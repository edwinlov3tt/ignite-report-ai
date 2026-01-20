/**
 * Lumina API Service
 * Handles fetching data from Lumina API for orders and line items
 */

const LUMINA_API_BASE = 'https://api.edwinlovett.com'

export type LuminaUrlType = 'order' | 'lineitem'

export interface LuminaLineItem {
  _id: string
  name?: string
  type?: string
  platform?: string
  status?: string
  budget?: number
  spent?: number
  impressions?: number
  clicks?: number
  conversions?: number
  startDate?: string
  endDate?: string
  [key: string]: unknown
}

export interface LuminaOrder {
  _id: string
  name?: string
  advertiser?: string
  agency?: string
  status?: string
  startDate?: string
  endDate?: string
  budget?: number
  lineItems?: LuminaLineItem[]
  [key: string]: unknown
}

export interface LuminaApiResponse {
  success: boolean
  data?: LuminaOrder | LuminaLineItem
  error?: string
}

/**
 * Parse a Lumina URL to extract the type and ID
 */
export function parseLuminaUrl(url: string): { type: LuminaUrlType; id: string } | null {
  try {
    // Handle both full URLs and just IDs
    if (!url.includes('townsquarelumina.com') && !url.includes('/')) {
      // Assume it's just an ID - default to order
      return { type: 'order', id: url.trim() }
    }

    // Remove query params (like ?tab=line_items)
    const urlWithoutQuery = url.split('?')[0]

    // Extract the type and ID from URL patterns:
    // Order: /lumina/view/order/{id}
    // Line item: /lumina/view/lineitem/{platform}/{id}

    if (urlWithoutQuery.includes('/order/')) {
      const match = urlWithoutQuery.match(/\/order\/([a-f0-9]+)$/i)
      if (match) {
        return { type: 'order', id: match[1] }
      }
    }

    if (urlWithoutQuery.includes('/lineitem/')) {
      // Line item URL: /lineitem/{platform}/{id}
      const match = urlWithoutQuery.match(/\/lineitem\/[^/]+\/([a-f0-9]+)$/i)
      if (match) {
        return { type: 'lineitem', id: match[1] }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Fetch an order with all its line items
 */
export async function fetchLuminaOrder(orderId: string): Promise<LuminaApiResponse> {
  try {
    const response = await fetch(`${LUMINA_API_BASE}/order?query=${orderId}`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order'
    }
  }
}

/**
 * Fetch a single line item
 */
export async function fetchLuminaLineItem(lineItemId: string): Promise<LuminaApiResponse> {
  try {
    const response = await fetch(`${LUMINA_API_BASE}/order?query=${lineItemId}&type=lineitem`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch line item'
    }
  }
}

/**
 * Fetch data from Lumina based on URL
 */
export async function fetchLuminaData(url: string): Promise<LuminaApiResponse & { type?: LuminaUrlType }> {
  const parsed = parseLuminaUrl(url)

  if (!parsed) {
    return { success: false, error: 'Invalid Lumina URL format' }
  }

  if (parsed.type === 'order') {
    const result = await fetchLuminaOrder(parsed.id)
    return { ...result, type: 'order' }
  } else {
    const result = await fetchLuminaLineItem(parsed.id)
    return { ...result, type: 'lineitem' }
  }
}

/**
 * Get all unique keys from an object (recursively for nested objects)
 */
export function extractDataKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    keys.push(fullKey)

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractDataKeys(value as Record<string, unknown>, fullKey))
    }
  }

  return keys
}

/**
 * Get value from nested object by dot-notation key
 */
export function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

/**
 * Format a value for display
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    // Format numbers with commas and handle currency/percentages
    if (Number.isInteger(value)) {
      return value.toLocaleString()
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}
