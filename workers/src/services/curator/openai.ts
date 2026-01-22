/**
 * OpenAI Service for Schema Curator
 * Handles GPT-5.2 interactions for extraction, classification, and verification
 */

import OpenAI from 'openai'
import type { Env } from '../../types/bindings'
import {
  type EntityType,
  type ExtractedField,
  type OpenAIExtractionResult,
  CURATOR_CONFIG,
} from '../../types/curator'

// ============================================
// Client Factory
// ============================================

export function createOpenAIClient(env: Env): OpenAI {
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  })
}

// ============================================
// Extraction Service
// ============================================

// Available Lucide icons for entity types
const AVAILABLE_ICONS = {
  industry: [
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
  ],
  platform: [
    'Facebook', 'Instagram', 'Twitter', 'Linkedin', 'Youtube', 'Twitch',
    'Chrome', 'Search', 'Globe', 'Tv', 'Radio', 'Smartphone',
    'Mail', 'MessageSquare', 'Send', 'Megaphone',
    'BarChart', 'LineChart', 'PieChart', 'Activity',
  ],
}

const EXTRACTION_SYSTEM_PROMPT = `You are a Schema Curator AI that extracts structured data from text content for a digital marketing analytics platform.

Your task is to identify and extract schema entities from the provided content. The platform supports these entity types:

1. **Platform** - Advertising platforms (e.g., Meta, Google Ads, TikTok, LinkedIn)
   - Fields: code, name, category (social/search/programmatic/ctv), description, logo_url

2. **Industry** - Business verticals/industries
   - Fields: code, name, description, icon
   - For the icon field, choose from these Lucide icon names: ${AVAILABLE_ICONS.industry.join(', ')}
   - Pick an icon that best represents the industry visually

3. **Product** - Top-level advertising product categories
   - Fields: name, data_value, description

4. **Subproduct** - Product subdivisions
   - Fields: name, data_value, description, parent_product

5. **Tactic Type** - Specific ad tactics within subproducts
   - Fields: name, data_value, description, parent_subproduct

6. **Soul Document** - AI prompt templates and personas
   - Fields: doc_type (system_prompt/agent_persona/skill/template), name, slug, content, description

For each extracted entity:
- Assign a confidence score (0.0 to 1.0) based on how certain you are about the value
- Provide reasoning for your classification
- Note the source type (the content came from user input)

Be conservative with confidence scores:
- 0.90-1.00: Direct, unambiguous statement of the value
- 0.70-0.89: Strong implication or standard industry terminology
- 0.50-0.69: Reasonable inference with some ambiguity
- Below 0.50: Educated guess, flag for review

Always output valid JSON matching the specified schema.`

const EXTRACTION_JSON_SCHEMA = {
  name: 'extraction_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      entities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            entity_type: {
              type: 'string',
              enum: ['platform', 'industry', 'product', 'subproduct', 'tactic_type', 'soul_doc'],
            },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  value: { type: ['string', 'number', 'boolean', 'null'] },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  reasoning: { type: 'string' },
                },
                required: ['name', 'value', 'confidence', 'reasoning'],
                additionalProperties: false,
              },
            },
            classification_reason: { type: 'string' },
          },
          required: ['entity_type', 'fields', 'classification_reason'],
          additionalProperties: false,
        },
      },
      summary: { type: 'string' },
    },
    required: ['entities', 'summary'],
    additionalProperties: false,
  },
}

export interface ExtractionOptions {
  content: string
  targetTypes?: EntityType[]
  maxTokens?: number
}

export interface ExtractionResponse {
  entities: OpenAIExtractionResult[]
  summary: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Extract schema entities from text content using GPT-5.2
 */
export async function extractEntities(
  client: OpenAI,
  options: ExtractionOptions
): Promise<ExtractionResponse> {
  const { content, targetTypes, maxTokens = CURATOR_CONFIG.MAX_TOKENS_PER_REQUEST } = options

  let userPrompt = `Please extract schema entities from the following content:\n\n${content}`

  if (targetTypes && targetTypes.length > 0) {
    userPrompt += `\n\nFocus on extracting these entity types: ${targetTypes.join(', ')}`
  }

  const response = await client.chat.completions.create({
    model: CURATOR_CONFIG.MODEL,
    max_completion_tokens: maxTokens,
    temperature: 0.3, // Lower temp for more consistent extraction
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: EXTRACTION_JSON_SCHEMA,
    },
  })

  const content_response = response.choices[0]?.message?.content
  if (!content_response) {
    throw new Error('No response content from OpenAI')
  }

  const parsed = JSON.parse(content_response) as {
    entities: OpenAIExtractionResult[]
    summary: string
  }

  return {
    entities: parsed.entities,
    summary: parsed.summary,
    usage: {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    },
  }
}

// ============================================
// Classification Service
// ============================================

const CLASSIFICATION_SYSTEM_PROMPT = `You are a Schema Classifier AI. Given text content, determine which schema entity types are present.

Entity types:
- platform: Advertising platforms (Meta, Google, TikTok, etc.)
- industry: Business verticals (Retail, Healthcare, Finance, etc.)
- product: Ad product categories (Display, Video, Search, etc.)
- subproduct: Product subdivisions (Standard Display, Responsive Display, etc.)
- tactic_type: Specific ad tactics (Prospecting, Retargeting, etc.)
- soul_doc: AI prompts, templates, or personas

Return a list of detected entity types with confidence scores and reasoning.`

const CLASSIFICATION_JSON_SCHEMA = {
  name: 'classification_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      detected_types: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            entity_type: {
              type: 'string',
              enum: ['platform', 'industry', 'product', 'subproduct', 'tactic_type', 'soul_doc'],
            },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            reasoning: { type: 'string' },
            estimated_count: { type: 'integer', minimum: 0 },
          },
          required: ['entity_type', 'confidence', 'reasoning', 'estimated_count'],
          additionalProperties: false,
        },
      },
    },
    required: ['detected_types'],
    additionalProperties: false,
  },
}

export interface ClassificationResult {
  entity_type: EntityType
  confidence: number
  reasoning: string
  estimated_count: number
}

export interface ClassificationResponse {
  detected_types: ClassificationResult[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Classify content to detect which entity types are present
 */
export async function classifyContent(
  client: OpenAI,
  content: string
): Promise<ClassificationResponse> {
  const response = await client.chat.completions.create({
    model: CURATOR_CONFIG.MODEL,
    max_completion_tokens: 1024,
    temperature: 0.2,
    messages: [
      { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
      { role: 'user', content: `Classify the following content:\n\n${content}` },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: CLASSIFICATION_JSON_SCHEMA,
    },
  })

  const content_response = response.choices[0]?.message?.content
  if (!content_response) {
    throw new Error('No response content from OpenAI')
  }

  const parsed = JSON.parse(content_response) as {
    detected_types: ClassificationResult[]
  }

  return {
    detected_types: parsed.detected_types,
    usage: {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    },
  }
}

// ============================================
// Verification Service
// ============================================

const VERIFICATION_SYSTEM_PROMPT = `You are a Schema Verifier AI. Your task is to verify extracted data against provided sources.

For each field, determine:
1. Is the value supported by the sources?
2. What is the confidence level based on source quality?
3. Are there any corrections or clarifications needed?

Be critical and evidence-based. Only mark values as verified if sources directly support them.`

export interface VerificationSource {
  url: string
  content: string
  domain: string
  trust_level: 'authoritative' | 'standard' | 'limited'
}

export interface VerificationRequest {
  field: ExtractedField
  sources: VerificationSource[]
}

export interface VerificationResult {
  field_name: string
  is_verified: boolean
  original_value: unknown
  verified_value: unknown
  confidence: number
  supporting_sources: string[]
  reasoning: string
}

const VERIFICATION_JSON_SCHEMA = {
  name: 'verification_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      field_name: { type: 'string' },
      is_verified: { type: 'boolean' },
      verified_value: { type: ['string', 'number', 'boolean', 'null'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      supporting_sources: {
        type: 'array',
        items: { type: 'string' },
      },
      reasoning: { type: 'string' },
    },
    required: ['field_name', 'is_verified', 'verified_value', 'confidence', 'supporting_sources', 'reasoning'],
    additionalProperties: false,
  },
}

/**
 * Verify an extracted field against web sources
 */
export async function verifyField(
  client: OpenAI,
  request: VerificationRequest
): Promise<VerificationResult> {
  const { field, sources } = request

  const sourcesText = sources.map((s, i) => (
    `Source ${i + 1} (${s.trust_level} - ${s.domain}):\n${s.content}\nURL: ${s.url}`
  )).join('\n\n')

  const userPrompt = `Verify this extracted field:
Field: ${field.name}
Current Value: ${JSON.stringify(field.value)}
Current Confidence: ${field.confidence}

Against these sources:
${sourcesText}`

  const response = await client.chat.completions.create({
    model: CURATOR_CONFIG.MODEL,
    max_completion_tokens: 1024,
    temperature: 0.2,
    messages: [
      { role: 'system', content: VERIFICATION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: VERIFICATION_JSON_SCHEMA,
    },
  })

  const content_response = response.choices[0]?.message?.content
  if (!content_response) {
    throw new Error('No response content from OpenAI')
  }

  const parsed = JSON.parse(content_response) as Omit<VerificationResult, 'original_value'>

  return {
    ...parsed,
    original_value: field.value,
  }
}

// ============================================
// Duplicate Detection Service
// ============================================

const DUPLICATE_SYSTEM_PROMPT = `You are a Duplicate Detection AI. Compare extracted entities against existing entities to identify potential duplicates.

Consider:
- Name similarity (accounting for variations, abbreviations, alternate names)
- Field value overlap
- Semantic equivalence (e.g., "Facebook Ads" vs "Meta Ads")

Return a similarity score (0.0 to 1.0) and matching field details.`

export interface ExistingEntity {
  id: string
  entity_type: EntityType
  name: string
  fields: Record<string, unknown>
}

export interface DuplicateCheckResult {
  is_potential_duplicate: boolean
  similarity_score: number
  matching_fields: string[]
  reasoning: string
  suggested_action: 'create_new' | 'merge' | 'review'
}

const DUPLICATE_JSON_SCHEMA = {
  name: 'duplicate_check_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      is_potential_duplicate: { type: 'boolean' },
      similarity_score: { type: 'number', minimum: 0, maximum: 1 },
      matching_fields: {
        type: 'array',
        items: { type: 'string' },
      },
      reasoning: { type: 'string' },
      suggested_action: {
        type: 'string',
        enum: ['create_new', 'merge', 'review'],
      },
    },
    required: ['is_potential_duplicate', 'similarity_score', 'matching_fields', 'reasoning', 'suggested_action'],
    additionalProperties: false,
  },
}

/**
 * Check if extracted entity is a duplicate of existing entity
 */
export async function checkDuplicate(
  client: OpenAI,
  extracted: { entity_type: EntityType; fields: ExtractedField[] },
  existing: ExistingEntity
): Promise<DuplicateCheckResult> {
  const extractedFields = Object.fromEntries(
    extracted.fields.map(f => [f.name, f.value])
  )

  const userPrompt = `Compare these entities for potential duplication:

EXTRACTED ENTITY:
Type: ${extracted.entity_type}
Fields: ${JSON.stringify(extractedFields, null, 2)}

EXISTING ENTITY:
ID: ${existing.id}
Type: ${existing.entity_type}
Name: ${existing.name}
Fields: ${JSON.stringify(existing.fields, null, 2)}`

  const response = await client.chat.completions.create({
    model: CURATOR_CONFIG.MODEL,
    max_completion_tokens: 1024,
    temperature: 0.2,
    messages: [
      { role: 'system', content: DUPLICATE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: DUPLICATE_JSON_SCHEMA,
    },
  })

  const content_response = response.choices[0]?.message?.content
  if (!content_response) {
    throw new Error('No response content from OpenAI')
  }

  return JSON.parse(content_response) as DuplicateCheckResult
}

// ============================================
// Chat Service (Conversational Interface)
// ============================================

const CHAT_SYSTEM_PROMPT = `You are the Schema Curator Assistant, an AI helper for managing schema data in a digital marketing analytics platform.

You help users:
1. Add new platforms, industries, products, and other schema entities
2. Update existing entities with new information
3. Research and verify data from various sources
4. Resolve conflicts and duplicates

Be conversational but efficient. Ask clarifying questions when needed. Summarize what you extracted and what actions you're taking.

When the user provides content, extract relevant entities and explain what you found. Guide them through the review and commit process.`

export interface ChatOptions {
  sessionMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  userMessage: string
  maxTokens?: number
}

export interface ChatResponse {
  content: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Send a conversational message to the curator assistant
 */
export async function chat(
  client: OpenAI,
  options: ChatOptions
): Promise<ChatResponse> {
  const { sessionMessages, userMessage, maxTokens = 2048 } = options

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ...sessionMessages,
    { role: 'user', content: userMessage },
  ]

  const response = await client.chat.completions.create({
    model: CURATOR_CONFIG.MODEL,
    max_completion_tokens: maxTokens,
    temperature: 0.7,
    messages,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response content from OpenAI')
  }

  return {
    content,
    usage: {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    },
  }
}

// ============================================
// Smart Extraction Service
// ============================================

const SMART_EXTRACTION_SYSTEM_PROMPT = `You are an intelligent Schema Curator AI for a digital marketing analytics platform. Your role is to analyze content and determine the BEST actions to take.

You can perform these action types:
1. **create_entity** - Create a new platform, industry, product, subproduct, tactic_type, or soul_doc
2. **update_field** - Update a specific field on an EXISTING entity (like adding ai_instruction)
3. **add_enrichment** - Add a quirk, insight, or note to an EXISTING entity
4. **research_fill** - Flag that additional research is needed to fill gaps

## Entity Types

### Core Entities (things you create):
- **platform** - Advertising platforms (Meta, Google Ads, TikTok)
- **industry** - Business verticals (Retail, Healthcare, Roofing)
- **product** - Ad product categories (Search, Display, Video)
- **subproduct** - Product subdivisions
- **tactic_type** - Specific tactics
- **soul_doc** - AI prompts and templates

### Enrichment Entities (things you add to existing entities):
- **platform_quirk** - Gotchas, edge cases, reporting quirks for a platform
  Fields: title, description, quirk_type (reporting/optimization/creative/targeting), ai_instruction, impact
- **industry_insight** - Tips, benchmarks, strategies for an industry
  Fields: title, content, insight_type (trend/benchmark/strategy/warning), ai_instruction
- **platform_buyer_note** - Practitioner tips for a platform
  Fields: content, note_type (tip/warning/best_practice)

## Decision Logic

1. **If content describes characteristics OF an existing entity** → add_enrichment or update_field
   Example: "Facebook's API often double-counts conversions" → platform_quirk for Facebook/Meta

2. **If content describes a NEW entity not in the schema** → create_entity
   Example: "We should add the Roofing industry" → create industry

3. **If content mentions both existing AND new entities** → multiple actions
   Example: "In roofing, SEM impression share is critical" →
   - create industry "Roofing" (if doesn't exist)
   - add industry_insight for SEM+Roofing
   - update_field on "Search" product ai_instruction

4. **If you can't determine the right entity** → set requires_research: true

5. **If the intent is unclear** → set clarification_needed with a question

## Confidence Scoring
- 0.90-1.00: Unambiguous, direct statement
- 0.70-0.89: Strong implication
- 0.50-0.69: Reasonable inference
- Below 0.50: Needs clarification

Always prefer enriching existing entities over creating new ones when the content is about existing things.`

const SMART_EXTRACTION_JSON_SCHEMA = {
  name: 'smart_extraction_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: ['enrichment', 'creation', 'mixed', 'unclear'],
        description: 'Overall intent of the content',
      },
      intent_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
      },
      clarification_needed: {
        type: ['string', 'null'],
        description: 'Question to ask user if intent is unclear',
      },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action_type: {
              type: 'string',
              enum: ['create_entity', 'update_field', 'add_enrichment', 'research_fill'],
            },
            entity_type: {
              type: 'string',
              enum: ['platform', 'industry', 'product', 'subproduct', 'tactic_type', 'soul_doc', 'platform_quirk', 'industry_insight', 'platform_buyer_note', 'platform_kpi'],
            },
            target_entity_id: {
              type: ['string', 'null'],
              description: 'ID of existing entity to update/enrich (from matched entities)',
            },
            target_entity_name: {
              type: ['string', 'null'],
              description: 'Name of existing entity to update/enrich',
            },
            target_entity_type: {
              type: ['string', 'null'],
              description: 'Type of existing entity to update/enrich',
            },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  value: { type: ['string', 'number', 'boolean', 'null'] },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  reasoning: { type: 'string' },
                },
                required: ['name', 'value', 'confidence', 'reasoning'],
                additionalProperties: false,
              },
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
            },
            reasoning: {
              type: 'string',
            },
            requires_research: {
              type: 'boolean',
            },
          },
          required: ['action_type', 'entity_type', 'target_entity_id', 'target_entity_name', 'target_entity_type', 'fields', 'confidence', 'reasoning', 'requires_research'],
          additionalProperties: false,
        },
      },
      summary: {
        type: 'string',
        description: 'Human-readable summary of what was extracted',
      },
    },
    required: ['intent', 'intent_confidence', 'clarification_needed', 'actions', 'summary'],
    additionalProperties: false,
  },
}

export interface SmartExtractionOptions {
  content: string
  matchedEntitiesContext: string  // Formatted string of matched entities
  maxTokens?: number
}

export interface SmartExtractionResponse {
  intent: 'enrichment' | 'creation' | 'mixed' | 'unclear'
  intent_confidence: number
  clarification_needed: string | null
  actions: Array<{
    action_type: 'create_entity' | 'update_field' | 'add_enrichment' | 'research_fill'
    entity_type: string
    target_entity_id: string | null
    target_entity_name: string | null
    target_entity_type: string | null
    fields: Array<{
      name: string
      value: unknown
      confidence: number
      reasoning: string
    }>
    confidence: number
    reasoning: string
    requires_research: boolean
  }>
  summary: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Smart extraction that understands enrichment vs creation
 * and uses semantic matching context
 */
export async function smartExtract(
  client: OpenAI,
  options: SmartExtractionOptions
): Promise<SmartExtractionResponse> {
  const { content, matchedEntitiesContext, maxTokens = CURATOR_CONFIG.MAX_TOKENS_PER_REQUEST } = options

  const userPrompt = `Analyze this content and determine the best actions to take:

---
CONTENT:
${content}
---

${matchedEntitiesContext}

Based on the matched entities above and the content, determine:
1. Is this content meant to ENRICH existing entities or CREATE new ones?
2. What specific actions should be taken?
3. For each action, provide the relevant fields and confidence levels.

Remember: Prefer enriching existing entities when the content is about them.`

  const response = await client.chat.completions.create({
    model: CURATOR_CONFIG.MODEL,
    max_completion_tokens: maxTokens,
    temperature: 0.3,
    messages: [
      { role: 'system', content: SMART_EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: SMART_EXTRACTION_JSON_SCHEMA,
    },
  })

  const content_response = response.choices[0]?.message?.content
  if (!content_response) {
    throw new Error('No response content from OpenAI')
  }

  const parsed = JSON.parse(content_response)

  return {
    ...parsed,
    usage: {
      prompt_tokens: response.usage?.prompt_tokens ?? 0,
      completion_tokens: response.usage?.completion_tokens ?? 0,
      total_tokens: response.usage?.total_tokens ?? 0,
    },
  }
}
