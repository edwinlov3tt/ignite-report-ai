/**
 * KV Storage Helpers
 * Utilities for reading/writing to Cloudflare KV namespaces
 */

import type { Env, PlatformContext, IndustryContext, SoulDocument, SchemaProduct } from '../types/bindings'

// KV Key Patterns
export const KV_KEYS = {
  // Platforms
  platform: (code: string) => `platform:${code}`,
  platformsList: 'platforms:list',

  // Industries
  industry: (code: string) => `industry:${code}`,
  industriesList: 'industries:list',

  // Soul Documents
  soulDoc: (slug: string) => `soul_doc:${slug}`,
  soulDocVersion: (slug: string, version: number) => `soul_doc:${slug}:v${version}`,
  soulDocsList: 'soul_docs:list',

  // Schema
  schemaFull: 'schema:full',
  schemaTactic: (dataValue: string) => `schema:tactic:${dataValue}`,

  // Lumina cache
  luminaCache: (orderId: string) => `lumina:${orderId}`,
}

// Cache TTLs in seconds
export const CACHE_TTL = {
  lumina: 600,      // 10 minutes
  platform: 3600,   // 1 hour (backed by publish mechanism)
  industry: 3600,   // 1 hour
  soulDoc: 3600,    // 1 hour
  schema: 3600,     // 1 hour
}

/**
 * Fetch platform context from KV
 */
export async function getPlatformContext(
  env: Env,
  platformCode: string
): Promise<PlatformContext | null> {
  const data = await env.PLATFORMS_KV.get(KV_KEYS.platform(platformCode), 'json')
  return data as PlatformContext | null
}

/**
 * Fetch multiple platforms from KV
 */
export async function getMultiplePlatforms(
  env: Env,
  platformCodes: string[]
): Promise<PlatformContext[]> {
  const results = await Promise.all(
    platformCodes.map(code => getPlatformContext(env, code))
  )
  return results.filter((p): p is PlatformContext => p !== null)
}

/**
 * Get list of all platform codes
 */
export async function getPlatformsList(env: Env): Promise<string[]> {
  const list = await env.PLATFORMS_KV.get(KV_KEYS.platformsList, 'json')
  return (list as string[]) || []
}

/**
 * Store platform context in KV
 */
export async function setPlatformContext(
  env: Env,
  platform: PlatformContext
): Promise<void> {
  await env.PLATFORMS_KV.put(
    KV_KEYS.platform(platform.code),
    JSON.stringify(platform),
    { expirationTtl: CACHE_TTL.platform }
  )
}

/**
 * Store platforms list in KV
 */
export async function setPlatformsList(
  env: Env,
  codes: string[]
): Promise<void> {
  await env.PLATFORMS_KV.put(
    KV_KEYS.platformsList,
    JSON.stringify(codes),
    { expirationTtl: CACHE_TTL.platform }
  )
}

/**
 * Fetch industry context from KV
 */
export async function getIndustryContext(
  env: Env,
  industryCode: string
): Promise<IndustryContext | null> {
  const data = await env.INDUSTRIES_KV.get(KV_KEYS.industry(industryCode), 'json')
  return data as IndustryContext | null
}

/**
 * Get list of all industry codes
 */
export async function getIndustriesList(env: Env): Promise<string[]> {
  const list = await env.INDUSTRIES_KV.get(KV_KEYS.industriesList, 'json')
  return (list as string[]) || []
}

/**
 * Store industry context in KV
 */
export async function setIndustryContext(
  env: Env,
  industry: IndustryContext
): Promise<void> {
  await env.INDUSTRIES_KV.put(
    KV_KEYS.industry(industry.code),
    JSON.stringify(industry),
    { expirationTtl: CACHE_TTL.industry }
  )
}

/**
 * Store industries list in KV
 */
export async function setIndustriesList(
  env: Env,
  codes: string[]
): Promise<void> {
  await env.INDUSTRIES_KV.put(
    KV_KEYS.industriesList,
    JSON.stringify(codes),
    { expirationTtl: CACHE_TTL.industry }
  )
}

/**
 * Fetch soul document from KV
 */
export async function getSoulDoc(
  env: Env,
  slug: string
): Promise<SoulDocument | null> {
  const data = await env.SOUL_DOCS_KV.get(KV_KEYS.soulDoc(slug), 'json')
  return data as SoulDocument | null
}

/**
 * Get list of all soul doc slugs
 */
export async function getSoulDocsList(env: Env): Promise<string[]> {
  const list = await env.SOUL_DOCS_KV.get(KV_KEYS.soulDocsList, 'json')
  return (list as string[]) || []
}

/**
 * Store soul document in KV
 */
export async function setSoulDoc(
  env: Env,
  doc: SoulDocument
): Promise<void> {
  // Store current version
  await env.SOUL_DOCS_KV.put(
    KV_KEYS.soulDoc(doc.slug),
    JSON.stringify(doc),
    { expirationTtl: CACHE_TTL.soulDoc }
  )

  // Also store with version number for cache busting
  await env.SOUL_DOCS_KV.put(
    KV_KEYS.soulDocVersion(doc.slug, doc.version),
    JSON.stringify(doc),
    { expirationTtl: CACHE_TTL.soulDoc }
  )
}

/**
 * Store soul docs list in KV
 */
export async function setSoulDocsList(
  env: Env,
  slugs: string[]
): Promise<void> {
  await env.SOUL_DOCS_KV.put(
    KV_KEYS.soulDocsList,
    JSON.stringify(slugs),
    { expirationTtl: CACHE_TTL.soulDoc }
  )
}

/**
 * Fetch full schema from KV
 */
export async function getFullSchema(env: Env): Promise<SchemaProduct[] | null> {
  const data = await env.SCHEMA_KV.get(KV_KEYS.schemaFull, 'json')
  return data as SchemaProduct[] | null
}

/**
 * Store full schema in KV
 */
export async function setFullSchema(
  env: Env,
  schema: SchemaProduct[]
): Promise<void> {
  await env.SCHEMA_KV.put(
    KV_KEYS.schemaFull,
    JSON.stringify(schema),
    { expirationTtl: CACHE_TTL.schema }
  )
}

/**
 * Store individual tactic lookup in KV
 */
export async function setTacticLookup(
  env: Env,
  dataValue: string,
  tacticInfo: { product: string; subproduct: string; tacticType: string }
): Promise<void> {
  await env.SCHEMA_KV.put(
    KV_KEYS.schemaTactic(dataValue),
    JSON.stringify(tacticInfo),
    { expirationTtl: CACHE_TTL.schema }
  )
}

/**
 * Get Lumina cache
 */
export async function getLuminaCache(
  env: Env,
  orderId: string
): Promise<unknown | null> {
  const data = await env.LUMINA_CACHE_KV.get(KV_KEYS.luminaCache(orderId), 'json')
  return data
}

/**
 * Set Lumina cache
 */
export async function setLuminaCache(
  env: Env,
  orderId: string,
  data: unknown
): Promise<void> {
  await env.LUMINA_CACHE_KV.put(
    KV_KEYS.luminaCache(orderId),
    JSON.stringify(data),
    { expirationTtl: CACHE_TTL.lumina }
  )
}
