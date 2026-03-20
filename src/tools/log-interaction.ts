import { apiClient } from '../api/client.js';
import type { LogInteractionResponse } from '../api/types.js';
import { LogInteractionSchema } from '../schemas/tools.js';
import { translateErrorForMCP } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const logInteractionToolDef = {
  name: 'log_interaction',
  description:
    'Log an API interaction event for behavioral learning. Records what action was taken, on which entity, through which API, and what the outcome was. This is the core write operation that builds the behavioral graph.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      entity_id: {
        type: 'string',
        description: 'UUID of the entity this interaction is about (from resolve_entity)',
      },
      api: {
        type: 'string',
        description: "Which API was called (e.g. 'sendgrid', 'stripe', 'github', 'jira')",
      },
      action_type: {
        type: 'string',
        description:
          "Category of action (e.g. 'send_email', 'create_issue', 'charge_card', 'notify')",
      },
      action: {
        type: 'string',
        description:
          "Specific action taken (e.g. 'payment_reminder_v2', 'bug_report', 'onboarding_sequence_1')",
      },
      outcome: {
        type: 'string',
        enum: ['success', 'failed', 'pending', 'ignored', 'unknown'],
        description: 'Result of the action',
      },
      intent: {
        type: 'string',
        description:
          "Optional business goal (e.g. 'payment_recovery', 'incident_response', 'lead_nurturing')",
      },
      agent_id: {
        type: 'string',
        description: 'Optional identifier for which agent triggered this',
      },
      external_ref: {
        type: 'string',
        description: 'Optional external reference ID for idempotent logging',
      },
      metadata: {
        type: 'object',
        description: 'Optional additional context about the interaction',
      },
      occurred_at: {
        type: 'string',
        description: 'Optional ISO 8601 timestamp when the interaction occurred (defaults to now)',
      },
    },
    required: ['entity_id', 'api', 'action_type', 'action', 'outcome'],
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;

export async function handleLogInteraction(args: unknown) {
  const start = Date.now();

  const parsed = LogInteractionSchema.safeParse(args);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return {
      isError: true,
      content: [{ type: 'text' as const, text: `Validation error: ${issues}` }],
    };
  }

  const input = parsed.data;

  try {
    const data = await apiClient.post<LogInteractionResponse>('/v1/core/interactions/log', input);

    logger.info('Tool called: log_interaction', {
      interaction_id: data.interaction_id,
      entity_id: data.entity_id,
      execution_time: `${Date.now() - start}ms`,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Interaction logged successfully. ID: ${data.interaction_id}`,
        },
      ],
    };
  } catch (error) {
    logger.error('Tool failed: log_interaction', {
      error: error instanceof Error ? error.message : String(error),
    });
    return translateErrorForMCP(error);
  }
}
