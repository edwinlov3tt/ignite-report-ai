/**
 * Commit Route for Schema Curator
 * Saves approved entities to the database with provenance tracking
 */

import { Hono } from 'hono'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Env } from '../../types/bindings'
import type { EntityType, ExtractedField, CommitRequest, CommitResponse } from '../../types/curator'
import {
  createAuditLog,
  recordProvenance,
  createProvenanceFromFields,
  generateBatchId,
} from '../../services/curator/audit'

const app = new Hono<{ Bindings: Env }>()

// ============================================
// Entity Commit Handlers
// ============================================

interface CommitResult {
  success: boolean
  entityId?: string
  error?: string
}

async function commitPlatform(
  supabase: ReturnType<typeof createSupabaseClient>,
  fields: ExtractedField[],
  batchId: string,
  changedBy: string
): Promise<CommitResult> {
  const fieldMap = Object.fromEntries(fields.map(f => [f.name, f.value]))

  // Check if platform already exists
  const { data: existing } = await supabase
    .from('platforms')
    .select('id')
    .eq('code', fieldMap.code)
    .single()

  const platformData = {
    code: fieldMap.code as string,
    name: fieldMap.name as string,
    description: fieldMap.description as string | null,
    category: fieldMap.category as string | null,
    logo_url: fieldMap.logo_url as string | null,
  }

  let entityId: string
  let operation: 'create' | 'update'

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('platforms')
      .update(platformData)
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
    entityId = existing.id
    operation = 'update'
  } else {
    // Create new
    const { data, error } = await supabase
      .from('platforms')
      .insert(platformData)
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    entityId = data.id
    operation = 'create'
  }

  // Create audit log
  await createAuditLog(supabase, {
    operation,
    entity_type: 'platform',
    entity_id: entityId,
    field_changes: Object.fromEntries(
      fields.map(f => [f.name, { old: null, new: f.value }])
    ),
    full_snapshot: platformData,
    batch_id: batchId,
    changed_by: changedBy,
  })

  return { success: true, entityId }
}

async function commitIndustry(
  supabase: ReturnType<typeof createSupabaseClient>,
  fields: ExtractedField[],
  batchId: string,
  changedBy: string
): Promise<CommitResult> {
  const fieldMap = Object.fromEntries(fields.map(f => [f.name, f.value]))

  // Check if industry already exists
  const { data: existing } = await supabase
    .from('industries')
    .select('id')
    .eq('code', fieldMap.code)
    .single()

  // Build industry data including research fields
  const industryData: Record<string, unknown> = {
    code: fieldMap.code as string,
    name: fieldMap.name as string,
    description: fieldMap.description as string | null,
    icon: fieldMap.icon as string | null,
  }

  // Add curator research fields if present (stored in curator_* columns)
  if (fieldMap.benchmarks) {
    industryData.curator_benchmarks = fieldMap.benchmarks
  }
  if (fieldMap.seasonality) {
    industryData.curator_seasonality = fieldMap.seasonality
  }
  if (fieldMap.buyer_notes) {
    industryData.buyer_notes = fieldMap.buyer_notes
  }
  if (fieldMap.insights) {
    industryData.curator_insights = fieldMap.insights
  }
  if (fieldMap.research_metadata) {
    industryData.research_metadata = fieldMap.research_metadata
  }

  let entityId: string
  let operation: 'create' | 'update'

  if (existing) {
    const { error } = await supabase
      .from('industries')
      .update(industryData)
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
    entityId = existing.id
    operation = 'update'
  } else {
    const { data, error } = await supabase
      .from('industries')
      .insert(industryData)
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    entityId = data.id
    operation = 'create'
  }

  await createAuditLog(supabase, {
    operation,
    entity_type: 'industry',
    entity_id: entityId,
    field_changes: Object.fromEntries(
      fields.map(f => [f.name, { old: null, new: f.value }])
    ),
    full_snapshot: industryData,
    batch_id: batchId,
    changed_by: changedBy,
  })

  return { success: true, entityId }
}

async function commitProduct(
  supabase: ReturnType<typeof createSupabaseClient>,
  fields: ExtractedField[],
  batchId: string,
  changedBy: string
): Promise<CommitResult> {
  const fieldMap = Object.fromEntries(fields.map(f => [f.name, f.value]))

  // Check if product already exists by data_value
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('data_value', fieldMap.data_value)
    .single()

  const productData = {
    name: fieldMap.name as string,
    data_value: fieldMap.data_value as string,
    description: fieldMap.description as string | null,
  }

  let entityId: string
  let operation: 'create' | 'update'

  if (existing) {
    const { error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
    entityId = existing.id
    operation = 'update'
  } else {
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    entityId = data.id
    operation = 'create'
  }

  await createAuditLog(supabase, {
    operation,
    entity_type: 'product',
    entity_id: entityId,
    field_changes: Object.fromEntries(
      fields.map(f => [f.name, { old: null, new: f.value }])
    ),
    full_snapshot: productData,
    batch_id: batchId,
    changed_by: changedBy,
  })

  return { success: true, entityId }
}

async function commitSubproduct(
  supabase: ReturnType<typeof createSupabaseClient>,
  fields: ExtractedField[],
  batchId: string,
  changedBy: string
): Promise<CommitResult> {
  const fieldMap = Object.fromEntries(fields.map(f => [f.name, f.value]))

  // Need to find parent product ID
  let productId: string | null = null
  if (fieldMap.parent_product) {
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('data_value', fieldMap.parent_product)
      .single()
    productId = product?.id || null
  }

  // Check if subproduct already exists
  const { data: existing } = await supabase
    .from('subproducts')
    .select('id')
    .eq('data_value', fieldMap.data_value)
    .single()

  const subproductData = {
    name: fieldMap.name as string,
    data_value: fieldMap.data_value as string,
    description: fieldMap.description as string | null,
    product_id: productId,
  }

  let entityId: string
  let operation: 'create' | 'update'

  if (existing) {
    const { error } = await supabase
      .from('subproducts')
      .update(subproductData)
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
    entityId = existing.id
    operation = 'update'
  } else {
    const { data, error } = await supabase
      .from('subproducts')
      .insert(subproductData)
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    entityId = data.id
    operation = 'create'
  }

  await createAuditLog(supabase, {
    operation,
    entity_type: 'subproduct',
    entity_id: entityId,
    field_changes: Object.fromEntries(
      fields.map(f => [f.name, { old: null, new: f.value }])
    ),
    full_snapshot: subproductData,
    batch_id: batchId,
    changed_by: changedBy,
  })

  return { success: true, entityId }
}

async function commitTacticType(
  supabase: ReturnType<typeof createSupabaseClient>,
  fields: ExtractedField[],
  batchId: string,
  changedBy: string
): Promise<CommitResult> {
  const fieldMap = Object.fromEntries(fields.map(f => [f.name, f.value]))

  // Need to find parent subproduct ID
  let subproductId: string | null = null
  if (fieldMap.parent_subproduct) {
    const { data: subproduct } = await supabase
      .from('subproducts')
      .select('id')
      .eq('data_value', fieldMap.parent_subproduct)
      .single()
    subproductId = subproduct?.id || null
  }

  // Check if tactic_type already exists
  const { data: existing } = await supabase
    .from('tactic_types')
    .select('id')
    .eq('data_value', fieldMap.data_value)
    .single()

  const tacticData = {
    name: fieldMap.name as string,
    data_value: fieldMap.data_value as string,
    description: fieldMap.description as string | null,
    subproduct_id: subproductId,
  }

  let entityId: string
  let operation: 'create' | 'update'

  if (existing) {
    const { error } = await supabase
      .from('tactic_types')
      .update(tacticData)
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
    entityId = existing.id
    operation = 'update'
  } else {
    const { data, error } = await supabase
      .from('tactic_types')
      .insert(tacticData)
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    entityId = data.id
    operation = 'create'
  }

  await createAuditLog(supabase, {
    operation,
    entity_type: 'tactic_type',
    entity_id: entityId,
    field_changes: Object.fromEntries(
      fields.map(f => [f.name, { old: null, new: f.value }])
    ),
    full_snapshot: tacticData,
    batch_id: batchId,
    changed_by: changedBy,
  })

  return { success: true, entityId }
}

async function commitSoulDoc(
  supabase: ReturnType<typeof createSupabaseClient>,
  fields: ExtractedField[],
  batchId: string,
  changedBy: string
): Promise<CommitResult> {
  const fieldMap = Object.fromEntries(fields.map(f => [f.name, f.value]))

  // Check if soul_doc already exists by slug
  const { data: existing } = await supabase
    .from('soul_documents')
    .select('id')
    .eq('slug', fieldMap.slug)
    .single()

  const soulDocData = {
    doc_type: fieldMap.doc_type as string,
    name: fieldMap.name as string,
    slug: fieldMap.slug as string,
    content: fieldMap.content as string,
    description: fieldMap.description as string | null,
  }

  let entityId: string
  let operation: 'create' | 'update'

  if (existing) {
    const { error } = await supabase
      .from('soul_documents')
      .update(soulDocData)
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
    entityId = existing.id
    operation = 'update'
  } else {
    const { data, error } = await supabase
      .from('soul_documents')
      .insert(soulDocData)
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    entityId = data.id
    operation = 'create'
  }

  await createAuditLog(supabase, {
    operation,
    entity_type: 'soul_doc',
    entity_id: entityId,
    field_changes: Object.fromEntries(
      fields.map(f => [f.name, { old: null, new: f.value }])
    ),
    full_snapshot: soulDocData,
    batch_id: batchId,
    changed_by: changedBy,
  })

  return { success: true, entityId }
}

// ============================================
// Main Commit Endpoint
// ============================================

app.post('/', async (c) => {
  const env = c.env

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return c.json({ error: 'Supabase not configured' }, 500)
  }

  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  let body: CommitRequest
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { items, session_id } = body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'No items to commit' }, 400)
  }

  const batchId = generateBatchId()
  const changedBy = 'curator_agent' // TODO: Add actual user identification

  const results: CommitResponse['results'] = []

  for (const item of items) {
    const { entity_type, fields } = item

    let result: CommitResult

    switch (entity_type) {
      case 'platform':
        result = await commitPlatform(supabase, fields, batchId, changedBy)
        break
      case 'industry':
        result = await commitIndustry(supabase, fields, batchId, changedBy)
        break
      case 'product':
        result = await commitProduct(supabase, fields, batchId, changedBy)
        break
      case 'subproduct':
        result = await commitSubproduct(supabase, fields, batchId, changedBy)
        break
      case 'tactic_type':
        result = await commitTacticType(supabase, fields, batchId, changedBy)
        break
      case 'soul_doc':
        result = await commitSoulDoc(supabase, fields, batchId, changedBy)
        break
      default:
        result = { success: false, error: `Unknown entity type: ${entity_type}` }
    }

    // Record provenance for successful commits
    if (result.success && result.entityId) {
      await recordProvenance(
        supabase,
        createProvenanceFromFields(entity_type, result.entityId, fields, 'user_input', 'gpt-5.2')
      )
    }

    results.push({
      entity_type,
      success: result.success,
      entity_id: result.entityId,
      error: result.error,
    })
  }

  // Update session if provided
  if (session_id) {
    await supabase
      .from('curator_sessions')
      .update({
        status: 'committed',
        pending_items: [],
      })
      .eq('id', session_id)
  }

  const response: CommitResponse = {
    batch_id: batchId,
    results,
    committed_count: results.filter(r => r.success).length,
    failed_count: results.filter(r => !r.success).length,
  }

  return c.json(response)
})

export default app
