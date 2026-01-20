/**
 * Web Research Service for Schema Curator
 * Uses Tavily API for intelligent web search and content extraction
 */

import type { Env } from '../../types/bindings'

// ============================================
// Tavily API Types
// ============================================

interface TavilySearchRequest {
  query: string
  search_depth?: 'basic' | 'advanced'
  include_domains?: string[]
  exclude_domains?: string[]
  max_results?: number
  include_answer?: boolean
  include_raw_content?: boolean
}

interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  published_date?: string
}

interface TavilySearchResponse {
  query: string
  answer?: string
  results: TavilySearchResult[]
  response_time: number
}

// ============================================
// Research Types
// ============================================

export interface IndustryResearchRequest {
  industry_name: string
  company_name?: string  // Optional: for client-specific research
  include_benchmarks?: boolean
  include_seasonality?: boolean
  include_buyer_notes?: boolean
  include_insights?: boolean
}

export interface BenchmarkData {
  cpc_range?: { min: number; max: number; avg: number; currency: string }
  cpa_range?: { min: number; max: number; avg: number; currency: string }
  ctr_range?: { min: number; max: number; avg: number; unit: string }
  cpm_range?: { min: number; max: number; avg: number; currency: string }
  roas_range?: { min: number; max: number; avg: number }
  notes: string
  sources: string[]
}

export interface SeasonalityData {
  peak_months: number[]
  slow_months: number[]
  quarterly_trends: {
    q1: string
    q2: string
    q3: string
    q4: string
  }
  holidays_impact: string[]
  notes: string
  sources: string[]
}

export interface IndustryInsight {
  topic: string
  content: string
  source_url?: string
  confidence: number
}

export interface ResearchResult {
  industry_name: string
  industry_code: string
  description: string
  icon: string
  benchmarks?: BenchmarkData
  seasonality?: SeasonalityData
  buyer_notes?: string
  insights?: IndustryInsight[]
  research_metadata: {
    researched_at: string
    sources: string[]
    query_count: number
  }
}

// ============================================
// Tavily Search Client
// ============================================

export async function tavilySearch(
  env: Env,
  request: TavilySearchRequest
): Promise<TavilySearchResponse> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: env.TAVILY_API_KEY,
      query: request.query,
      search_depth: request.search_depth || 'advanced',
      include_domains: request.include_domains,
      exclude_domains: request.exclude_domains,
      max_results: request.max_results || 5,
      include_answer: request.include_answer ?? true,
      include_raw_content: request.include_raw_content ?? false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tavily search failed: ${error}`)
  }

  return response.json()
}

// ============================================
// Industry Research Queries
// ============================================

const BENCHMARK_DOMAINS = [
  'wordstream.com',
  'hubspot.com',
  'statista.com',
  'marketingcharts.com',
  'searchengineland.com',
  'socialmediatoday.com',
  'emarketer.com',
]

const SEASONALITY_DOMAINS = [
  'thinkwithgoogle.com',
  'trends.google.com',
  'nrf.com',
  'marketingprofs.com',
]

export async function searchBenchmarks(
  env: Env,
  industryName: string
): Promise<TavilySearchResponse> {
  return tavilySearch(env, {
    query: `${industryName} industry digital advertising benchmarks CPC CPA CTR 2024 2025`,
    search_depth: 'advanced',
    include_domains: BENCHMARK_DOMAINS,
    max_results: 8,
    include_answer: true,
  })
}

export async function searchSeasonality(
  env: Env,
  industryName: string
): Promise<TavilySearchResponse> {
  return tavilySearch(env, {
    query: `${industryName} industry seasonal trends peak months advertising spending patterns`,
    search_depth: 'advanced',
    max_results: 6,
    include_answer: true,
  })
}

export async function searchBuyerPersonas(
  env: Env,
  industryName: string,
  companyName?: string
): Promise<TavilySearchResponse> {
  const query = companyName
    ? `${companyName} ${industryName} target customer demographics buyer persona pain points`
    : `${industryName} industry target audience buyer persona demographics pain points motivations`

  return tavilySearch(env, {
    query,
    search_depth: 'advanced',
    max_results: 6,
    include_answer: true,
  })
}

export async function searchIndustryInsights(
  env: Env,
  industryName: string,
  companyName?: string
): Promise<TavilySearchResponse> {
  const query = companyName
    ? `${companyName} ${industryName} industry trends market analysis competitive landscape 2024 2025`
    : `${industryName} industry trends digital marketing strategies competitive landscape 2024 2025`

  return tavilySearch(env, {
    query,
    search_depth: 'advanced',
    max_results: 8,
    include_answer: true,
  })
}

// ============================================
// Aggregate Research Function
// ============================================

export interface AggregatedResearch {
  benchmarks?: TavilySearchResponse
  seasonality?: TavilySearchResponse
  buyer_personas?: TavilySearchResponse
  insights?: TavilySearchResponse
  total_sources: string[]
}

export async function conductIndustryResearch(
  env: Env,
  request: IndustryResearchRequest
): Promise<AggregatedResearch> {
  const { industry_name, company_name, include_benchmarks, include_seasonality, include_buyer_notes, include_insights } = request

  const searches: Promise<TavilySearchResponse | null>[] = []
  const searchTypes: string[] = []

  // Run searches in parallel for efficiency
  if (include_benchmarks !== false) {
    searches.push(searchBenchmarks(env, industry_name).catch(() => null))
    searchTypes.push('benchmarks')
  }

  if (include_seasonality !== false) {
    searches.push(searchSeasonality(env, industry_name).catch(() => null))
    searchTypes.push('seasonality')
  }

  if (include_buyer_notes !== false) {
    searches.push(searchBuyerPersonas(env, industry_name, company_name).catch(() => null))
    searchTypes.push('buyer_personas')
  }

  if (include_insights !== false) {
    searches.push(searchIndustryInsights(env, industry_name, company_name).catch(() => null))
    searchTypes.push('insights')
  }

  const results = await Promise.all(searches)

  // Aggregate all unique source URLs
  const allSources = new Set<string>()
  const aggregated: AggregatedResearch = { total_sources: [] }

  results.forEach((result, index) => {
    if (result) {
      const type = searchTypes[index]
      aggregated[type as keyof AggregatedResearch] = result as TavilySearchResponse
      result.results.forEach(r => allSources.add(r.url))
    }
  })

  aggregated.total_sources = Array.from(allSources)

  return aggregated
}
