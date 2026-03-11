import { z } from 'zod';

const OutcomeEnum = z.enum(['success', 'failed', 'pending', 'ignored', 'unknown']);

//  Tool 1: resolve_entity 

export const ResolveEntitySchema = z.object({
  identifiers: z
    .record(z.string(), z.string())
    .refine((obj) => Object.keys(obj).length >= 1, {
      message: 'At least one identifier is required',
    }),
  entity_type: z.string().max(100).optional(),
  display_name: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ResolveEntityInput = z.infer<typeof ResolveEntitySchema>;

//  Tool 2: log_interaction 

export const LogInteractionSchema = z.object({
  entity_id: z.string().uuid('entity_id must be a valid UUID'),
  api: z.string().min(1).max(100),
  action_type: z.string().min(1).max(100),
  action: z.string().min(1).max(255),
  outcome: OutcomeEnum,
  intent: z.string().max(255).optional(),
  agent_id: z.string().max(255).optional(),
  external_ref: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurred_at: z.string().datetime().optional(),
});

export type LogInteractionInput = z.infer<typeof LogInteractionSchema>;

//  Tool 3: get_recommendation 

export const GetRecommendationSchema = z.object({
  entity_id: z.string().uuid('entity_id must be a valid UUID'),
  intent: z.string().min(1).max(255),
  lookback_days: z.number().int().positive().max(730).optional(),
});

export type GetRecommendationInput = z.infer<typeof GetRecommendationSchema>;

//  Tool 4: update_recommendation_outcome 

export const UpdateOutcomeSchema = z.object({
  recommendation_id: z.string().uuid('recommendation_id must be a valid UUID'),
  was_followed: z.boolean(),
  outcome_interaction_id: z.string().uuid().optional(),
});

export type UpdateOutcomeInput = z.infer<typeof UpdateOutcomeSchema>;

//  Tool 5: get_entity 

export const GetEntitySchema = z.object({
  entity_id: z.string().uuid('entity_id must be a valid UUID'),
});

export type GetEntityInput = z.infer<typeof GetEntitySchema>;
