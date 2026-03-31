import { apiClient } from '../api/client.js';
import type { GetRecommendationResponse } from '../api/types.js';
import { GetRecommendationSchema } from '../schemas/tools.js';
import { PaymentRequiredError, translateErrorForMCP } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const getRecommendationToolDef = {
  name: 'get_recommendation',
  description:
    'Ask the intelligent engine for the statistically best action to take next for a given entity and intent. Based on historical data, this tool returns the exact communication channel or action type most likely to succeed. Call this *before* deciding what to do.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      entity_id: {
        type: 'string',
        description: 'The internal Fusemomo UUID of the entity (must be obtained from resolve_entity first).',
      },
      intent: {
        type: 'string',
        description:
          "The overarching business goal you are trying to achieve (e.g., 'payment_recovery', 'lead_nurturing', 'upsell', 'onboarding'). The recommendation is optimized strictly for this goal.",
      },
      lookback_days: {
        type: 'number',
        description:
          'Optional: Override default lookback window in days (default: 90 for Builder, 730 for Enterprise, max: 730)',
      },
      min_success_count: {
        type: 'number',
        description:
          'Optional: Minimum number of successful interactions required for a recommendation pair to be considered (default: 1)',
      },
      agent_id: {
        type: 'string',
        description: 'Optional: ID of the agent requesting the recommendation. Useful for segmented attribution tracking.',
      },
    },
    required: ['entity_id', 'intent'],
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;

export async function handleGetRecommendation(args: unknown) {
  const start = Date.now();

  const parsed = GetRecommendationSchema.safeParse(args);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return {
      isError: true,
      content: [{ type: 'text' as const, text: `Validation error: ${issues}` }],
    };
  }

  const input = parsed.data;

  try {
    const { entity_id, ...payload } = input;
    const data = await apiClient.post<GetRecommendationResponse | null>(
      `/v1/core/entities/${entity_id}/recommend`,
      payload,
    );

    logger.info('Tool called: get_recommendation', {
      entity_id: input.entity_id,
      intent: input.intent,
      execution_time: `${Date.now() - start}ms`,
    });

    // Handle missing or insufficient data
    if (!data || !data.data_sufficient || !data.primary) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Insufficient interaction history for this entity and intent. Need more interactions to make a reliable recommendation.',
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              recommendation_id: data.recommendation_id,
              entity_id: data.entity_id,
              intent: data.intent,
              confidence_score: data.confidence_score,
              data_sufficient: data.data_sufficient,
              lookback_days: data.lookback_days,
              primary_recommendation: data.primary
                ? {
                    channel: data.primary.api,
                    action_type: data.primary.action_type,
                    composite_score: data.primary.composite_score,
                    raw_success_rate: data.primary.raw_success_rate,
                    success_count: data.primary.success_count,
                    total_count: data.primary.total_count,
                    last_success_at: data.primary.last_success_at,
                  }
                : null,
              all_channels_ranked: data.opportunity_set.map((entry) => ({
                channel: entry.api,
                action_type: entry.action_type,
                composite_score: entry.composite_score,
                raw_success_rate: entry.raw_success_rate,
                success_count: entry.success_count,
                total_count: entry.total_count,
                is_primary: entry.is_primary,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    // Special 402 handling — plan upgrade message
    if (error instanceof PaymentRequiredError) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: 'Recommendations require a Builder plan. This account is on the Free tier. Upgrade at https://fusemomo.com/upgrade',
          },
        ],
      };
    }

    logger.error('Tool failed: get_recommendation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return translateErrorForMCP(error);
  }
}
