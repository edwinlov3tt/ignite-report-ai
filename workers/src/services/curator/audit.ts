/**
 * Audit & Provenance Services for Schema Curator
 * Handles tracking of all schema changes with full history for rollback
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { EntityType, ExtractedField } from '../../types/curator'

// ============================================
// Types
// ============================================

export interface ProvenanceRecord {
  entity_type: EntityType
  entity_id: string
  field_name: string
  source_type: 'user_input' | 'file_upload' | 'url' | 'web_research' | 'ai_generated'
  source_url?: string
  source_snippet?: string
  ai_model?: string
  ai_confidence?: number
}

export interface AuditLogEntry {
  operation: 'create' | 'update' | 'delete'
  entity_type: EntityType
  entity_id: string
  field_changes: Record<string, { old: unknown; new: unknown }>
  full_snapshot: Record<string, unknown>
  batch_id?: string
  changed_by: string
}

// ============================================
// Provenance Tracking
// ============================================

/**
 * Record provenance for extracted fields
 */
export async function recordProvenance(
  supabase: SupabaseClient,
  records: ProvenanceRecord[]
): Promise<{ success: boolean; error?: string }> {
  if (records.length === 0) {
    return { success: true }
  }

  const { error } = await supabase
    .from('schema_provenance')
    .insert(records.map(r => ({
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      field_name: r.field_name,
      source_type: r.source_type,
      source_url: r.source_url,
      source_snippet: r.source_snippet,
      ai_model: r.ai_model,
      ai_confidence: r.ai_confidence,
    })))

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get provenance history for an entity
 */
export async function getProvenance(
  supabase: SupabaseClient,
  entityType: EntityType,
  entityId: string
): Promise<ProvenanceRecord[]> {
  const { data, error } = await supabase
    .from('schema_provenance')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to get provenance:', error)
    return []
  }

  return data || []
}

// ============================================
// Audit Logging
// ============================================

/**
 * Create an audit log entry for a schema change
 */
export async function createAuditLog(
  supabase: SupabaseClient,
  entry: AuditLogEntry
): Promise<{ success: boolean; auditId?: string; error?: string }> {
  const { data, error } = await supabase
    .from('schema_audit_log')
    .insert({
      operation: entry.operation,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      field_changes: entry.field_changes,
      full_snapshot: entry.full_snapshot,
      batch_id: entry.batch_id,
      changed_by: entry.changed_by,
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, auditId: data.id }
}

/**
 * Get audit history for an entity
 */
export async function getAuditHistory(
  supabase: SupabaseClient,
  entityType: EntityType,
  entityId: string
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('schema_audit_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('is_rolled_back', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to get audit history:', error)
    return []
  }

  return data || []
}

/**
 * Rollback an entity to a previous state
 */
export async function rollbackEntity(
  supabase: SupabaseClient,
  auditLogId: string
): Promise<{ success: boolean; snapshot?: Record<string, unknown>; error?: string }> {
  // Get the audit log entry
  const { data: auditEntry, error: fetchError } = await supabase
    .from('schema_audit_log')
    .select('*')
    .eq('id', auditLogId)
    .single()

  if (fetchError || !auditEntry) {
    return { success: false, error: fetchError?.message || 'Audit log entry not found' }
  }

  // Mark as rolled back
  const { error: updateError } = await supabase
    .from('schema_audit_log')
    .update({ is_rolled_back: true })
    .eq('id', auditLogId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true, snapshot: auditEntry.full_snapshot }
}

// ============================================
// Batch Operations
// ============================================

/**
 * Generate a unique batch ID for grouping related changes
 */
export function generateBatchId(): string {
  return crypto.randomUUID()
}

/**
 * Create provenance records from extracted fields
 */
export function createProvenanceFromFields(
  entityType: EntityType,
  entityId: string,
  fields: ExtractedField[],
  sourceType: ProvenanceRecord['source_type'],
  aiModel?: string
): ProvenanceRecord[] {
  return fields.map(field => ({
    entity_type: entityType,
    entity_id: entityId,
    field_name: field.name,
    source_type: sourceType,
    ai_model: aiModel,
    ai_confidence: field.confidence,
  }))
}
