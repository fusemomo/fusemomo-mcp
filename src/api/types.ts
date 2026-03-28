export type InteractionOutcome = 'success' | 'failed' | 'pending' | 'ignored' | 'unknown';

export interface EntityIdentifier {
  id: string;
  source: string;
  identifier_type: string;
  identifier_value: string;
  confidence: number;
  link_strategy: string;
  verified_at: string | null;
}

//  Tool 1: resolve_entity 

export interface ResolveEntityRequest {
  identifiers: Record<string, string>;
  entity_type?: string;
  display_name?: string;
  metadata?: Record<string, unknown>;
}

export interface ResolveEntityResponse {
  entity_id: string;
  tenant_id: string;
  display_name: string | null;
  entity_type: string | null;
  total_interactions: number;
  successful_interactions: number;
  last_interaction_at: string | null;
  preferred_action_type: string | null;
  behavioral_score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  identifiers: EntityIdentifier[];
}

//  Tool 2: log_interaction 

export interface LogInteractionRequest {
  entity_id: string;
  api: string;
  action_type: string;
  action: string;
  outcome: InteractionOutcome;
  intent?: string;
  agent_id?: string;
  external_ref?: string;
  metadata?: Record<string, unknown>;
  occurred_at?: string;
}

export interface LogInteractionResponse {
  interaction_id: string;
  entity_id: string;
  logged_at: string;
}

//  Tool 3: get_recommendation 

export interface GetRecommendationRequest {
  intent: string;
  lookback_days?: number;
  min_success_count?: number;
  agent_id?: string;
}

export interface OpportunityEntry {
  api: string;
  action_type: string;
  total_count: number;
  success_count: number;
  raw_success_rate: number;
  recency_score: number;
  feedback_weight: number;
  composite_score: number;
  last_success_at?: string;
  last_occurred_at: string;
  is_primary: boolean;
}

export interface GetRecommendationResponse {
  recommendation_id: string;
  entity_id: string;
  intent?: string;
  primary: OpportunityEntry | null;
  opportunity_set: OpportunityEntry[];
  confidence_score: number;
  data_sufficient: boolean;
  lookback_days: number;
  generated_at: string;
}

//  Tool 4: update_recommendation_outcome 

export interface UpdateOutcomeRequest {
  was_followed: boolean;
  outcome_interaction_id?: string;
}

export interface UpdateOutcomeResponse {
  recommendation_id: string;
  was_followed: boolean;
  outcome: string | null;
  updated_at?: string;
}

//  Tool 5: get_entity 

export interface InteractionSummary {
  id: string;
  api: string;
  action_type: string;
  outcome: InteractionOutcome;
  occurred_at: string;
}

export interface GetEntityResponse {
  id: string;
  tenant_id: string;
  display_name: string | null;
  entity_type: string | null;
  total_interactions: number;
  successful_interactions: number;
  last_interaction_at: string | null;
  preferred_action_type: string | null;
  behavioral_score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  identifiers: EntityIdentifier[];
  interactions: InteractionSummary[];
}
