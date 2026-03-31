import { apiClient } from '../api/client.js';
import type { GetEntityResponse } from '../api/types.js';
import { GetEntitySchema } from '../schemas/tools.js';
import { translateErrorForMCP } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const getEntityToolDef = {
  name: 'get_entity',
  description:
    "Retrieve the complete behavioral profile and consolidated history of an entity. Provides historical success rates, behavioral scores, all linked identifiers, and recent interactions. Use this when you need absolute context on an entity's past behaviors before deciding how to approach them.",
  inputSchema: {
    type: 'object' as const,
    properties: {
      entity_id: {
        type: 'string',
        description: 'The internal Fusemomo UUID of the entity. You MUST obtain this by calling resolve_entity first.',
      },
    },
    required: ['entity_id'],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

export async function handleGetEntity(args: unknown) {
  const start = Date.now();

  const parsed = GetEntitySchema.safeParse(args);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return {
      isError: true,
      content: [{ type: 'text' as const, text: `Validation error: ${issues}` }],
    };
  }

  const { entity_id } = parsed.data;

  try {
    const data = await apiClient.get<GetEntityResponse>(`/v1/core/entities/${entity_id}`);

    logger.info('Tool called: get_entity', {
      entity_id,
      execution_time: `${Date.now() - start}ms`,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              entity_id: data.id,
              display_name: data.display_name,
              entity_type: data.entity_type,
              identifiers: data.identifiers,
              total_interactions: data.total_interactions,
              successful_interactions: data.successful_interactions,
              behavioral_score: data.behavioral_score,
              preferred_action_type: data.preferred_action_type,
              last_interaction_at: data.last_interaction_at,
              recent_interactions: data.interactions,
              metadata: data.metadata,
              created_at: data.created_at,
              updated_at: data.updated_at,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error('Tool failed: get_entity', {
      error: error instanceof Error ? error.message : String(error),
    });
    return translateErrorForMCP(error);
  }
}
