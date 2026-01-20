/**
 * Research Route for Schema Curator
 * AI-powered research to seed schema data with rich industry intelligence
 */

import { Hono } from 'hono'
import OpenAI from 'openai'
import type { Env } from '../../types/bindings'
import { createOpenAIClient } from '../../services/curator/openai'
import {
  conductIndustryResearch,
  type AggregatedResearch,
  type BenchmarkData,
  type SeasonalityData,
  type IndustryInsight,
} from '../../services/curator/webResearch'
import type { ExtractedItem, ExtractedField, EntityType } from '../../types/curator'

const app = new Hono<{ Bindings: Env }>()

// ============================================
// Research Request Types
// ============================================

interface ResearchRequest {
  query: string  // Natural language query like "Create industry for Electric Services"
  entity_type?: EntityType  // Optional: focus on specific type
  company_name?: string  // Optional: for client-specific research
}

interface ResearchResponse {
  success: boolean
  extracted_items: ExtractedItem[]
  research_summary: string
  sources_used: string[]
  tokens_used: number
  error?: string
}

// ============================================
// Available Lucide Icons for Industries
// ============================================

const INDUSTRY_ICONS = [
  'Building2', 'Factory', 'Store', 'ShoppingBag', 'ShoppingCart', 'Briefcase',
  'Landmark', 'GraduationCap', 'Heart', 'HeartPulse', 'Stethoscope', 'Pill',
  'Car', 'Plane', 'Ship', 'Train', 'Truck', 'Bike',
  'Home', 'Building', 'Hotel', 'Warehouse',
  'Utensils', 'Coffee', 'Wine', 'Pizza',
  'Gamepad2', 'Music', 'Film', 'Tv', 'Radio', 'Headphones',
  'Wallet', 'CreditCard', 'DollarSign', 'PiggyBank', 'TrendingUp', 'BarChart3',
  'Cpu', 'Smartphone', 'Laptop', 'Monitor', 'Server', 'Cloud',
  'Leaf', 'TreePine', 'Sun', 'Droplets', 'Wind', 'Zap',
  'Shirt', 'Watch', 'Gem', 'Scissors',
  'Dumbbell', 'Trophy', 'Medal', 'Target',
  'BookOpen', 'Newspaper', 'FileText', 'PenTool',
  'Users', 'UserCircle', 'Baby', 'Dog', 'Cat',
  'Globe', 'Map', 'Compass', 'Mountain',
  'Wrench', 'Hammer', 'HardHat', 'Cog',
  'Shield', 'Lock', 'Key', 'Scale',
]

// ============================================
// OpenAI Synthesis Prompts
// ============================================

const RESEARCH_SYNTHESIS_PROMPT = `You are a Digital Marketing Research Analyst synthesizing web research into structured industry data for an advertising analytics platform.

Your task is to analyze the provided web research results and create a comprehensive industry profile including:

1. **Industry Basics**
   - code: Snake_case identifier (e.g., "electric_services", "fine_jewelry")
   - name: Display name
   - description: 2-3 sentence overview of the industry
   - icon: Choose the most appropriate icon from this list: ${INDUSTRY_ICONS.join(', ')}

2. **Benchmarks** (from digital advertising data)
   - CPC range (cost per click): min, max, average in USD
   - CPA range (cost per acquisition): min, max, average in USD
   - CTR range (click-through rate): min, max, average as percentage
   - CPM range (cost per 1000 impressions): min, max, average in USD
   - ROAS range (return on ad spend): min, max, average as multiplier
   - Include notes about what affects these ranges

3. **Seasonality**
   - Peak months (1-12): When advertising spend/demand is highest
   - Slow months (1-12): When demand typically drops
   - Quarterly trends: Brief description for each quarter
   - Holiday impact: List holidays that significantly affect this industry
   - Notes on seasonal patterns

4. **Buyer Notes**
   - Target demographics and psychographics
   - Key pain points and motivations
   - Decision-making factors
   - Typical customer journey
   - Write as a helpful brief for account managers

5. **Industry Insights**
   - 3-5 key insights about trends, competitive landscape, opportunities
   - Each insight should have a topic, detailed content, and confidence score

Be data-driven and cite specific numbers from the research when available. If data is uncertain, provide reasonable industry estimates with lower confidence scores.`

const RESEARCH_JSON_SCHEMA = {
  name: 'industry_research_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      industry: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' },
        },
        required: ['code', 'name', 'description', 'icon'],
        additionalProperties: false,
      },
      benchmarks: {
        type: 'object',
        properties: {
          cpc_range: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              avg: { type: 'number' },
              currency: { type: 'string' },
            },
            required: ['min', 'max', 'avg', 'currency'],
            additionalProperties: false,
          },
          cpa_range: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              avg: { type: 'number' },
              currency: { type: 'string' },
            },
            required: ['min', 'max', 'avg', 'currency'],
            additionalProperties: false,
          },
          ctr_range: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              avg: { type: 'number' },
              unit: { type: 'string' },
            },
            required: ['min', 'max', 'avg', 'unit'],
            additionalProperties: false,
          },
          cpm_range: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              avg: { type: 'number' },
              currency: { type: 'string' },
            },
            required: ['min', 'max', 'avg', 'currency'],
            additionalProperties: false,
          },
          roas_range: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              avg: { type: 'number' },
            },
            required: ['min', 'max', 'avg'],
            additionalProperties: false,
          },
          notes: { type: 'string' },
        },
        required: ['cpc_range', 'cpa_range', 'ctr_range', 'cpm_range', 'roas_range', 'notes'],
        additionalProperties: false,
      },
      seasonality: {
        type: 'object',
        properties: {
          peak_months: { type: 'array', items: { type: 'integer' } },
          slow_months: { type: 'array', items: { type: 'integer' } },
          quarterly_trends: {
            type: 'object',
            properties: {
              q1: { type: 'string' },
              q2: { type: 'string' },
              q3: { type: 'string' },
              q4: { type: 'string' },
            },
            required: ['q1', 'q2', 'q3', 'q4'],
            additionalProperties: false,
          },
          holidays_impact: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        },
        required: ['peak_months', 'slow_months', 'quarterly_trends', 'holidays_impact', 'notes'],
        additionalProperties: false,
      },
      buyer_notes: { type: 'string' },
      insights: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
            content: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: ['topic', 'content', 'confidence'],
          additionalProperties: false,
        },
      },
      research_summary: { type: 'string' },
    },
    required: ['industry', 'benchmarks', 'seasonality', 'buyer_notes', 'insights', 'research_summary'],
    additionalProperties: false,
  },
}

// ============================================
// Helper Functions
// ============================================

function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function formatResearchForPrompt(research: AggregatedResearch): string {
  let formatted = ''

  if (research.benchmarks) {
    formatted += '## BENCHMARK RESEARCH\n'
    if (research.benchmarks.answer) {
      formatted += `Summary: ${research.benchmarks.answer}\n\n`
    }
    research.benchmarks.results.forEach((r, i) => {
      formatted += `Source ${i + 1}: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n\n`
    })
  }

  if (research.seasonality) {
    formatted += '## SEASONALITY RESEARCH\n'
    if (research.seasonality.answer) {
      formatted += `Summary: ${research.seasonality.answer}\n\n`
    }
    research.seasonality.results.forEach((r, i) => {
      formatted += `Source ${i + 1}: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n\n`
    })
  }

  if (research.buyer_personas) {
    formatted += '## BUYER PERSONA RESEARCH\n'
    if (research.buyer_personas.answer) {
      formatted += `Summary: ${research.buyer_personas.answer}\n\n`
    }
    research.buyer_personas.results.forEach((r, i) => {
      formatted += `Source ${i + 1}: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n\n`
    })
  }

  if (research.insights) {
    formatted += '## INDUSTRY INSIGHTS RESEARCH\n'
    if (research.insights.answer) {
      formatted += `Summary: ${research.insights.answer}\n\n`
    }
    research.insights.results.forEach((r, i) => {
      formatted += `Source ${i + 1}: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n\n`
    })
  }

  return formatted
}

// ============================================
// Main Research Endpoint
// ============================================

app.post('/', async (c) => {
  const env = c.env

  if (!env.TAVILY_API_KEY) {
    return c.json({ success: false, error: 'Tavily API key not configured' }, 500)
  }

  if (!env.OPENAI_API_KEY) {
    return c.json({ success: false, error: 'OpenAI API key not configured' }, 500)
  }

  let body: ResearchRequest
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const { query, company_name } = body

  if (!query || query.trim().length === 0) {
    return c.json({ success: false, error: 'Query is required' }, 400)
  }

  try {
    // Step 1: Parse the query to extract industry name
    // For now, we'll use a simple extraction - the OpenAI call will help refine it
    const industryMatch = query.match(/(?:industry|sector|business|create|research|find)[\s:]+(?:for\s+)?(.+?)(?:\s*,|\s*\.|$)/i)
    let industryName = industryMatch ? industryMatch[1].trim() : query.trim()

    // Clean up common phrases
    industryName = industryName
      .replace(/^(a|an|the)\s+/i, '')
      .replace(/\s+(industry|sector|business)$/i, '')
      .trim()

    // Step 2: Conduct web research using Tavily
    const research = await conductIndustryResearch(env, {
      industry_name: industryName,
      company_name: company_name,
      include_benchmarks: true,
      include_seasonality: true,
      include_buyer_notes: true,
      include_insights: true,
    })

    // Step 3: Format research for OpenAI
    const formattedResearch = formatResearchForPrompt(research)

    // Step 4: Use OpenAI to synthesize into structured data
    const openai = createOpenAIClient(env)

    const userPrompt = `Research request: "${query}"
${company_name ? `Company context: ${company_name}` : ''}

Please synthesize the following web research into a comprehensive industry profile:

${formattedResearch}

Create a complete industry profile with benchmarks, seasonality, buyer notes, and insights based on this research.`

    const response = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      max_completion_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: 'system', content: RESEARCH_SYNTHESIS_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: RESEARCH_JSON_SCHEMA,
      },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const synthesized = JSON.parse(content)
    const tokensUsed = response.usage?.total_tokens ?? 0

    // Step 5: Convert to ExtractedItem format
    const fields: ExtractedField[] = [
      { name: 'code', value: synthesized.industry.code, confidence: 0.95, source: 'web_research' },
      { name: 'name', value: synthesized.industry.name, confidence: 0.95, source: 'web_research' },
      { name: 'description', value: synthesized.industry.description, confidence: 0.9, source: 'web_research' },
      { name: 'icon', value: synthesized.industry.icon, confidence: 0.85, source: 'ai_generated' },
      { name: 'benchmarks', value: synthesized.benchmarks, confidence: 0.75, source: 'web_research' },
      { name: 'seasonality', value: synthesized.seasonality, confidence: 0.75, source: 'web_research' },
      { name: 'buyer_notes', value: synthesized.buyer_notes, confidence: 0.8, source: 'web_research' },
      { name: 'insights', value: synthesized.insights, confidence: 0.8, source: 'web_research' },
      {
        name: 'research_metadata',
        value: {
          researched_at: new Date().toISOString(),
          sources: research.total_sources,
          query: query,
          company_context: company_name || null,
          tokens_used: tokensUsed,
        },
        confidence: 1.0,
        source: 'ai_generated',
      },
    ]

    const extractedItem: ExtractedItem = {
      id: generateItemId(),
      entity_type: 'industry',
      fields,
      overall_confidence: 0.85,
      classification_reason: `AI-researched industry profile for "${industryName}" based on ${research.total_sources.length} web sources`,
      duplicate_candidates: [],
      conflicts: [],
      status: 'pending',
    }

    const researchResponse: ResearchResponse = {
      success: true,
      extracted_items: [extractedItem],
      research_summary: synthesized.research_summary,
      sources_used: research.total_sources,
      tokens_used: tokensUsed,
    }

    return c.json(researchResponse)

  } catch (error) {
    console.error('Research error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Research failed',
      extracted_items: [],
      research_summary: '',
      sources_used: [],
      tokens_used: 0,
    }, 500)
  }
})

export default app
