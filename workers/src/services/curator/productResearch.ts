/**
 * Product Research Service
 * Core research orchestration for Schema Curator
 *
 * This service conducts AI-powered research on products/subproducts
 * to extract guidance fields, with source tracking and chain of thought.
 */

import OpenAI from 'openai'
import type { Env } from '../../types/bindings'
import { createOpenAIClient } from './openai'
import { conductIndustryResearch, type AggregatedResearch } from './webResearch'
import {
  type ProductResearchRequest,
  type ProductResearchResponse,
  type ResearchReadiness,
  type ReasoningStep,
  type ExtractedGuidanceFields,
  type SourceWithAuthority,
  type CrossEntitySuggestion,
  type InheritanceAnalysis,
  type ResearchDepth,
  type AuthorityTier,
  type AvailableMetricsContext,
  CURATOR_CONFIG,
} from '../../types/curator'
import { createClient } from '@supabase/supabase-js'

// ============================================
// Research Readiness Check
// ============================================

interface ProductData {
  id: string
  name: string
  description?: string
  platforms?: string[]
  mediums?: string[]
  notes?: string
}

interface SubProductData {
  id: string
  name: string
  description?: string
  platforms?: string[]
  mediums?: string[]
  notes?: string
  kpis?: string[]
}

interface PerformanceTableData {
  id: string
  table_name: string
  file_name: string
  headers: string[]
  description?: string
  subproduct_id: string
  subproduct_name?: string
}

/**
 * Check if a product/subproduct is ready for quality research
 */
export function checkResearchReadiness(
  product: ProductData,
  subproduct?: SubProductData
): ResearchReadiness {
  const warnings: string[] = []
  const missing: string[] = []
  let dataQualityScore = 1.0

  // Product-level checks
  if (!product.description || product.description.length < 50) {
    warnings.push('Product description is too brief for quality research')
    missing.push('description')
    dataQualityScore -= 0.2
  }

  if (!product.platforms || product.platforms.length === 0) {
    warnings.push('No platforms specified - research may be too generic')
    missing.push('platforms')
    dataQualityScore -= 0.15
  }

  if (!product.mediums || product.mediums.length === 0) {
    warnings.push('No mediums specified - consider adding for targeted research')
    missing.push('mediums')
    dataQualityScore -= 0.1
  }

  // Subproduct-level checks (if provided)
  if (subproduct) {
    if (!subproduct.description || subproduct.description.length < 30) {
      warnings.push('Subproduct description is too brief')
      missing.push('subproduct_description')
      dataQualityScore -= 0.15
    }

    if (!subproduct.kpis || subproduct.kpis.length === 0) {
      warnings.push('No KPIs defined for subproduct - research may miss key metrics')
      missing.push('subproduct_kpis')
      dataQualityScore -= 0.1
    }
  }

  // Normalize score
  dataQualityScore = Math.max(0, Math.min(1, dataQualityScore))

  return {
    is_ready: warnings.length === 0,
    warnings,
    missing_fields: missing,
    recommendation: warnings.length > 0
      ? 'Add more context for better research results. The AI will work with available data but results may be less specific.'
      : 'Product is well-documented and ready for comprehensive research.',
    data_quality_score: dataQualityScore,
  }
}

// ============================================
// Performance Tables Fetching
// ============================================

/**
 * Fetch performance tables for a product or specific subproduct
 * - If subproduct_id is provided: get tables for that specific subproduct
 * - If only product_id: get ALL tables for ALL subproducts under that product
 */
async function fetchPerformanceTables(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  subproductId?: string
): Promise<PerformanceTableData[]> {
  if (subproductId) {
    // Fetch tables for specific subproduct
    const { data, error } = await supabase
      .from('performance_tables')
      .select(`
        id,
        table_name,
        file_name,
        headers,
        description,
        subproduct_id,
        subproducts (name)
      `)
      .eq('subproduct_id', subproductId)
      .order('sort_order', { ascending: true })

    if (error || !data) return []

    return data.map(pt => ({
      id: pt.id,
      table_name: pt.table_name,
      file_name: pt.file_name,
      headers: pt.headers || [],
      description: pt.description,
      subproduct_id: pt.subproduct_id,
      subproduct_name: (pt.subproducts as { name: string } | null)?.name,
    }))
  }

  // Fetch ALL tables for ALL subproducts under this product
  // First get all subproduct IDs for this product
  const { data: subproducts } = await supabase
    .from('subproducts')
    .select('id, name')
    .eq('product_id', productId)

  if (!subproducts || subproducts.length === 0) return []

  const subproductIds = subproducts.map(sp => sp.id)
  const subproductNames = new Map(subproducts.map(sp => [sp.id, sp.name]))

  // Fetch all performance tables for these subproducts
  const { data: tables, error } = await supabase
    .from('performance_tables')
    .select(`
      id,
      table_name,
      file_name,
      headers,
      description,
      subproduct_id
    `)
    .in('subproduct_id', subproductIds)
    .order('sort_order', { ascending: true })

  if (error || !tables) return []

  return tables.map(pt => ({
    id: pt.id,
    table_name: pt.table_name,
    file_name: pt.file_name,
    headers: pt.headers || [],
    description: pt.description,
    subproduct_id: pt.subproduct_id,
    subproduct_name: subproductNames.get(pt.subproduct_id),
  }))
}

/**
 * Format performance tables into a readable context for the AI prompt
 * Also returns structured data for the API response
 */
function formatAvailableMetricsContext(
  tables: PerformanceTableData[],
  isProductLevel: boolean
): { prompt: string; structured: AvailableMetricsContext } {
  // Common metrics to check against
  const COMMON_METRICS_TO_CHECK = [
    'Daypart', 'Hour of Day', 'Time of Day',
    'Device', 'Device Type', 'Mobile vs Desktop',
    'Geographic', 'City', 'State', 'Region', 'DMA',
    'Age', 'Gender', 'Demographics',
    'Placement', 'Site', 'Publisher',
    'Creative', 'Ad Copy', 'Ad Variation'
  ]

  if (tables.length === 0) {
    return {
      prompt: `## Available Metrics
⚠️ No performance tables defined for this product/subproduct.
Analysis guidance should be general - specific metric references cannot be validated.`,
      structured: {
        all_metrics: [],
        tables_count: 0,
        is_product_level: isProductLevel,
        not_available: COMMON_METRICS_TO_CHECK,
      }
    }
  }

  // Collect all unique headers across tables
  const allHeaders = new Set<string>()
  const tablesBySubproduct = new Map<string, PerformanceTableData[]>()
  const metricsBySubproduct: Record<string, string[]> = {}

  for (const table of tables) {
    const spName = table.subproduct_name || 'Unknown'
    if (!tablesBySubproduct.has(spName)) {
      tablesBySubproduct.set(spName, [])
    }
    tablesBySubproduct.get(spName)!.push(table)

    for (const header of table.headers) {
      allHeaders.add(header)
    }
  }

  // Build metrics by subproduct
  for (const [spName, spTables] of tablesBySubproduct) {
    const spHeaders = new Set<string>()
    for (const t of spTables) {
      for (const h of t.headers) spHeaders.add(h)
    }
    metricsBySubproduct[spName] = Array.from(spHeaders).sort()
  }

  let context = `## Available Metrics (FROM OUR DATA)\n\n`
  context += `**IMPORTANT: Only reference these metrics in your analysis guidance.**\n\n`

  // List all unique metrics
  context += `### All Available Columns/Metrics\n`
  context += `\`\`\`\n${Array.from(allHeaders).sort().join(', ')}\n\`\`\`\n\n`

  // If product-level, show breakdown by subproduct
  if (isProductLevel && tablesBySubproduct.size > 1) {
    context += `### Metrics by Subproduct\n`
    for (const [spName, spTables] of tablesBySubproduct) {
      const spHeaders = new Set<string>()
      for (const t of spTables) {
        for (const h of t.headers) spHeaders.add(h)
      }
      context += `\n**${spName}:**\n`
      context += `- Tables: ${spTables.map(t => t.table_name).join(', ')}\n`
      context += `- Metrics: ${Array.from(spHeaders).join(', ')}\n`
    }
  } else {
    // Single subproduct - show table details
    context += `### Performance Tables\n`
    for (const table of tables) {
      context += `\n**${table.table_name}** (${table.file_name})\n`
      context += `Headers: ${table.headers.join(', ')}\n`
      if (table.description) {
        context += `Description: ${table.description}\n`
      }
    }
  }

  // Add explicit "NOT AVAILABLE" section for common metrics we DON'T have
  const notAvailable = COMMON_METRICS_TO_CHECK.filter(m => !allHeaders.has(m))

  if (notAvailable.length > 0) {
    context += `\n### Metrics NOT Available (Do Not Reference)\n`
    context += `These common metrics are NOT in our data - do not suggest analyzing them:\n`
    context += `- ${notAvailable.join(', ')}\n`
  }

  return {
    prompt: context,
    structured: {
      all_metrics: Array.from(allHeaders).sort(),
      tables_count: tables.length,
      is_product_level: isProductLevel,
      metrics_by_subproduct: isProductLevel && tablesBySubproduct.size > 1 ? metricsBySubproduct : undefined,
      not_available: notAvailable,
    }
  }
}

// ============================================
// Research Synthesis Prompts
// ============================================

const PRODUCT_RESEARCH_SYSTEM_PROMPT = `You are a Digital Marketing Research Analyst conducting research on advertising products and tactics. Your goal is to extract actionable guidance for campaign analysis.

## CRITICAL DATA CONSTRAINTS

**YOU MUST ONLY REFERENCE METRICS THAT ARE AVAILABLE IN THE PROVIDED PERFORMANCE TABLES.**

The "Available Metrics" section below lists the ONLY data columns we have access to for this product.
- DO NOT suggest analyzing metrics not in our data (e.g., dayparting, device breakdown, geographic splits - unless explicitly listed)
- DO NOT recommend optimizations based on data we cannot see
- FOCUS analysis guidance on the exact headers/columns provided
- If a common metric is NOT in our available data, explicitly note that we cannot analyze it

## CRITICAL BUSINESS CONSTRAINTS

You MUST follow these constraints in all recommendations:

1. **NEVER suggest budget reallocation** between tactics, campaigns, or channels
   - The company cannot quickly modify or shift budgets mid-campaign
   - Only recommend optimizations within CURRENT spend allocation

2. **For budget increases**, only suggest:
   - "Consider adding budget at the end of the campaign period"
   - "For future campaigns, allocate additional budget to X"

3. **Focus optimization on:**
   - Bid adjustments within current settings
   - Targeting refinements
   - Creative/copy improvements
   - Audience optimization
   - Schedule/dayparting adjustments (ONLY if daypart data is available)

4. **Avoid phrases like:**
   - "Shift budget from X to Y"
   - "Reallocate spend"
   - "Move budget"
   - "Redistribute funds"

## Research Output Structure

Extract and synthesize the following guidance fields:

1. **chain_of_thought_guidance** - Step-by-step reasoning process for analyzing this product USING ONLY AVAILABLE METRICS
2. **analysis_instructions** - Specific instructions for what to analyze (reference actual column names from available data)
3. **example_good_analysis** - Examples using the actual metrics we have access to
4. **example_bad_analysis** - Anti-patterns to avoid (including analyzing unavailable metrics)
5. **critical_metrics** - ONLY metrics from the available data that are most important
6. **optimization_priorities** - Ordered list of optimization areas (based on what we can actually measure)
7. **important_constraints_restrictions** - Business rules, limitations, AND data limitations

## Confidence Scoring
- 0.90-1.00: Directly from authoritative sources
- 0.70-0.89: Strongly supported by multiple sources
- 0.50-0.69: Reasonable inference from available data
- Below 0.50: Educated guess, flag for review

Always cite your sources and reasoning for each field.`

const RESEARCH_JSON_SCHEMA = {
  name: 'product_research_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      chain_of_thought_guidance: {
        type: 'array',
        items: { type: 'string' },
        description: 'Step-by-step reasoning process for analyzing this product',
      },
      analysis_instructions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific instructions for what to analyze',
      },
      example_good_analysis: {
        type: 'array',
        items: { type: 'string' },
        description: 'Examples of good analysis practices',
      },
      example_bad_analysis: {
        type: 'array',
        items: { type: 'string' },
        description: 'Anti-patterns to avoid',
      },
      critical_metrics: {
        type: 'array',
        items: { type: 'string' },
        description: 'Must-track metrics for this product',
      },
      optimization_priorities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ordered list of optimization areas',
      },
      important_constraints_restrictions: {
        type: 'string',
        description: 'Business rules and limitations',
      },
      reasoning_steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            step_number: { type: 'integer' },
            description: { type: 'string' },
            sources_used: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number' },
          },
          required: ['step_number', 'description', 'sources_used', 'confidence'],
          additionalProperties: false,
        },
      },
      cross_entity_suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            target_entity_type: { type: 'string' },
            target_entity_name: { type: 'string' },
            suggested_field: { type: 'string' },
            suggested_value: { type: 'string' },
            reasoning: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: ['target_entity_type', 'target_entity_name', 'suggested_field', 'suggested_value', 'reasoning', 'confidence'],
          additionalProperties: false,
        },
      },
      chain_of_thought: {
        type: 'string',
        description: 'Full reasoning narrative in markdown format',
      },
    },
    required: [
      'chain_of_thought_guidance',
      'analysis_instructions',
      'example_good_analysis',
      'example_bad_analysis',
      'critical_metrics',
      'optimization_priorities',
      'important_constraints_restrictions',
      'reasoning_steps',
      'cross_entity_suggestions',
      'chain_of_thought',
    ],
    additionalProperties: false,
  },
}

// ============================================
// Source Authority Scoring
// ============================================

/**
 * Get domain authority information from whitelist
 */
async function getDomainAuthority(
  env: Env,
  domain: string
): Promise<{ tier: AuthorityTier; score: number }> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  const { data } = await supabase
    .from('curator_domain_whitelist')
    .select('trust_level, authority_score')
    .eq('domain', domain)
    .eq('is_active', true)
    .single()

  if (data) {
    return {
      tier: data.trust_level as AuthorityTier,
      score: data.authority_score || 0.7,
    }
  }

  // Default for unknown domains
  return { tier: 'standard', score: 0.5 }
}

/**
 * Process sources from Tavily research and add authority info
 */
async function processSourcesWithAuthority(
  env: Env,
  sources: string[]
): Promise<SourceWithAuthority[]> {
  const processed: SourceWithAuthority[] = []

  for (const url of sources) {
    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname.replace('www.', '')
      const authority = await getDomainAuthority(env, domain)

      processed.push({
        id: crypto.randomUUID(),
        url,
        domain,
        authority_tier: authority.tier,
        authority_score: authority.score,
      })
    } catch {
      // Invalid URL, skip
    }
  }

  // Sort by authority score descending
  return processed.sort((a, b) => b.authority_score - a.authority_score)
}

// ============================================
// Main Research Function
// ============================================

/**
 * Conduct comprehensive research on a product/subproduct
 */
export async function conductProductResearch(
  env: Env,
  request: ProductResearchRequest
): Promise<ProductResearchResponse> {
  const startTime = Date.now()
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  // 1. Load product data
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, description, platforms, mediums, notes')
    .eq('id', request.product_id)
    .single()

  if (productError || !product) {
    return {
      success: false,
      session_id: '',
      readiness_check: { is_ready: false, warnings: ['Product not found'], missing_fields: [], recommendation: '' },
      chain_of_thought: '',
      reasoning_steps: [],
      extracted_fields: {},
      sources: [],
      cross_entity_suggestions: [],
      tokens_used: 0,
      duration_ms: Date.now() - startTime,
      error: 'Product not found',
    }
  }

  // 2. Load subproduct if specified
  let subproduct: SubProductData | undefined
  if (request.subproduct_id) {
    const { data: sp } = await supabase
      .from('subproducts')
      .select('id, name, description, platforms, mediums, notes, kpis')
      .eq('id', request.subproduct_id)
      .single()
    if (sp) subproduct = sp
  }

  // 3. Check research readiness
  const readinessCheck = checkResearchReadiness(product, subproduct)

  // 4. Fetch performance tables for available metrics context
  const performanceTables = await fetchPerformanceTables(
    supabase,
    request.product_id,
    request.subproduct_id
  )
  const isProductLevel = !request.subproduct_id
  const { prompt: availableMetricsPrompt, structured: availableMetrics } = formatAvailableMetricsContext(performanceTables, isProductLevel)

  // 5. Build search context
  const productContext = subproduct
    ? `${product.name} - ${subproduct.name}`
    : product.name

  const platformContext = (product.platforms || []).join(', ')
  const mediumContext = (product.mediums || []).join(', ')

  // 6. Conduct web research
  let research: AggregatedResearch
  try {
    research = await conductIndustryResearch(env, {
      industry_name: productContext,
      company_name: undefined,
      include_benchmarks: true,
      include_seasonality: false,
      include_buyer_notes: false,
      include_insights: true,
    })
  } catch {
    research = {
      benchmarks: { query: '', results: [], answer: '' },
      insights: { query: '', results: [], answer: '' },
      total_sources: [],
    }
  }

  // 7. Process sources with authority
  const sources = await processSourcesWithAuthority(env, research.total_sources)

  // 8. Format research for synthesis (including available metrics)
  let formattedResearch = `## Product Context
Name: ${productContext}
Platforms: ${platformContext || 'Not specified'}
Mediums: ${mediumContext || 'Not specified'}
Description: ${product.description || 'Not provided'}
${subproduct?.description ? `Subproduct Description: ${subproduct.description}` : ''}
${subproduct?.kpis ? `KPIs: ${subproduct.kpis.join(', ')}` : ''}

${availableMetricsPrompt}

## User Research Notes
${request.user_context || 'No specific context provided'}

## Platform Focus
${request.platform_focus || 'General (all platforms)'}

## Web Research Results
`

  if (research.benchmarks?.results) {
    formattedResearch += '\n### Benchmark Data\n'
    research.benchmarks.results.forEach((r, i) => {
      formattedResearch += `Source ${i + 1}: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n\n`
    })
  }

  if (research.insights?.results) {
    formattedResearch += '\n### Industry Insights\n'
    research.insights.results.forEach((r, i) => {
      formattedResearch += `Source ${i + 1}: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n\n`
    })
  }

  // 8. Synthesize with OpenAI
  const openai = createOpenAIClient(env)

  const userPrompt = `Research and extract guidance fields for this advertising product:

${formattedResearch}

Create comprehensive guidance that:
1. **ONLY references metrics from the "Available Metrics" section above** - do NOT suggest analyzing data we don't have
2. Follows the CRITICAL BUSINESS CONSTRAINTS (no budget reallocation)
3. Is specific to this product/platform combination
4. Provides actionable analysis instructions using the actual column names from our data
5. In "example_bad_analysis", explicitly include examples of referencing metrics we don't have

Remember:
- NEVER suggest moving budget between campaigns or tactics
- NEVER suggest analyzing daypart, device, geographic, or demographic data unless those columns are listed in Available Metrics
- Focus on what we CAN measure and optimize based on OUR data`

  const response = await openai.chat.completions.create({
    model: CURATOR_CONFIG.MODEL,
    max_completion_tokens: 4096,
    temperature: 0.3,
    messages: [
      { role: 'system', content: PRODUCT_RESEARCH_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: RESEARCH_JSON_SCHEMA,
    },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    return {
      success: false,
      session_id: '',
      readiness_check: readinessCheck,
      available_metrics: availableMetrics,
      chain_of_thought: '',
      reasoning_steps: [],
      extracted_fields: {},
      sources,
      cross_entity_suggestions: [],
      tokens_used: response.usage?.total_tokens ?? 0,
      duration_ms: Date.now() - startTime,
      error: 'No response from AI',
    }
  }

  const synthesized = JSON.parse(content)
  const tokensUsed = response.usage?.total_tokens ?? 0

  // 9. Store research session
  const { data: session, error: sessionError } = await supabase
    .from('research_sessions')
    .insert({
      target_product_id: request.product_id,
      target_subproduct_id: request.subproduct_id || null,
      research_type: request.subproduct_id ? 'subproduct' : 'product',
      research_depth: request.research_depth || 'standard',
      user_context: request.user_context || null,
      chain_of_thought: synthesized.chain_of_thought,
      reasoning_steps: synthesized.reasoning_steps,
      sources_consulted: sources,
      extracted_fields: {
        chain_of_thought_guidance: synthesized.chain_of_thought_guidance,
        analysis_instructions: synthesized.analysis_instructions,
        example_good_analysis: synthesized.example_good_analysis,
        example_bad_analysis: synthesized.example_bad_analysis,
        critical_metrics: synthesized.critical_metrics,
        optimization_priorities: synthesized.optimization_priorities,
        important_constraints_restrictions: synthesized.important_constraints_restrictions,
      },
      cross_entity_suggestions: synthesized.cross_entity_suggestions,
      readiness_check: readinessCheck,
      tokens_used: tokensUsed,
      model_used: CURATOR_CONFIG.MODEL,
      duration_ms: Date.now() - startTime,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  // 10. Store sources in curator_sources table (upsert)
  for (const source of sources) {
    await supabase
      .from('curator_sources')
      .upsert({
        url: source.url,
        domain: source.domain,
        authority_tier: source.authority_tier,
        authority_score: source.authority_score,
        fetch_count: 1,
      }, {
        onConflict: 'url',
      })
  }

  const durationMs = Date.now() - startTime

  return {
    success: true,
    session_id: session?.id || '',
    readiness_check: readinessCheck,
    available_metrics: availableMetrics,
    chain_of_thought: synthesized.chain_of_thought,
    reasoning_steps: synthesized.reasoning_steps,
    extracted_fields: {
      chain_of_thought_guidance: synthesized.chain_of_thought_guidance,
      analysis_instructions: synthesized.analysis_instructions,
      example_good_analysis: synthesized.example_good_analysis,
      example_bad_analysis: synthesized.example_bad_analysis,
      critical_metrics: synthesized.critical_metrics,
      optimization_priorities: synthesized.optimization_priorities,
      important_constraints_restrictions: synthesized.important_constraints_restrictions,
    },
    sources,
    cross_entity_suggestions: synthesized.cross_entity_suggestions || [],
    tokens_used: tokensUsed,
    duration_ms: durationMs,
  }
}
