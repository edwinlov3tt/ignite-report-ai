/**
 * Embedding Routes
 * API endpoints for managing vector embeddings
 * Part of the RAG-enhanced knowledge system
 */

import { Context } from 'hono'
import type { Env } from '../types/bindings'
import { createSupabaseClient } from '../services/supabase'
import {
  embedTableRecords,
  embedAllTables,
  embedSoulDocumentChunks,
  getEmbeddingStats,
  generateEmbedding,
} from '../services/embeddings'

/**
 * POST /embeddings/generate
 * Generate embeddings for a specific table
 */
export async function handleGenerateEmbeddings(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<{
      table: string
      batchSize?: number
    }>()

    if (!body.table) {
      return c.json({ success: false, error: 'Table name is required' }, 400)
    }

    const validTables = [
      'platforms',
      'platform_quirks',
      'industries',
      'industry_insights',
      'products',
      'tactic_types',
      'lumina_discovered_fields',
    ]

    if (!validTables.includes(body.table)) {
      return c.json({
        success: false,
        error: `Invalid table. Valid options: ${validTables.join(', ')}`,
      }, 400)
    }

    const supabase = createSupabaseClient(c.env)
    const result = await embedTableRecords(
      supabase,
      c.env,
      body.table,
      body.batchSize || 20
    )

    return c.json({
      ...result,
      table: body.table,
    })
  } catch (error) {
    console.error('Generate embeddings error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * POST /embeddings/generate-all
 * Generate embeddings for all tables
 */
export async function handleGenerateAllEmbeddings(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const supabase = createSupabaseClient(c.env)
    const results = await embedAllTables(supabase, c.env)

    const summary = {
      totalProcessed: 0,
      totalFailed: 0,
      totalTokens: 0,
    }

    for (const result of Object.values(results)) {
      summary.totalProcessed += result.processed
      summary.totalFailed += result.failed
      summary.totalTokens += result.tokensUsed
    }

    return c.json({
      success: summary.totalFailed === 0,
      summary,
      tables: results,
    })
  } catch (error) {
    console.error('Generate all embeddings error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * POST /embeddings/soul-document/:versionId
 * Generate chunked embeddings for a soul document version
 */
export async function handleEmbedSoulDocument(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const versionId = c.req.param('versionId')
    if (!versionId) {
      return c.json({ success: false, error: 'Version ID is required' }, 400)
    }

    const supabase = createSupabaseClient(c.env)
    const result = await embedSoulDocumentChunks(supabase, c.env, versionId)

    return c.json({
      success: result.success,
      versionId,
      chunksProcessed: result.processed,
      tokensUsed: result.tokensUsed,
      errors: result.errors,
    })
  } catch (error) {
    console.error('Embed soul document error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /embeddings/stats
 * Get embedding statistics across all tables
 */
export async function handleGetEmbeddingStats(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const supabase = createSupabaseClient(c.env)
    const stats = await getEmbeddingStats(supabase)

    return c.json({
      success: true,
      ...stats,
    })
  } catch (error) {
    console.error('Get embedding stats error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * POST /embeddings/search
 * Perform semantic search across a table
 */
export async function handleSemanticSearch(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<{
      query: string
      table: 'quirks' | 'industries' | 'tactics' | 'insights' | 'soul_chunks'
      limit?: number
      filters?: Record<string, string>
    }>()

    if (!body.query || !body.table) {
      return c.json({
        success: false,
        error: 'Query and table are required',
      }, 400)
    }

    const supabase = createSupabaseClient(c.env)

    // Generate embedding for the query
    const { embedding } = await generateEmbedding(body.query, c.env)

    // Call the appropriate search function
    let results: unknown[] = []

    switch (body.table) {
      case 'quirks':
        const { data: quirks } = await supabase.rpc('match_platform_quirks', {
          query_embedding: embedding,
          match_count: body.limit || 5,
          platform_filter: body.filters?.platform_id || null,
        })
        results = quirks || []
        break

      case 'industries':
        const { data: industries } = await supabase.rpc('match_similar_industries', {
          query_embedding: embedding,
          match_count: body.limit || 3,
        })
        results = industries || []
        break

      case 'tactics':
        const { data: tactics } = await supabase.rpc('match_tactics', {
          query_embedding: embedding,
          match_count: body.limit || 5,
        })
        results = tactics || []
        break

      case 'insights':
        const { data: insights } = await supabase.rpc('match_industry_insights', {
          query_embedding: embedding,
          match_count: body.limit || 5,
          industry_filter: body.filters?.industry_id || null,
        })
        results = insights || []
        break

      case 'soul_chunks':
        const { data: chunks } = await supabase.rpc('match_soul_chunks', {
          query_embedding: embedding,
          match_count: body.limit || 5,
          doc_type_filter: body.filters?.doc_type || null,
        })
        results = chunks || []
        break
    }

    return c.json({
      success: true,
      query: body.query,
      table: body.table,
      count: results.length,
      results,
    })
  } catch (error) {
    console.error('Semantic search error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * POST /embeddings/match-tactic
 * Match a Lumina tactic name to the schema using semantic search
 */
export async function handleMatchTactic(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<{
      tacticName: string
      limit?: number
    }>()

    if (!body.tacticName) {
      return c.json({ success: false, error: 'Tactic name is required' }, 400)
    }

    const supabase = createSupabaseClient(c.env)

    // Generate embedding for the tactic name
    const { embedding } = await generateEmbedding(body.tacticName, c.env)

    // Search for matching tactics
    const { data: matches, error } = await supabase.rpc('match_tactics', {
      query_embedding: embedding,
      match_count: body.limit || 3,
      min_similarity: 0.5,
    })

    if (error) {
      throw new Error(`Search failed: ${error.message}`)
    }

    return c.json({
      success: true,
      query: body.tacticName,
      matches: matches || [],
      bestMatch: matches && matches.length > 0 ? matches[0] : null,
    })
  } catch (error) {
    console.error('Match tactic error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
