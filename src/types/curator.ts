/**
 * Schema Curator Agent Types (Frontend)
 * Types for the AI-powered schema management UI
 */

// ============================================
// Core Entity Types (shared with backend)
// ============================================

export type EntityType = 'platform' | 'industry' | 'product' | 'subproduct' | 'tactic_type' | 'soul_doc'
export type SourceType = 'file' | 'url' | 'web_research' | 'ai_generated' | 'manual'
export type TrustLevel = 'authoritative' | 'standard' | 'limited'
export type SessionStatus = 'active' | 'completed' | 'abandoned'
export type ItemStatus = 'pending' | 'approved' | 'rejected' | 'merged'

// ============================================
// Session & Chat Types
// ============================================

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
  confidence: number
  source: SourceType
  source_url?: string
  source_snippet?: string
}

export interface ExtractedItem {
  id: string
  entity_type: EntityType
  fields: ExtractedField[]
  overall_confidence: number
  classification_reason: string
  duplicate_candidates?: DuplicateCandidate[]
  conflicts?: FieldConflict[]
  status: ItemStatus
}

export interface CommittedItem {
  id: string
  entity_type: EntityType
  entity_id: string
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
// Web Research Types
// ============================================

export interface WebSource {
  url: string
  title: string
  domain: string
  trust_level: TrustLevel
  relevant_snippet: string
}

export interface DomainWhitelist {
  id: string
  domain: string
  trust_level: TrustLevel
  categories?: string[]
  notes?: string
  is_active: boolean
}

// ============================================
// Preview & Commit Types
// ============================================

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

export interface CommitResult {
  entity_type: EntityType
  success: boolean
  entity_id?: string
  error?: string
}

// ============================================
// API Request/Response Types
// ============================================

export interface ExtractRequest {
  session_id?: string
  content: string
  content_type: 'text' | 'url' | 'file_content'
  file_name?: string
  target_types?: EntityType[]
}

export interface ExtractResponse {
  success: boolean
  session_id: string
  extracted_items: ExtractedItem[]
  tokens_used: number
  tokens_remaining: number
  message?: string
}

export interface CommitRequest {
  session_id: string
  items: CommitItemPayload[]
}

export interface CommitItemPayload {
  item_id: string
  approved_fields: string[]
  field_overrides?: Record<string, unknown>
  merge_with?: string
}

export interface CommitResponse {
  batch_id: string
  results: CommitResult[]
  committed_count: number
  failed_count: number
}

export interface RollbackRequest {
  batch_id?: string
  audit_log_ids?: string[]
}

export interface RollbackResponse {
  success: boolean
  rolled_back: number
  errors?: string[]
}

// ============================================
// UI State Types
// ============================================

export interface CuratorUIState {
  // Panel states
  activePanel: 'chat' | 'input' | 'review'

  // Input state
  inputMode: 'text' | 'file' | 'url'
  inputContent: string
  uploadedFiles: UploadedFile[]

  // Processing state
  isExtracting: boolean
  isResearching: boolean
  isCommitting: boolean

  // Selection state
  selectedItemIds: string[]
  expandedItemIds: string[]

  // Edit state
  editingField?: {
    itemId: string
    fieldName: string
    originalValue: unknown
  }
}

export interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  content?: string  // Parsed content
  status: 'pending' | 'parsing' | 'ready' | 'error'
  error?: string
}

// ============================================
// UI Constants
// ============================================

// Icon names map to Lucide icons in the component
export const ENTITY_TYPE_ICONS: Record<EntityType, string> = {
  platform: 'Smartphone',
  industry: 'Factory',
  product: 'Package',
  subproduct: 'Layers',
  tactic_type: 'Target',
  soul_doc: 'FileText',
}

export const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'platform', label: 'Platform' },
  { value: 'industry', label: 'Industry' },
  { value: 'product', label: 'Product' },
  { value: 'subproduct', label: 'Subproduct' },
  { value: 'tactic_type', label: 'Tactic Type' },
  { value: 'soul_doc', label: 'Soul Document' },
]

export const SOURCE_TYPES: { value: SourceType; label: string; color: string }[] = [
  { value: 'file', label: 'File Upload', color: 'var(--color-info)' },
  { value: 'url', label: 'URL', color: 'var(--color-success)' },
  { value: 'web_research', label: 'Web Research', color: 'var(--color-warning)' },
  { value: 'ai_generated', label: 'AI Generated', color: 'var(--color-primary)' },
  { value: 'manual', label: 'Manual Entry', color: 'var(--color-muted)' },
]

export const TRUST_LEVELS: { value: TrustLevel; label: string; color: string }[] = [
  { value: 'authoritative', label: 'Authoritative', color: 'var(--color-success)' },
  { value: 'standard', label: 'Standard', color: 'var(--color-info)' },
  { value: 'limited', label: 'Limited', color: 'var(--color-warning)' },
]

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.70,
  LOW: 0.50,
} as const

export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high'
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium'
  return 'low'
}

export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence)
  switch (level) {
    case 'high': return 'var(--color-success)'
    case 'medium': return 'var(--color-warning)'
    case 'low': return 'var(--color-error)'
  }
}

// ============================================
// File Parsing Constants
// ============================================

export const SUPPORTED_FILE_TYPES = {
  'text/plain': { extension: '.txt', parser: 'text' },
  'text/csv': { extension: '.csv', parser: 'csv' },
  'application/pdf': { extension: '.pdf', parser: 'pdf' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extension: '.docx', parser: 'docx' },
  'image/png': { extension: '.png', parser: 'vision' },
  'image/jpeg': { extension: '.jpg', parser: 'vision' },
  'image/webp': { extension: '.webp', parser: 'vision' },
} as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// ============================================
// Token Budget Constants
// ============================================

export const TOKEN_BUDGET = {
  DAILY_LIMIT: 500000,
  WARNING_THRESHOLD: 0.80, // 80%
  HARD_STOP_THRESHOLD: 1.00, // 100%
} as const

export function getTokenBudgetStatus(used: number, limit: number): 'ok' | 'warning' | 'exceeded' {
  const ratio = used / limit
  if (ratio >= TOKEN_BUDGET.HARD_STOP_THRESHOLD) return 'exceeded'
  if (ratio >= TOKEN_BUDGET.WARNING_THRESHOLD) return 'warning'
  return 'ok'
}
