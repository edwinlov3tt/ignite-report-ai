/**
 * Soul Documents API Service
 * Connects directly to Supabase for version-controlled prompts, personas, and templates
 */

import { supabase, publishToKV } from './supabase'

// Types matching the database schema
export interface SoulDocumentVersion {
  id: string
  document_id: string
  version: number
  content: string
  change_summary?: string
  changed_by?: string
  is_published: boolean
  published_at?: string
  created_at?: string
}

export interface SoulDocument {
  id: string
  doc_type: 'system_prompt' | 'agent_persona' | 'skill' | 'template'
  name: string
  slug: string
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  versions?: SoulDocumentVersion[]
  current_version?: SoulDocumentVersion
}

// ============================================
// READ Operations
// ============================================

/**
 * Get all soul documents with their versions
 */
export async function getSoulDocuments(): Promise<SoulDocument[]> {
  const { data, error } = await supabase
    .from('soul_documents')
    .select(`
      id,
      doc_type,
      name,
      slug,
      description,
      is_active,
      created_at,
      updated_at,
      versions:soul_document_versions (
        id,
        document_id,
        version,
        content,
        change_summary,
        changed_by,
        is_published,
        published_at,
        created_at
      )
    `)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Failed to fetch soul documents:', error)
    throw new Error(error.message)
  }

  // Add current_version helper
  const docs = (data || []).map(doc => ({
    ...doc,
    current_version: doc.versions?.find((v: SoulDocumentVersion) => v.is_published)
  }))

  return docs as SoulDocument[]
}

/**
 * Get a single soul document by ID with all versions
 */
export async function getSoulDocument(id: string): Promise<SoulDocument | null> {
  const { data, error } = await supabase
    .from('soul_documents')
    .select(`
      id,
      doc_type,
      name,
      slug,
      description,
      is_active,
      created_at,
      updated_at,
      versions:soul_document_versions (
        id,
        document_id,
        version,
        content,
        change_summary,
        changed_by,
        is_published,
        published_at,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch soul document:', error)
    throw new Error(error.message)
  }

  if (!data) return null

  // Sort versions by version number descending and add current_version
  const sortedVersions = [...(data.versions || [])].sort((a, b) => b.version - a.version)

  return {
    ...data,
    versions: sortedVersions,
    current_version: sortedVersions.find(v => v.is_published)
  } as SoulDocument
}

// ============================================
// Document CRUD
// ============================================

/**
 * Create a new soul document
 */
export async function createSoulDocument(data: {
  doc_type: 'system_prompt' | 'agent_persona' | 'skill' | 'template'
  name: string
  slug: string
  description?: string
}): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('soul_documents')
    .insert({
      doc_type: data.doc_type,
      name: data.name,
      slug: data.slug,
      description: data.description,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create soul document:', error)
    throw new Error(error.message)
  }

  await publishToKV('soul_docs')

  return { id: result.id }
}

/**
 * Update a soul document
 */
export async function updateSoulDocument(
  id: string,
  data: {
    doc_type?: 'system_prompt' | 'agent_persona' | 'skill' | 'template'
    name?: string
    slug?: string
    description?: string
    is_active?: boolean
  }
): Promise<void> {
  const { error } = await supabase
    .from('soul_documents')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Failed to update soul document:', error)
    throw new Error(error.message)
  }

  await publishToKV('soul_docs')
}

/**
 * Delete a soul document
 */
export async function deleteSoulDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('soul_documents')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete soul document:', error)
    throw new Error(error.message)
  }

  await publishToKV('soul_docs')
}

// ============================================
// Version Operations
// ============================================

/**
 * Create a new version of a document
 */
export async function createVersion(
  documentId: string,
  data: {
    content: string
    change_summary?: string
    changed_by?: string
  }
): Promise<{ id: string }> {
  // Get the current max version number
  const { data: versions } = await supabase
    .from('soul_document_versions')
    .select('version')
    .eq('document_id', documentId)
    .order('version', { ascending: false })
    .limit(1)

  const maxVersion = versions?.[0]?.version || 0

  const { data: result, error } = await supabase
    .from('soul_document_versions')
    .insert({
      document_id: documentId,
      version: maxVersion + 1,
      content: data.content,
      change_summary: data.change_summary,
      changed_by: data.changed_by || 'admin',
      is_published: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create version:', error)
    throw new Error(error.message)
  }

  await publishToKV('soul_docs')

  return { id: result.id }
}

/**
 * Publish a version (makes it the active version)
 */
export async function publishVersion(versionId: string): Promise<void> {
  // Get the document ID for this version
  const { data: version, error: fetchError } = await supabase
    .from('soul_document_versions')
    .select('document_id')
    .eq('id', versionId)
    .single()

  if (fetchError) {
    console.error('Failed to fetch version:', fetchError)
    throw new Error(fetchError.message)
  }

  // Unpublish all versions for this document
  const { error: unpublishError } = await supabase
    .from('soul_document_versions')
    .update({ is_published: false })
    .eq('document_id', version.document_id)

  if (unpublishError) {
    console.error('Failed to unpublish versions:', unpublishError)
    throw new Error(unpublishError.message)
  }

  // Publish the selected version
  const { error: publishError } = await supabase
    .from('soul_document_versions')
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .eq('id', versionId)

  if (publishError) {
    console.error('Failed to publish version:', publishError)
    throw new Error(publishError.message)
  }

  await publishToKV('soul_docs')
}

/**
 * Get a specific version
 */
export async function getVersion(versionId: string): Promise<SoulDocumentVersion | null> {
  const { data, error } = await supabase
    .from('soul_document_versions')
    .select('*')
    .eq('id', versionId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch version:', error)
    throw new Error(error.message)
  }

  return data as SoulDocumentVersion | null
}

/**
 * Compare two versions (returns both versions for diff display)
 */
export async function compareVersions(
  versionId1: string,
  versionId2: string
): Promise<{
  version1: SoulDocumentVersion
  version2: SoulDocumentVersion
}> {
  const [version1, version2] = await Promise.all([
    getVersion(versionId1),
    getVersion(versionId2),
  ])

  if (!version1 || !version2) {
    throw new Error('One or both versions not found')
  }

  return { version1, version2 }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}
