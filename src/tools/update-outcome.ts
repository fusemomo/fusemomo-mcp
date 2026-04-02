import { apiClient } from '../api/client.js';
import type { UpdateOutcomeResponse } from '../api/types.js';
import { UpdateOutcomeSchema } from '../schemas/tools.js';
import { translateErrorForMCP } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const updateOutcomeToolDef = {
  name: 'update_recommendation_outcome',
  description:
    "Close the feedback loop on a previously retrieved recommendation. Once you act upon a recommendation from get_recommendation, you MUST call this to inform the engine if the recommendation actually worked or failed. This self-corrects the algorithm.",
  inputSchema: {
    type: 'object' as const,
    properties: {
      recommendation_id: {
        type: 'string',
        description: 'UUID of the recommendation to update (from get_recommendation response)',
      },
      was_followed: {
        type: 'boolean',
        description: 'True if you actually executed the exact action recommended by the engine. False if you chose to do something else instead.',
      },
      outcome_interaction_id: {
        type: 'string',
        description:
          'Optional: UUID of the interaction that resulted from following the recommendation. MUST belong to the exact same entity as the recommendation (via log_interaction).',
      },
    },
    required: ['recommendation_id', 'was_followed'],
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

export async function handleUpdateOutcome(args: unknown) {
  const start = Date.now();

  const parsed = UpdateOutcomeSchema.safeParse(args);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return {
      isError: true,
      content: [{ type: 'text' as const, text: `Validation error: ${issues}` }],
    };
  }

  const { recommendation_id, was_followed, outcome_interaction_id } = parsed.data;

  try {
    const data = await apiClient.patch<UpdateOutcomeResponse>(
      `/v1/core/recommends/${recommendation_id}/feedback`,
      {
        was_followed,
        ...(outcome_interaction_id !== undefined && { outcome_interaction_id }),
      },
    );

    logger.info('Tool called: update_recommendation_outcome', {
      recommendation_id,
      was_followed,
      execution_time: `${Date.now() - start}ms`,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              recommendation_id: data.recommendation_id,
              was_followed: data.was_followed,
              outcome: data.outcome,
              updated_at: data.updated_at ?? null,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error('Tool failed: update_recommendation_outcome', {
      error: error instanceof Error ? error.message : String(error),
    });
    return translateErrorForMCP(error);
  }
}
