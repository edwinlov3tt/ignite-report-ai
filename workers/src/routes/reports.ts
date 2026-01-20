/**
 * Reports Route
 * Retrieve stored reports from R2
 */

import { Context } from 'hono'
import type { Env } from '../types/bindings'
import { getReport, getReportMetadata } from '../storage/r2'

/**
 * GET /reports/:id
 * Retrieve a stored report by ID
 */
export async function handleGetReport(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const reportId = c.req.param('id')

    if (!reportId) {
      return c.json({ success: false, error: 'Report ID is required' }, 400)
    }

    // Check for metadata-only request
    const metadataOnly = c.req.query('metadata') === 'true'

    if (metadataOnly) {
      const metadata = await getReportMetadata(c.env, reportId)

      if (!metadata) {
        return c.json({ success: false, error: 'Report not found' }, 404)
      }

      return c.json({
        success: true,
        metadata,
      })
    }

    // Fetch full report
    const report = await getReport(c.env, reportId)

    if (!report) {
      return c.json({ success: false, error: 'Report not found' }, 404)
    }

    return c.json({
      success: true,
      report,
    })

  } catch (error) {
    console.error('Get report error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
