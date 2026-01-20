/**
 * Platforms API Service
 * Connects directly to Supabase for platform knowledge management
 */

import { supabase, publishToKV } from './supabase'
import type {
  Platform,
  PlatformQuirk,
  PlatformKPI,
  PlatformThreshold,
  PlatformBuyerNote,
  QuirkType,
  ImpactLevel,
  Objective,
  Direction,
  NoteType,
  PlatformCategory
} from '@/types/admin'

// Re-export types for convenience
export type {
  Platform,
  PlatformQuirk,
  PlatformKPI,
  PlatformThreshold,
  PlatformBuyerNote
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a code from a platform name
 * e.g., "The Trade Desk" -> "the_trade_desk"
 */
export function generatePlatformCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Create a platform from just a name (convenience wrapper)
 * Returns the platform name for immediate use
 */
export async function createPlatformFromName(name: string): Promise<string> {
  const code = generatePlatformCode(name)

  // Check if platform with this name already exists
  const { data: existing } = await supabase
    .from('platforms')
    .select('name')
    .eq('name', name)
    .single()

  if (existing) {
    return existing.name
  }

  // Create new platform
  const { error } = await supabase
    .from('platforms')
    .insert({
      code,
      name,
      is_active: true,
    })

  if (error) {
    // If it's a unique constraint error on code, the platform might exist with different name
    if (error.code === '23505') {
      console.warn('Platform code already exists, skipping creation:', code)
      return name
    }
    console.error('Failed to create platform:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')

  return name
}

// ============================================
// READ Operations
// ============================================

/**
 * Get all platforms with related data
 */
export async function getPlatforms(): Promise<Platform[]> {
  const { data, error } = await supabase
    .from('platforms')
    .select(`
      id,
      code,
      name,
      category,
      logo_url,
      description,
      is_active,
      created_at,
      updated_at,
      quirks:platform_quirks (
        id,
        platform_id,
        quirk_type,
        title,
        description,
        impact,
        ai_instruction,
        source,
        contributed_by,
        verified_by,
        applies_to_tactics,
        created_at
      ),
      kpis:platform_kpis (
        id,
        platform_id,
        objective,
        primary_kpis,
        secondary_kpis,
        notes,
        created_at
      ),
      thresholds:platform_thresholds (
        id,
        platform_id,
        metric,
        warning_value,
        critical_value,
        direction,
        context,
        tactic_id,
        created_at
      ),
      buyer_notes:platform_buyer_notes (
        id,
        platform_id,
        note_type,
        content,
        tactic_id,
        contributed_by,
        upvotes,
        is_verified,
        verified_by,
        created_at
      )
    `)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Failed to fetch platforms:', error)
    throw new Error(error.message)
  }

  return (data || []) as Platform[]
}

/**
 * Get a single platform by ID with all related data
 */
export async function getPlatform(id: string): Promise<Platform | null> {
  const { data, error } = await supabase
    .from('platforms')
    .select(`
      id,
      code,
      name,
      category,
      logo_url,
      description,
      is_active,
      created_at,
      updated_at,
      quirks:platform_quirks (
        id,
        platform_id,
        quirk_type,
        title,
        description,
        impact,
        ai_instruction,
        source,
        contributed_by,
        verified_by,
        applies_to_tactics,
        created_at
      ),
      kpis:platform_kpis (
        id,
        platform_id,
        objective,
        primary_kpis,
        secondary_kpis,
        notes,
        created_at
      ),
      thresholds:platform_thresholds (
        id,
        platform_id,
        metric,
        warning_value,
        critical_value,
        direction,
        context,
        tactic_id,
        created_at
      ),
      buyer_notes:platform_buyer_notes (
        id,
        platform_id,
        note_type,
        content,
        tactic_id,
        contributed_by,
        upvotes,
        is_verified,
        verified_by,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch platform:', error)
    throw new Error(error.message)
  }

  return data as Platform | null
}

// ============================================
// Platform CRUD
// ============================================

/**
 * Create a new platform
 */
export async function createPlatform(data: {
  code: string
  name: string
  category?: PlatformCategory
  description?: string
}): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('platforms')
    .insert({
      code: data.code,
      name: data.name,
      category: data.category,
      description: data.description,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create platform:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')

  return { id: result.id }
}

/**
 * Update a platform
 */
export async function updatePlatform(
  id: string,
  data: {
    code?: string
    name?: string
    category?: PlatformCategory
    description?: string
    is_active?: boolean
  }
): Promise<void> {
  const { error } = await supabase
    .from('platforms')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Failed to update platform:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')
}

/**
 * Delete a platform and remove it from all products/subproducts
 */
export async function deletePlatform(id: string): Promise<{ removedFromProducts: number; removedFromSubproducts: number }> {
  // First, get the platform name so we can remove it from products/subproducts
  const { data: platform, error: fetchError } = await supabase
    .from('platforms')
    .select('name')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Failed to fetch platform:', fetchError)
    throw new Error(fetchError.message)
  }

  const platformName = platform.name

  // Remove from all products that have this platform
  const { data: productsWithPlatform } = await supabase
    .from('products')
    .select('id, platforms')
    .contains('platforms', [platformName])

  let removedFromProducts = 0
  if (productsWithPlatform && productsWithPlatform.length > 0) {
    for (const product of productsWithPlatform) {
      const updatedPlatforms = (product.platforms || []).filter((p: string) => p !== platformName)
      await supabase
        .from('products')
        .update({ platforms: updatedPlatforms, updated_at: new Date().toISOString() })
        .eq('id', product.id)
      removedFromProducts++
    }
  }

  // Remove from all subproducts that have this platform
  const { data: subproductsWithPlatform } = await supabase
    .from('subproducts')
    .select('id, platforms')
    .contains('platforms', [platformName])

  let removedFromSubproducts = 0
  if (subproductsWithPlatform && subproductsWithPlatform.length > 0) {
    for (const subproduct of subproductsWithPlatform) {
      const updatedPlatforms = (subproduct.platforms || []).filter((p: string) => p !== platformName)
      await supabase
        .from('subproducts')
        .update({ platforms: updatedPlatforms, updated_at: new Date().toISOString() })
        .eq('id', subproduct.id)
      removedFromSubproducts++
    }
  }

  // Now delete the platform
  const { error: deleteError } = await supabase
    .from('platforms')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('Failed to delete platform:', deleteError)
    throw new Error(deleteError.message)
  }

  // Sync all affected caches
  await publishToKV('platforms')
  await publishToKV('schema')

  return { removedFromProducts, removedFromSubproducts }
}

/**
 * Delete a platform by name (convenience wrapper)
 */
export async function deletePlatformByName(name: string): Promise<{ removedFromProducts: number; removedFromSubproducts: number }> {
  // Find the platform by name
  const { data: platform, error } = await supabase
    .from('platforms')
    .select('id')
    .eq('name', name)
    .single()

  if (error || !platform) {
    throw new Error(`Platform "${name}" not found`)
  }

  return deletePlatform(platform.id)
}

// ============================================
// Quirk Operations
// ============================================

/**
 * Add a quirk to a platform
 */
export async function addQuirk(
  platformId: string,
  data: {
    quirk_type: QuirkType
    title: string
    description: string
    impact: ImpactLevel
    ai_instruction?: string
    source?: string
    contributed_by?: string
  }
): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('platform_quirks')
    .insert({
      platform_id: platformId,
      quirk_type: data.quirk_type,
      title: data.title,
      description: data.description,
      impact: data.impact,
      ai_instruction: data.ai_instruction,
      source: data.source,
      contributed_by: data.contributed_by,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to add quirk:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')

  return { id: result.id }
}

/**
 * Update a quirk
 */
export async function updateQuirk(
  quirkId: string,
  data: {
    quirk_type?: QuirkType
    title?: string
    description?: string
    impact?: ImpactLevel
    ai_instruction?: string
    source?: string
    contributed_by?: string
    verified_by?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('platform_quirks')
    .update(data)
    .eq('id', quirkId)

  if (error) {
    console.error('Failed to update quirk:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')
}

/**
 * Delete a quirk
 */
export async function deleteQuirk(quirkId: string): Promise<void> {
  const { error } = await supabase
    .from('platform_quirks')
    .delete()
    .eq('id', quirkId)

  if (error) {
    console.error('Failed to delete quirk:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')
}

// ============================================
// KPI Operations
// ============================================

/**
 * Add a KPI to a platform
 */
export async function addKPI(
  platformId: string,
  data: {
    objective: Objective
    primary_kpis: string[]
    secondary_kpis?: string[]
    notes?: string
  }
): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('platform_kpis')
    .insert({
      platform_id: platformId,
      objective: data.objective,
      primary_kpis: data.primary_kpis,
      secondary_kpis: data.secondary_kpis,
      notes: data.notes,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to add KPI:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')

  return { id: result.id }
}

/**
 * Update a KPI
 */
export async function updateKPI(
  kpiId: string,
  data: {
    objective?: Objective
    primary_kpis?: string[]
    secondary_kpis?: string[]
    notes?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('platform_kpis')
    .update(data)
    .eq('id', kpiId)

  if (error) {
    console.error('Failed to update KPI:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')
}

/**
 * Delete a KPI
 */
export async function deleteKPI(kpiId: string): Promise<void> {
  const { error } = await supabase
    .from('platform_kpis')
    .delete()
    .eq('id', kpiId)

  if (error) {
    console.error('Failed to delete KPI:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')
}

// ============================================
// Threshold Operations
// ============================================

/**
 * Add a threshold to a platform
 */
export async function addThreshold(
  platformId: string,
  data: {
    metric: string
    warning_value?: number
    critical_value?: number
    direction: Direction
    context?: string
  }
): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('platform_thresholds')
    .insert({
      platform_id: platformId,
      metric: data.metric,
      warning_value: data.warning_value,
      critical_value: data.critical_value,
      direction: data.direction,
      context: data.context,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to add threshold:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')

  return { id: result.id }
}

/**
 * Update a threshold
 */
export async function updateThreshold(
  thresholdId: string,
  data: {
    metric?: string
    warning_value?: number
    critical_value?: number
    direction?: Direction
    context?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('platform_thresholds')
    .update(data)
    .eq('id', thresholdId)

  if (error) {
    console.error('Failed to update threshold:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')
}

/**
 * Delete a threshold
 */
export async function deleteThreshold(thresholdId: string): Promise<void> {
  const { error } = await supabase
    .from('platform_thresholds')
    .delete()
    .eq('id', thresholdId)

  if (error) {
    console.error('Failed to delete threshold:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')
}

// ============================================
// Buyer Note Operations
// ============================================

/**
 * Add a buyer note to a platform
 */
export async function addBuyerNote(
  platformId: string,
  data: {
    note_type: NoteType
    content: string
    contributed_by: string
  }
): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('platform_buyer_notes')
    .insert({
      platform_id: platformId,
      note_type: data.note_type,
      content: data.content,
      contributed_by: data.contributed_by,
      upvotes: 0,
      is_verified: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to add buyer note:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')

  return { id: result.id }
}

/**
 * Update a buyer note
 */
export async function updateBuyerNote(
  noteId: string,
  data: {
    note_type?: NoteType
    content?: string
    is_verified?: boolean
    verified_by?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('platform_buyer_notes')
    .update(data)
    .eq('id', noteId)

  if (error) {
    console.error('Failed to update buyer note:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')
}

/**
 * Upvote a buyer note
 */
export async function upvoteBuyerNote(noteId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_buyer_note_upvotes', { note_id: noteId })

  if (error) {
    // Fallback: fetch current value and increment
    const { data: note } = await supabase
      .from('platform_buyer_notes')
      .select('upvotes')
      .eq('id', noteId)
      .single()

    if (note) {
      await supabase
        .from('platform_buyer_notes')
        .update({ upvotes: (note.upvotes || 0) + 1 })
        .eq('id', noteId)
    }
  }

  await publishToKV('platforms')
}

/**
 * Delete a buyer note
 */
export async function deleteBuyerNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('platform_buyer_notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    console.error('Failed to delete buyer note:', error)
    throw new Error(error.message)
  }

  await publishToKV('platforms')
}
