/**
 * Schema Curator Agent Types
 * Types for AI-powered schema management system
 */

// ============================================
// Database Entity Types
// ============================================

export type EntityType = 'platform' | 'industry' | 'product' | 'subproduct' | 'tactic_type' | 'soul_doc'
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
// API Request/Response Types
// ============================================

// POST /curator/extract
export interface ExtractRequest {
  session_id?: string         // Resume existing session
  content: string             // Text content to extract from
  content_type: 'text' | 'url' | 'file_content'
  file_name?: string          // Original filename if from file
  target_types?: EntityType[] // Filter extraction to specific types
}

export interface ExtractResponse {
  success: boolean
  session_id: string
  extracted_items: ExtractedItem[]
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
