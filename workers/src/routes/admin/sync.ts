/**
 * Admin Sync Route
 * Sync data between Supabase and fallback database
 */

import { Context } from 'hono'
import type { Env } from '../../types/bindings'
import { syncAllToFallback, syncTableToFallback } from '../../services/sync'

/**
 * POST /admin/sync
 * Sync data from Supabase to fallback database
 */
export async function handleSync(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<{ table?: string }>().catch(() => ({}))

    if (!c.env.FALLBACK_DB_URL) {
      return c.json({
        success: false,
        error: 'No fallback database configured',
      }, 400)
    }

    if (body.table) {
      // Sync specific table
      const result = await syncTableToFallback(c.env, body.table)
      return c.json({
        success: result.success,
        table: body.table,
        rowsSynced: result.rowsSynced,
        error: result.error,
      })
    } else {
      // Sync all tables
      const result = await syncAllToFallback(c.env)
      const totalRows = Object.values(result.tables).reduce(
        (sum, t) => sum + t.rowsSynced,
        0
      )

      return c.json({
        success: result.success,
        totalRowsSynced: totalRows,
        tables: result.tables,
      })
    }
  } catch (error) {
    console.error('Sync route error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /admin/sync/status
 * Check sync status between databases
 */
export async function handleSyncStatus(c: Context<{ Bindings: Env }>): Promise<Response> {
  return c.json({
    fallbackConfigured: !!c.env.FALLBACK_DB_URL,
    message: c.env.FALLBACK_DB_URL
      ? 'Fallback database is configured. POST to /admin/sync to synchronize.'
      : 'No fallback database configured. Set FALLBACK_DB_URL secret to enable.',
  })
}
