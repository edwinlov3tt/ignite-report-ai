/**
 * Database Sync Service
 * Keeps Supabase and SiteGround Postgres in sync
 */

import { Pool } from 'pg'
import type { Env } from '../types/bindings'
import { createSupabaseClient } from './supabase'

/**
 * Create a connection pool for the fallback database
 */
export function createFallbackPool(env: Env): Pool | null {
  if (!env.FALLBACK_DB_URL) {
    return null
  }

  return new Pool({
    connectionString: env.FALLBACK_DB_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })
}

/**
 * Sync a single table from Supabase to fallback database
 */
export async function syncTableToFallback(
  env: Env,
  tableName: string,
  options?: { truncateFirst?: boolean }
): Promise<{ success: boolean; rowsSynced: number; error?: string }> {
  const pool = createFallbackPool(env)
  if (!pool) {
    return { success: false, rowsSynced: 0, error: 'No fallback database configured' }
  }

  const supabase = createSupabaseClient(env)

  try {
    // Fetch all data from Supabase
    const { data, error: fetchError } = await supabase
      .from(tableName)
      .select('*')

    if (fetchError) {
      throw new Error(`Failed to fetch from Supabase: ${fetchError.message}`)
    }

    if (!data || data.length === 0) {
      return { success: true, rowsSynced: 0 }
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Optionally truncate first
      if (options?.truncateFirst) {
        await client.query(`TRUNCATE TABLE ${tableName} CASCADE`)
      }

      // Build upsert query based on table
      const columns = Object.keys(data[0])
      const columnList = columns.join(', ')
      const valuePlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ')

      let rowsSynced = 0
      for (const row of data) {
        const values = columns.map(col => row[col])

        // Use INSERT ... ON CONFLICT for upsert
        const query = `
          INSERT INTO ${tableName} (${columnList})
          VALUES (${valuePlaceholders})
          ON CONFLICT (id) DO UPDATE SET
          ${columns.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(', ')}
        `

        await client.query(query, values)
        rowsSynced++
      }

      await client.query('COMMIT')
      return { success: true, rowsSynced }

    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

  } catch (error) {
    return {
      success: false,
      rowsSynced: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  } finally {
    await pool.end()
  }
}

/**
 * Sync all schema tables to fallback database
 */
export async function syncAllToFallback(env: Env): Promise<{
  success: boolean
  tables: Record<string, { success: boolean; rowsSynced: number; error?: string }>
}> {
  const tables = [
    'platforms',
    'platform_quirks',
    'platform_kpis',
    'platform_thresholds',
    'platform_buyer_notes',
    'industries',
    'industry_benchmarks',
    'industry_insights',
    'industry_seasonality',
    'soul_documents',
    'soul_document_versions',
    'products',
    'subproducts',
    'tactic_types',
  ]

  const results: Record<string, { success: boolean; rowsSynced: number; error?: string }> = {}
  let allSuccess = true

  // Use truncate for full sync to handle unique constraint conflicts
  for (const table of tables) {
    const result = await syncTableToFallback(env, table, { truncateFirst: true })
    results[table] = result
    if (!result.success) {
      allSuccess = false
    }
  }

  return { success: allSuccess, tables: results }
}

/**
 * Write to both databases (dual-write pattern)
 */
export async function dualWrite(
  env: Env,
  tableName: string,
  operation: 'insert' | 'update' | 'delete',
  data: Record<string, unknown>,
  whereClause?: { column: string; value: unknown }
): Promise<{ primary: boolean; fallback: boolean; errors: string[] }> {
  const supabase = createSupabaseClient(env)
  const pool = createFallbackPool(env)
  const errors: string[] = []
  let primarySuccess = false
  let fallbackSuccess = false

  // Write to Supabase (primary)
  try {
    let query = supabase.from(tableName)

    switch (operation) {
      case 'insert':
        const { error: insertError } = await query.insert(data)
        if (insertError) throw insertError
        break
      case 'update':
        if (whereClause) {
          const { error: updateError } = await query
            .update(data)
            .eq(whereClause.column, whereClause.value)
          if (updateError) throw updateError
        }
        break
      case 'delete':
        if (whereClause) {
          const { error: deleteError } = await query
            .delete()
            .eq(whereClause.column, whereClause.value)
          if (deleteError) throw deleteError
        }
        break
    }
    primarySuccess = true
  } catch (error) {
    errors.push(`Primary: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Write to fallback if configured
  if (pool) {
    try {
      const client = await pool.connect()
      try {
        switch (operation) {
          case 'insert': {
            const columns = Object.keys(data)
            const values = Object.values(data)
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
            await client.query(
              `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
              values
            )
            break
          }
          case 'update': {
            if (whereClause) {
              const columns = Object.keys(data)
              const values = Object.values(data)
              const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ')
              await client.query(
                `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause.column} = $${columns.length + 1}`,
                [...values, whereClause.value]
              )
            }
            break
          }
          case 'delete': {
            if (whereClause) {
              await client.query(
                `DELETE FROM ${tableName} WHERE ${whereClause.column} = $1`,
                [whereClause.value]
              )
            }
            break
          }
        }
        fallbackSuccess = true
      } finally {
        client.release()
      }
    } catch (error) {
      errors.push(`Fallback: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      await pool.end()
    }
  } else {
    fallbackSuccess = true // No fallback configured, consider it success
  }

  return { primary: primarySuccess, fallback: fallbackSuccess, errors }
}
