/**
 * Extractor Suggestions API Client
 * Communicates with the workers API for AI-powered extractor suggestions
 */

import { API_CONFIG } from '@/config/api'

const API_BASE = API_CONFIG.worker.base

export interface ExtractorSuggestion {
  id: string
  field_path: string
  suggested_name: string
  aggregation_type: 'sum' | 'avg' | 'first' | 'last' | 'concat' | 'unique' | 'count'
  when_conditions: Record<string, string | string[]> | null
  description: string
  confidence: number
  status: 'pending' | 'approved' | 'rejected' | 'modified'
  is_new: boolean
  source_order_id: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface SuggestionStats {
  total: number
  pending: number
  approved: number
  rejected: number
  modified: number
  avgConfidence: number
}

export interface GenerateResult {
  success: boolean
  fieldsAnalyzed: number
  suggestionsGenerated: number
  highRelevance: number
  mediumRelevance: number
  lowRelevance: number
  tokensUsed: { input: number; output: number }
  durationMs: number
}

/**
 * Get suggestions with optional filtering
 */
export async function getSuggestions(options?: {
  status?: 'pending' | 'approved' | 'rejected' | 'modified' | 'all'
  minConfidence?: number
  limit?: number
}): Promise<ExtractorSuggestion[]> {
  const params = new URLSearchParams()
  if (options?.status) params.set('status', options.status)
  if (options?.minConfidence) params.set('minConfidence', String(options.minConfidence))
  if (options?.limit) params.set('limit', String(options.limit))

  const response = await fetch(`${API_BASE}/extractor-suggestions?${params}`)
  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch suggestions')
  }

  return data.suggestions
}

/**
 * Get suggestion statistics
 */
export async function getSuggestionStats(): Promise<SuggestionStats> {
  const response = await fetch(`${API_BASE}/extractor-suggestions/stats`)
  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch stats')
  }

  return data.stats
}

/**
 * Approve a suggestion
 */
export async function approveSuggestion(
  id: string,
  modifications?: {
    extractorName?: string
    aggregationType?: string
    description?: string
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/extractor-suggestions/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modifications })
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to approve suggestion')
  }
}

/**
 * Reject a suggestion
 */
export async function rejectSuggestion(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/extractor-suggestions/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to reject suggestion')
  }
}

/**
 * Generate new suggestions by running AI scoring
 */
export async function generateSuggestions(options?: {
  minFrequency?: number
  onlyNew?: boolean
}): Promise<GenerateResult> {
  const response = await fetch(`${API_BASE}/extractor-suggestions/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      minFrequency: options?.minFrequency || 0.1,
      onlyNew: options?.onlyNew ?? true
    })
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to generate suggestions')
  }

  return data
}

/**
 * Bulk approve high-confidence suggestions
 */
export async function bulkApprove(minConfidence: number): Promise<{ approved: number; total: number }> {
  const response = await fetch(`${API_BASE}/extractor-suggestions/bulk-approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minConfidence })
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to bulk approve')
  }

  return { approved: data.approved, total: data.total }
}

/**
 * Export approved suggestions as extractor config
 */
export async function exportSuggestions(): Promise<{
  count: number
  extractors: Array<{
    name: string
    path: string
    aggregation: string
    conditions?: Record<string, string | string[]>
    description: string
    confidence: number
  }>
}> {
  const response = await fetch(`${API_BASE}/extractor-suggestions/export`)
  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to export suggestions')
  }

  return { count: data.count, extractors: data.extractors }
}
