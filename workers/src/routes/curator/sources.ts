/**
 * Sources Route for Schema Curator
 * CRUD operations for curator sources repository
 */

import { Hono } from 'hono'
import type { Env } from '../../types/bindings'
import { createClient } from '@supabase/supabase-js'
import type { CuratorSource, AuthorityTier } from '../../types/curator'

const app = new Hono<{ Bindings: Env }>()

// ============================================
// GET /curator/sources - List sources
// ============================================
app.get('/', async (c) => {
  const env = c.env

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  // Parse query parameters
  const authority_tier = c.req.query('authority') as AuthorityTier | undefined
  const domain = c.req.query('domain')
  const entity_type = c.req.query('entity_type')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')

  try {
    // Build query
    let query = supabase
      .from('curator_sources')
      .select('*', { count: 'exact' })

    if (authority_tier) {
      query = query.eq('authority_tier', authority_tier)
    }

    if (domain) {
      query = query.ilike('domain', `%${domain}%`)
    }

    // Order by authority score descending, then by fetch count
    query = query
      .order('authority_score', { ascending: false })
      .order('fetch_count', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      throw error
    }

    // If entity_type filter provided, also get linked entity counts
    if (entity_type && data) {
      const sourceIds = data.map(s => s.id)
      const { data: entityLinks } = await supabase
        .from('entity_sources')
        .select('source_id')
        .eq('entity_type', entity_type)
        .in('source_id', sourceIds)

      // Filter to only sources that have links to this entity type
      const linkedSourceIds = new Set(entityLinks?.map(e => e.source_id) || [])
      const filteredData = data.filter(s => linkedSourceIds.has(s.id))

      return c.json({
        success: true,
        sources: filteredData,
        total_count: filteredData.length,
      })
    }

    return c.json({
      success: true,
      sources: data || [],
      total_count: count || 0,
    })
  } catch (error) {
    console.error('Sources list error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sources',
    }, 500)
  }
})

// ============================================
// GET /curator/sources/:id - Get single source
// ============================================
app.get('/:id', async (c) => {
  const env = c.env
  const sourceId = c.req.param('id')

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  try {
    const { data, error } = await supabase
      .from('curator_sources')
      .select('*')
      .eq('id', sourceId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ success: false, error: 'Source not found' }, 404)
      }
      throw error
    }

    return c.json({
      success: true,
      source: data,
    })
  } catch (error) {
    console.error('Source fetch error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch source',
    }, 500)
  }
})

// ============================================
// GET /curator/sources/:id/entities - Get entities using this source
// ============================================
app.get('/:id/entities', async (c) => {
  const env = c.env
  const sourceId = c.req.param('id')

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  try {
    const { data, error } = await supabase
      .from('entity_sources')
      .select('*')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return c.json({
      success: true,
      entity_links: data || [],
    })
  } catch (error) {
    console.error('Entity links fetch error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch entity links',
    }, 500)
  }
})

// ============================================
// POST /curator/sources - Add user-provided source
// ============================================
app.post('/', async (c) => {
  const env = c.env

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  let body: {
    url: string
    title?: string
    snippet?: string
    categories?: string[]
  }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  // Validate URL
  if (!body.url || body.url.trim().length === 0) {
    return c.json({ success: false, error: 'url is required' }, 400)
  }

  let domain: string
  try {
    const urlObj = new URL(body.url)
    domain = urlObj.hostname.replace('www.', '')
  } catch {
    return c.json({ success: false, error: 'Invalid URL format' }, 400)
  }

  try {
    // Check if domain is in whitelist for authority
    const { data: whitelistEntry } = await supabase
      .from('curator_domain_whitelist')
      .select('trust_level, authority_score')
      .eq('domain', domain)
      .eq('is_active', true)
      .single()

    const authorityTier: AuthorityTier = whitelistEntry?.trust_level || 'user_provided'
    const authorityScore = whitelistEntry?.authority_score || 0.5

    // Upsert the source
    const { data, error } = await supabase
      .from('curator_sources')
      .upsert({
        url: body.url,
        domain,
        title: body.title,
        snippet: body.snippet,
        authority_tier: authorityTier,
        authority_score: authorityScore,
        categories: body.categories,
        is_user_provided: true,
        fetch_count: 0,
      }, {
        onConflict: 'url',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return c.json({
      success: true,
      source: data,
    })
  } catch (error) {
    console.error('Source create error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create source',
    }, 500)
  }
})

// ============================================
// PUT /curator/sources/:id - Update source
// ============================================
app.put('/:id', async (c) => {
  const env = c.env
  const sourceId = c.req.param('id')

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  let body: {
    title?: string
    snippet?: string
    categories?: string[]
  }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  try {
    const { data, error } = await supabase
      .from('curator_sources')
      .update({
        title: body.title,
        snippet: body.snippet,
        categories: body.categories,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ success: false, error: 'Source not found' }, 404)
      }
      throw error
    }

    return c.json({
      success: true,
      source: data,
    })
  } catch (error) {
    console.error('Source update error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update source',
    }, 500)
  }
})

// ============================================
// DELETE /curator/sources/:id - Delete source
// ============================================
app.delete('/:id', async (c) => {
  const env = c.env
  const sourceId = c.req.param('id')

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  try {
    const { error } = await supabase
      .from('curator_sources')
      .delete()
      .eq('id', sourceId)

    if (error) {
      throw error
    }

    return c.json({
      success: true,
      deleted: true,
    })
  } catch (error) {
    console.error('Source delete error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete source',
    }, 500)
  }
})

// ============================================
// POST /curator/sources/:id/link - Link source to entity
// ============================================
app.post('/:id/link', async (c) => {
  const env = c.env
  const sourceId = c.req.param('id')

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ success: false, error: 'Supabase not configured' }, 500)
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  let body: {
    entity_type: string
    entity_id: string
    field_name?: string
    citation_text?: string
    relevance_score?: number
  }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  if (!body.entity_type || !body.entity_id) {
    return c.json({ success: false, error: 'entity_type and entity_id are required' }, 400)
  }

  try {
    const { data, error } = await supabase
      .from('entity_sources')
      .insert({
        source_id: sourceId,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        field_name: body.field_name,
        citation_text: body.citation_text,
        relevance_score: body.relevance_score || 0.8,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return c.json({
      success: true,
      link: data,
    })
  } catch (error) {
    console.error('Source link error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link source',
    }, 500)
  }
})

export default app
