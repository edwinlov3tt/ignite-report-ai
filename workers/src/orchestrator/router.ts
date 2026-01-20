/**
 * Multi-Agent Orchestrator
 * Routes analysis requests based on complexity
 */

import Anthropic from '@anthropic-ai/sdk'
import type { DetectedTactic, ParsedFile } from '../types/bindings'
import { sendMessage, sendExpertMessage, synthesizeExpertOutputs, type MessageResponse } from '../services/anthropic'

/**
 * Complexity assessment result
 */
export interface ComplexityAssessment {
  tacticCount: number
  platformCount: number
  uniquePlatforms: string[]
  hasComplexTactics: boolean
  requiresMultiAgent: boolean
  recommendedExperts: string[]
}

/**
 * Expert agent definition
 */
export interface ExpertAgent {
  name: string
  slug: string
  platforms?: string[]
  tacticTypes?: string[]
  prompt: string
}

/**
 * Pre-defined expert agents
 */
export const EXPERT_AGENTS: ExpertAgent[] = [
  {
    name: 'Paid Social Expert',
    slug: 'paid-social-expert',
    platforms: ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'snapchat', 'pinterest'],
    prompt: `You are an expert in paid social media advertising analysis.

Focus on:
- Engagement metrics (CTR, engagement rate, share rate)
- Audience targeting effectiveness
- Creative performance patterns
- Platform-specific algorithm considerations
- Social proof and viral potential
- Cost efficiency (CPM, CPC, CPE)

Provide specific, actionable insights for improving social media campaign performance.`,
  },
  {
    name: 'Search & SEM Expert',
    slug: 'search-sem-expert',
    platforms: ['google_ads'],
    tacticTypes: ['search', 'ppc', 'sem'],
    prompt: `You are an expert in search engine marketing and PPC analysis.

Focus on:
- Quality Score optimization
- Keyword performance and match type analysis
- Ad copy effectiveness
- Landing page relevance signals
- Bid strategy optimization
- Search query analysis and negative keywords
- Conversion tracking accuracy

Provide specific, actionable insights for improving search campaign performance.`,
  },
  {
    name: 'Display & Programmatic Expert',
    slug: 'display-programmatic-expert',
    platforms: ['programmatic'],
    tacticTypes: ['display', 'banner', 'native', 'programmatic'],
    prompt: `You are an expert in display and programmatic advertising analysis.

Focus on:
- Viewability metrics and ad placement quality
- Frequency capping effectiveness
- Audience segment performance
- Creative size and format optimization
- Brand safety and contextual relevance
- Retargeting efficiency
- Publisher/site performance

Provide specific, actionable insights for improving display campaign performance.`,
  },
  {
    name: 'Video & CTV Expert',
    slug: 'video-ctv-expert',
    platforms: ['youtube', 'ctv'],
    tacticTypes: ['video', 'ctv', 'ott', 'pre-roll'],
    prompt: `You are an expert in video and connected TV advertising analysis.

Focus on:
- Video completion rates by quartile
- Skip rate analysis
- Audience attention metrics
- Cross-device attribution
- Frequency and reach optimization
- Content adjacency and brand suitability
- Cost per completed view efficiency

Provide specific, actionable insights for improving video campaign performance.`,
  },
  {
    name: 'E-commerce & Retail Expert',
    slug: 'ecommerce-retail-expert',
    platforms: ['amazon_ads'],
    tacticTypes: ['shopping', 'product', 'catalog'],
    prompt: `You are an expert in e-commerce and retail media advertising analysis.

Focus on:
- ROAS and ACOS optimization
- Product-level performance
- Shopping feed quality
- Competitive positioning
- Inventory and availability impact
- Purchase funnel analysis
- Customer lifetime value signals

Provide specific, actionable insights for improving retail media campaign performance.`,
  },
]

/**
 * Assess campaign complexity to determine routing
 */
export function assessComplexity(
  tactics: DetectedTactic[],
  files: { performance?: ParsedFile; pacing?: ParsedFile }
): ComplexityAssessment {
  const tacticCount = tactics.length
  const uniquePlatforms = [...new Set(tactics.map(t => t.platform))]
  const platformCount = uniquePlatforms.length

  // Check for complex tactic types
  const complexTacticTypes = ['retargeting', 'dynamic', 'programmatic', 'ctv', 'ott']
  const hasComplexTactics = tactics.some(t =>
    complexTacticTypes.some(ct => t.tacticType.toLowerCase().includes(ct))
  )

  // Determine if multi-agent is needed
  const requiresMultiAgent =
    tacticCount >= 3 ||
    platformCount >= 2 ||
    hasComplexTactics

  // Select recommended experts based on platforms and tactics
  const recommendedExperts = selectExperts(tactics, uniquePlatforms)

  return {
    tacticCount,
    platformCount,
    uniquePlatforms,
    hasComplexTactics,
    requiresMultiAgent,
    recommendedExperts,
  }
}

/**
 * Select expert agents based on campaign composition
 */
export function selectExperts(
  tactics: DetectedTactic[],
  platforms: string[]
): string[] {
  const selectedExperts = new Set<string>()

  for (const expert of EXPERT_AGENTS) {
    // Check platform match
    const platformMatch = expert.platforms?.some(p => platforms.includes(p))

    // Check tactic type match
    const tacticMatch = expert.tacticTypes?.some(tt =>
      tactics.some(t => t.tacticType.toLowerCase().includes(tt))
    )

    if (platformMatch || tacticMatch) {
      selectedExperts.add(expert.slug)
    }
  }

  return Array.from(selectedExperts)
}

/**
 * Get expert agent by slug
 */
export function getExpertBySlug(slug: string): ExpertAgent | undefined {
  return EXPERT_AGENTS.find(e => e.slug === slug)
}

/**
 * Run multi-agent analysis
 */
export async function runMultiAgentAnalysis(
  client: Anthropic,
  systemPrompt: string,
  context: string,
  campaignData: string,
  expertSlugs: string[]
): Promise<{
  expertOutputs: Array<{ expert: string; output: string }>
  synthesis: MessageResponse
}> {
  // Get expert agents
  const experts = expertSlugs
    .map(slug => getExpertBySlug(slug))
    .filter((e): e is ExpertAgent => e !== undefined)

  if (experts.length === 0) {
    throw new Error('No valid experts found for the given slugs')
  }

  // Run experts in parallel with Haiku
  console.log(`Running ${experts.length} expert agents in parallel`)
  const expertPromises = experts.map(async expert => {
    const response = await sendExpertMessage(client, expert.prompt, context, campaignData)
    return {
      expert: expert.name,
      output: response.content,
    }
  })

  const expertOutputs = await Promise.all(expertPromises)
  console.log(`All expert agents completed`)

  // Synthesize with Sonnet
  console.log('Synthesizing expert outputs')
  const synthesis = await synthesizeExpertOutputs(
    client,
    systemPrompt,
    expertOutputs,
    campaignData
  )

  return {
    expertOutputs,
    synthesis,
  }
}

/**
 * Run single-call analysis (for simple campaigns)
 */
export async function runSingleCallAnalysis(
  client: Anthropic,
  systemPrompt: string,
  cachedContext: string[],
  prompt: string
): Promise<MessageResponse> {
  return sendMessage(client, {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.7,
    systemPrompt,
    cachedContext,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })
}
