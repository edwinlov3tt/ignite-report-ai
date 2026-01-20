/**
 * Anthropic Claude API Client
 * Handles all Claude API interactions with prompt caching support
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Env } from '../types/bindings'

export type ModelId = 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514' | 'claude-3-5-haiku-20241022'

export interface MessageOptions {
  model?: ModelId
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  cachedContext?: string[]  // Content to cache for reuse
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export interface MessageResponse {
  content: string
  model: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
  stop_reason: string
}

/**
 * Create an Anthropic client with the API key from environment
 */
export function createAnthropicClient(env: Env): Anthropic {
  return new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  })
}

/**
 * Send a message to Claude with optional prompt caching
 */
export async function sendMessage(
  client: Anthropic,
  options: MessageOptions
): Promise<MessageResponse> {
  const {
    model = 'claude-sonnet-4-20250514',
    maxTokens = 4096,
    temperature = 0.7,
    systemPrompt,
    cachedContext = [],
    messages,
  } = options

  // Build system content blocks with caching
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = []

  // Add system prompt with cache control if provided
  if (systemPrompt) {
    systemBlocks.push({
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    })
  }

  // Add cached context blocks (platform/industry context)
  for (const context of cachedContext) {
    systemBlocks.push({
      type: 'text',
      text: context,
      cache_control: { type: 'ephemeral' },
    })
  }

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemBlocks.length > 0 ? systemBlocks : undefined,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  })

  // Extract text content from response
  const textContent = response.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  return {
    content: textContent,
    model: response.model,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? undefined,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? undefined,
    },
    stop_reason: response.stop_reason ?? 'unknown',
  }
}

/**
 * Send message to Haiku for expert agent tasks
 */
export async function sendExpertMessage(
  client: Anthropic,
  expertPrompt: string,
  context: string,
  campaignData: string
): Promise<MessageResponse> {
  return sendMessage(client, {
    model: 'claude-3-5-haiku-20241022',
    maxTokens: 2048,
    temperature: 0.5,
    systemPrompt: expertPrompt,
    messages: [
      {
        role: 'user',
        content: `${context}\n\n${campaignData}`,
      },
    ],
  })
}

/**
 * Synthesize multiple expert outputs with Sonnet
 */
export async function synthesizeExpertOutputs(
  client: Anthropic,
  systemPrompt: string,
  expertOutputs: Array<{ expert: string; output: string }>,
  originalRequest: string
): Promise<MessageResponse> {
  const synthesisPrompt = `You are synthesizing multiple expert analyses into a cohesive report.

## Expert Analyses:
${expertOutputs.map(e => `### ${e.expert}\n${e.output}`).join('\n\n')}

## Original Request:
${originalRequest}

Please synthesize these expert analyses into a unified, coherent report. Resolve any conflicts, highlight consensus points, and provide actionable recommendations.`

  return sendMessage(client, {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.7,
    systemPrompt,
    messages: [
      {
        role: 'user',
        content: synthesisPrompt,
      },
    ],
  })
}
