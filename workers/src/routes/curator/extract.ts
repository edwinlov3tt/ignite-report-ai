/**
 * Curator Extract Route
 * POST /curator/extract - Extract schema entities from content
 */

import { Context } from 'hono'
import type { Env } from '../../types/bindings'
import { createSupabaseClient } from '../../services/supabase'
import { createOpenAIClient, extractEntities, classifyContent } from '../../services/curator/openai'
import type {
  ExtractRequest,
  ExtractResponse,
  ExtractedItem,
  ExtractedField,
  CuratorSession,
  CURATOR_CONFIG,
} from '../../types/curator'

/**
 * Generate a unique ID for extracted items
 */
function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * POST /curator/extract
 * Extract schema entities from provided content
 */
export async function handleExtract(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<ExtractRequest>()
    const { session_id, content, content_type, file_name, target_types } = body

    // Validate input
    if (!content || content.trim().length === 0) {
      return c.json({
        success: false,
        error: 'Content is required',
      }, 400)
    }

    const supabase = createSupabaseClient(c.env)
    const openai = createOpenAIClient(c.env)

    // Get or create session
    let session: CuratorSession
    if (session_id) {
      // Resume existing session
      const { data, error } = await supabase
        .from('curator_sessions')
        .select('*')
        .eq('id', session_id)
        .single()

      if (error || !data) {
        return c.json({
          success: false,
          error: 'Session not found',
        }, 404)
      }

      session = data as CuratorSession

      // Check if session is still active
      if (session.status !== 'active') {
        return c.json({
          success: false,
          error: 'Session is no longer active',
        }, 400)
      }

      // Check token budget
      if (session.tokens_used >= session.tokens_limit) {
        return c.json({
          success: false,
          error: 'Token budget exceeded for this session',
        }, 429)
      }
    } else {
      // Create new session
      const { data, error } = await supabase
        .from('curator_sessions')
        .insert({
          status: 'active',
          messages: [],
          pending_items: [],
          committed_items: [],
          tokens_used: 0,
          tokens_limit: 500000, // ~$10/day budget
        })
        .select()
        .single()

      if (error || !data) {
        throw new Error(`Failed to create session: ${error?.message}`)
      }

      session = data as CuratorSession
    }

    // Build context message for the chat
    let contextMessage = `User submitted ${content_type} content`
    if (file_name) {
      contextMessage += ` from file: ${file_name}`
    }
    contextMessage += `\n\nContent:\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`

    // First, classify the content to understand what types are present
    const classification = await classifyContent(openai, content)

    // Filter to requested types if specified
    const typesToExtract = target_types && target_types.length > 0
      ? classification.detected_types.filter(t => target_types.includes(t.entity_type))
      : classification.detected_types.filter(t => t.confidence >= 0.5)

    // If no types detected with sufficient confidence, return early
    if (typesToExtract.length === 0) {
      // Update session with attempt
      await supabase
        .from('curator_sessions')
        .update({
          tokens_used: session.tokens_used + classification.usage.total_tokens,
          last_activity_at: new Date().toISOString(),
          messages: [
            ...session.messages,
            {
              id: generateItemId(),
              role: 'user',
              content: contextMessage,
              timestamp: new Date().toISOString(),
            },
            {
              id: generateItemId(),
              role: 'assistant',
              content: 'I analyzed the content but could not identify any schema entities with sufficient confidence. Please provide more specific information about platforms, industries, products, or other schema types.',
              timestamp: new Date().toISOString(),
              metadata: { tokens_used: classification.usage.total_tokens },
            },
          ],
        })
        .eq('id', session.id)

      return c.json({
        success: true,
        session_id: session.id,
        extracted_items: [],
        tokens_used: classification.usage.total_tokens,
        tokens_remaining: session.tokens_limit - session.tokens_used - classification.usage.total_tokens,
        message: 'No schema entities detected with sufficient confidence. Please provide more specific content.',
      })
    }

    // Extract entities
    const extraction = await extractEntities(openai, {
      content,
      targetTypes: typesToExtract.map(t => t.entity_type),
    })

    const totalTokensUsed = classification.usage.total_tokens + extraction.usage.total_tokens

    // Convert OpenAI extraction results to ExtractedItem format
    const extractedItems: ExtractedItem[] = extraction.entities.map(entity => {
      const fields: ExtractedField[] = entity.fields.map(f => ({
        name: f.name,
        value: f.value,
        confidence: f.confidence,
        source: content_type === 'url' ? 'url' : content_type === 'file_content' ? 'file' : 'manual',
        source_snippet: f.reasoning,
      }))

      // Calculate overall confidence as weighted average
      const overallConfidence = fields.length > 0
        ? fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length
        : 0

      return {
        id: generateItemId(),
        entity_type: entity.entity_type,
        fields,
        overall_confidence: overallConfidence,
        classification_reason: entity.classification_reason,
        duplicate_candidates: [], // Will be populated by preview endpoint
        conflicts: [],
        status: 'pending',
      }
    })

    // Build assistant response message
    const entitySummary = extractedItems
      .map(item => {
        const nameField = item.fields.find(f => f.name === 'name')
        const name = nameField ? String(nameField.value) : 'Unnamed'
        return `- ${item.entity_type}: "${name}" (${Math.round(item.overall_confidence * 100)}% confidence)`
      })
      .join('\n')

    const assistantMessage = extractedItems.length > 0
      ? `I extracted ${extractedItems.length} schema ${extractedItems.length === 1 ? 'entity' : 'entities'}:\n\n${entitySummary}\n\n${extraction.summary}\n\nPlease review the extracted items and approve or edit them before committing.`
      : `I analyzed the content but could not extract any valid schema entities. ${extraction.summary}`

    // Update session with results
    const updatedMessages = [
      ...session.messages,
      {
        id: generateItemId(),
        role: 'user' as const,
        content: contextMessage,
        timestamp: new Date().toISOString(),
      },
      {
        id: generateItemId(),
        role: 'assistant' as const,
        content: assistantMessage,
        timestamp: new Date().toISOString(),
        metadata: {
          extracted_items: extractedItems.length,
          tokens_used: totalTokensUsed,
          model: 'gpt-5.2-2025-12-11',
        },
      },
    ]

    const updatedPendingItems = [...session.pending_items, ...extractedItems]

    await supabase
      .from('curator_sessions')
      .update({
        tokens_used: session.tokens_used + totalTokensUsed,
        last_activity_at: new Date().toISOString(),
        messages: updatedMessages,
        pending_items: updatedPendingItems,
      })
      .eq('id', session.id)

    const response: ExtractResponse = {
      success: true,
      session_id: session.id,
      extracted_items: extractedItems,
      tokens_used: totalTokensUsed,
      tokens_remaining: session.tokens_limit - session.tokens_used - totalTokensUsed,
      message: assistantMessage,
    }

    return c.json(response)
  } catch (error) {
    console.error('Curator extract error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /curator/session/:id
 * Get session details including pending items
 */
export async function handleGetSession(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const sessionId = c.req.param('id')

    if (!sessionId) {
      return c.json({
        success: false,
        error: 'Session ID is required',
      }, 400)
    }

    const supabase = createSupabaseClient(c.env)

    const { data, error } = await supabase
      .from('curator_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !data) {
      return c.json({
        success: false,
        error: 'Session not found',
      }, 404)
    }

    return c.json({
      success: true,
      session: data,
    })
  } catch (error) {
    console.error('Curator get session error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
