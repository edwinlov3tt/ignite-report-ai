/**
 * Admin Publish Route
 * Syncs data from Supabase to KV for edge-fast access
 */

import { Context } from 'hono'
import type { Env, PublishRequest, PublishResponse } from '../../types/bindings'
import { createSupabaseClient, fetchAllPlatforms, fetchAllIndustries, fetchPublishedSoulDocs, fetchFullSchema, logKvSync } from '../../services/supabase'
import { setPlatformContext, setPlatformsList, setIndustryContext, setIndustriesList, setSoulDoc, setSoulDocsList, setFullSchema, setTacticLookup } from '../../storage/kv'

/**
 * POST /admin/publish
 * Sync specified namespace from Supabase to KV
 */
export async function handlePublish(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<PublishRequest>()
    const { namespace } = body

    if (!namespace || !['platforms', 'industries', 'soul_docs', 'schema', 'all'].includes(namespace)) {
      return c.json({
        success: false,
        error: 'namespace must be one of: platforms, industries, soul_docs, schema, all',
      }, 400)
    }

    const supabase = createSupabaseClient(c.env)
    const results: Record<string, number> = {}

    // Publish platforms
    if (namespace === 'platforms' || namespace === 'all') {
      const count = await publishPlatforms(c.env, supabase)
      results.platforms = count
      await logKvSync(supabase, {
        namespace: 'platforms',
        keys_synced: count,
        success: true,
      })
    }

    // Publish industries
    if (namespace === 'industries' || namespace === 'all') {
      const count = await publishIndustries(c.env, supabase)
      results.industries = count
      await logKvSync(supabase, {
        namespace: 'industries',
        keys_synced: count,
        success: true,
      })
    }

    // Publish soul documents
    if (namespace === 'soul_docs' || namespace === 'all') {
      const count = await publishSoulDocs(c.env, supabase)
      results.soul_docs = count
      await logKvSync(supabase, {
        namespace: 'soul_docs',
        keys_synced: count,
        success: true,
      })
    }

    // Publish schema
    if (namespace === 'schema' || namespace === 'all') {
      const count = await publishSchema(c.env, supabase)
      results.schema = count
      await logKvSync(supabase, {
        namespace: 'schema',
        keys_synced: count,
        success: true,
      })
    }

    const totalSynced = Object.values(results).reduce((a, b) => a + b, 0)

    console.log(`Published ${totalSynced} items to KV:`, results)

    return c.json({
      success: true,
      synced: totalSynced,
      namespace: namespace === 'all' ? 'all' : namespace,
      details: results,
    } as PublishResponse & { details: Record<string, number> })

  } catch (error) {
    console.error('Publish route error:', error)

    // Log failed sync
    try {
      const supabase = createSupabaseClient(c.env)
      await logKvSync(supabase, {
        namespace: 'unknown',
        keys_synced: 0,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
    } catch {
      // Ignore logging error
    }

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * Publish all platforms to KV
 */
async function publishPlatforms(env: Env, supabase: ReturnType<typeof createSupabaseClient>): Promise<number> {
  const platforms = await fetchAllPlatforms(supabase)

  // Store each platform
  await Promise.all(platforms.map(p => setPlatformContext(env, p)))

  // Store list of codes
  const codes = platforms.map(p => p.code)
  await setPlatformsList(env, codes)

  return platforms.length
}

/**
 * Publish all industries to KV
 */
async function publishIndustries(env: Env, supabase: ReturnType<typeof createSupabaseClient>): Promise<number> {
  const industries = await fetchAllIndustries(supabase)

  // Store each industry
  await Promise.all(industries.map(i => setIndustryContext(env, i)))

  // Store list of codes
  const codes = industries.map(i => i.code)
  await setIndustriesList(env, codes)

  return industries.length
}

/**
 * Publish all soul documents to KV
 */
async function publishSoulDocs(env: Env, supabase: ReturnType<typeof createSupabaseClient>): Promise<number> {
  const docs = await fetchPublishedSoulDocs(supabase)

  // Store each document
  await Promise.all(docs.map(d => setSoulDoc(env, d)))

  // Store list of slugs
  const slugs = docs.map(d => d.slug)
  await setSoulDocsList(env, slugs)

  return docs.length
}

/**
 * Publish schema to KV
 */
async function publishSchema(env: Env, supabase: ReturnType<typeof createSupabaseClient>): Promise<number> {
  const schema = await fetchFullSchema(supabase)

  // Store full schema
  await setFullSchema(env, schema)

  // Store individual tactic lookups for quick matching
  let tacticCount = 0
  for (const product of schema) {
    for (const subproduct of product.subproducts || []) {
      for (const tacticType of subproduct.tactic_types || []) {
        await setTacticLookup(env, tacticType.data_value, {
          product: product.data_value,
          subproduct: subproduct.data_value,
          tacticType: tacticType.data_value,
        })
        tacticCount++
      }
    }
  }

  return schema.length + tacticCount
}
