import { apiClient } from '../api/client.js';
import type { LogInteractionResponse } from '../api/types.js';
import { LogInteractionSchema } from '../schemas/tools.js';
import { translateErrorForMCP } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const logInteractionToolDef = {
  name: 'log_interaction',
  description:
    'Chronicle a specific action taken on an entity to build its behavioral profile. Use this to explicitly tell the system what you did, which tool you used, and what happened. This behavioral payload forms the graph that drives future ML recommendations.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      entity_id: {
        type: 'string',
        description: 'The internal Fusemomo UUID of the entity (obtained from resolve_entity).',
      },
      api: {
        type: 'string',
        description: "The name of the service or system used to perform the action (e.g., 'sendgrid', 'stripe', 'linear', 'slack', 'internal_db').",
      },
      action_type: {
        type: 'string',
        description:
          "The broad category of the action taken. Keep this consistent across similar actions (e.g., 'send_email', 'charge_card', 'create_ticket', 'send_message').",
      },
      action: {
        type: 'string',
        description:
          "The precise/specific action or template used (e.g., 'welcome_email_v2', 'subscription_renewal', 'bug_report_creation').",
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
        description: 'Required: Identifier for which agent triggered this interaction (e.g. cursor_agent, outreach_bot_v1)',
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
    required: ['entity_id', 'api', 'action_type', 'action', 'outcome', 'agent_id'],
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
          text: JSON.stringify(
            {
              interaction_id: data.interaction_id,
              entity_id: data.entity_id,
              logged_at: data.logged_at,
            },
            null,
            2,
          ),
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
