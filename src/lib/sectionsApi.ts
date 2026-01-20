/**
 * Sections API Service
 * Connects to the PHP backend for report sections CRUD operations
 * Uses Vite proxy in development (/api -> https://ignite.edwinlovett.com/report-ai/api)
 */

// In development, use relative URL for Vite proxy; in production, use full URL
const API_BASE = import.meta.env.DEV
  ? '/api/sections.php'
  : 'https://ignite.edwinlovett.com/report-ai/api/sections.php'

// Types for report sections
export interface ReportSection {
  id: number
  name: string
  section_key: string
  description: string
  instructions: string
  display_order: number
  is_default: boolean
  scope?: 'global' | 'product' | 'subproduct'
  product_name?: string
  subproduct_name?: string
  created_at?: string
  updated_at?: string
}

export interface SectionFormData {
  name: string
  section_key: string
  description?: string
  instructions: string
  display_order?: number
  is_default?: boolean
  scope?: 'global' | 'product' | 'subproduct'
  product_name?: string
  subproduct_name?: string
}

interface ApiResponse<T> {
  sections?: T
  section?: ReportSection
  message?: string
  error?: boolean
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      throw new Error(data.message || `HTTP error ${response.status}`)
    }

    return data
  } catch (error) {
    console.error(`Sections API error:`, error)
    throw error
  }
}

// ============================================
// READ Operations
// ============================================

/**
 * Get all report sections
 */
export async function getSections(): Promise<ReportSection[]> {
  const response = await fetchApi<ApiResponse<ReportSection[]>>(API_BASE)
  return response.sections || []
}

// ============================================
// CREATE Operations
// ============================================

/**
 * Create a new report section
 */
export async function createSection(data: SectionFormData): Promise<ReportSection> {
  const response = await fetchApi<ApiResponse<ReportSection[]>>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.section || { id: 0, ...data } as ReportSection
}

// ============================================
// UPDATE Operations
// ============================================

/**
 * Update an existing report section
 */
export async function updateSection(
  sectionId: number,
  data: SectionFormData
): Promise<void> {
  await fetchApi(`${API_BASE}?id=${sectionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// ============================================
// DELETE Operations
// ============================================

/**
 * Delete a report section
 */
export async function deleteSection(sectionId: number): Promise<void> {
  await fetchApi(`${API_BASE}?id=${sectionId}`, {
    method: 'DELETE',
  })
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a section key from a name
 */
export function generateSectionKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)
}

/**
 * Get default sections (fallback if API fails)
 */
export function getDefaultSections(): ReportSection[] {
  return [
    {
      id: 1,
      name: 'Executive Summary',
      section_key: 'executive_summary',
      description: 'High-level overview of campaign performance',
      instructions: 'Provide a concise executive summary highlighting key performance metrics and overall campaign effectiveness.',
      display_order: 1,
      is_default: true,
    },
    {
      id: 2,
      name: 'Performance Analysis',
      section_key: 'performance_analysis',
      description: 'Detailed analysis of campaign metrics and KPIs',
      instructions: 'Analyze key performance indicators, conversion rates, and effectiveness metrics in detail.',
      display_order: 2,
      is_default: true,
    },
    {
      id: 3,
      name: 'Trends & Insights',
      section_key: 'trends_insights',
      description: 'Identification of patterns and actionable insights',
      instructions: 'Identify trends, patterns, and actionable insights from the campaign data.',
      display_order: 3,
      is_default: true,
    },
    {
      id: 4,
      name: 'Recommendations',
      section_key: 'recommendations',
      description: 'Strategic recommendations for optimization',
      instructions: 'Provide specific, actionable recommendations for improving campaign performance.',
      display_order: 4,
      is_default: true,
    },
  ]
}
