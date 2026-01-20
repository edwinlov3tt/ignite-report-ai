/**
 * Schema API Service
 * Connects directly to Supabase for schema CRUD operations
 */

import { supabase, publishToKV } from './supabase'

// Types matching the database schema
export interface TacticType {
  id: string
  subproduct_id: string
  name: string
  alias_code?: string
  overview?: string
  analysis_instructions?: string
  lumina_data?: string[]
  // Legacy fields (kept for backward compatibility)
  data_value?: string
  slug?: string
  filename_stem?: string
  headers?: string[]
  aliases?: string[]
  is_active: boolean
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export interface PerformanceTable {
  id: string
  subproduct_id: string
  table_name: string
  file_name: string
  headers: string[]
  description?: string
  is_required: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface TableValidator {
  id: string
  subproduct_id: string
  required_tables: string[]
  minimum_tables: number
  created_at?: string
  updated_at?: string
}

export interface SubProduct {
  id: string
  product_id: string
  name: string
  data_value: string
  slug?: string
  description?: string
  platforms?: string[]
  notes?: string
  kpis?: string[]
  medium?: string // deprecated - use mediums array
  mediums?: string[]
  alias_code?: string
  targeting_options?: string[]
  // Analysis fields (inherit from product if empty)
  analysis_instructions?: string[]
  chain_of_thought_guidance?: string[]
  output_format_requirements?: Record<string, unknown>
  example_good_analysis?: string[]
  example_bad_analysis?: string[]
  // Optimization fields (inherit from product if empty)
  critical_metrics?: string[]
  warning_thresholds?: Record<string, unknown>
  optimization_priorities?: string[]
  // Constraints
  important_constraints_restrictions?: string
  is_active: boolean
  sort_order?: number
  tactic_types?: TacticType[]
  performance_tables?: PerformanceTable[]
  table_validator?: TableValidator
  created_at?: string
  updated_at?: string
}

export interface LuminaExtractor {
  id: string
  product_id: string
  name: string
  path: string
  when_conditions?: Record<string, unknown>
  aggregate_type?: string
  description?: string
  created_at?: string
  updated_at?: string
}

export interface Benchmark {
  id: string
  product_id: string
  metric_name: string
  goal_value?: number
  warning_threshold?: number
  unit: string
  direction: 'above' | 'below'
  context?: string
  source?: string
  created_at?: string
  updated_at?: string
}

export interface Product {
  id: string
  name: string
  data_value: string
  slug: string
  description?: string
  platforms?: string[]
  medium?: string // deprecated - use mediums array
  mediums?: string[]
  notes?: string
  ai_guidelines?: string
  ai_prompt?: string
  // Analysis fields
  analysis_instructions?: string[]
  chain_of_thought_guidance?: string[]
  output_format_requirements?: Record<string, unknown>
  example_good_analysis?: string[]
  example_bad_analysis?: string[]
  // Optimization fields
  critical_metrics?: string[]
  warning_thresholds?: Record<string, unknown>
  optimization_priorities?: string[]
  // Constraints
  important_constraints_restrictions?: string
  is_active: boolean
  sort_order?: number
  subproducts?: SubProduct[]
  lumina_extractors?: LuminaExtractor[]
  benchmarks?: Benchmark[]
  created_at?: string
  updated_at?: string
}

export interface SchemaExport {
  version: string
  generated_at: string
  products: Product[]
}

// ============================================
// READ Operations
// ============================================

/**
 * Get all products with full hierarchy (subproducts, tactic_types)
 */
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      data_value,
      slug,
      description,
      platforms,
      medium,
      mediums,
      notes,
      ai_guidelines,
      ai_prompt,
      analysis_instructions,
      chain_of_thought_guidance,
      output_format_requirements,
      example_good_analysis,
      example_bad_analysis,
      critical_metrics,
      warning_thresholds,
      optimization_priorities,
      important_constraints_restrictions,
      is_active,
      sort_order,
      created_at,
      updated_at,
      lumina_extractors (
        id,
        product_id,
        name,
        path,
        when_conditions,
        aggregate_type,
        description,
        is_active,
        sort_order,
        created_at,
        updated_at
      ),
      subproducts (
        id,
        name,
        data_value,
        slug,
        description,
        platforms,
        medium,
        mediums,
        notes,
        kpis,
        alias_code,
        targeting_options,
        analysis_instructions,
        chain_of_thought_guidance,
        output_format_requirements,
        example_good_analysis,
        example_bad_analysis,
        critical_metrics,
        warning_thresholds,
        optimization_priorities,
        important_constraints_restrictions,
        product_id,
        is_active,
        sort_order,
        created_at,
        updated_at,
        tactic_types (
          id,
          name,
          alias_code,
          overview,
          analysis_instructions,
          lumina_data,
          data_value,
          slug,
          filename_stem,
          headers,
          aliases,
          subproduct_id,
          is_active,
          sort_order,
          created_at,
          updated_at
        )
      )
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch products:', error)
    throw new Error(error.message)
  }

  return (data || []) as Product[]
}

/**
 * Get a single product by ID
 */
export async function getProduct(productId: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      data_value,
      slug,
      description,
      platforms,
      medium,
      mediums,
      notes,
      ai_guidelines,
      ai_prompt,
      analysis_instructions,
      chain_of_thought_guidance,
      output_format_requirements,
      example_good_analysis,
      example_bad_analysis,
      critical_metrics,
      warning_thresholds,
      optimization_priorities,
      important_constraints_restrictions,
      is_active,
      sort_order,
      created_at,
      updated_at,
      lumina_extractors (
        id,
        product_id,
        name,
        path,
        when_conditions,
        aggregate_type,
        description,
        is_active,
        sort_order,
        created_at,
        updated_at
      ),
      subproducts (
        id,
        name,
        data_value,
        slug,
        description,
        platforms,
        medium,
        mediums,
        notes,
        kpis,
        alias_code,
        targeting_options,
        analysis_instructions,
        chain_of_thought_guidance,
        output_format_requirements,
        example_good_analysis,
        example_bad_analysis,
        critical_metrics,
        warning_thresholds,
        optimization_priorities,
        important_constraints_restrictions,
        product_id,
        is_active,
        sort_order,
        created_at,
        updated_at,
        tactic_types (
          id,
          name,
          alias_code,
          overview,
          analysis_instructions,
          lumina_data,
          data_value,
          slug,
          filename_stem,
          headers,
          aliases,
          subproduct_id,
          is_active,
          sort_order,
          created_at,
          updated_at
        )
      )
    `)
    .eq('id', productId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch product:', error)
    throw new Error(error.message)
  }

  return data as Product | null
}

/**
 * Export full schema as JSON
 */
export async function exportSchema(): Promise<SchemaExport> {
  const products = await getProducts()
  return {
    version: '2.0',
    generated_at: new Date().toISOString(),
    products,
  }
}

// ============================================
// CREATE Operations
// ============================================

/**
 * Create a new product
 */
export async function createProduct(data: {
  name: string
  slug?: string
  data_value?: string
  platforms?: string[]
  notes?: string
  ai_guidelines?: string
  ai_prompt?: string
  sort_order?: number
}): Promise<{ id: string }> {
  const slug = data.slug || generateSlug(data.name)
  const { data: result, error } = await supabase
    .from('products')
    .insert({
      name: data.name,
      slug: slug,
      data_value: data.data_value || slug,
      platforms: data.platforms,
      notes: data.notes,
      ai_guidelines: data.ai_guidelines,
      ai_prompt: data.ai_prompt,
      sort_order: data.sort_order || 0,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create product:', error)
    throw new Error(error.message)
  }

  // Sync to KV after changes
  await publishToKV('schema')

  return { id: result.id }
}

/**
 * Create a new subproduct
 */
export async function createSubproduct(data: {
  product_id: string
  name: string
  slug?: string
  data_value?: string
  platforms?: string[]
  notes?: string
  sort_order?: number
}): Promise<{ id: string }> {
  const slug = data.slug || generateSlug(data.name)
  const { data: result, error } = await supabase
    .from('subproducts')
    .insert({
      product_id: data.product_id,
      name: data.name,
      slug: slug,
      data_value: data.data_value || slug,
      platforms: data.platforms,
      notes: data.notes,
      sort_order: data.sort_order || 0,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create subproduct:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')

  return { id: result.id }
}

/**
 * Create a new tactic type
 */
export async function createTacticType(data: {
  subproduct_id: string
  name: string
  alias_code?: string
  overview?: string
  analysis_instructions?: string
  lumina_data?: string[]
  // Legacy fields
  slug?: string
  data_value?: string
  filename_stem?: string
  headers?: string[]
  aliases?: string[]
}): Promise<{ id: string }> {
  const slug = data.slug || generateSlug(data.name)
  const { data: result, error } = await supabase
    .from('tactic_types')
    .insert({
      subproduct_id: data.subproduct_id,
      name: data.name,
      alias_code: data.alias_code,
      overview: data.overview,
      analysis_instructions: data.analysis_instructions,
      lumina_data: data.lumina_data,
      slug: slug,
      data_value: data.data_value || slug,
      filename_stem: data.filename_stem || slug,
      headers: data.headers,
      aliases: data.aliases,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create tactic type:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')

  return { id: result.id }
}

// ============================================
// UPDATE Operations
// ============================================

/**
 * Update a product
 */
export async function updateProduct(
  productId: string,
  data: {
    name?: string
    slug?: string
    data_value?: string
    description?: string
    platforms?: string[]
    medium?: string
    mediums?: string[]
    notes?: string
    ai_guidelines?: string
    ai_prompt?: string
    // Analysis fields
    analysis_instructions?: string[]
    chain_of_thought_guidance?: string[]
    output_format_requirements?: Record<string, unknown>
    example_good_analysis?: string[]
    example_bad_analysis?: string[]
    // Optimization fields
    critical_metrics?: string[]
    warning_thresholds?: Record<string, unknown>
    optimization_priorities?: string[]
    // Constraints
    important_constraints_restrictions?: string
    sort_order?: number
    is_active?: boolean
  }
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)

  if (error) {
    console.error('Failed to update product:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')
}

/**
 * Update a subproduct
 */
export async function updateSubproduct(
  subproductId: string,
  data: {
    name?: string
    slug?: string
    data_value?: string
    description?: string
    platforms?: string[]
    notes?: string
    kpis?: string[]
    medium?: string
    mediums?: string[]
    alias_code?: string
    targeting_options?: string[]
    // Analysis fields
    analysis_instructions?: string[]
    chain_of_thought_guidance?: string[]
    output_format_requirements?: Record<string, unknown>
    example_good_analysis?: string[]
    example_bad_analysis?: string[]
    // Optimization fields
    critical_metrics?: string[]
    warning_thresholds?: Record<string, unknown>
    optimization_priorities?: string[]
    // Constraints
    important_constraints_restrictions?: string
    sort_order?: number
    is_active?: boolean
  }
): Promise<void> {
  const { error } = await supabase
    .from('subproducts')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subproductId)

  if (error) {
    console.error('Failed to update subproduct:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')
}

/**
 * Update a tactic type
 */
export async function updateTacticType(
  tacticTypeId: string,
  data: {
    name?: string
    alias_code?: string
    overview?: string
    analysis_instructions?: string
    lumina_data?: string[]
    // Legacy fields
    slug?: string
    data_value?: string
    filename_stem?: string
    headers?: string[]
    aliases?: string[]
    is_active?: boolean
  }
): Promise<void> {
  const { error } = await supabase
    .from('tactic_types')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tacticTypeId)

  if (error) {
    console.error('Failed to update tactic type:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')
}

// ============================================
// DELETE Operations
// ============================================

/**
 * Delete a product (cascades to subproducts and tactic types)
 */
export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) {
    console.error('Failed to delete product:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')
}

/**
 * Delete a subproduct (cascades to tactic types)
 */
export async function deleteSubproduct(subproductId: string): Promise<void> {
  const { error } = await supabase
    .from('subproducts')
    .delete()
    .eq('id', subproductId)

  if (error) {
    console.error('Failed to delete subproduct:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')
}

/**
 * Delete a tactic type
 */
export async function deleteTacticType(tacticTypeId: string): Promise<void> {
  const { error } = await supabase
    .from('tactic_types')
    .delete()
    .eq('id', tacticTypeId)

  if (error) {
    console.error('Failed to delete tactic type:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a data_value from a name
 */
export function generateDataValue(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * Generate a slug from a name (alias for generateDataValue)
 */
export function generateSlug(name: string): string {
  return generateDataValue(name)
}

/**
 * Download schema as JSON file
 */
export async function downloadSchemaJson(): Promise<void> {
  const schema = await exportSchema()
  const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `unified_tactic_schema_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================
// Performance Tables CRUD
// ============================================

/**
 * Get performance tables for a subproduct
 */
export async function getPerformanceTables(subproductId: string): Promise<PerformanceTable[]> {
  const { data, error } = await supabase
    .from('performance_tables')
    .select('*')
    .eq('subproduct_id', subproductId)
    .order('sort_order', { ascending: true })
    .order('table_name', { ascending: true })

  if (error) {
    console.error('Failed to fetch performance tables:', error)
    throw new Error(error.message)
  }

  return (data || []) as PerformanceTable[]
}

/**
 * Create a new performance table
 */
export async function createPerformanceTable(data: {
  subproduct_id: string
  table_name: string
  file_name: string
  headers: string[]
  description?: string
  is_required?: boolean
  sort_order?: number
}): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('performance_tables')
    .insert({
      subproduct_id: data.subproduct_id,
      table_name: data.table_name,
      file_name: data.file_name,
      headers: data.headers,
      description: data.description,
      is_required: data.is_required || false,
      sort_order: data.sort_order || 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create performance table:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')

  return { id: result.id }
}

/**
 * Update a performance table
 */
export async function updatePerformanceTable(
  tableId: string,
  data: {
    table_name?: string
    file_name?: string
    headers?: string[]
    description?: string
    is_required?: boolean
    sort_order?: number
  }
): Promise<void> {
  const { error } = await supabase
    .from('performance_tables')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tableId)

  if (error) {
    console.error('Failed to update performance table:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')
}

/**
 * Delete a performance table
 */
export async function deletePerformanceTable(tableId: string): Promise<void> {
  const { error } = await supabase
    .from('performance_tables')
    .delete()
    .eq('id', tableId)

  if (error) {
    console.error('Failed to delete performance table:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')
}

// ============================================
// Table Validator CRUD
// ============================================

/**
 * Get table validator for a subproduct
 */
export async function getTableValidator(subproductId: string): Promise<TableValidator | null> {
  const { data, error } = await supabase
    .from('table_validators')
    .select('*')
    .eq('subproduct_id', subproductId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch table validator:', error)
    throw new Error(error.message)
  }

  return data as TableValidator | null
}

/**
 * Upsert table validator for a subproduct
 */
export async function upsertTableValidator(data: {
  subproduct_id: string
  required_tables: string[]
  minimum_tables: number
}): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('table_validators')
    .upsert({
      subproduct_id: data.subproduct_id,
      required_tables: data.required_tables,
      minimum_tables: data.minimum_tables,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'subproduct_id'
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to upsert table validator:', error)
    throw new Error(error.message)
  }

  await publishToKV('schema')

  return { id: result.id }
}
