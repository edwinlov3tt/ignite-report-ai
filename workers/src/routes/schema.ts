/**
 * Schema Routes
 * GET endpoints for Schema Admin frontend
 */

import { Context } from 'hono'
import type { Env } from '../types/bindings'
import { createSupabaseClient } from '../services/supabase'

/**
 * GET /schema/products
 * Get all products with subproducts and tactic_types
 */
export async function handleGetProducts(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const supabase = createSupabaseClient(c.env)

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        data_value,
        slug,
        platforms,
        notes,
        ai_guidelines,
        ai_prompt,
        is_active,
        sort_order,
        created_at,
        updated_at,
        subproducts (
          id,
          name,
          data_value,
          slug,
          platforms,
          notes,
          kpis,
          medium,
          alias_code,
          targeting_options,
          product_id,
          is_active,
          sort_order,
          created_at,
          updated_at,
          tactic_types (
            id,
            name,
            data_value,
            slug,
            filename_stem,
            headers,
            aliases,
            subproduct_id,
            is_active,
            sort_order,
            created_at,
            updated_at
          )
        )
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`)
    }

    return c.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Schema products error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /schema/platforms
 * Get all platforms with related data
 */
export async function handleGetPlatforms(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const supabase = createSupabaseClient(c.env)

    const { data, error } = await supabase
      .from('platforms')
      .select(`
        id,
        code,
        name,
        category,
        logo_url,
        description,
        is_active,
        created_at,
        updated_at,
        quirks:platform_quirks (
          id,
          platform_id,
          quirk_type,
          title,
          description,
          impact,
          ai_instruction,
          source,
          contributed_by,
          verified_by,
          applies_to_tactics,
          created_at
        ),
        kpis:platform_kpis (
          id,
          platform_id,
          objective,
          primary_kpis,
          secondary_kpis,
          notes,
          created_at
        ),
        thresholds:platform_thresholds (
          id,
          platform_id,
          metric,
          warning_value,
          critical_value,
          direction,
          context,
          tactic_id,
          created_at
        ),
        buyer_notes:platform_buyer_notes (
          id,
          platform_id,
          note_type,
          content,
          tactic_id,
          contributed_by,
          upvotes,
          is_verified,
          verified_by,
          created_at
        )
      `)
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch platforms: ${error.message}`)
    }

    return c.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Schema platforms error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /schema/industries
 * Get all industries with related data
 */
export async function handleGetIndustries(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const supabase = createSupabaseClient(c.env)

    const { data, error } = await supabase
      .from('industries')
      .select(`
        id,
        code,
        name,
        description,
        is_active,
        created_at,
        updated_at,
        benchmarks:industry_benchmarks (
          id,
          industry_id,
          metric,
          p25,
          p50,
          p75,
          sample_size,
          confidence,
          quarter,
          platform_id,
          tactic_id,
          notes,
          created_at
        ),
        insights:industry_insights (
          id,
          industry_id,
          insight_type,
          title,
          content,
          ai_instruction,
          source,
          source_url,
          valid_from,
          valid_until,
          created_at
        ),
        seasonality:industry_seasonality (
          id,
          industry_id,
          period_type,
          period_value,
          impact,
          cpm_modifier,
          description,
          created_at
        )
      `)
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch industries: ${error.message}`)
    }

    return c.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Schema industries error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /schema/soul-docs
 * Get all soul documents with published versions
 */
export async function handleGetSoulDocs(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const supabase = createSupabaseClient(c.env)

    const { data, error } = await supabase
      .from('soul_documents')
      .select(`
        id,
        doc_type,
        name,
        slug,
        is_active,
        created_at,
        updated_at,
        versions:soul_document_versions (
          id,
          document_id,
          version,
          content,
          is_published,
          published_at,
          created_at
        )
      `)
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch soul documents: ${error.message}`)
    }

    return c.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Schema soul docs error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}

/**
 * GET /schema/performance-tables
 * Get all performance tables with product/subproduct info
 */
export async function handleGetPerformanceTables(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const supabase = createSupabaseClient(c.env)

    // First get performance tables with subproduct info
    const { data: performanceTables, error: ptError } = await supabase
      .from('performance_tables')
      .select(`
        id,
        table_name,
        file_name,
        headers,
        description,
        is_required,
        sort_order,
        subproduct_id
      `)
      .order('sort_order', { ascending: true })

    if (ptError) {
      throw new Error(`Failed to fetch performance tables: ${ptError.message}`)
    }

    // Get subproducts with product info
    const { data: subproducts, error: spError } = await supabase
      .from('subproducts')
      .select(`
        id,
        name,
        product_id,
        products (
          id,
          name
        )
      `)

    if (spError) {
      throw new Error(`Failed to fetch subproducts: ${spError.message}`)
    }

    // Create lookup map
    const subproductMap = new Map(subproducts?.map(sp => [sp.id, sp]) || [])

    // Enrich performance tables with product/subproduct names
    const enrichedData = (performanceTables || []).map(pt => {
      const subproduct = subproductMap.get(pt.subproduct_id)
      const product = subproduct?.products as { id: string; name: string } | undefined

      return {
        ...pt,
        subproduct_name: subproduct?.name || null,
        product_name: product?.name || null,
      }
    })

    // Check format query param
    const format = c.req.query('format')

    if (format === 'csv') {
      // Generate CSV
      const headers = ['product_name', 'subproduct_name', 'table_name', 'file_name', 'headers', 'description', 'is_required', 'sort_order']
      const csvRows = [headers.join(',')]

      for (const row of enrichedData) {
        const values = [
          `"${row.product_name || ''}"`,
          `"${row.subproduct_name || ''}"`,
          `"${row.table_name || ''}"`,
          `"${row.file_name || ''}"`,
          `"${Array.isArray(row.headers) ? row.headers.join('; ') : ''}"`,
          `"${(row.description || '').replace(/"/g, '""')}"`,
          row.is_required ? 'TRUE' : 'FALSE',
          row.sort_order || 0,
        ]
        csvRows.push(values.join(','))
      }

      return new Response(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="performance_tables.csv"',
        },
      })
    }

    return c.json({
      success: true,
      count: enrichedData.length,
      data: enrichedData,
    })
  } catch (error) {
    console.error('Schema performance tables error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
