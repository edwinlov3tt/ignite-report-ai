/**
 * Product Research Route
 * POST /curator/research/product - AI-powered product research with source tracking
 * GET /curator/research/product/sessions - List research sessions
 * GET /curator/research/product/sessions/:id - Get specific session
 */

import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import type { Env } from '../../types/bindings'
import { conductProductResearch } from '../../services/curator/productResearch'
import type { ProductResearchRequest } from '../../types/curator'

const app = new Hono<{ Bindings: Env }>()

// POST /curator/research/product
app.post('/', async (c) => {
  const env = c.env

  // Validate required API keys
  if (!env.TAVILY_API_KEY) {
    return c.json({ success: false, error: 'Tavily API key not configured' }, 500)
  }

  if (!env.OPENAI_API_KEY) {
    return c.json({ success: false, error: 'OpenAI API key not configured' }, 500)
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  // Parse request
  let body: ProductResearchRequest
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  // Validate required fields
  if (!body.product_id || body.product_id.trim().length === 0) {
    return c.json({ success: false, error: 'product_id is required' }, 400)
  }

  // Validate research_depth if provided
  if (body.research_depth && !['quick', 'standard', 'deep'].includes(body.research_depth)) {
    return c.json({ success: false, error: 'research_depth must be quick, standard, or deep' }, 400)
  }

  try {
    const result = await conductProductResearch(env, body)

    if (!result.success) {
      return c.json(result, 400)
    }

    return c.json(result)
  } catch (error) {
    console.error('Product research error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Research failed',
    }, 500)
  }
})

// GET /curator/research/product/sessions - List all research sessions
app.get('/sessions', async (c) => {
  const env = c.env

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  // Get query params for filtering
  const productId = c.req.query('product_id')
  const subproductId = c.req.query('subproduct_id')
  const limit = parseInt(c.req.query('limit') || '20')

  try {
    let query = supabase
      .from('research_sessions')
      .select(`
        id,
        target_product_id,
        target_subproduct_id,
        research_type,
        research_depth,
        status,
        tokens_used,
        duration_ms,
        created_at,
        completed_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (productId) {
      query = query.eq('target_product_id', productId)
    }
    if (subproductId) {
      query = query.eq('target_subproduct_id', subproductId)
    }

    const { data: sessions, error } = await query

    if (error) {
      return c.json({ success: false, error: error.message }, 500)
    }

    // Fetch product/subproduct names for display
    const productIds = [...new Set(sessions?.map(s => s.target_product_id).filter(Boolean))]
    const subproductIds = [...new Set(sessions?.map(s => s.target_subproduct_id).filter(Boolean))]

    const [productsResult, subproductsResult] = await Promise.all([
      productIds.length > 0
        ? supabase.from('products').select('id, name').in('id', productIds)
        : { data: [] },
      subproductIds.length > 0
        ? supabase.from('subproducts').select('id, name').in('id', subproductIds as string[])
        : { data: [] },
    ])

    const productMap = new Map((productsResult.data || []).map(p => [p.id, p.name]))
    const subproductMap = new Map((subproductsResult.data || []).map(s => [s.id, s.name]))

    // Enrich sessions with names
    const enrichedSessions = (sessions || []).map(s => ({
      ...s,
      product_name: productMap.get(s.target_product_id) || null,
      subproduct_name: s.target_subproduct_id ? subproductMap.get(s.target_subproduct_id) : null,
    }))

    return c.json({
      success: true,
      count: enrichedSessions.length,
      sessions: enrichedSessions,
    })
  } catch (error) {
    console.error('List sessions error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list sessions',
    }, 500)
  }
})

// GET /curator/research/product/sessions/:id - Get specific session with full data
app.get('/sessions/:id', async (c) => {
  const env = c.env
  const sessionId = c.req.param('id')

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  try {
    const { data: session, error } = await supabase
      .from('research_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      return c.json({ success: false, error: error.message }, 404)
    }

    // Fetch product/subproduct names
    const [productResult, subproductResult] = await Promise.all([
      session.target_product_id
        ? supabase.from('products').select('id, name').eq('id', session.target_product_id).single()
        : { data: null },
      session.target_subproduct_id
        ? supabase.from('subproducts').select('id, name').eq('id', session.target_subproduct_id).single()
        : { data: null },
    ])

    return c.json({
      success: true,
      session: {
        ...session,
        product_name: productResult.data?.name || null,
        subproduct_name: subproductResult.data?.name || null,
      },
    })
  } catch (error) {
    console.error('Get session error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get session',
    }, 500)
  }
})

export default app
