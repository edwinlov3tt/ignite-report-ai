/**
 * Mediums API Service
 * Connects directly to Supabase for medium management
 */

import { supabase, publishToKV } from './supabase'

// ============================================
// Types
// ============================================

export interface Medium {
  id: string
  name: string
  code: string
  description?: string
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a code from a medium name
 * e.g., "Connected TV" -> "connected_tv"
 */
export function generateMediumCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Create a medium from just a name (convenience wrapper)
 * Returns the medium name for immediate use
 */
export async function createMediumFromName(name: string, description?: string): Promise<string> {
  const code = generateMediumCode(name)

  // Check if medium with this name already exists
  const { data: existing } = await supabase
    .from('mediums')
    .select('name')
    .eq('name', name)
    .single()

  if (existing) {
    return existing.name
  }

  // Get max sort_order for new medium
  const { data: maxOrder } = await supabase
    .from('mediums')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrder?.sort_order || 0) + 1

  // Create new medium
  const { error } = await supabase
    .from('mediums')
    .insert({
      code,
      name,
      description,
      is_active: true,
      sort_order: nextOrder,
    })

  if (error) {
    // If it's a unique constraint error on code, the medium might exist with different name
    if (error.code === '23505') {
      console.warn('Medium code already exists, skipping creation:', code)
      return name
    }
    console.error('Failed to create medium:', error)
    throw new Error(error.message)
  }

  await publishToKV('mediums')

  return name
}

// ============================================
// READ Operations
// ============================================

/**
 * Get all active mediums
 */
export async function getMediums(): Promise<Medium[]> {
  const { data, error } = await supabase
    .from('mediums')
    .select(`
      id,
      name,
      code,
      description,
      is_active,
      sort_order,
      created_at,
      updated_at
    `)
    .eq('is_active', true)
    .order('sort_order')
    .order('name')

  if (error) {
    console.error('Failed to fetch mediums:', error)
    throw new Error(error.message)
  }

  return (data || []) as Medium[]
}

/**
 * Get all mediums including inactive
 */
export async function getAllMediums(): Promise<Medium[]> {
  const { data, error } = await supabase
    .from('mediums')
    .select(`
      id,
      name,
      code,
      description,
      is_active,
      sort_order,
      created_at,
      updated_at
    `)
    .order('sort_order')
    .order('name')

  if (error) {
    console.error('Failed to fetch mediums:', error)
    throw new Error(error.message)
  }

  return (data || []) as Medium[]
}

/**
 * Get a single medium by ID
 */
export async function getMedium(id: string): Promise<Medium | null> {
  const { data, error } = await supabase
    .from('mediums')
    .select(`
      id,
      name,
      code,
      description,
      is_active,
      sort_order,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch medium:', error)
    throw new Error(error.message)
  }

  return data as Medium | null
}

/**
 * Get a medium by name
 */
export async function getMediumByName(name: string): Promise<Medium | null> {
  const { data, error } = await supabase
    .from('mediums')
    .select(`
      id,
      name,
      code,
      description,
      is_active,
      sort_order,
      created_at,
      updated_at
    `)
    .eq('name', name)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch medium:', error)
    throw new Error(error.message)
  }

  return data as Medium | null
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Create a new medium
 */
export async function createMedium(data: {
  name: string
  code?: string
  description?: string
  sort_order?: number
}): Promise<{ id: string }> {
  const code = data.code || generateMediumCode(data.name)

  // Get max sort_order if not provided
  let sortOrder = data.sort_order
  if (sortOrder === undefined) {
    const { data: maxOrder } = await supabase
      .from('mediums')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()
    sortOrder = (maxOrder?.sort_order || 0) + 1
  }

  const { data: result, error } = await supabase
    .from('mediums')
    .insert({
      code,
      name: data.name,
      description: data.description,
      is_active: true,
      sort_order: sortOrder,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create medium:', error)
    throw new Error(error.message)
  }

  await publishToKV('mediums')

  return { id: result.id }
}

/**
 * Update a medium
 */
export async function updateMedium(
  id: string,
  data: {
    name?: string
    code?: string
    description?: string
    is_active?: boolean
    sort_order?: number
  }
): Promise<void> {
  const { error } = await supabase
    .from('mediums')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Failed to update medium:', error)
    throw new Error(error.message)
  }

  await publishToKV('mediums')
}

/**
 * Delete a medium and remove it from all products/subproducts
 */
export async function deleteMedium(id: string): Promise<{ removedFromProducts: number; removedFromSubproducts: number }> {
  // First, get the medium name so we can remove it from products/subproducts
  const { data: medium, error: fetchError } = await supabase
    .from('mediums')
    .select('name')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Failed to fetch medium:', fetchError)
    throw new Error(fetchError.message)
  }

  const mediumName = medium.name

  // Remove from all products that have this medium
  const { data: productsWithMedium } = await supabase
    .from('products')
    .select('id, mediums')
    .contains('mediums', [mediumName])

  let removedFromProducts = 0
  if (productsWithMedium && productsWithMedium.length > 0) {
    for (const product of productsWithMedium) {
      const updatedMediums = (product.mediums || []).filter((m: string) => m !== mediumName)
      await supabase
        .from('products')
        .update({ mediums: updatedMediums, updated_at: new Date().toISOString() })
        .eq('id', product.id)
      removedFromProducts++
    }
  }

  // Remove from all subproducts that have this medium
  const { data: subproductsWithMedium } = await supabase
    .from('subproducts')
    .select('id, mediums')
    .contains('mediums', [mediumName])

  let removedFromSubproducts = 0
  if (subproductsWithMedium && subproductsWithMedium.length > 0) {
    for (const subproduct of subproductsWithMedium) {
      const updatedMediums = (subproduct.mediums || []).filter((m: string) => m !== mediumName)
      await supabase
        .from('subproducts')
        .update({ mediums: updatedMediums, updated_at: new Date().toISOString() })
        .eq('id', subproduct.id)
      removedFromSubproducts++
    }
  }

  // Now delete the medium
  const { error: deleteError } = await supabase
    .from('mediums')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('Failed to delete medium:', deleteError)
    throw new Error(deleteError.message)
  }

  // Sync all affected caches
  await publishToKV('mediums')
  await publishToKV('schema')

  return { removedFromProducts, removedFromSubproducts }
}

/**
 * Delete a medium by name (convenience wrapper)
 */
export async function deleteMediumByName(name: string): Promise<{ removedFromProducts: number; removedFromSubproducts: number }> {
  // Find the medium by name
  const { data: medium, error } = await supabase
    .from('mediums')
    .select('id')
    .eq('name', name)
    .single()

  if (error || !medium) {
    throw new Error(`Medium "${name}" not found`)
  }

  return deleteMedium(medium.id)
}
