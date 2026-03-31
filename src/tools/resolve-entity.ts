import { apiClient } from '../api/client.js';
import type { ResolveEntityResponse } from '../api/types.js';
import { ResolveEntitySchema } from '../schemas/tools.js';
import { translateErrorForMCP } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const resolveEntityToolDef = {
  name: 'resolve_entity',
  description:
    'Resolve external identifiers (e.g. Email, GitHub ID, Stripe ID) into a unified internal Fusemomo Entity. THIS MUST BE YOUR FIRST STEP in any workflow, as every other tool requires the internal `entity_id` returned here. If the entity does not exist, this tool automatically safely creates it.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      identifiers: {
        type: 'object',
        description:
          "MANDATORY: Key-value map of known identifiers. Keys are the source platform (e.g., 'email', 'phone', 'stripe_customer_id', 'github_username'), values are the actual IDs. Provide all known pairs to ensure accurate merging.",
        additionalProperties: { type: 'string' },
      },
      entity_type: {
        type: 'string',
        description: "Optional entity type classification (e.g. 'contact', 'repository', 'order')",
      },
      display_name: {
        type: 'string',
        description: 'Optional human-readable name for the entity',
      },
    },
    required: ['identifiers'],
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;

export async function handleResolveEntity(args: unknown) {
  const start = Date.now();

  const parsed = ResolveEntitySchema.safeParse(args);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return {
      isError: true,
      content: [{ type: 'text' as const, text: `Validation error: ${issues}` }],
    };
  }

  const input = parsed.data;

  try {
    const data = await apiClient.post<ResolveEntityResponse>('/v1/core/entities/resolve', input);

    logger.info('Tool called: resolve_entity', {
      entity_id: data.entity_id,
      execution_time: `${Date.now() - start}ms`,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              entity_id: data.entity_id,
              display_name: data.display_name,
              entity_type: data.entity_type,
              identifiers: data.identifiers,
              behavioral_score: data.behavioral_score,
              total_interactions: data.total_interactions,
              successful_interactions: data.successful_interactions,
              preferred_action_type: data.preferred_action_type,
              created_at: data.created_at,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    logger.error('Tool failed: resolve_entity', {
      error: error instanceof Error ? error.message : String(error),
    });
    return translateErrorForMCP(error);
  }
}
