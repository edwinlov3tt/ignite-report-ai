/**
 * Feedback Route
 * Collect user feedback on generated reports
 */

import { Context } from 'hono'
import type { Env, FeedbackRequest } from '../types/bindings'
import { createSupabaseClient, saveFeedback } from '../services/supabase'
import { reportExists } from '../storage/r2'

/**
 * POST /feedback
 * Submit feedback for a report
 */
export async function handleFeedback(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<FeedbackRequest>()
    const { reportId, feedbackType, comment } = body

    // Validate required fields
    if (!reportId) {
      return c.json({ success: false, error: 'reportId is required' }, 400)
    }

    if (!feedbackType || !['thumbs_up', 'thumbs_down'].includes(feedbackType)) {
      return c.json({
        success: false,
        error: 'feedbackType must be "thumbs_up" or "thumbs_down"',
      }, 400)
    }

    // Verify report exists
    const exists = await reportExists(c.env, reportId)
    if (!exists) {
      return c.json({ success: false, error: 'Report not found' }, 404)
    }

    // Save feedback to Supabase
    const supabase = createSupabaseClient(c.env)
    await saveFeedback(supabase, {
      report_id: reportId,
      feedback_type: feedbackType,
      comment: comment || undefined,
    })

    console.log(`Feedback saved: ${feedbackType} for report ${reportId}`)

    return c.json({
      success: true,
      message: 'Feedback recorded',
    })

  } catch (error) {
    console.error('Feedback route error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
