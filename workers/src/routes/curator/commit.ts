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

  // Check if product already exists by data_value or id
  let existing: { id: string } | null = null

  if (fieldMap.id) {
    const { data } = await supabase
      .from('products')
      .select('id')
      .eq('id', fieldMap.id)
      .single()
    existing = data
  } else if (fieldMap.data_value) {
    const { data } = await supabase
      .from('products')
      .select('id')
      .eq('data_value', fieldMap.data_value)
      .single()
    existing = data
  }

  // Build product data including research guidance fields
  const productData: Record<string, unknown> = {}

  // Core fields
  if (fieldMap.name) productData.name = fieldMap.name
  if (fieldMap.data_value) productData.data_value = fieldMap.data_value
  if (fieldMap.description !== undefined) productData.description = fieldMap.description
  if (fieldMap.platforms) productData.platforms = fieldMap.platforms
  if (fieldMap.mediums) productData.mediums = fieldMap.mediums
  if (fieldMap.notes) productData.notes = fieldMap.notes
  if (fieldMap.ai_guidelines) productData.ai_guidelines = fieldMap.ai_guidelines
  if (fieldMap.ai_prompt) productData.ai_prompt = fieldMap.ai_prompt

  // Research guidance fields
  if (fieldMap.chain_of_thought_guidance) productData.chain_of_thought_guidance = fieldMap.chain_of_thought_guidance
  if (fieldMap.analysis_instructions) productData.analysis_instructions = fieldMap.analysis_instructions
  if (fieldMap.example_good_analysis) productData.example_good_analysis = fieldMap.example_good_analysis
  if (fieldMap.example_bad_analysis) productData.example_bad_analysis = fieldMap.example_bad_analysis
  if (fieldMap.critical_metrics) productData.critical_metrics = fieldMap.critical_metrics
  if (fieldMap.optimization_priorities) productData.optimization_priorities = fieldMap.optimization_priorities
  if (fieldMap.important_constraints_restrictions) productData.important_constraints = fieldMap.important_constraints_restrictions

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
    // For new products, ensure required fields
    if (!productData.name || !productData.data_value) {
      return { success: false, error: 'name and data_value are required for new products' }
    }
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
  } else if (fieldMap.product_id) {
    productId = fieldMap.product_id as string
  }

  // Check if subproduct already exists by id or data_value
  let existing: { id: string } | null = null

  if (fieldMap.id) {
    const { data } = await supabase
      .from('subproducts')
      .select('id')
      .eq('id', fieldMap.id)
      .single()
    existing = data
  } else if (fieldMap.data_value) {
    const { data } = await supabase
      .from('subproducts')
      .select('id')
      .eq('data_value', fieldMap.data_value)
      .single()
    existing = data
  }

  // Build subproduct data including research guidance fields
  const subproductData: Record<string, unknown> = {}

  // Core fields
  if (fieldMap.name) subproductData.name = fieldMap.name
  if (fieldMap.data_value) subproductData.data_value = fieldMap.data_value
  if (fieldMap.description !== undefined) subproductData.description = fieldMap.description
  if (productId) subproductData.product_id = productId
  if (fieldMap.platforms) subproductData.platforms = fieldMap.platforms
  if (fieldMap.mediums) subproductData.mediums = fieldMap.mediums
  if (fieldMap.notes) subproductData.notes = fieldMap.notes
  if (fieldMap.kpis) subproductData.kpis = fieldMap.kpis
  if (fieldMap.medium) subproductData.medium = fieldMap.medium
  if (fieldMap.alias_code) subproductData.alias_code = fieldMap.alias_code
  if (fieldMap.targeting_options) subproductData.targeting_options = fieldMap.targeting_options

  // Research guidance fields
  if (fieldMap.chain_of_thought_guidance) subproductData.chain_of_thought_guidance = fieldMap.chain_of_thought_guidance
  if (fieldMap.analysis_instructions) subproductData.analysis_instructions = fieldMap.analysis_instructions
  if (fieldMap.example_good_analysis) subproductData.example_good_analysis = fieldMap.example_good_analysis
  if (fieldMap.example_bad_analysis) subproductData.example_bad_analysis = fieldMap.example_bad_analysis
  if (fieldMap.critical_metrics) subproductData.critical_metrics = fieldMap.critical_metrics
  if (fieldMap.optimization_priorities) subproductData.optimization_priorities = fieldMap.optimization_priorities
  if (fieldMap.important_constraints_restrictions) subproductData.important_constraints = fieldMap.important_constraints_restrictions

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
    // For new subproducts, ensure required fields
    if (!subproductData.name || !subproductData.data_value) {
      return { success: false, error: 'name and data_value are required for new subproducts' }
    }
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
// Enrichment Entity Commit Handlers
// ============================================

async function commitPlatformQuirk(
  supabase: ReturnType<typeof createSupabaseClient>,
  fields: ExtractedField[],
  targetEntityId: string | undefined,
  batchId: string,
  changedBy: string
): Promise<CommitResult> {
  const fieldMap = Object.fromEntries(fields.map(f => [f.name, f.value]))

  // Need platform_id - either from target or lookup by name
  let platformId = targetEntityId
  if (!platformId && fieldMap.platform_name) {
    const { data: platform } = await supabase
      .from('platforms')
      .select('id')
      .ilike('name', String(fieldMap.platform_name))
      .single()
    platformId = platform?.id
  }

  if (!platformId) {
    return { success: false, error: 'Platform not found for quirk' }
  }

  const quirkData = {
    platform_id: platformId,
    title: fieldMap.title as string,
    description: fieldMap.description as string | null,
    quirk_type: (fieldMap.quirk_type as string) || 'reporting',
    ai_instruction: fieldMap.ai_instruction as string | null,
    impact: fieldMap.impact as string | null,
  }

  const { data, error } = await supabase
    .from('platform_quirks')
    .insert(quirkData)
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  await createAuditLog(supabase, {
    operation: 'create',
    entity_type: 'platform_quirk' as EntityType,
    entity_id: data.id,
    field_changes: Object.fromEntries(
      fields.map(f => [f.name, { old: null, new: f.value }])
    ),
    full_snapshot: quirkData,
    batch_id: batchId,
    changed_by: changedBy,
  })

  return { success: true, entityId: data.id }
}

async function commitIndustryInsight(
  supabase: ReturnType<typeof createSupabaseClient>,
  fields: ExtractedField[],
  targetEntityId: string | undefined,
  batchId: string,
  changedBy: string
): Promise<CommitResult> {
  const fieldMap = Object.fromEntries(fields.map(f => [f.name, f.value]))

  // Need industry_id - either from target or lookup by name
  let industryId = targetEntityId
  if (!industryId && fieldMap.industry_name) {
    const { data: industry } = await supabase
      .from('industries')
      .select('id')
      .ilike('name', String(fieldMap.industry_name))
      .single()
    industryId = industry?.id
  }

  if (!industryId) {
    return { success: false, error: 'Industry not found for insight' }
  }

  const insightData = {
    industry_id: industryId,
    title: fieldMap.title as string,
    content: fieldMap.content as string | null,
    insight_type: (fieldMap.insight_type as string) || 'trend',
    ai_instruction: fieldMap.ai_instruction as string | null,
  }

  const { data, error } = await supabase
    .from('industry_insights')
    .insert(insightData)
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  await createAuditLog(supabase, {
    operation: 'create',
    entity_type: 'industry_insight' as EntityType,
    entity_id: data.id,
    field_changes: Object.fromEntries(
      fields.map(f => [f.name, { old: null, new: f.value }])
    ),
    full_snapshot: insightData,
    batch_id: batchId,
    changed_by: changedBy,
  })

  return { success: true, entityId: data.id }
}

async function commitPlatformBuyerNote(
  supabase: ReturnType<typeof createSupabaseClient>,
  fields: ExtractedField[],
  targetEntityId: string | undefined,
  batchId: string,
  changedBy: string
): Promise<CommitResult> {
  const fieldMap = Object.fromEntries(fields.map(f => [f.name, f.value]))

  let platformId = targetEntityId
  if (!platformId && fieldMap.platform_name) {
    const { data: platform } = await supabase
      .from('platforms')
      .select('id')
      .ilike('name', String(fieldMap.platform_name))
      .single()
    platformId = platform?.id
  }

  if (!platformId) {
    return { success: false, error: 'Platform not found for buyer note' }
  }

  const noteData = {
    platform_id: platformId,
    content: fieldMap.content as string,
    note_type: (fieldMap.note_type as string) || 'tip',
    contributed_by: changedBy,
  }

  const { data, error } = await supabase
    .from('platform_buyer_notes')
    .insert(noteData)
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  await createAuditLog(supabase, {
    operation: 'create',
    entity_type: 'platform_buyer_note' as EntityType,
    entity_id: data.id,
    field_changes: Object.fromEntries(
      fields.map(f => [f.name, { old: null, new: f.value }])
    ),
    full_snapshot: noteData,
    batch_id: batchId,
    changed_by: changedBy,
  })

  return { success: true, entityId: data.id }
}

// ============================================
// Field Update Handler (for update_field actions)
// ============================================

async function updateEntityField(
  supabase: ReturnType<typeof createSupabaseClient>,
  targetEntityType: string,
  targetEntityId: string,
  fields: ExtractedField[],
  batchId: string,
  changedBy: string
): Promise<CommitResult> {
  const tableMap: Record<string, string> = {
    platform: 'platforms',
    industry: 'industries',
    product: 'products',
    subproduct: 'subproducts',
    tactic_type: 'tactic_types',
    soul_doc: 'soul_documents',
  }

  const table = tableMap[targetEntityType]
  if (!table) {
    return { success: false, error: `Unknown entity type for update: ${targetEntityType}` }
  }

  // Get current values for audit log
  const { data: current, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('id', targetEntityId)
    .single()

  if (fetchError || !current) {
    return { success: false, error: `Entity not found: ${targetEntityId}` }
  }

  // Build update object from fields
  const updateData: Record<string, unknown> = {}
  const fieldChanges: Record<string, { old: unknown; new: unknown }> = {}

  for (const field of fields) {
    updateData[field.name] = field.value
    fieldChanges[field.name] = {
      old: current[field.name],
      new: field.value,
    }
  }

  const { error: updateError } = await supabase
    .from(table)
    .update(updateData)
    .eq('id', targetEntityId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  await createAuditLog(supabase, {
    operation: 'update',
    entity_type: targetEntityType as EntityType,
    entity_id: targetEntityId,
    field_changes: fieldChanges,
    full_snapshot: { ...current, ...updateData },
    batch_id: batchId,
    changed_by: changedBy,
  })

  return { success: true, entityId: targetEntityId }
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
    // Support for smart mode actions with target_entity
    const targetEntity = (item as any).target_entity
    const actionType = (item as any).action_type

    let result: CommitResult

    // Handle update_field action type
    if (actionType === 'update_field' && targetEntity) {
      result = await updateEntityField(
        supabase,
        targetEntity.type,
        targetEntity.id,
        fields,
        batchId,
        changedBy
      )
    } else {
      // Handle entity creation (create_entity or add_enrichment)
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
        // Enrichment types
        case 'platform_quirk':
          result = await commitPlatformQuirk(supabase, fields, targetEntity?.id, batchId, changedBy)
          break
        case 'industry_insight':
          result = await commitIndustryInsight(supabase, fields, targetEntity?.id, batchId, changedBy)
          break
        case 'platform_buyer_note':
          result = await commitPlatformBuyerNote(supabase, fields, targetEntity?.id, batchId, changedBy)
          break
        default:
          result = { success: false, error: `Unknown entity type: ${entity_type}` }
      }
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
