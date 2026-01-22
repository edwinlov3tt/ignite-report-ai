/**
 * Embedding Generation Service
 * Generates vector embeddings for RAG-enhanced semantic search
 * Uses OpenAI text-embedding-3-small for cost-effective embeddings
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { Env } from '../types/bindings'

// Embedding dimensions for text-embedding-3-small
const EMBEDDING_DIMENSIONS = 1536
const EMBEDDING_MODEL = 'text-embedding-3-small'

/**
 * Result of embedding generation
 */
export interface EmbeddingResult {
  embedding: number[]
  tokensUsed: number
}

/**
 * Batch embedding result
 */
export interface BatchEmbeddingResult {
  success: boolean
  processed: number
  failed: number
  tokensUsed: number
  errors: string[]
}

/**
 * Generate embedding for a single text using OpenAI API
 */
export async function generateEmbedding(
  text: string,
  env: Env
): Promise<EmbeddingResult> {
  // Truncate text if too long (max ~8000 tokens for embedding model)
  const truncatedText = text.slice(0, 30000)

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncatedText,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI embedding failed: ${error}`)
  }

  const data = await response.json() as {
    data: Array<{ embedding: number[] }>
    usage: { total_tokens: number }
  }

  return {
    embedding: data.data[0].embedding,
    tokensUsed: data.usage.total_tokens,
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateBatchEmbeddings(
  texts: string[],
  env: Env
): Promise<{ embeddings: number[][]; tokensUsed: number }> {
  // OpenAI supports batch embeddings
  const truncatedTexts = texts.map(t => t.slice(0, 30000))

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncatedTexts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI batch embedding failed: ${error}`)
  }

  const data = await response.json() as {
    data: Array<{ embedding: number[]; index: number }>
    usage: { total_tokens: number }
  }

  // Sort by index to maintain order
  const sortedData = data.data.sort((a, b) => a.index - b.index)

  return {
    embeddings: sortedData.map(d => d.embedding),
    tokensUsed: data.usage.total_tokens,
  }
}

/**
 * Embed records for a specific table
 */
export async function embedTableRecords(
  supabase: SupabaseClient,
  env: Env,
  tableName: string,
  batchSize: number = 20
): Promise<BatchEmbeddingResult> {
  const result: BatchEmbeddingResult = {
    success: true,
    processed: 0,
    failed: 0,
    tokensUsed: 0,
    errors: [],
  }

  // Get records needing embeddings
  const { data: records, error: fetchError } = await supabase
    .rpc('get_records_needing_embeddings', {
      target_table: tableName,
      batch_size: batchSize,
    })

  if (fetchError) {
    result.success = false
    result.errors.push(`Failed to fetch records: ${fetchError.message}`)
    return result
  }

  if (!records || records.length === 0) {
    return result // Nothing to process
  }

  // Process in batches to avoid rate limits
  const BATCH_SIZE = 10
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const texts = batch.map((r: { text_to_embed: string }) => r.text_to_embed)
    const ids = batch.map((r: { record_id: string }) => r.record_id)

    try {
      const { embeddings, tokensUsed } = await generateBatchEmbeddings(texts, env)
      result.tokensUsed += tokensUsed

      // Update each record with its embedding
      for (let j = 0; j < ids.length; j++) {
        const { error: updateError } = await supabase
          .from(tableName)
          .update({
            embedding: embeddings[j],
            embedding_text: texts[j].slice(0, 1000), // Store first 1000 chars for debugging
            embedded_at: new Date().toISOString(),
          })
          .eq('id', ids[j])

        if (updateError) {
          result.failed++
          result.errors.push(`Failed to update ${ids[j]}: ${updateError.message}`)
        } else {
          result.processed++
        }
      }
    } catch (e) {
      result.failed += batch.length
      result.errors.push(`Batch embedding failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < records.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  result.success = result.failed === 0

  return result
}

/**
 * Embed all tables that need embeddings
 */
export async function embedAllTables(
  supabase: SupabaseClient,
  env: Env
): Promise<Record<string, BatchEmbeddingResult>> {
  const tables = [
    'platforms',
    'platform_quirks',
    'industries',
    'industry_insights',
    'products',
    'tactic_types',
    'lumina_discovered_fields',
  ]

  const results: Record<string, BatchEmbeddingResult> = {}

  for (const table of tables) {
    results[table] = await embedTableRecords(supabase, env, table)
  }

  return results
}

/**
 * Chunk soul document content for fine-grained retrieval
 */
export function chunkSoulDocument(
  content: string,
  maxChunkSize: number = 1000
): string[] {
  const chunks: string[] = []

  // Split by double newlines (paragraphs) or XML-style tags
  const sections = content.split(/\n\n+|(?=<[a-z_]+>)|(?<=<\/[a-z_]+>)/)

  let currentChunk = ''

  for (const section of sections) {
    const trimmedSection = section.trim()
    if (!trimmedSection) continue

    // If adding this section would exceed limit, save current chunk
    if (currentChunk.length + trimmedSection.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim())
      currentChunk = ''
    }

    currentChunk += (currentChunk ? '\n\n' : '') + trimmedSection
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * Embed soul document chunks
 */
export async function embedSoulDocumentChunks(
  supabase: SupabaseClient,
  env: Env,
  versionId: string
): Promise<BatchEmbeddingResult> {
  const result: BatchEmbeddingResult = {
    success: true,
    processed: 0,
    failed: 0,
    tokensUsed: 0,
    errors: [],
  }

  // Get the version content
  const { data: version, error: versionError } = await supabase
    .from('soul_document_versions')
    .select('content')
    .eq('id', versionId)
    .single()

  if (versionError || !version) {
    result.success = false
    result.errors.push(`Failed to fetch version: ${versionError?.message || 'Not found'}`)
    return result
  }

  // Chunk the content
  const chunks = chunkSoulDocument(version.content)

  // Delete existing chunks for this version
  await supabase
    .from('soul_document_chunks')
    .delete()
    .eq('version_id', versionId)

  // Generate embeddings for all chunks
  try {
    const { embeddings, tokensUsed } = await generateBatchEmbeddings(chunks, env)
    result.tokensUsed = tokensUsed

    // Insert chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const { error: insertError } = await supabase
        .from('soul_document_chunks')
        .insert({
          version_id: versionId,
          chunk_index: i,
          content: chunks[i],
          token_count: Math.ceil(chunks[i].length / 4), // Rough estimate
          embedding: embeddings[i],
          embedded_at: new Date().toISOString(),
        })

      if (insertError) {
        result.failed++
        result.errors.push(`Failed to insert chunk ${i}: ${insertError.message}`)
      } else {
        result.processed++
      }
    }
  } catch (e) {
    result.success = false
    result.errors.push(`Embedding failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
  }

  result.success = result.failed === 0

  return result
}

/**
 * Get embedding statistics
 */
export async function getEmbeddingStats(
  supabase: SupabaseClient
): Promise<{
  tables: Record<string, { total: number; embedded: number; pending: number }>
  totalTokensUsed: number
}> {
  const tables = [
    'platforms',
    'platform_quirks',
    'industries',
    'industry_insights',
    'products',
    'tactic_types',
    'lumina_discovered_fields',
  ]

  const stats: Record<string, { total: number; embedded: number; pending: number }> = {}

  for (const table of tables) {
    const { count: total } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    const { count: embedded } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .not('embedding', 'is', null)

    stats[table] = {
      total: total || 0,
      embedded: embedded || 0,
      pending: (total || 0) - (embedded || 0),
    }
  }

  // Get total tokens from embedding jobs
  const { data: jobStats } = await supabase
    .from('embedding_jobs')
    .select('tokens_used')
    .eq('status', 'completed')

  const totalTokensUsed = (jobStats || []).reduce(
    (sum: number, job: { tokens_used: number | null }) => sum + (job.tokens_used || 0),
    0
  )

  return { tables: stats, totalTokensUsed }
}
