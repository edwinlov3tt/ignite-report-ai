/**
 * Lumina API Route
 * Proxies requests to Lumina API with KV caching
 */

import { Context } from 'hono'
import type { Env, LuminaRequest, LuminaResponse } from '../types/bindings'
import { getLuminaCache, setLuminaCache } from '../storage/kv'
import { discoverFields, discoverOrderFields, saveDiscoveredFields } from '../services/fieldDiscovery'
import { createSupabaseClient } from '../services/supabase'

/**
 * Run field discovery in background (non-blocking)
 * This automatically catalogs new fields from Lumina responses
 */
async function runFieldDiscovery(env: Env, orderId: string, data: Record<string, unknown>): Promise<void> {
  try {
    const startTime = Date.now()
    const lineItems = (data.lineItems || data.items || []) as unknown[]
    const orderData = data.order || data

    // Discover fields
    const lineItemFields = discoverFields(lineItems)
    const orderFields = discoverOrderFields(orderData)
    const allFields = [...lineItemFields, ...orderFields]

    // Save to database
    const supabase = createSupabaseClient(env)
    const companyName = (orderData as Record<string, unknown>).companyName as string | undefined
    const result = await saveDiscoveredFields(
      supabase,
      allFields,
      orderId,
      companyName,
      lineItems.length
    )

    console.log(`Field discovery completed for order ${orderId}: ${result.newFields} new, ${result.updatedFields} updated (${Date.now() - startTime}ms)`)
  } catch (error) {
    console.error(`Field discovery failed for order ${orderId}:`, error)
    // Don't throw - this is a background task
  }
}

/**
 * POST /lumina
 * Fetch campaign data from Lumina API with caching
 */
export async function handleLumina(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<LuminaRequest>()
    const { orderId, forceRefresh = false } = body

    if (!orderId) {
      return c.json({ success: false, error: 'orderId is required' }, 400)
    }

    // Check cache unless force refresh requested
    if (!forceRefresh) {
      const cached = await getLuminaCache(c.env, orderId)
      if (cached) {
        console.log(`Lumina cache hit for order: ${orderId}`)
        return c.json({
          success: true,
          data: cached,
          cached: true,
        } as LuminaResponse & { cached: boolean })
      }
    }

    // Fetch from Lumina API
    console.log(`Fetching from Lumina API for order: ${orderId}`)
    const luminaUrl = `${c.env.LUMINA_API_URL}?query=${encodeURIComponent(orderId)}`

    const response = await fetch(luminaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Report.AI-Worker/1.0',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Lumina API error: ${response.status} - ${errorText}`)
      return c.json({
        success: false,
        error: `Lumina API error: ${response.status}`,
        details: errorText,
      }, response.status as 400 | 500)
    }

    const data = await response.json() as Record<string, unknown>

    // Cache the response (10 minute TTL)
    await setLuminaCache(c.env, orderId, data)
    console.log(`Lumina response cached for order: ${orderId}`)

    // Run field discovery in the background (non-blocking)
    c.executionCtx.waitUntil(runFieldDiscovery(c.env, orderId, data))

    return c.json({
      success: true,
      data,
      cached: false,
    } as LuminaResponse & { cached: boolean })

  } catch (error) {
    console.error('Lumina route error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * Parse and normalize Lumina response data
 */
export function normalizeLuminaData(data: Record<string, unknown>): {
  orderId: string
  orderName: string
  orderAmount: number
  platform: string
  startDate: string
  endDate: string
  tactics: Array<{
    name: string
    platform: string
    budget: number
    spend: number
    impressions: number
    clicks: number
  }>
} {
  // Extract common fields with fallbacks
  const orderId = String(data.orderId || data.order_id || data.id || '')
  const orderName = String(data.orderName || data.order_name || data.name || '')
  const orderAmount = Number(data.orderAmount || data.order_amount || data.budget || 0)
  const platform = String(data.platform || data.channel || '')
  const startDate = String(data.startDate || data.start_date || data.flightStart || '')
  const endDate = String(data.endDate || data.end_date || data.flightEnd || '')

  // Extract tactics from various possible structures
  const rawTactics = data.tactics || data.lineItems || data.items || []
  const tactics = (Array.isArray(rawTactics) ? rawTactics : []).map((t: Record<string, unknown>) => ({
    name: String(t.name || t.tacticName || ''),
    platform: String(t.platform || platform),
    budget: Number(t.budget || t.plannedSpend || 0),
    spend: Number(t.spend || t.actualSpend || 0),
    impressions: Number(t.impressions || 0),
    clicks: Number(t.clicks || 0),
  }))

  return {
    orderId,
    orderName,
    orderAmount,
    platform,
    startDate,
    endDate,
    tactics,
  }
}

/**
 * Detect platforms from Lumina data
 */
export function detectPlatformsFromLumina(data: ReturnType<typeof normalizeLuminaData>): string[] {
  const platforms = new Set<string>()

  // Add main platform
  if (data.platform) {
    platforms.add(normalizePlatformCode(data.platform))
  }

  // Add platforms from tactics
  for (const tactic of data.tactics) {
    if (tactic.platform) {
      platforms.add(normalizePlatformCode(tactic.platform))
    }
  }

  return Array.from(platforms)
}

/**
 * Normalize platform names to standard codes
 */
function normalizePlatformCode(platform: string): string {
  const normalized = platform.toLowerCase().trim()

  const platformMap: Record<string, string> = {
    'facebook': 'facebook',
    'meta': 'facebook',
    'fb': 'facebook',
    'instagram': 'instagram',
    'ig': 'instagram',
    'google': 'google_ads',
    'google ads': 'google_ads',
    'googleads': 'google_ads',
    'adwords': 'google_ads',
    'youtube': 'youtube',
    'yt': 'youtube',
    'linkedin': 'linkedin',
    'li': 'linkedin',
    'twitter': 'twitter',
    'x': 'twitter',
    'tiktok': 'tiktok',
    'snap': 'snapchat',
    'snapchat': 'snapchat',
    'pinterest': 'pinterest',
    'amazon': 'amazon_ads',
    'amazon ads': 'amazon_ads',
    'programmatic': 'programmatic',
    'display': 'programmatic',
    'dv360': 'programmatic',
    'ttd': 'programmatic',
    'ctv': 'ctv',
    'ott': 'ctv',
    'streaming': 'streaming_audio',
    'audio': 'streaming_audio',
    'spotify': 'streaming_audio',
  }

  return platformMap[normalized] || normalized
}
