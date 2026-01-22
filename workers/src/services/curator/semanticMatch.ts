/**
 * Semantic Matching Service for Schema Curator
 * Uses pgvector embeddings to find existing entities that match input content
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { Env } from '../../types/bindings'
import type { SemanticMatch, MatchContext, CoreEntityType } from '../../types/curator'
import { generateEmbedding } from '../embeddings'

// Minimum similarity threshold for matches
const MIN_SIMILARITY = 0.6

/**
 * Extract potential entity mentions from text
 * Returns key phrases that might reference existing entities
 */
export function extractMentions(content: string): string[] {
  const mentions: string[] = []

  // Common patterns for entity mentions
  const patterns = [
    // "For X campaigns" or "In X campaigns"
    /(?:for|in|on|with)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:campaigns?|ads?|advertising)/gi,
    // "X industry" or "X vertical"
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:industry|vertical|sector|business)/gi,
    // Platform names (capitalized words near ad-related terms)
    /(?:on|using|via|through)\s+([A-Z][a-zA-Z]+(?:\s+Ads?)?)/gi,
    // Product types
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:product|tactic|strategy|campaign type)/gi,
    // Explicit mentions like "Facebook", "Google Ads", "Meta"
    /(Meta|Facebook|Google|TikTok|LinkedIn|Twitter|X|Instagram|YouTube|Pinterest|Snapchat|Reddit|Amazon|Microsoft|Bing)/gi,
    // Industry terms
    /(Roofing|Retail|Healthcare|Finance|Automotive|Real Estate|E-commerce|SaaS|B2B|B2C|CPG|FMCG|Pharma|Insurance|Banking|Travel|Hospitality)/gi,
    // Product/tactic terms
    /(SEM|SEO|PPC|Display|Video|CTV|OTT|Programmatic|Social|Email|Native|Search|Shopping|Performance Max|Demand Gen)/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const mention = match[1]?.trim()
      if (mention && mention.length > 2 && !mentions.includes(mention)) {
        mentions.push(mention)
      }
    }
  }

  return mentions
}

/**
 * Find matching platforms using semantic search
 */
async function matchPlatforms(
  supabase: SupabaseClient,
  env: Env,
  mentions: string[]
): Promise<SemanticMatch[]> {
  const matches: SemanticMatch[] = []

  for (const mention of mentions) {
    try {
      // Generate embedding for the mention
      const { embedding } = await generateEmbedding(mention, env)

      // Search for matching platforms
      const { data, error } = await supabase.rpc('match_platforms', {
        query_embedding: embedding,
        match_count: 2,
        min_similarity: MIN_SIMILARITY,
      })

      if (!error && data && data.length > 0) {
        for (const result of data) {
          // Avoid duplicates
          if (!matches.find(m => m.entity_id === result.id)) {
            matches.push({
              entity_type: 'platform',
              entity_id: result.id,
              entity_name: result.name,
              similarity: result.similarity,
              matched_text: mention,
            })
          }
        }
      }
    } catch (e) {
      console.error(`Failed to match platform for "${mention}":`, e)
    }
  }

  return matches
}

/**
 * Find matching industries using semantic search
 */
async function matchIndustries(
  supabase: SupabaseClient,
  env: Env,
  mentions: string[]
): Promise<SemanticMatch[]> {
  const matches: SemanticMatch[] = []

  for (const mention of mentions) {
    try {
      const { embedding } = await generateEmbedding(mention, env)

      const { data, error } = await supabase.rpc('match_similar_industries', {
        query_embedding: embedding,
        match_count: 2,
        min_similarity: MIN_SIMILARITY,
      })

      if (!error && data && data.length > 0) {
        for (const result of data) {
          if (!matches.find(m => m.entity_id === result.id)) {
            matches.push({
              entity_type: 'industry',
              entity_id: result.id,
              entity_name: result.name,
              similarity: result.similarity,
              matched_text: mention,
            })
          }
        }
      }
    } catch (e) {
      console.error(`Failed to match industry for "${mention}":`, e)
    }
  }

  return matches
}

/**
 * Find matching products using semantic search
 */
async function matchProducts(
  supabase: SupabaseClient,
  env: Env,
  mentions: string[]
): Promise<SemanticMatch[]> {
  const matches: SemanticMatch[] = []

  for (const mention of mentions) {
    try {
      const { embedding } = await generateEmbedding(mention, env)

      const { data, error } = await supabase.rpc('match_products', {
        query_embedding: embedding,
        match_count: 2,
        min_similarity: MIN_SIMILARITY,
      })

      if (!error && data && data.length > 0) {
        for (const result of data) {
          if (!matches.find(m => m.entity_id === result.id)) {
            matches.push({
              entity_type: 'product',
              entity_id: result.id,
              entity_name: result.name,
              similarity: result.similarity,
              matched_text: mention,
            })
          }
        }
      }
    } catch (e) {
      console.error(`Failed to match product for "${mention}":`, e)
    }
  }

  return matches
}

/**
 * Find matching tactic types using semantic search
 */
async function matchTactics(
  supabase: SupabaseClient,
  env: Env,
  mentions: string[]
): Promise<SemanticMatch[]> {
  const matches: SemanticMatch[] = []

  for (const mention of mentions) {
    try {
      const { embedding } = await generateEmbedding(mention, env)

      const { data, error } = await supabase.rpc('match_tactics', {
        query_embedding: embedding,
        match_count: 2,
        min_similarity: MIN_SIMILARITY,
      })

      if (!error && data && data.length > 0) {
        for (const result of data) {
          if (!matches.find(m => m.entity_id === result.tactic_id)) {
            matches.push({
              entity_type: 'tactic_type',
              entity_id: result.tactic_id,
              entity_name: result.tactic_name,
              similarity: result.similarity,
              matched_text: mention,
            })
          }
        }
      }
    } catch (e) {
      console.error(`Failed to match tactic for "${mention}":`, e)
    }
  }

  return matches
}

/**
 * Find all matching entities in the content
 * This is the main entry point for semantic matching
 */
export async function findMatchingEntities(
  supabase: SupabaseClient,
  env: Env,
  content: string
): Promise<MatchContext> {
  // Extract potential entity mentions from the content
  const mentions = extractMentions(content)

  console.log('Extracted mentions:', mentions)

  if (mentions.length === 0) {
    // If no explicit mentions, try matching the entire content summary
    const summary = content.slice(0, 500)
    mentions.push(summary)
  }

  // Run all matching in parallel
  const [platforms, industries, products, tactic_types] = await Promise.all([
    matchPlatforms(supabase, env, mentions),
    matchIndustries(supabase, env, mentions),
    matchProducts(supabase, env, mentions),
    matchTactics(supabase, env, mentions),
  ])

  return {
    platforms,
    industries,
    products,
    tactic_types,
  }
}

/**
 * Check if a specific entity name exists in the database
 * Returns the entity if found, null otherwise
 */
export async function checkEntityExists(
  supabase: SupabaseClient,
  entityType: CoreEntityType,
  name: string
): Promise<{ id: string; name: string } | null> {
  const tableMap: Record<CoreEntityType, string> = {
    platform: 'platforms',
    industry: 'industries',
    product: 'products',
    subproduct: 'subproducts',
    tactic_type: 'tactic_types',
    soul_doc: 'soul_documents',
  }

  const table = tableMap[entityType]
  if (!table) return null

  // Try exact match first (case-insensitive)
  const { data, error } = await supabase
    .from(table)
    .select('id, name')
    .ilike('name', name)
    .limit(1)
    .single()

  if (!error && data) {
    return { id: data.id, name: data.name }
  }

  return null
}

/**
 * Get summary of matched entities for the AI prompt
 */
export function formatMatchContextForPrompt(context: MatchContext): string {
  const sections: string[] = []

  if (context.platforms.length > 0) {
    sections.push('MATCHED PLATFORMS:\n' + context.platforms.map(p =>
      `- "${p.entity_name}" (ID: ${p.entity_id}, matched "${p.matched_text}", similarity: ${(p.similarity * 100).toFixed(0)}%)`
    ).join('\n'))
  }

  if (context.industries.length > 0) {
    sections.push('MATCHED INDUSTRIES:\n' + context.industries.map(i =>
      `- "${i.entity_name}" (ID: ${i.entity_id}, matched "${i.matched_text}", similarity: ${(i.similarity * 100).toFixed(0)}%)`
    ).join('\n'))
  }

  if (context.products.length > 0) {
    sections.push('MATCHED PRODUCTS:\n' + context.products.map(p =>
      `- "${p.entity_name}" (ID: ${p.entity_id}, matched "${p.matched_text}", similarity: ${(p.similarity * 100).toFixed(0)}%)`
    ).join('\n'))
  }

  if (context.tactic_types.length > 0) {
    sections.push('MATCHED TACTICS:\n' + context.tactic_types.map(t =>
      `- "${t.entity_name}" (ID: ${t.entity_id}, matched "${t.matched_text}", similarity: ${(t.similarity * 100).toFixed(0)}%)`
    ).join('\n'))
  }

  if (sections.length === 0) {
    return 'NO EXISTING ENTITIES MATCHED - This content may describe new entities to create.'
  }

  return sections.join('\n\n')
}
