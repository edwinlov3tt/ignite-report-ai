/**
 * AI Extractor Suggestions Service
 * Uses Claude Haiku to analyze discovered fields and suggest extractors
 * Part of the Schema Intelligence system
 */

import { SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { createAnthropicClient } from './anthropic'
import type { Env } from '../types/bindings'

/**
 * Field data for AI analysis
 */
export interface FieldForAnalysis {
  path: string
  dataTypes: string[]
  samples: unknown[]
  frequency: number
  isNested: boolean
  occurrenceCount: number
}

/**
 * AI-generated extractor suggestion
 */
export interface ExtractorSuggestion {
  fieldPath: string
  relevanceScore: number  // 0-10
  extractorName: string   // snake_case name
  aggregationType: 'sum' | 'avg' | 'first' | 'last' | 'concat' | 'unique' | 'count'
  conditions: 'always' | Record<string, string | string[]>
  description: string
  category: 'budget' | 'performance' | 'creative' | 'targeting' | 'timeline' | 'structure' | 'metadata'
}

/**
 * Result of AI scoring run
 */
export interface ScoringResult {
  fieldsAnalyzed: number
  suggestionsGenerated: number
  highRelevance: number   // Score >= 7
  mediumRelevance: number // Score 4-6
  lowRelevance: number    // Score 1-3
  tokensUsed: {
    input: number
    output: number
  }
  durationMs: number
}

/**
 * Prompt for Claude Haiku to analyze fields
 */
const FIELD_ANALYSIS_PROMPT = `You are analyzing Lumina campaign management data fields for a marketing analytics platform called Report.AI.

Your task is to evaluate discovered fields and suggest which ones should be extracted as meaningful data points for campaign performance analysis.

For each field, you will:
1. Score its relevance (0-10) for marketing campaign analysis
2. Suggest an extractor name (snake_case)
3. Recommend how to aggregate values
4. Categorize the field type
5. Write a brief description

## Relevance Scoring Guidelines:
- **10**: Critical campaign metrics (budget, spend, impressions, clicks, conversions, revenue)
- **8-9**: Important performance indicators (CTR, CPM, CPV, view rates, engagement rates)
- **7-8**: Creative information (ad copy, headlines, descriptions, creative assets, image URLs, video URLs)
- **6-7**: Useful targeting/context (audience segments, geo targeting, keywords, platform)
- **4-5**: Campaign structure (product, subproduct, initiative, dates, status)
- **2-3**: Metadata (IDs, names, internal references)
- **0-1**: System fields, timestamps, or irrelevant data

## Aggregation Types:
- **sum**: For counts and amounts (budget, impressions, clicks)
- **avg**: For rates and percentages (CTR, CPM, engagement rate)
- **first**: For single values per campaign (company name, order name)
- **last**: For most recent value (status, last updated)
- **concat**: For combining text values (notes, descriptions, ad copy)
- **unique**: For collecting distinct values (platforms, products, creative variations)
- **count**: For counting occurrences

## Categories:
- **budget**: Financial data (budget, spend, cost, revenue)
- **performance**: Metrics (impressions, clicks, views, conversions)
- **creative**: Ad creative data (headlines, descriptions, copy, images, videos, CTAs, landing pages)
- **targeting**: Audience/targeting data (segments, geo, keywords)
- **timeline**: Date/time data (start, end, duration)
- **structure**: Campaign organization (product, initiative, tactic)
- **metadata**: IDs, names, status, references

## Response Format (JSON):
{
  "suggestions": [
    {
      "fieldPath": "the.field.path",
      "relevanceScore": 8,
      "extractorName": "suggested_name",
      "aggregationType": "sum",
      "conditions": "always",
      "description": "Brief description of what this field represents",
      "category": "performance"
    }
  ]
}

Only include fields with relevance score >= 3. Skip internal/system fields.
Focus on fields useful for:
- Budget analysis and spend tracking
- Performance metrics (impressions, clicks, views, conversions)
- **Creative information (ad copy, headlines, descriptions, images, videos, CTAs, landing page URLs)**
- **Creative instructions and specifications (size requirements, format, messaging guidelines)**
- Targeting information (audience, geo, keywords)
- Campaign structure (products, tactics, platforms)
- Timeline and pacing analysis

IMPORTANT: Creative fields are especially valuable for report generation as they provide context about what ads were shown. Look for fields containing:
- Ad headlines, titles, copy text
- Description text, body copy
- Call-to-action (CTA) text
- Image URLs, video URLs, asset links
- Creative specifications or instructions
- Landing page URLs
- Ad format or size information`

/**
 * Format fields for AI prompt
 */
function formatFieldsForPrompt(fields: FieldForAnalysis[]): string {
  return fields
    .map(f => {
      const samplesStr = f.samples
        .slice(0, 3)
        .map(s => typeof s === 'string' ? `"${s.substring(0, 50)}"` : String(s))
        .join(', ')

      return `- **${f.path}**
  Types: ${f.dataTypes.join(', ')}
  Frequency: ${Math.round(f.frequency * 100)}%
  Samples: ${samplesStr}
  Seen ${f.occurrenceCount} times`
    })
    .join('\n\n')
}

/**
 * Run AI scoring on discovered fields
 */
export async function scoreFieldsWithAI(
  env: Env,
  fields: FieldForAnalysis[]
): Promise<{ suggestions: ExtractorSuggestion[]; tokensUsed: { input: number; output: number } }> {
  const client = createAnthropicClient(env)

  // Filter to fields worth analyzing (frequency > 10%)
  const significantFields = fields.filter(f => f.frequency > 0.1)

  if (significantFields.length === 0) {
    return { suggestions: [], tokensUsed: { input: 0, output: 0 } }
  }

  const fieldsPrompt = formatFieldsForPrompt(significantFields)

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4000,
    temperature: 0.3,
    system: FIELD_ANALYSIS_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Please analyze these discovered fields from Lumina campaign data:\n\n${fieldsPrompt}`,
      },
    ],
  })

  // Extract text content
  const textContent = response.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  // Parse JSON response
  let suggestions: ExtractorSuggestion[] = []
  try {
    // Find JSON in response (might be wrapped in markdown code blocks)
    const jsonMatch = textContent.match(/\{[\s\S]*"suggestions"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      suggestions = parsed.suggestions || []
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e)
  }

  return {
    suggestions,
    tokensUsed: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
  }
}

/**
 * Save AI suggestions to database
 */
export async function saveSuggestions(
  supabase: SupabaseClient,
  suggestions: ExtractorSuggestion[],
  sourceOrderId?: string
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0

  for (const suggestion of suggestions) {
    // Check if suggestion already exists for this field path
    const { data: existing } = await supabase
      .from('lumina_extractor_suggestions')
      .select('id, confidence')
      .eq('field_path', suggestion.fieldPath)
      .eq('status', 'pending')
      .single()

    if (existing) {
      // Update if new confidence is higher
      const existingRecord = existing as { id: string; confidence: number }
      if (suggestion.relevanceScore / 10 > existingRecord.confidence) {
        const { error } = await supabase
          .from('lumina_extractor_suggestions')
          .update({
            suggested_name: suggestion.extractorName,
            aggregation_type: suggestion.aggregationType,
            when_conditions: suggestion.conditions === 'always' ? null : suggestion.conditions,
            description: suggestion.description,
            confidence: suggestion.relevanceScore / 10,
          })
          .eq('id', existingRecord.id)

        if (!error) updated++
      }
    } else {
      // Insert new suggestion
      const { error } = await supabase
        .from('lumina_extractor_suggestions')
        .insert({
          field_path: suggestion.fieldPath,
          suggested_name: suggestion.extractorName,
          aggregation_type: suggestion.aggregationType,
          when_conditions: suggestion.conditions === 'always' ? null : suggestion.conditions,
          description: suggestion.description,
          confidence: suggestion.relevanceScore / 10,
          is_new: true,
          source_order_id: sourceOrderId,
        })

      if (!error) inserted++
    }
  }

  return { inserted, updated }
}

/**
 * Get pending suggestions for review
 */
export async function getPendingSuggestions(
  supabase: SupabaseClient,
  options?: {
    minConfidence?: number
    limit?: number
  }
): Promise<unknown[]> {
  let query = supabase
    .from('lumina_extractor_suggestions')
    .select('*')
    .eq('status', 'pending')
    .order('confidence', { ascending: false })

  if (options?.minConfidence) {
    query = query.gte('confidence', options.minConfidence)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch suggestions: ${error.message}`)
  }

  return data || []
}

/**
 * Approve a suggestion (creates an extractor config)
 */
export async function approveSuggestion(
  supabase: SupabaseClient,
  suggestionId: string,
  reviewedBy?: string,
  modifications?: Partial<ExtractorSuggestion>
): Promise<void> {
  const { error } = await supabase
    .from('lumina_extractor_suggestions')
    .update({
      status: modifications ? 'modified' : 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      ...(modifications && {
        suggested_name: modifications.extractorName,
        aggregation_type: modifications.aggregationType,
        description: modifications.description,
      }),
    })
    .eq('id', suggestionId)

  if (error) {
    throw new Error(`Failed to approve suggestion: ${error.message}`)
  }
}

/**
 * Reject a suggestion
 */
export async function rejectSuggestion(
  supabase: SupabaseClient,
  suggestionId: string,
  reviewedBy?: string
): Promise<void> {
  const { error } = await supabase
    .from('lumina_extractor_suggestions')
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)

  if (error) {
    throw new Error(`Failed to reject suggestion: ${error.message}`)
  }
}

/**
 * Run full AI scoring pipeline on discovered fields
 */
export async function runScoringPipeline(
  env: Env,
  supabase: SupabaseClient,
  options?: {
    minFrequency?: number
    onlyNew?: boolean
    sourceOrderId?: string
  }
): Promise<ScoringResult> {
  const startTime = Date.now()

  // Fetch discovered fields to analyze
  let query = supabase
    .from('lumina_discovered_fields')
    .select('field_path, data_types, sample_values, frequency, is_nested, occurrence_count')
    .gte('frequency', options?.minFrequency || 0.1)
    .order('frequency', { ascending: false })
    .limit(100) // Limit batch size

  if (options?.onlyNew) {
    query = query.eq('status', 'discovered')
  }

  const { data: fieldsData, error } = await query

  if (error) {
    throw new Error(`Failed to fetch fields: ${error.message}`)
  }

  const fields: FieldForAnalysis[] = (fieldsData || []).map((f: Record<string, unknown>) => ({
    path: f.field_path as string,
    dataTypes: f.data_types as string[],
    samples: f.sample_values as unknown[],
    frequency: f.frequency as number,
    isNested: f.is_nested as boolean,
    occurrenceCount: f.occurrence_count as number,
  }))

  if (fields.length === 0) {
    return {
      fieldsAnalyzed: 0,
      suggestionsGenerated: 0,
      highRelevance: 0,
      mediumRelevance: 0,
      lowRelevance: 0,
      tokensUsed: { input: 0, output: 0 },
      durationMs: Date.now() - startTime,
    }
  }

  // Run AI scoring
  const { suggestions, tokensUsed } = await scoreFieldsWithAI(env, fields)

  // Save suggestions
  await saveSuggestions(supabase, suggestions, options?.sourceOrderId)

  // Calculate stats
  const highRelevance = suggestions.filter(s => s.relevanceScore >= 7).length
  const mediumRelevance = suggestions.filter(s => s.relevanceScore >= 4 && s.relevanceScore < 7).length
  const lowRelevance = suggestions.filter(s => s.relevanceScore < 4).length

  // Mark analyzed fields as reviewed
  for (const field of fields) {
    await supabase
      .from('lumina_discovered_fields')
      .update({ status: 'reviewed' })
      .eq('field_path', field.path)
  }

  return {
    fieldsAnalyzed: fields.length,
    suggestionsGenerated: suggestions.length,
    highRelevance,
    mediumRelevance,
    lowRelevance,
    tokensUsed,
    durationMs: Date.now() - startTime,
  }
}

/**
 * Get suggestion statistics
 */
export async function getSuggestionStats(supabase: SupabaseClient): Promise<{
  total: number
  pending: number
  approved: number
  rejected: number
  modified: number
  avgConfidence: number
}> {
  const { data } = await supabase
    .from('lumina_extractor_suggestions')
    .select('status, confidence')

  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    modified: 0,
    avgConfidence: 0,
  }

  let totalConfidence = 0

  for (const row of data || []) {
    const record = row as { status: string; confidence: number }
    stats.total++
    totalConfidence += record.confidence

    switch (record.status) {
      case 'pending':
        stats.pending++
        break
      case 'approved':
        stats.approved++
        break
      case 'rejected':
        stats.rejected++
        break
      case 'modified':
        stats.modified++
        break
    }
  }

  stats.avgConfidence = stats.total > 0 ? totalConfidence / stats.total : 0

  return stats
}
