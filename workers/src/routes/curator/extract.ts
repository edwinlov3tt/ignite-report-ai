/**
 * Curator Extract Route
 * POST /curator/extract - Extract schema entities from content
 * Supports both legacy and smart extraction modes
 */

import { Context } from 'hono'
import type { Env } from '../../types/bindings'
import { createSupabaseClient } from '../../services/supabase'
import { createOpenAIClient, extractEntities, classifyContent, smartExtract } from '../../services/curator/openai'
import { findMatchingEntities, formatMatchContextForPrompt } from '../../services/curator/semanticMatch'
import type {
  ExtractRequest,
  ExtractResponse,
  ExtractedItem,
  ExtractedField,
  CuratorSession,
  CuratorAction,
  SmartExtractionResult,
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
 * Supports 'smart' mode (semantic matching + actions) and 'legacy' mode
 */
export async function handleExtract(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json<ExtractRequest>()
    const { session_id, content, content_type, file_name, target_types, mode = 'smart' } = body

    // Validate input
    if (!content || content.trim().length === 0) {
      return c.json({
        success: false,
        error: 'Content is required',
      }, 400)
    }

    const supabase = createSupabaseClient(c.env)
    const openai = createOpenAIClient(c.env)

    // Use smart mode by default
    if (mode === 'smart') {
      return handleSmartExtract(c, supabase, openai, body)
    }

    // Legacy mode: Get or create session
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
 * Smart extraction handler
 * Uses semantic matching to find existing entities and determines actions
 */
async function handleSmartExtract(
  c: Context<{ Bindings: Env }>,
  supabase: ReturnType<typeof createSupabaseClient>,
  openai: ReturnType<typeof createOpenAIClient>,
  body: ExtractRequest
): Promise<Response> {
  const { session_id, content, content_type, file_name } = body

  // Get or create session
  let session: CuratorSession
  if (session_id) {
    const { data, error } = await supabase
      .from('curator_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (error || !data) {
      return c.json({ success: false, error: 'Session not found' }, 404)
    }

    session = data as CuratorSession
    if (session.status !== 'active') {
      return c.json({ success: false, error: 'Session is no longer active' }, 400)
    }
    if (session.tokens_used >= session.tokens_limit) {
      return c.json({ success: false, error: 'Token budget exceeded' }, 429)
    }
  } else {
    const { data, error } = await supabase
      .from('curator_sessions')
      .insert({
        status: 'active',
        messages: [],
        pending_items: [],
        committed_items: [],
        tokens_used: 0,
        tokens_limit: 500000,
      })
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to create session: ${error?.message}`)
    }
    session = data as CuratorSession
  }

  // Step 1: Find matching entities via semantic search
  console.log('Finding matching entities...')
  const matchedEntities = await findMatchingEntities(supabase, c.env, content)
  const matchContext = formatMatchContextForPrompt(matchedEntities)
  console.log('Match context:', matchContext)

  // Step 2: Smart extraction with context
  console.log('Running smart extraction...')
  const extraction = await smartExtract(openai, {
    content,
    matchedEntitiesContext: matchContext,
  })

  // Convert actions to CuratorAction format with IDs
  const actions: CuratorAction[] = extraction.actions.map(action => ({
    id: generateItemId(),
    action_type: action.action_type,
    entity_type: action.entity_type as CuratorAction['entity_type'],
    target_entity: action.target_entity_id ? {
      id: action.target_entity_id,
      name: action.target_entity_name || '',
      type: action.target_entity_type as CuratorAction['target_entity']['type'],
    } : undefined,
    fields: action.fields.map(f => ({
      name: f.name,
      value: f.value,
      confidence: f.confidence,
      source: content_type === 'url' ? 'url' as const : content_type === 'file_content' ? 'file' as const : 'manual' as const,
      source_snippet: f.reasoning,
    })),
    confidence: action.confidence,
    reasoning: action.reasoning,
    requires_research: action.requires_research,
    status: 'pending' as const,
  }))

  const smartResult: SmartExtractionResult = {
    intent: extraction.intent,
    intent_confidence: extraction.intent_confidence,
    matched_entities: matchedEntities,
    actions,
    clarification_needed: extraction.clarification_needed || undefined,
    summary: extraction.summary,
  }

  // Build assistant message
  const actionSummary = actions.map(action => {
    const targetInfo = action.target_entity
      ? ` → ${action.target_entity.name} (${action.target_entity.type})`
      : ''
    const nameField = action.fields.find(f => f.name === 'name' || f.name === 'title')
    const name = nameField ? String(nameField.value) : ''
    return `- ${action.action_type}: ${action.entity_type}${name ? ` "${name}"` : ''}${targetInfo} (${Math.round(action.confidence * 100)}%)`
  }).join('\n')

  const assistantMessage = extraction.clarification_needed
    ? `I need clarification: ${extraction.clarification_needed}\n\nBased on what I can infer, here are potential actions:\n${actionSummary}`
    : `Intent: ${extraction.intent} (${Math.round(extraction.intent_confidence * 100)}% confident)\n\nProposed actions:\n${actionSummary}\n\n${extraction.summary}`

  // Update session
  const contextMessage = `User submitted ${content_type} content${file_name ? ` from file: ${file_name}` : ''}\n\nContent:\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`

  await supabase
    .from('curator_sessions')
    .update({
      tokens_used: session.tokens_used + extraction.usage.total_tokens,
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
          content: assistantMessage,
          timestamp: new Date().toISOString(),
          metadata: {
            extracted_items: actions.length,
            tokens_used: extraction.usage.total_tokens,
            model: 'gpt-5.2-2025-12-11',
            mode: 'smart',
          },
        },
      ],
      pending_items: actions, // Store actions as pending items
    })
    .eq('id', session.id)

  return c.json({
    success: true,
    session_id: session.id,
    smart_result: smartResult,
    tokens_used: extraction.usage.total_tokens,
    tokens_remaining: session.tokens_limit - session.tokens_used - extraction.usage.total_tokens,
    message: assistantMessage,
  })
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
