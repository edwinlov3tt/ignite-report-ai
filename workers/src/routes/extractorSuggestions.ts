/**
 * Extractor Suggestions Routes
 * API endpoints for AI-powered extractor suggestion management
 * Part of the Schema Intelligence system
 */

import { Context } from 'hono'
import type { Env } from '../types/bindings'
import { createSupabaseClient } from '../services/supabase'
import {
  runScoringPipeline,
  getPendingSuggestions,
  approveSuggestion,
  rejectSuggestion,
  getSuggestionStats,
} from '../services/extractorSuggestions'

/**
 * POST /extractor-suggestions/generate
 * Run AI scoring on discovered fields and generate suggestions
 */
export async function handleGenerateSuggestions(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<{
      minFrequency?: number
      onlyNew?: boolean
      sourceOrderId?: string
    }>().catch(() => ({}))

    const supabase = createSupabaseClient(c.env)

    const result = await runScoringPipeline(c.env, supabase, {
      minFrequency: body.minFrequency || 0.1,
      onlyNew: body.onlyNew ?? true,
      sourceOrderId: body.sourceOrderId,
    })

    return c.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Generate suggestions error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /extractor-suggestions
 * Get pending suggestions for review
 */
export async function handleGetSuggestions(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const status = c.req.query('status') || 'pending'
    const minConfidence = c.req.query('minConfidence')
    const limit = c.req.query('limit')

    const supabase = createSupabaseClient(c.env)

    // Build query based on status
    let query = supabase
      .from('lumina_extractor_suggestions')
      .select('*')
      .order('confidence', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (minConfidence) {
      query = query.gte('confidence', parseFloat(minConfidence))
    }

    if (limit) {
      query = query.limit(parseInt(limit, 10))
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch suggestions: ${error.message}`)
    }

    return c.json({
      success: true,
      count: data?.length || 0,
      suggestions: data || [],
    })
  } catch (error) {
    console.error('Get suggestions error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /extractor-suggestions/stats
 * Get suggestion statistics
 */
export async function handleGetSuggestionStats(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const supabase = createSupabaseClient(c.env)
    const stats = await getSuggestionStats(supabase)

    return c.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Get suggestion stats error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * POST /extractor-suggestions/:id/approve
 * Approve a suggestion (optionally with modifications)
 */
export async function handleApproveSuggestion(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const suggestionId = c.req.param('id')
    if (!suggestionId) {
      return c.json({ success: false, error: 'Suggestion ID is required' }, 400)
    }

    const body = await c.req.json<{
      reviewedBy?: string
      modifications?: {
        extractorName?: string
        aggregationType?: string
        description?: string
      }
    }>().catch(() => ({}))

    const supabase = createSupabaseClient(c.env)

    await approveSuggestion(
      supabase,
      suggestionId,
      body.reviewedBy,
      body.modifications
    )

    return c.json({
      success: true,
      suggestionId,
      status: body.modifications ? 'modified' : 'approved',
    })
  } catch (error) {
    console.error('Approve suggestion error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * POST /extractor-suggestions/:id/reject
 * Reject a suggestion
 */
export async function handleRejectSuggestion(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const suggestionId = c.req.param('id')
    if (!suggestionId) {
      return c.json({ success: false, error: 'Suggestion ID is required' }, 400)
    }

    const body = await c.req.json<{ reviewedBy?: string }>().catch(() => ({}))

    const supabase = createSupabaseClient(c.env)

    await rejectSuggestion(supabase, suggestionId, body.reviewedBy)

    return c.json({
      success: true,
      suggestionId,
      status: 'rejected',
    })
  } catch (error) {
    console.error('Reject suggestion error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * POST /extractor-suggestions/bulk-approve
 * Approve multiple suggestions at once (for high-confidence auto-approval)
 */
export async function handleBulkApprove(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<{
      minConfidence: number
      reviewedBy?: string
    }>()

    if (!body.minConfidence || body.minConfidence < 0.7) {
      return c.json({
        success: false,
        error: 'minConfidence must be at least 0.7 for bulk approval',
      }, 400)
    }

    const supabase = createSupabaseClient(c.env)

    // Get high-confidence pending suggestions
    const { data: suggestions, error: fetchError } = await supabase
      .from('lumina_extractor_suggestions')
      .select('id')
      .eq('status', 'pending')
      .gte('confidence', body.minConfidence)

    if (fetchError) {
      throw new Error(`Failed to fetch suggestions: ${fetchError.message}`)
    }

    // Approve each one
    let approved = 0
    for (const suggestion of suggestions || []) {
      const record = suggestion as { id: string }
      try {
        await approveSuggestion(supabase, record.id, body.reviewedBy)
        approved++
      } catch (e) {
        console.error(`Failed to approve ${record.id}:`, e)
      }
    }

    return c.json({
      success: true,
      approved,
      total: suggestions?.length || 0,
    })
  } catch (error) {
    console.error('Bulk approve error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /extractor-suggestions/:id/preview
 * Preview what data would be extracted using a suggestion
 */
export async function handlePreviewSuggestion(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const suggestionId = c.req.param('id')
    const orderId = c.req.query('orderId')

    if (!suggestionId) {
      return c.json({ success: false, error: 'Suggestion ID is required' }, 400)
    }

    const supabase = createSupabaseClient(c.env)

    // Get the suggestion
    const { data: suggestion, error: suggestionError } = await supabase
      .from('lumina_extractor_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single()

    if (suggestionError || !suggestion) {
      return c.json({ success: false, error: 'Suggestion not found' }, 404)
    }

    // Get sample values from the discovered field
    const { data: field } = await supabase
      .from('lumina_discovered_fields')
      .select('sample_values, frequency, occurrence_count')
      .eq('field_path', (suggestion as { field_path: string }).field_path)
      .single()

    const fieldRecord = field as { sample_values: unknown[]; frequency: number; occurrence_count: number } | null

    return c.json({
      success: true,
      suggestion,
      fieldData: fieldRecord ? {
        samples: fieldRecord.sample_values || [],
        frequency: fieldRecord.frequency,
        occurrenceCount: fieldRecord.occurrence_count,
      } : null,
    })
  } catch (error) {
    console.error('Preview suggestion error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /extractor-suggestions/export
 * Export approved suggestions as extractor config JSON
 */
export async function handleExportSuggestions(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const supabase = createSupabaseClient(c.env)

    // Get all approved/modified suggestions
    const { data: suggestions, error } = await supabase
      .from('lumina_extractor_suggestions')
      .select('*')
      .in('status', ['approved', 'modified'])
      .order('confidence', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch suggestions: ${error.message}`)
    }

    // Transform to extractor config format
    const extractors = (suggestions || []).map((s: Record<string, unknown>) => ({
      name: s.suggested_name,
      path: s.field_path,
      aggregation: s.aggregation_type,
      conditions: s.when_conditions || undefined,
      description: s.description,
      confidence: s.confidence,
      approvedAt: s.reviewed_at,
    }))

    return c.json({
      success: true,
      count: extractors.length,
      extractors,
      exportedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Export suggestions error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
