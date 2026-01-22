/**
 * Schema Curator Agent Types
 * Types for AI-powered schema management system
 */

// ============================================
// Database Entity Types
// ============================================

// Core entity types (things you create)
export type CoreEntityType = 'platform' | 'industry' | 'product' | 'subproduct' | 'tactic_type' | 'soul_doc'

// Enrichment entity types (things you add to existing entities)
export type EnrichmentEntityType = 'platform_quirk' | 'industry_insight' | 'platform_buyer_note' | 'platform_kpi'

// All entity types
export type EntityType = CoreEntityType | EnrichmentEntityType

// Action types - what the curator can do
export type CuratorActionType =
  | 'create_entity'      // Create a new entity
  | 'update_field'       // Update a field on existing entity
  | 'add_enrichment'     // Add quirk/insight/note to existing entity
  | 'research_fill'      // Research and fill missing data
export type SourceType = 'file' | 'url' | 'web_research' | 'ai_generated' | 'manual'
export type TrustLevel = 'authoritative' | 'standard' | 'limited'
export type SessionStatus = 'active' | 'completed' | 'abandoned'

export interface SchemaProvenance {
  id: string
  entity_type: EntityType
  entity_id: string
  field_name: string
  source_type: SourceType
  source_url?: string
  source_snippet?: string
  ai_model?: string
  ai_confidence?: number
  created_at: string
}

export interface SchemaAuditLog {
  id: string
  operation: 'create' | 'update'
  entity_type: EntityType
  entity_id: string
  field_changes: Record<string, { old: unknown; new: unknown }>
  full_snapshot: Record<string, unknown>
  batch_id?: string
  changed_by: string
  is_rolled_back: boolean
  rolled_back_at?: string
  rolled_back_by?: string
  created_at: string
}

export interface CuratorDomainWhitelist {
  id: string
  domain: string
  trust_level: TrustLevel
  categories?: string[]
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CuratorSession {
  id: string
  status: SessionStatus
  messages: ChatMessage[]
  pending_items: ExtractedItem[]
  committed_items: CommittedItem[]
  tokens_used: number
  tokens_limit: number
  last_activity_at: string
  created_at: string
}

// ============================================
// Chat & Messaging Types
// ============================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: {
    extracted_items?: number
    tokens_used?: number
    model?: string
  }
}

// ============================================
// Extraction Types
// ============================================

export interface ExtractedField {
  name: string
  value: unknown
  confidence: number          // 0.0 to 1.0
  source: SourceType
  source_url?: string
  source_snippet?: string
}

export interface ExtractedItem {
  id: string                  // Temporary ID for tracking
  entity_type: EntityType
  fields: ExtractedField[]
  overall_confidence: number
  classification_reason: string
  duplicate_candidates?: DuplicateCandidate[]
  conflicts?: FieldConflict[]
  status: 'pending' | 'approved' | 'rejected' | 'merged'
}

export interface CommittedItem {
  id: string
  entity_type: EntityType
  entity_id: string          // Database ID after commit
  committed_at: string
  batch_id: string
}

export interface DuplicateCandidate {
  entity_id: string
  entity_name: string
  similarity_score: number
  matching_fields: string[]
}

export interface FieldConflict {
  field_name: string
  existing_value: unknown
  new_value: unknown
  resolution?: 'keep_existing' | 'use_new' | 'merge'
}

// ============================================
// Semantic Matching Types
// ============================================

export interface SemanticMatch {
  entity_type: CoreEntityType
  entity_id: string
  entity_name: string
  similarity: number
  matched_text: string  // What text triggered the match
}

export interface MatchContext {
  platforms: SemanticMatch[]
  industries: SemanticMatch[]
  products: SemanticMatch[]
  tactic_types: SemanticMatch[]
}

// ============================================
// Action-Based Extraction Types
// ============================================

export interface CuratorAction {
  id: string
  action_type: CuratorActionType
  entity_type: EntityType
  target_entity?: {
    id: string
    name: string
    type: CoreEntityType
  }
  fields: ExtractedField[]
  confidence: number
  reasoning: string
  requires_research: boolean
  status: 'pending' | 'approved' | 'rejected' | 'completed'
}

export interface SmartExtractionResult {
  intent: 'enrichment' | 'creation' | 'mixed' | 'unclear'
  intent_confidence: number
  matched_entities: MatchContext
  actions: CuratorAction[]
  clarification_needed?: string
  summary: string
}

// ============================================
// API Request/Response Types
// ============================================

// POST /curator/extract
export interface ExtractRequest {
  session_id?: string         // Resume existing session
  content: string             // Text content to extract from
  content_type: 'text' | 'url' | 'file_content'
  file_name?: string          // Original filename if from file
  target_types?: EntityType[] // Filter extraction to specific types
  mode?: 'smart' | 'legacy'   // Smart = semantic matching + actions, Legacy = old behavior
}

export interface ExtractResponse {
  success: boolean
  session_id: string
  // Legacy mode response
  extracted_items?: ExtractedItem[]
  // Smart mode response
  smart_result?: SmartExtractionResult
  tokens_used: number
  tokens_remaining: number
  message?: string           // AI response message
}

// POST /curator/research
export interface ResearchRequest {
  session_id: string
  item_id: string            // ID of extracted item to research
  fields?: string[]          // Specific fields to verify (all if empty)
}

export interface ResearchResponse {
  success: boolean
  item_id: string
  verified_fields: ExtractedField[]
  additional_sources: WebSource[]
  tokens_used: number
}

export interface WebSource {
  url: string
  title: string
  domain: string
  trust_level: TrustLevel
  relevant_snippet: string
}

// POST /curator/preview
export interface PreviewRequest {
  session_id: string
  item_ids: string[]         // Items to preview for commit
}

export interface PreviewResponse {
  success: boolean
  items: PreviewItem[]
  has_conflicts: boolean
  has_duplicates: boolean
}

export interface PreviewItem {
  item_id: string
  entity_type: EntityType
  proposed_changes: ProposedChange[]
  duplicate_candidates: DuplicateCandidate[]
  conflicts: FieldConflict[]
  can_commit: boolean
  warnings: string[]
}

export interface ProposedChange {
  field: string
  value: unknown
  confidence: number
  source: SourceType
}

// POST /curator/commit
export interface CommitRequest {
  session_id?: string
  items: CommitItemDirect[]  // Direct field commit (simpler)
}

export interface CommitItemDirect {
  entity_type: EntityType
  fields: ExtractedField[]
}

export interface CommitItem {
  item_id: string
  approved_fields: string[]    // Fields user approved
  field_overrides?: Record<string, unknown>  // Manual edits
  merge_with?: string          // Entity ID to merge with instead of create
}

export interface CommitResponse {
  batch_id: string
  results: CommitResult[]
  committed_count: number
  failed_count: number
}

export interface CommitResult {
  entity_type: EntityType
  success: boolean
  entity_id?: string
  error?: string
}

export interface CommittedResult {
  item_id: string
  entity_id: string
  entity_type: EntityType
  operation: 'create' | 'update' | 'merge'
}

export interface FailedCommit {
  item_id: string
  error: string
}

// POST /curator/rollback
export interface RollbackRequest {
  batch_id?: string           // Rollback entire batch
  audit_log_ids?: string[]    // Rollback specific changes
}

export interface RollbackResponse {
  success: boolean
  rolled_back: number
  errors?: string[]
}

// GET /curator/session/:id
export interface SessionResponse {
  success: boolean
  session: CuratorSession
}

// GET /curator/whitelist
export interface WhitelistResponse {
  success: boolean
  domains: CuratorDomainWhitelist[]
}

// ============================================
// OpenAI Integration Types
// ============================================

export interface OpenAIExtractionResult {
  entity_type: EntityType
  fields: {
    name: string
    value: unknown
    confidence: number
    reasoning: string
  }[]
  classification_reason: string
}

export interface OpenAIVerificationResult {
  field_name: string
  is_verified: boolean
  confidence: number
  sources: {
    url: string
    snippet: string
    supports: boolean
  }[]
  corrected_value?: unknown
}

// ============================================
// Constants
// ============================================

export const CURATOR_CONFIG = {
  MODEL: 'gpt-5.2-2025-12-11',
  MAX_TOKENS_PER_REQUEST: 4096,
  DAILY_TOKEN_BUDGET: 500000,
  CONFIDENCE_THRESHOLD: {
    HIGH: 0.85,
    MEDIUM: 0.70,
    LOW: 0.50,
  },
  SESSION_TIMEOUT_HOURS: 24,
} as const

// ============================================
// Research Mode Evolution Types
// ============================================

// Authority tiers for sources
export type AuthorityTier = 'authoritative' | 'standard' | 'user_provided'

// Research depth levels
export type ResearchDepth = 'quick' | 'standard' | 'deep'

// Research session status
export type ResearchStatus = 'in_progress' | 'completed' | 'failed'

// Feedback types for continuous learning
export type FeedbackType = 'good' | 'bad' | 'partial'

// Research target type
export type ResearchType = 'product' | 'subproduct' | 'platform' | 'industry' | 'cross_entity'

// Curator Source - centralized source repository
export interface CuratorSource {
  id: string
  url: string
  domain: string
  title?: string
  snippet?: string
  authority_tier: AuthorityTier
  authority_score: number  // 1.0, 0.7, 0.5
  categories?: string[]
  fetch_count: number
  is_user_provided: boolean
  created_at: string
  updated_at: string
}

// Entity Source - links sources to entities
export interface EntitySource {
  id: string
  source_id: string
  entity_type: CoreEntityType
  entity_id: string
  field_name?: string
  citation_text?: string
  relevance_score: number
  created_at: string
}

// Source with authority information for display
export interface SourceWithAuthority {
  id: string
  url: string
  domain: string
  title?: string
  authority_tier: AuthorityTier
  authority_score: number
  citation_text?: string
  categories?: string[]
}

// Research readiness check result
export interface ResearchReadiness {
  is_ready: boolean
  warnings: string[]
  missing_fields: string[]
  recommendation: string
  data_quality_score?: number
}

// Individual reasoning step in chain of thought
export interface ReasoningStep {
  step_number: number
  description: string
  sources_used: string[]
  confidence: number
  duration_ms?: number
}

// Extracted guidance fields from research
export interface ExtractedGuidanceFields {
  chain_of_thought_guidance?: string[]
  analysis_instructions?: string[]
  example_good_analysis?: string[]
  example_bad_analysis?: string[]
  critical_metrics?: string[]
  optimization_priorities?: string[]
  important_constraints_restrictions?: string
}

// Inheritance analysis - what applies at product vs subproduct level
export interface InheritanceAnalysis {
  product_level_guidance: ExtractedField[]
  subproduct_specific_guidance: ExtractedField[]
  inheritance_reasoning: string
}

// Cross-entity intelligence suggestion
export interface CrossEntitySuggestion {
  target_entity_type: CoreEntityType
  target_entity_id?: string
  target_entity_name?: string
  suggested_field: string
  suggested_value: string
  reasoning: string
  confidence: number
}

// Research session - full research context
export interface ResearchSession {
  id: string
  target_product_id?: string
  target_subproduct_id?: string
  target_platform_id?: string
  target_industry_id?: string
  research_type: ResearchType
  research_depth: ResearchDepth
  user_context?: string
  chain_of_thought: string
  reasoning_steps?: ReasoningStep[]
  sources_consulted?: SourceWithAuthority[]
  extracted_fields?: ExtractedGuidanceFields
  inheritance_analysis?: InheritanceAnalysis
  cross_entity_suggestions?: CrossEntitySuggestion[]
  readiness_check?: ResearchReadiness
  tokens_used: number
  model_used?: string
  duration_ms?: number
  status: ResearchStatus
  error_message?: string
  created_at: string
  completed_at?: string
}

// Research feedback for continuous learning
export interface ResearchFeedback {
  id: string
  research_session_id: string
  feedback_type: FeedbackType
  field_name?: string
  feedback_notes?: string
  marked_by: string
  created_at: string
}

// ============================================
// Research API Request/Response Types
// ============================================

// POST /curator/research/product
export interface ProductResearchRequest {
  product_id: string             // Required
  subproduct_id?: string         // Optional - narrows scope
  platform_focus?: string        // Optional - e.g., "Google Ads"
  user_context?: string          // Optional - notes to guide research
  research_depth?: ResearchDepth
}

// Available metrics context from performance tables
export interface AvailableMetricsContext {
  all_metrics: string[]           // All unique column headers available
  tables_count: number            // Number of performance tables found
  is_product_level: boolean       // True if product-only (no subproduct specified)
  metrics_by_subproduct?: Record<string, string[]>  // Breakdown by subproduct
  not_available: string[]         // Common metrics NOT in our data
}

export interface ProductResearchResponse {
  success: boolean
  session_id: string
  readiness_check: ResearchReadiness
  available_metrics?: AvailableMetricsContext  // What data we actually have
  chain_of_thought: string
  reasoning_steps: ReasoningStep[]
  extracted_fields: ExtractedGuidanceFields
  sources: SourceWithAuthority[]
  cross_entity_suggestions: CrossEntitySuggestion[]
  inheritance_analysis?: InheritanceAnalysis
  tokens_used: number
  duration_ms: number
  error?: string
}

// GET /curator/sources
export interface SourcesListRequest {
  entity_type?: CoreEntityType
  authority_tier?: AuthorityTier
  domain?: string
  limit?: number
  offset?: number
}

export interface SourcesListResponse {
  success: boolean
  sources: CuratorSource[]
  total_count: number
}

// POST /curator/sources
export interface CreateSourceRequest {
  url: string
  title?: string
  snippet?: string
  categories?: string[]
}

export interface CreateSourceResponse {
  success: boolean
  source: CuratorSource
  error?: string
}

// POST /curator/feedback
export interface SubmitFeedbackRequest {
  research_session_id: string
  feedback_type: FeedbackType
  field_name?: string
  notes?: string
}

export interface SubmitFeedbackResponse {
  success: boolean
  feedback_id: string
  error?: string
}

// GET /curator/feedback/patterns
export interface FeedbackPatternsResponse {
  success: boolean
  patterns: Array<{
    field_name: string
    good_count: number
    bad_count: number
    total_count: number
    success_rate: number
  }>
}
