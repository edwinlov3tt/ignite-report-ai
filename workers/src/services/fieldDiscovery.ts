/**
 * Field Discovery Service
 * Automatically discovers and catalogs fields from Lumina API responses
 * Part of the Schema Intelligence system
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Statistics about a discovered field
 */
export interface FieldStats {
  path: string
  count: number
  types: Set<string>
  samples: unknown[]
  isNested: boolean
  parentPath: string | null
  frequency: number
}

/**
 * Result of a field discovery operation
 */
export interface DiscoveryResult {
  orderId: string
  companyName?: string
  fieldsDiscovered: number
  newFields: number
  updatedFields: number
  lineItemCount: number
  durationMs: number
  fields: FieldStats[]
}

/**
 * Walk through an object recursively and call callback for each leaf value
 */
function walkObject(
  obj: unknown,
  prefix: string,
  callback: (path: string, value: unknown, parentPath: string | null) => void
): void {
  if (obj === null || obj === undefined) return

  if (typeof obj !== 'object') {
    callback(prefix, obj, prefix.includes('.') ? prefix.substring(0, prefix.lastIndexOf('.')) : null)
    return
  }

  if (Array.isArray(obj)) {
    // For arrays, sample the first few items and walk their structure
    // We use [*] notation to indicate array items
    if (obj.length > 0) {
      const sample = obj.slice(0, 3) // Sample first 3 items
      for (const item of sample) {
        if (typeof item === 'object' && item !== null) {
          walkObject(item, `${prefix}[*]`, callback)
        } else {
          callback(`${prefix}[*]`, item, prefix)
        }
      }
    }
    return
  }

  // Regular object
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    const parentPath = prefix || null

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recurse into nested objects
      walkObject(value, path, callback)
    } else if (Array.isArray(value)) {
      // Handle arrays
      walkObject(value, path, callback)
    } else {
      // Leaf value
      callback(path, value, parentPath)
    }
  }
}

/**
 * Discover all fields from an array of line items
 */
export function discoverFields(lineItems: unknown[]): FieldStats[] {
  const fieldMap = new Map<string, FieldStats>()

  for (const item of lineItems) {
    walkObject(item, '', (path, value, parentPath) => {
      const existing = fieldMap.get(path) || {
        path,
        count: 0,
        types: new Set<string>(),
        samples: [],
        isNested: path.includes('.'),
        parentPath,
        frequency: 0,
      }

      existing.count++

      // Track data type
      const valueType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
      existing.types.add(valueType)

      // Collect unique samples (max 5)
      if (existing.samples.length < 5 && value !== null && value !== undefined) {
        const sampleValue = typeof value === 'object' ? JSON.stringify(value) : value
        if (!existing.samples.some(s => JSON.stringify(s) === JSON.stringify(sampleValue))) {
          existing.samples.push(sampleValue)
        }
      }

      fieldMap.set(path, existing)
    })
  }

  // Calculate frequency
  const fieldValues = Array.from(fieldMap.values())
  for (const stats of fieldValues) {
    stats.frequency = lineItems.length > 0 ? stats.count / lineItems.length : 0
  }

  return fieldValues
}

/**
 * Discover fields from order-level data
 */
export function discoverOrderFields(orderData: unknown): FieldStats[] {
  const fieldMap = new Map<string, FieldStats>()

  walkObject(orderData, 'order', (path, value, parentPath) => {
    const existing = fieldMap.get(path) || {
      path,
      count: 1,
      types: new Set<string>(),
      samples: [],
      isNested: path.includes('.'),
      parentPath,
      frequency: 1,
    }

    const valueType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
    existing.types.add(valueType)

    if (value !== null && value !== undefined && existing.samples.length < 5) {
      const sampleValue = typeof value === 'object' ? JSON.stringify(value) : value
      existing.samples.push(sampleValue)
    }

    fieldMap.set(path, existing)
  })

  return Array.from(fieldMap.values())
}

/**
 * Save discovered fields to database
 */
export async function saveDiscoveredFields(
  supabase: SupabaseClient,
  fields: FieldStats[],
  orderId: string,
  companyName?: string,
  lineItemCount?: number
): Promise<{ newFields: number; updatedFields: number }> {
  const startTime = Date.now()
  let newFields = 0
  let updatedFields = 0

  for (const field of fields) {
    // Skip very low frequency fields (likely noise)
    if (field.frequency < 0.05) continue

    // Check if field already exists
    const { data: existing } = await supabase
      .from('lumina_discovered_fields')
      .select('id, occurrence_count, data_types, sample_values, frequency')
      .eq('field_path', field.path)
      .single()

    if (existing) {
      // Update existing field
      const existingRecord = existing as {
        id: string
        occurrence_count: number
        data_types: string[]
        sample_values: unknown[]
        frequency: number
      }

      const existingTypes = new Set(existingRecord.data_types || [])
      field.types.forEach(t => existingTypes.add(t))

      const existingSamples = existingRecord.sample_values || []
      const newSamples = [...existingSamples]
      for (const sample of field.samples) {
        if (newSamples.length < 10 && !newSamples.some(s => JSON.stringify(s) === JSON.stringify(sample))) {
          newSamples.push(sample)
        }
      }

      const { error } = await supabase
        .from('lumina_discovered_fields')
        .update({
          data_types: Array.from(existingTypes),
          sample_values: newSamples,
          frequency: Math.max(field.frequency, existingRecord.frequency || 0),
          last_seen_at: new Date().toISOString(),
          occurrence_count: (existingRecord.occurrence_count || 1) + 1,
        })
        .eq('id', existingRecord.id)

      if (!error) updatedFields++
    } else {
      // Insert new field
      const { error } = await supabase
        .from('lumina_discovered_fields')
        .insert({
          field_path: field.path,
          data_types: Array.from(field.types),
          sample_values: field.samples,
          frequency: field.frequency,
          is_nested: field.isNested,
          parent_path: field.parentPath,
        })

      if (!error) newFields++
    }
  }

  // Log the discovery run
  const durationMs = Date.now() - startTime
  await supabase
    .from('lumina_field_discovery_log')
    .insert({
      order_id: orderId,
      company_name: companyName,
      fields_discovered: fields.length,
      new_fields: newFields,
      updated_fields: updatedFields,
      line_item_count: lineItemCount || 0,
      discovery_duration_ms: durationMs,
      field_summary: {
        totalFields: fields.length,
        highFrequencyFields: fields.filter(f => f.frequency > 0.8).length,
        nestedFields: fields.filter(f => f.isNested).length,
      },
    })

  return { newFields, updatedFields }
}

/**
 * Get all discovered fields from database
 */
export async function getDiscoveredFields(
  supabase: SupabaseClient,
  options?: {
    status?: string
    minFrequency?: number
    limit?: number
  }
): Promise<unknown[]> {
  let query = supabase
    .from('lumina_discovered_fields')
    .select('*')
    .order('frequency', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.minFrequency) {
    query = query.gte('frequency', options.minFrequency)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch discovered fields: ${error.message}`)
  }

  return data || []
}

/**
 * Get discovery logs
 */
export async function getDiscoveryLogs(
  supabase: SupabaseClient,
  limit: number = 50
): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('lumina_field_discovery_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch discovery logs: ${error.message}`)
  }

  return data || []
}

/**
 * Get new fields since a given date
 */
export async function getNewFieldsSince(
  supabase: SupabaseClient,
  since: Date
): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('lumina_discovered_fields')
    .select('*')
    .gte('first_seen_at', since.toISOString())
    .order('first_seen_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch new fields: ${error.message}`)
  }

  return data || []
}

/**
 * Update field status (for admin review)
 */
export async function updateFieldStatus(
  supabase: SupabaseClient,
  fieldPath: string,
  status: 'discovered' | 'reviewed' | 'approved' | 'ignored',
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('lumina_discovered_fields')
    .update({ status, notes })
    .eq('field_path', fieldPath)

  if (error) {
    throw new Error(`Failed to update field status: ${error.message}`)
  }
}
