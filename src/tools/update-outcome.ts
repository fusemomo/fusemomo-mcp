import { apiClient } from '../api/client.js';
import type { UpdateOutcomeResponse } from '../api/types.js';
import { UpdateOutcomeSchema } from '../schemas/tools.js';
import { translateErrorForMCP } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const updateOutcomeToolDef = {
  name: 'update_recommendation_outcome',
  description:
    "Update a recommendation with whether it was followed and what the outcome was. Closes the feedback loop so Fusemomo can measure recommendation quality and improve future suggestions. Call this after acting on a get_recommendation result.",
  inputSchema: {
    type: 'object' as const,
    properties: {
      recommendation_id: {
        type: 'string',
        description: 'UUID of the recommendation to update (from get_recommendation response)',
      },
      was_followed: {
        type: 'boolean',
        description: 'Whether the agent followed this recommendation',
      },
      outcome_interaction_id: {
        type: 'string',
        description:
          'Optional: UUID of the interaction that resulted from following the recommendation (from log_interaction)',
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
      `/v1/core/recommends/${recommendation_id}/outcomes`,
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
          text: `Recommendation outcome updated. Followed: ${data.was_followed}, Outcome: ${data.outcome ?? 'unknown'}`,
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
