/**
 * Analyze Route
 * Main campaign analysis endpoint with multi-agent support
 */

import { Context } from 'hono'
import type { Env, AnalyzeRequest, AnalyzeResponse, StoredReport } from '../types/bindings'
import { createAnthropicClient } from '../services/anthropic'
import { createSupabaseClient, saveReportMetadata } from '../services/supabase'
import { storeReport } from '../storage/r2'
import { assembleContext, buildPrompt, getCacheableContext } from '../context/assembler'
import { assessComplexity, runMultiAgentAnalysis, runSingleCallAnalysis } from '../orchestrator/router'

/**
 * POST /analyze
 * Analyze campaign data with AI
 */
export async function handleAnalyze(c: Context<{ Bindings: Env }>): Promise<Response> {
  const startTime = Date.now()

  try {
    const body = await c.req.json<AnalyzeRequest>()
    const { campaignData, companyConfig, files, config } = body

    // Validate required fields
    if (!campaignData?.orderId) {
      return c.json({ success: false, error: 'campaignData.orderId is required' }, 400)
    }
    if (!companyConfig?.companyName || !companyConfig?.industry) {
      return c.json({ success: false, error: 'companyConfig.companyName and industry are required' }, 400)
    }

    // Extract detected tactics from files
    const tactics = [
      ...(files.performance?.tactics || []),
      ...(files.pacing?.tactics || []),
    ]

    // Get unique platform codes from tactics
    const platformCodes = [...new Set(tactics.map(t => t.platform))]

    console.log(`Analyzing campaign ${campaignData.orderId}:`, {
      platforms: platformCodes,
      tactics: tactics.length,
      industry: companyConfig.industry,
    })

    // Assemble context from KV
    const context = await assembleContext(c.env, {
      soulDocSlug: 'campaign-analyst',
      platformCodes,
      industryCode: companyConfig.industry.toLowerCase().replace(/\s+/g, '_'),
      tactics,
      campaignData,
      companyConfig,
      files,
    })

    // Assess complexity for routing decision
    const complexity = assessComplexity(tactics, files)
    console.log('Complexity assessment:', complexity)

    // Create Anthropic client
    const anthropic = createAnthropicClient(c.env)

    // Build the prompt
    const prompt = buildPrompt(context)
    const cacheableContext = getCacheableContext(context)

    let analysisContent: string
    let modelUsed: string
    let tokensUsed: { input: number; output: number }
    let agentStrategy: 'single_call' | 'multi_agent'

    if (complexity.requiresMultiAgent && complexity.recommendedExperts.length > 0) {
      // Multi-agent analysis for complex campaigns
      console.log('Using multi-agent strategy with experts:', complexity.recommendedExperts)
      agentStrategy = 'multi_agent'

      const { synthesis } = await runMultiAgentAnalysis(
        anthropic,
        context.systemPrompt,
        cacheableContext.join('\n\n'),
        prompt,
        complexity.recommendedExperts
      )

      analysisContent = synthesis.content
      modelUsed = synthesis.model
      tokensUsed = {
        input: synthesis.usage.input_tokens,
        output: synthesis.usage.output_tokens,
      }
    } else {
      // Single-call analysis for simple campaigns
      console.log('Using single-call strategy')
      agentStrategy = 'single_call'

      const response = await runSingleCallAnalysis(
        anthropic,
        context.systemPrompt,
        cacheableContext,
        prompt
      )

      analysisContent = response.content
      modelUsed = response.model
      tokensUsed = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      }
    }

    // Generate report ID
    const reportId = crypto.randomUUID()

    // Create stored report
    const storedReport: StoredReport = {
      id: reportId,
      campaign_id: campaignData.orderId,
      content: analysisContent,
      model_used: modelUsed,
      agent_strategy: agentStrategy,
      soul_doc_versions: context.soulDocVersions,
      tokens_used: tokensUsed,
      created_at: new Date().toISOString(),
    }

    // Store report in R2
    const { key: r2Key } = await storeReport(c.env, storedReport)
    console.log(`Report stored in R2: ${r2Key}`)

    // Save metadata to Supabase
    const supabase = createSupabaseClient(c.env)
    await saveReportMetadata(supabase, {
      id: reportId,
      campaign_id: campaignData.orderId,
      r2_key: r2Key,
      model_used: modelUsed,
      agent_strategy: agentStrategy,
      soul_doc_versions: context.soulDocVersions,
    })

    const duration = Date.now() - startTime
    console.log(`Analysis completed in ${duration}ms:`, {
      reportId,
      model: modelUsed,
      strategy: agentStrategy,
      tokensUsed,
    })

    return c.json({
      success: true,
      reportId,
      analysis: analysisContent,
      model: modelUsed,
      tokensUsed,
      strategy: agentStrategy,
      duration,
    } as AnalyzeResponse & { strategy: string; duration: number })

  } catch (error) {
    console.error('Analyze route error:', error)

    // Check for specific Anthropic errors
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        return c.json({
          success: false,
          error: 'Rate limit exceeded. Please try again in a moment.',
          retryable: true,
        }, 429)
      }

      if (error.message.includes('invalid_api_key')) {
        return c.json({
          success: false,
          error: 'API configuration error. Please contact support.',
        }, 500)
      }
    }

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * Detect platforms from various data sources
 */
export function detectPlatformsFromData(
  campaignData: AnalyzeRequest['campaignData'],
  files: AnalyzeRequest['files']
): string[] {
  const platforms = new Set<string>()

  // From performance file tactics
  for (const tactic of files.performance?.tactics || []) {
    if (tactic.platform) {
      platforms.add(normalizePlatform(tactic.platform))
    }
  }

  // From pacing file tactics
  for (const tactic of files.pacing?.tactics || []) {
    if (tactic.platform) {
      platforms.add(normalizePlatform(tactic.platform))
    }
  }

  return Array.from(platforms)
}

/**
 * Normalize platform names to standard codes
 */
function normalizePlatform(platform: string): string {
  const normalized = platform.toLowerCase().trim()

  const platformMap: Record<string, string> = {
    'facebook': 'facebook',
    'meta': 'facebook',
    'fb': 'facebook',
    'instagram': 'instagram',
    'ig': 'instagram',
    'google': 'google_ads',
    'google ads': 'google_ads',
    'googleads': 'google_ads',
    'adwords': 'google_ads',
    'youtube': 'youtube',
    'yt': 'youtube',
    'linkedin': 'linkedin',
    'li': 'linkedin',
    'twitter': 'twitter',
    'x': 'twitter',
    'tiktok': 'tiktok',
    'snap': 'snapchat',
    'snapchat': 'snapchat',
    'pinterest': 'pinterest',
    'amazon': 'amazon_ads',
    'amazon ads': 'amazon_ads',
    'programmatic': 'programmatic',
    'display': 'programmatic',
    'dv360': 'programmatic',
    'ttd': 'programmatic',
    'ctv': 'ctv',
    'ott': 'ctv',
    'streaming': 'streaming_audio',
    'audio': 'streaming_audio',
    'spotify': 'streaming_audio',
  }

  return platformMap[normalized] || normalized
}
