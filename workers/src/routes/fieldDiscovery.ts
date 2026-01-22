/**
 * Field Discovery Routes
 * API endpoints for the Schema Intelligence field discovery system
 */

import { Context } from 'hono'
import type { Env } from '../types/bindings'
import { createSupabaseClient } from '../services/supabase'
import {
  discoverFields,
  discoverOrderFields,
  saveDiscoveredFields,
  getDiscoveredFields,
  getDiscoveryLogs,
  getNewFieldsSince,
  updateFieldStatus,
} from '../services/fieldDiscovery'
import { getLuminaCache } from '../storage/kv'

/**
 * POST /field-discovery/discover
 * Discover fields from a Lumina order (uses cached data or fetches fresh)
 */
export async function handleDiscover(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<{ orderId: string; forceRefresh?: boolean }>()
    const { orderId, forceRefresh = false } = body

    if (!orderId) {
      return c.json({ success: false, error: 'orderId is required' }, 400)
    }

    const startTime = Date.now()

    // Get Lumina data (from cache or fresh fetch)
    let luminaData: Record<string, unknown> | null = null

    if (!forceRefresh) {
      const cached = await getLuminaCache(c.env, orderId)
      if (cached) {
        luminaData = cached as Record<string, unknown>
      }
    }

    if (!luminaData) {
      // Fetch fresh from Lumina API
      const response = await fetch(`${c.env.LUMINA_API_URL}?query=${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Report.AI-FieldDiscovery/1.0',
        },
      })

      if (!response.ok) {
        return c.json({
          success: false,
          error: `Failed to fetch Lumina data: ${response.status}`,
        }, response.status as 400 | 500)
      }

      luminaData = (await response.json()) as Record<string, unknown>
    }

    // Extract line items and order data
    const lineItems = (luminaData.lineItems || luminaData.items || []) as unknown[]
    const orderData = luminaData.order || luminaData

    // Discover fields from line items
    const lineItemFields = discoverFields(lineItems)

    // Discover fields from order-level data
    const orderFields = discoverOrderFields(orderData)

    // Combine all fields
    const allFields = [...lineItemFields, ...orderFields]

    // Save to database
    const supabase = createSupabaseClient(c.env)
    const companyName = (orderData as Record<string, unknown>).companyName as string | undefined
    const result = await saveDiscoveredFields(
      supabase,
      allFields,
      orderId,
      companyName,
      lineItems.length
    )

    const durationMs = Date.now() - startTime

    return c.json({
      success: true,
      orderId,
      companyName,
      lineItemCount: lineItems.length,
      fieldsDiscovered: allFields.length,
      newFields: result.newFields,
      updatedFields: result.updatedFields,
      durationMs,
      summary: {
        highFrequencyFields: allFields.filter(f => f.frequency > 0.8).length,
        mediumFrequencyFields: allFields.filter(f => f.frequency > 0.3 && f.frequency <= 0.8).length,
        lowFrequencyFields: allFields.filter(f => f.frequency <= 0.3).length,
        nestedFields: allFields.filter(f => f.isNested).length,
      },
    })
  } catch (error) {
    console.error('Field discovery error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /field-discovery/fields
 * Get all discovered fields with optional filtering
 */
export async function handleGetFields(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const status = c.req.query('status')
    const minFrequency = c.req.query('minFrequency')
    const limit = c.req.query('limit')

    const supabase = createSupabaseClient(c.env)
    const fields = await getDiscoveredFields(supabase, {
      status: status || undefined,
      minFrequency: minFrequency ? parseFloat(minFrequency) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
    })

    return c.json({
      success: true,
      count: fields.length,
      fields,
    })
  } catch (error) {
    console.error('Get fields error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /field-discovery/logs
 * Get discovery run logs
 */
export async function handleGetLogs(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const limit = c.req.query('limit')

    const supabase = createSupabaseClient(c.env)
    const logs = await getDiscoveryLogs(supabase, limit ? parseInt(limit, 10) : 50)

    return c.json({
      success: true,
      count: logs.length,
      logs,
    })
  } catch (error) {
    console.error('Get logs error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /field-discovery/new
 * Get fields discovered since a given date (default: last 7 days)
 */
export async function handleGetNewFields(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const sinceParam = c.req.query('since')
    const since = sinceParam
      ? new Date(sinceParam)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Default: 7 days ago

    const supabase = createSupabaseClient(c.env)
    const fields = await getNewFieldsSince(supabase, since)

    return c.json({
      success: true,
      since: since.toISOString(),
      count: fields.length,
      fields,
    })
  } catch (error) {
    console.error('Get new fields error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * PUT /field-discovery/fields/:path/status
 * Update the status of a discovered field (for admin review)
 */
export async function handleUpdateFieldStatus(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const fieldPath = c.req.param('path')
    if (!fieldPath) {
      return c.json({ success: false, error: 'Field path is required' }, 400)
    }

    const body = await c.req.json<{ status: string; notes?: string }>()
    const { status, notes } = body

    if (!['discovered', 'reviewed', 'approved', 'ignored'].includes(status)) {
      return c.json({
        success: false,
        error: 'Invalid status. Must be: discovered, reviewed, approved, or ignored',
      }, 400)
    }

    const supabase = createSupabaseClient(c.env)
    await updateFieldStatus(
      supabase,
      decodeURIComponent(fieldPath),
      status as 'discovered' | 'reviewed' | 'approved' | 'ignored',
      notes
    )

    return c.json({
      success: true,
      fieldPath: decodeURIComponent(fieldPath),
      status,
    })
  } catch (error) {
    console.error('Update field status error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /field-discovery/stats
 * Get summary statistics about discovered fields
 */
export async function handleGetStats(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const supabase = createSupabaseClient(c.env)

    // Get field counts by status
    const { data: statusCounts } = await supabase
      .from('lumina_discovered_fields')
      .select('status')

    // Get total discovery runs
    const { count: totalRuns } = await supabase
      .from('lumina_field_discovery_log')
      .select('*', { count: 'exact', head: true })

    // Get recent runs (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: recentRuns } = await supabase
      .from('lumina_field_discovery_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo)

    // Count fields by status
    const statusSummary: Record<string, number> = {
      discovered: 0,
      reviewed: 0,
      approved: 0,
      ignored: 0,
    }

    for (const row of statusCounts || []) {
      const status = (row as { status: string }).status || 'discovered'
      statusSummary[status] = (statusSummary[status] || 0) + 1
    }

    const totalFields = Object.values(statusSummary).reduce((a, b) => a + b, 0)

    return c.json({
      success: true,
      stats: {
        totalFields,
        byStatus: statusSummary,
        totalDiscoveryRuns: totalRuns || 0,
        recentRuns: recentRuns || 0,
        lastUpdated: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
