import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'API key not configured' })
  }

  try {
    const { campaignData, companyConfig, timeRange, files, config } = req.body

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(campaignData, companyConfig, timeRange, files, config)

    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: config.temperature || 0.5,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    const responseText = content.type === 'text' ? content.text : ''

    return res.status(200).json({
      success: true,
      data: {
        executiveSummary: responseText,
        generatedAt: new Date().toISOString(),
        campaignName: campaignData?.orderName || 'Campaign',
        companyName: companyConfig?.companyName || campaignData?.companyName || 'Company',
      },
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate analysis',
    })
  }
}

function buildAnalysisPrompt(
  campaignData: any,
  companyConfig: any,
  timeRange: any,
  files: Record<string, any[]>,
  config: any
) {
  const toneInstructions: Record<string, string> = {
    professional: 'Use a formal, business-appropriate tone.',
    conversational: 'Use a friendly, approachable tone.',
    analytical: 'Focus on data-driven insights and metrics.',
    encouraging: 'Use a positive, motivating tone highlighting successes.',
    concise: 'Be brief and to the point, focusing on key insights.',
    casual: 'Use a relaxed, informal tone.',
  }

  const tone = toneInstructions[config.tone] || toneInstructions.professional

  // Build file data summary
  const fileDataSummary = Object.entries(files)
    .map(([tactic, tacticFiles]) => {
      if (!tacticFiles || tacticFiles.length === 0) return null
      const totalRows = tacticFiles.reduce((sum, f: any) => sum + (f.data?.length || 0), 0)
      const headers = tacticFiles[0]?.headers || []
      return `- ${tactic}: ${tacticFiles.length} files, ${totalRows} data rows. Columns: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}`
    })
    .filter(Boolean)
    .join('\n')

  return `You are an expert digital marketing analyst. Analyze the following campaign data and provide actionable insights.

${tone}

## Campaign Information
- **Company**: ${companyConfig?.companyName || campaignData?.companyName || 'Unknown'}
- **Campaign**: ${campaignData?.orderName || 'Campaign'}
- **Industry**: ${companyConfig?.industry || 'Not specified'}
- **Status**: ${campaignData?.status || 'Unknown'}
- **Date Range**: ${timeRange?.startDate || 'N/A'} to ${timeRange?.endDate || 'N/A'} (${timeRange?.durationDays || 0} days)

## Campaign Goals
${companyConfig?.campaignGoals || 'Not specified'}

## Additional Context
${companyConfig?.additionalNotes || 'None provided'}

## Performance Data Available
${fileDataSummary || 'No performance data uploaded'}

## Line Items (${campaignData?.lineItems?.length || 0} total)
${campaignData?.lineItems?.slice(0, 10).map((item: any) => `- ${item.product}: ${item.subProduct || 'N/A'} (${item.status})`).join('\n') || 'No line items'}
${(campaignData?.lineItems?.length || 0) > 10 ? `... and ${campaignData.lineItems.length - 10} more` : ''}

${config.customInstructions ? `## Custom Instructions\n${config.customInstructions}\n` : ''}

Please provide a comprehensive analysis including:
1. **Executive Summary** - Key findings and overall campaign health
2. **Performance Analysis** - Analysis of each tactic's performance
3. **Trends & Patterns** - Notable trends observed in the data
4. **Recommendations** - Specific, actionable recommendations for improvement

Format your response in clear markdown with headers and bullet points.`
}
