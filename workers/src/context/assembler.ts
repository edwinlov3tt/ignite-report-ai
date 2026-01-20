/**
 * Context Assembler
 * Builds AI prompts with priority-based context from KV
 */

import type { Env, PlatformContext, IndustryContext, SoulDocument, DetectedTactic, ParsedFile } from '../types/bindings'
import { getPlatformContext, getMultiplePlatforms, getIndustryContext, getSoulDoc } from '../storage/kv'

/**
 * Context priority levels (highest to lowest):
 * 1. System prompt (Soul Document)
 * 2. Tactic-specific guidance
 * 3. Platform quirks (HIGH impact only)
 * 4. Industry benchmarks
 * 5. Platform KPIs
 * 6. Industry insights
 * 7. Buyer notes (lowest)
 */

export interface AssembledContext {
  systemPrompt: string
  platforms: PlatformContext[]
  industry: IndustryContext | null
  tactics: DetectedTactic[]
  campaignData: string
  companyInfo: string
  soulDocVersions: Record<string, number>
}

export interface ContextOptions {
  soulDocSlug?: string
  platformCodes: string[]
  industryCode: string
  tactics: DetectedTactic[]
  campaignData: {
    orderId: string
    orderName?: string
    startDate?: string
    endDate?: string
  }
  companyConfig: {
    companyName: string
    industry: string
    customInstructions?: string
  }
  files: {
    performance?: ParsedFile
    pacing?: ParsedFile
  }
}

/**
 * Fetch all context from KV and assemble into structured format
 */
export async function assembleContext(
  env: Env,
  options: ContextOptions
): Promise<AssembledContext> {
  const { soulDocSlug = 'campaign-analyst', platformCodes, industryCode, tactics, campaignData, companyConfig, files } = options

  // Parallel fetch all context
  const [soulDoc, platforms, industry] = await Promise.all([
    getSoulDoc(env, soulDocSlug),
    getMultiplePlatforms(env, platformCodes),
    getIndustryContext(env, industryCode),
  ])

  // Build campaign data string
  const campaignDataStr = formatCampaignData(campaignData, files)

  // Build company info string
  const companyInfo = formatCompanyInfo(companyConfig)

  // Track soul doc versions used
  const soulDocVersions: Record<string, number> = {}
  if (soulDoc) {
    soulDocVersions[soulDoc.slug] = soulDoc.version
  }

  return {
    systemPrompt: soulDoc?.content || getDefaultSystemPrompt(),
    platforms,
    industry,
    tactics,
    campaignData: campaignDataStr,
    companyInfo,
    soulDocVersions,
  }
}

/**
 * Build the full prompt with priority-based context ordering
 */
export function buildPrompt(context: AssembledContext, tokenBudget = 100000): string {
  const sections: Array<{ content: string; priority: number; required: boolean }> = []

  // 1. System context is handled separately via system prompt
  // 2. Tactic-specific guidance
  if (context.tactics.length > 0) {
    sections.push({
      content: formatTacticGuidance(context.tactics),
      priority: 1,
      required: true,
    })
  }

  // 3. Platform quirks (HIGH impact only)
  const highImpactQuirks = formatPlatformQuirks(context.platforms, 'high')
  if (highImpactQuirks) {
    sections.push({
      content: highImpactQuirks,
      priority: 2,
      required: true,
    })
  }

  // 4. Industry benchmarks
  if (context.industry) {
    const benchmarks = formatBenchmarks(context.industry)
    if (benchmarks) {
      sections.push({
        content: benchmarks,
        priority: 3,
        required: false,
      })
    }
  }

  // 5. Platform KPIs
  const kpis = formatPlatformKpis(context.platforms)
  if (kpis) {
    sections.push({
      content: kpis,
      priority: 4,
      required: false,
    })
  }

  // 6. Industry insights
  if (context.industry) {
    const insights = formatIndustryInsights(context.industry)
    if (insights) {
      sections.push({
        content: insights,
        priority: 5,
        required: false,
      })
    }
  }

  // 7. Buyer notes (lowest priority)
  const buyerNotes = formatBuyerNotes(context.platforms)
  if (buyerNotes) {
    sections.push({
      content: buyerNotes,
      priority: 6,
      required: false,
    })
  }

  // Company info and campaign data are always included
  sections.push({
    content: context.companyInfo,
    priority: 0,
    required: true,
  })

  sections.push({
    content: context.campaignData,
    priority: 0,
    required: true,
  })

  // Assemble within token budget
  return assembleWithinBudget(sections, tokenBudget)
}

/**
 * Get cacheable context blocks for Anthropic prompt caching
 */
export function getCacheableContext(context: AssembledContext): string[] {
  const blocks: string[] = []

  // Platform context is good for caching (reused across campaigns on same platforms)
  if (context.platforms.length > 0) {
    const platformContext = formatPlatformContext(context.platforms)
    if (platformContext) {
      blocks.push(platformContext)
    }
  }

  // Industry context is good for caching
  if (context.industry) {
    const industryContext = formatIndustryContext(context.industry)
    if (industryContext) {
      blocks.push(industryContext)
    }
  }

  return blocks
}

// ============ Formatting Functions ============

function formatCampaignData(
  campaignData: ContextOptions['campaignData'],
  files: ContextOptions['files']
): string {
  let output = '## Campaign Information\n\n'
  output += `- Order ID: ${campaignData.orderId}\n`
  if (campaignData.orderName) output += `- Order Name: ${campaignData.orderName}\n`
  if (campaignData.startDate) output += `- Start Date: ${campaignData.startDate}\n`
  if (campaignData.endDate) output += `- End Date: ${campaignData.endDate}\n`

  if (files.performance?.data && files.performance.data.length > 0) {
    output += '\n### Performance Data\n\n'
    output += formatDataTable(files.performance.data.slice(0, 50)) // Limit rows
  }

  if (files.pacing?.data && files.pacing.data.length > 0) {
    output += '\n### Pacing Data\n\n'
    output += formatDataTable(files.pacing.data.slice(0, 50)) // Limit rows
  }

  return output
}

function formatDataTable(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  let table = '| ' + headers.join(' | ') + ' |\n'
  table += '| ' + headers.map(() => '---').join(' | ') + ' |\n'

  for (const row of data) {
    table += '| ' + headers.map(h => String(row[h] ?? '')).join(' | ') + ' |\n'
  }

  return table
}

function formatCompanyInfo(config: ContextOptions['companyConfig']): string {
  let output = '## Company Context\n\n'
  output += `- Company: ${config.companyName}\n`
  output += `- Industry: ${config.industry}\n`

  if (config.customInstructions) {
    output += `\n### Custom Instructions\n${config.customInstructions}\n`
  }

  return output
}

function formatTacticGuidance(tactics: DetectedTactic[]): string {
  if (tactics.length === 0) return ''

  let output = '## Detected Tactics\n\n'

  for (const tactic of tactics) {
    output += `- **${tactic.tacticType}** on ${tactic.platform}`
    if (tactic.product) output += ` (${tactic.product})`
    if (tactic.matchConfidence < 0.9) output += ` [${Math.round(tactic.matchConfidence * 100)}% confidence]`
    output += '\n'
  }

  return output
}

function formatPlatformQuirks(platforms: PlatformContext[], impactLevel: 'high' | 'medium' | 'low'): string {
  const quirks: string[] = []

  for (const platform of platforms) {
    const filtered = (platform.quirks || []).filter(q => q.impact_level === impactLevel)
    for (const quirk of filtered) {
      quirks.push(`- **${platform.name}**: ${quirk.quirk}${quirk.recommendation ? ` → ${quirk.recommendation}` : ''}`)
    }
  }

  if (quirks.length === 0) return ''

  return `## Platform Quirks (${impactLevel.toUpperCase()} Impact)\n\n${quirks.join('\n')}\n`
}

function formatPlatformKpis(platforms: PlatformContext[]): string {
  const kpis: string[] = []

  for (const platform of platforms) {
    for (const kpi of platform.kpis || []) {
      let line = `- **${platform.name} - ${kpi.kpi_name}**`
      if (kpi.typical_range) line += `: typical range ${kpi.typical_range}`
      if (kpi.good_threshold) line += `, good > ${kpi.good_threshold}`
      if (kpi.bad_threshold) line += `, concerning < ${kpi.bad_threshold}`
      kpis.push(line)
    }
  }

  if (kpis.length === 0) return ''

  return `## Platform KPIs\n\n${kpis.join('\n')}\n`
}

function formatBenchmarks(industry: IndustryContext): string {
  if (!industry.benchmarks || industry.benchmarks.length === 0) return ''

  let output = `## ${industry.name} Industry Benchmarks\n\n`

  for (const benchmark of industry.benchmarks) {
    output += `- **${benchmark.metric_name}**: ${benchmark.benchmark_value}${benchmark.unit || ''}`
    if (benchmark.source) output += ` (${benchmark.source})`
    output += '\n'
  }

  return output
}

function formatIndustryInsights(industry: IndustryContext): string {
  if (!industry.insights || industry.insights.length === 0) return ''

  // Sort by priority and take top insights
  const sorted = [...industry.insights].sort((a, b) => b.priority - a.priority).slice(0, 5)

  let output = `## ${industry.name} Industry Insights\n\n`
  for (const insight of sorted) {
    output += `- ${insight.insight}\n`
  }

  return output
}

function formatBuyerNotes(platforms: PlatformContext[]): string {
  const notes: string[] = []

  for (const platform of platforms) {
    // Sort by priority and take top notes
    const sorted = [...(platform.buyer_notes || [])].sort((a, b) => b.priority - a.priority).slice(0, 2)
    for (const note of sorted) {
      notes.push(`- **${platform.name}**: ${note.note}`)
    }
  }

  if (notes.length === 0) return ''

  return `## Media Buyer Notes\n\n${notes.join('\n')}\n`
}

function formatPlatformContext(platforms: PlatformContext[]): string {
  let output = '## Platform Reference\n\n'

  for (const platform of platforms) {
    output += `### ${platform.name}\n`
    if (platform.description) output += `${platform.description}\n\n`

    // Include all quirks
    if (platform.quirks && platform.quirks.length > 0) {
      output += '**Quirks:**\n'
      for (const quirk of platform.quirks) {
        output += `- [${quirk.impact_level.toUpperCase()}] ${quirk.quirk}\n`
      }
      output += '\n'
    }
  }

  return output
}

function formatIndustryContext(industry: IndustryContext): string {
  let output = `## ${industry.name} Industry Reference\n\n`

  if (industry.description) {
    output += `${industry.description}\n\n`
  }

  if (industry.seasonality && industry.seasonality.length > 0) {
    output += '**Seasonality:**\n'
    for (const season of industry.seasonality) {
      output += `- ${season.period} (${season.impact} impact): ${season.description || ''}\n`
    }
    output += '\n'
  }

  return output
}

function assembleWithinBudget(
  sections: Array<{ content: string; priority: number; required: boolean }>,
  tokenBudget: number
): string {
  // Rough token estimation: 4 chars per token
  const estimateTokens = (text: string) => Math.ceil(text.length / 4)

  // Sort by priority (lower = higher priority)
  const sorted = [...sections].sort((a, b) => a.priority - b.priority)

  let result = ''
  let usedTokens = 0

  for (const section of sorted) {
    const sectionTokens = estimateTokens(section.content)

    if (section.required || usedTokens + sectionTokens <= tokenBudget) {
      result += section.content + '\n\n'
      usedTokens += sectionTokens
    }
  }

  return result.trim()
}

function getDefaultSystemPrompt(): string {
  return `You are an expert digital marketing analyst specializing in campaign performance analysis.

Your role is to:
1. Analyze campaign performance data thoroughly
2. Identify key trends, successes, and areas for improvement
3. Provide actionable recommendations based on industry best practices
4. Consider platform-specific nuances and limitations
5. Deliver insights in a clear, professional format

Always be specific with your analysis, citing actual metrics from the data provided.
Focus on insights that will help improve campaign performance and ROI.`
}
