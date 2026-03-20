import { apiClient } from '../api/client.js';
import type { GetRecommendationResponse } from '../api/types.js';
import { GetRecommendationSchema } from '../schemas/tools.js';
import { PaymentRequiredError, translateErrorForMCP } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const getRecommendationToolDef = {
  name: 'get_recommendation',
  description:
    'Get the highest-success action recommendation for an entity based on historical behavioral data. Returns the action type most likely to succeed for this entity and intent. Requires Builder plan or higher.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      entity_id: {
        type: 'string',
        description: 'UUID of the entity to get recommendation for (from resolve_entity)',
      },
      intent: {
        type: 'string',
        description:
          "Business goal (e.g. 'payment_recovery', 'incident_response', 'lead_nurturing', 'onboarding')",
      },
      lookback_days: {
        type: 'number',
        description:
          'Optional: Override default lookback window in days (default: 90 for Builder, 730 for Enterprise, max: 730)',
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
    const data = await apiClient.post<GetRecommendationResponse | null>(
      '/v1/core/recommends',
      input,
    );

    logger.info('Tool called: get_recommendation', {
      entity_id: input.entity_id,
      intent: input.intent,
      execution_time: `${Date.now() - start}ms`,
    });

    // Null / empty response means insufficient data
    if (!data) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Insufficient interaction history for this entity and intent. Need at least 2 interactions to make a recommendation.',
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
              recommended_action_type: data.recommended_action_type,
              confidence: data.confidence_score ?? data.confidence,
              reason: data.reason,
              sample_size: data.sample_size,
              scoring_breakdown: data.scoring_breakdown,
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
