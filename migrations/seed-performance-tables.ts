/**
 * Seed Script: Import Performance Tables from Legacy JSON
 *
 * This script reads enhanced_tactic_categories.json and populates:
 * - performance_tables (for each subProduct's performanceTables)
 * - table_validators (for each subProduct's tableValidator)
 * - Updates subproducts with kpis, medium, alias_code fields
 *
 * Run with: npx tsx migrations/seed-performance-tables.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Types for the legacy JSON structure
interface LegacyPerformanceTable {
  tableName: string
  fileName: string
  headers: string[]
}

interface LegacyTableValidator {
  requiredTables: string[]
  minimumTables: number
}

interface LegacySubProduct {
  subProductAliasCode?: string
  medium?: string
  kpi?: string[]
  dataValue?: string
  performanceTables?: LegacyPerformanceTable[]
  tableValidator?: LegacyTableValidator
  targetingOptions?: string[]
}

interface LegacyTactic {
  platform: string[]
  category: string
  product: string
  subProducts: Record<string, LegacySubProduct>
}

interface LegacyData {
  platforms: Record<string, string[]>
  tactics: Record<string, LegacyTactic>
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function seedPerformanceTables() {
  console.log('🚀 Starting performance tables seed...\n')

  // Read the legacy JSON file
  const jsonPath = path.join(__dirname, '../_legacy/context/tactic-training/enhanced_tactic_categories.json')

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Legacy JSON file not found at:', jsonPath)
    process.exit(1)
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8')
  const legacyData: LegacyData = JSON.parse(rawData)

  console.log(`📖 Loaded legacy data with ${Object.keys(legacyData.tactics).length} tactics\n`)

  // Track statistics
  let productsCreated = 0
  let subproductsCreated = 0
  let tablesCreated = 0
  let validatorsCreated = 0
  let subproductsUpdated = 0

  // Process each tactic (which maps to a Product)
  for (const [tacticKey, tactic] of Object.entries(legacyData.tactics)) {
    const productName = tactic.product
    const productSlug = generateSlug(productName)

    console.log(`\n📦 Processing Product: ${productName}`)

    // Check if product exists
    let { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('slug', productSlug)
      .single()

    let productId: string

    if (existingProduct) {
      productId = existingProduct.id
      console.log(`  ✓ Product exists: ${productId}`)
    } else {
      // Create the product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: productName,
          slug: productSlug,
          data_value: tacticKey,
          platforms: tactic.platform,
          is_active: true,
          sort_order: productsCreated
        })
        .select('id')
        .single()

      if (productError) {
        console.error(`  ❌ Failed to create product: ${productError.message}`)
        continue
      }

      productId = newProduct.id
      productsCreated++
      console.log(`  ✨ Created product: ${productId}`)
    }

    // Process each subProduct
    for (const [subProductName, subProduct] of Object.entries(tactic.subProducts)) {
      const subProductSlug = generateSlug(subProductName)

      console.log(`  📁 Processing SubProduct: ${subProductName}`)

      // Check if subproduct exists
      let { data: existingSubProduct } = await supabase
        .from('subproducts')
        .select('id')
        .eq('product_id', productId)
        .eq('slug', subProductSlug)
        .single()

      let subProductId: string

      if (existingSubProduct) {
        subProductId = existingSubProduct.id
        console.log(`    ✓ SubProduct exists: ${subProductId}`)

        // Update with additional fields from legacy data
        const { error: updateError } = await supabase
          .from('subproducts')
          .update({
            kpis: subProduct.kpi || [],
            medium: subProduct.medium,
            alias_code: subProduct.subProductAliasCode,
            targeting_options: subProduct.targetingOptions || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', subProductId)

        if (updateError) {
          console.log(`    ⚠️ Failed to update subproduct: ${updateError.message}`)
        } else {
          subproductsUpdated++
        }
      } else {
        // Create the subproduct
        const { data: newSubProduct, error: subProductError } = await supabase
          .from('subproducts')
          .insert({
            product_id: productId,
            name: subProductName,
            slug: subProductSlug,
            data_value: subProduct.dataValue || subProductSlug,
            kpis: subProduct.kpi || [],
            medium: subProduct.medium,
            alias_code: subProduct.subProductAliasCode,
            targeting_options: subProduct.targetingOptions || [],
            is_active: true,
            sort_order: subproductsCreated
          })
          .select('id')
          .single()

        if (subProductError) {
          console.error(`    ❌ Failed to create subproduct: ${subProductError.message}`)
          continue
        }

        subProductId = newSubProduct.id
        subproductsCreated++
        console.log(`    ✨ Created subproduct: ${subProductId}`)
      }

      // Process performance tables
      if (subProduct.performanceTables && subProduct.performanceTables.length > 0) {
        console.log(`    📊 Processing ${subProduct.performanceTables.length} performance tables...`)

        for (let i = 0; i < subProduct.performanceTables.length; i++) {
          const table = subProduct.performanceTables[i]

          // Check if table exists
          const { data: existingTable } = await supabase
            .from('performance_tables')
            .select('id')
            .eq('subproduct_id', subProductId)
            .eq('table_name', table.tableName)
            .single()

          if (existingTable) {
            // Update existing table
            const { error: updateError } = await supabase
              .from('performance_tables')
              .update({
                file_name: table.fileName,
                headers: table.headers,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingTable.id)

            if (updateError) {
              console.log(`      ⚠️ Failed to update table "${table.tableName}": ${updateError.message}`)
            }
          } else {
            // Create new table
            const isRequired = subProduct.tableValidator?.requiredTables?.includes(table.tableName) || false

            const { error: tableError } = await supabase
              .from('performance_tables')
              .insert({
                subproduct_id: subProductId,
                table_name: table.tableName,
                file_name: table.fileName,
                headers: table.headers,
                is_required: isRequired,
                sort_order: i
              })

            if (tableError) {
              console.log(`      ⚠️ Failed to create table "${table.tableName}": ${tableError.message}`)
            } else {
              tablesCreated++
            }
          }
        }
      }

      // Process table validator
      if (subProduct.tableValidator) {
        const { error: validatorError } = await supabase
          .from('table_validators')
          .upsert({
            subproduct_id: subProductId,
            required_tables: subProduct.tableValidator.requiredTables,
            minimum_tables: subProduct.tableValidator.minimumTables,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'subproduct_id'
          })

        if (validatorError) {
          console.log(`      ⚠️ Failed to upsert validator: ${validatorError.message}`)
        } else {
          validatorsCreated++
        }
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Seed complete!')
  console.log('='.repeat(50))
  console.log(`📦 Products created: ${productsCreated}`)
  console.log(`📁 SubProducts created: ${subproductsCreated}`)
  console.log(`📁 SubProducts updated: ${subproductsUpdated}`)
  console.log(`📊 Performance tables created: ${tablesCreated}`)
  console.log(`✓ Table validators created: ${validatorsCreated}`)
}

// Run the seed
seedPerformanceTables().catch(console.error)
