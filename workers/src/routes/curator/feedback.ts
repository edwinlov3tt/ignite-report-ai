/**
 * Feedback Route for Schema Curator
 * Handles research feedback for continuous learning
 */

import { Hono } from 'hono'
import type { Env } from '../../types/bindings'
import { createClient } from '@supabase/supabase-js'
import type { FeedbackType } from '../../types/curator'

const app = new Hono<{ Bindings: Env }>()

// ============================================
// POST /curator/feedback - Submit feedback
// ============================================
app.post('/', async (c) => {
  const env = c.env

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  let body: {
    research_session_id: string
    feedback_type: FeedbackType
    field_name?: string
    notes?: string
  }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  // Validate required fields
  if (!body.research_session_id) {
    return c.json({ success: false, error: 'research_session_id is required' }, 400)
  }

  if (!body.feedback_type || !['good', 'bad', 'partial'].includes(body.feedback_type)) {
    return c.json({ success: false, error: 'feedback_type must be good, bad, or partial' }, 400)
  }

  try {
    // Verify research session exists
    const { data: session, error: sessionError } = await supabase
      .from('research_sessions')
      .select('id')
      .eq('id', body.research_session_id)
      .single()

    if (sessionError || !session) {
      return c.json({ success: false, error: 'Research session not found' }, 404)
    }

    // Insert feedback
    const { data, error } = await supabase
      .from('research_feedback')
      .insert({
        research_session_id: body.research_session_id,
        feedback_type: body.feedback_type,
        field_name: body.field_name,
        feedback_notes: body.notes,
        marked_by: 'admin', // TODO: Use actual user when auth is added
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    return c.json({
      success: true,
      feedback_id: data.id,
    })
  } catch (error) {
    console.error('Feedback submit error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit feedback',
    }, 500)
  }
})

// ============================================
// GET /curator/feedback - List feedback
// ============================================
app.get('/', async (c) => {
  const env = c.env

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  const session_id = c.req.query('session_id')
  const feedback_type = c.req.query('type') as FeedbackType | undefined
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')

  try {
    let query = supabase
      .from('research_feedback')
      .select('*, research_sessions(id, target_product_id, target_subproduct_id, research_type)', { count: 'exact' })

    if (session_id) {
      query = query.eq('research_session_id', session_id)
    }

    if (feedback_type) {
      query = query.eq('feedback_type', feedback_type)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return c.json({
      success: true,
      feedback: data || [],
      total_count: count || 0,
    })
  } catch (error) {
    console.error('Feedback list error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feedback',
    }, 500)
  }
})

// ============================================
// GET /curator/feedback/patterns - Get feedback patterns for prompt improvement
// ============================================
app.get('/patterns', async (c) => {
  const env = c.env

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
  const limit = parseInt(c.req.query('limit') || '100')

  try {
    // Use the database function we created
    const { data, error } = await supabase.rpc('get_feedback_patterns', { p_limit: limit })

    if (error) {
      throw error
    }

    return c.json({
      success: true,
      patterns: data || [],
    })
  } catch (error) {
    console.error('Feedback patterns error:', error)

    // Fallback to manual aggregation if RPC doesn't exist
    try {
      const { data: feedback } = await supabase
        .from('research_feedback')
        .select('field_name, feedback_type')
        .not('field_name', 'is', null)

      if (!feedback || feedback.length === 0) {
        return c.json({ success: true, patterns: [] })
      }

      // Manual aggregation
      const patterns: Record<string, { good: number; bad: number; partial: number }> = {}

      for (const fb of feedback) {
        if (!fb.field_name) continue
        if (!patterns[fb.field_name]) {
          patterns[fb.field_name] = { good: 0, bad: 0, partial: 0 }
        }
        patterns[fb.field_name][fb.feedback_type as FeedbackType]++
      }

      const result = Object.entries(patterns).map(([field_name, counts]) => ({
        field_name,
        good_count: counts.good,
        bad_count: counts.bad,
        total_count: counts.good + counts.bad + counts.partial,
        success_rate: Math.round((counts.good / (counts.good + counts.bad + counts.partial)) * 100),
      })).sort((a, b) => b.total_count - a.total_count)

      return c.json({
        success: true,
        patterns: result,
      })
    } catch {
      return c.json({
        success: false,
        error: 'Failed to calculate feedback patterns',
      }, 500)
    }
  }
})

// ============================================
// DELETE /curator/feedback/:id - Delete feedback
// ============================================
app.delete('/:id', async (c) => {
  const env = c.env
  const feedbackId = c.req.param('id')

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  try {
    const { error } = await supabase
      .from('research_feedback')
      .delete()
      .eq('id', feedbackId)

    if (error) {
      throw error
    }

    return c.json({
      success: true,
      deleted: true,
    })
  } catch (error) {
    console.error('Feedback delete error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete feedback',
    }, 500)
  }
})

// ============================================
// GET /curator/feedback/sessions/:session_id - Get feedback for a session
// ============================================
app.get('/sessions/:session_id', async (c) => {
  const env = c.env
  const sessionId = c.req.param('session_id')

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  try {
    const { data, error } = await supabase
      .from('research_feedback')
      .select('*')
      .eq('research_session_id', sessionId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Calculate summary
    const summary = {
      total: data?.length || 0,
      good: data?.filter(f => f.feedback_type === 'good').length || 0,
      bad: data?.filter(f => f.feedback_type === 'bad').length || 0,
      partial: data?.filter(f => f.feedback_type === 'partial').length || 0,
    }

    return c.json({
      success: true,
      feedback: data || [],
      summary,
    })
  } catch (error) {
    console.error('Session feedback error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch session feedback',
    }, 500)
  }
})

export default app
