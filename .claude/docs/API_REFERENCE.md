# API Reference - CRUD Functions

Complete list of available API functions for Schema Admin operations. All functions connect directly to Supabase.

---

## Schema API (`src/lib/schemaApi.ts`)

Manages Products, SubProducts, and TacticTypes hierarchy.

### Products

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `getProducts()` | READ | - | `Product[]` |
| `getProduct(productId)` | READ | `productId: string` | `Product \| null` |
| `createProduct(data)` | CREATE | `{ name, slug?, data_value?, platforms?, notes?, ai_guidelines?, ai_prompt?, sort_order? }` | `{ id: string }` |
| `updateProduct(productId, data)` | UPDATE | `productId: string`, partial product fields | `void` |
| `deleteProduct(productId)` | DELETE | `productId: string` | `void` |

### SubProducts

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `createSubproduct(data)` | CREATE | `{ product_id, name, slug?, data_value?, platforms?, notes?, sort_order? }` | `{ id: string }` |
| `updateSubproduct(subproductId, data)` | UPDATE | `subproductId: string`, partial fields | `void` |
| `deleteSubproduct(subproductId)` | DELETE | `subproductId: string` | `void` |

### Tactic Types

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `createTacticType(data)` | CREATE | `{ subproduct_id, name, slug?, data_value?, filename_stem?, headers?, aliases? }` | `{ id: string }` |
| `updateTacticType(tacticTypeId, data)` | UPDATE | `tacticTypeId: string`, partial fields | `void` |
| `deleteTacticType(tacticTypeId)` | DELETE | `tacticTypeId: string` | `void` |

### Utilities

| Function | Operation | Description |
|----------|-----------|-------------|
| `exportSchema()` | READ | Returns full schema as `SchemaExport` |
| `downloadSchemaJson()` | READ | Triggers browser download of schema JSON |
| `generateSlug(name)` | UTIL | Converts name to slug format |
| `generateDataValue(name)` | UTIL | Converts name to data_value format |

---

## Platforms API (`src/lib/platformsApi.ts`)

Manages Platforms and their knowledge base (Quirks, KPIs, Thresholds, Buyer Notes).

### Platforms

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `getPlatforms()` | READ | - | `Platform[]` |
| `getPlatform(id)` | READ | `id: string` | `Platform \| null` |
| `createPlatform(data)` | CREATE | `{ code, name, category?, description? }` | `{ id: string }` |
| `updatePlatform(id, data)` | UPDATE | `id: string`, partial fields | `void` |
| `deletePlatform(id)` | DELETE | `id: string` | `void` |

### Platform Quirks

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `addQuirk(platformId, data)` | CREATE | `platformId`, `{ quirk_type, title, description, impact, ai_instruction?, source?, contributed_by? }` | `{ id: string }` |
| `updateQuirk(quirkId, data)` | UPDATE | `quirkId: string`, partial fields | `void` |
| `deleteQuirk(quirkId)` | DELETE | `quirkId: string` | `void` |

### Platform KPIs

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `addKPI(platformId, data)` | CREATE | `platformId`, `{ objective, primary_kpis, secondary_kpis?, notes? }` | `{ id: string }` |
| `updateKPI(kpiId, data)` | UPDATE | `kpiId: string`, partial fields | `void` |
| `deleteKPI(kpiId)` | DELETE | `kpiId: string` | `void` |

### Platform Thresholds

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `addThreshold(platformId, data)` | CREATE | `platformId`, `{ metric, warning_value?, critical_value?, direction, context? }` | `{ id: string }` |
| `updateThreshold(thresholdId, data)` | UPDATE | `thresholdId: string`, partial fields | `void` |
| `deleteThreshold(thresholdId)` | DELETE | `thresholdId: string` | `void` |

### Platform Buyer Notes

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `addBuyerNote(platformId, data)` | CREATE | `platformId`, `{ note_type, content, contributed_by }` | `{ id: string }` |
| `updateBuyerNote(noteId, data)` | UPDATE | `noteId: string`, partial fields | `void` |
| `upvoteBuyerNote(noteId)` | UPDATE | `noteId: string` | `void` |
| `deleteBuyerNote(noteId)` | DELETE | `noteId: string` | `void` |

---

## Industries API (`src/lib/industriesApi.ts`)

Manages Industries and their knowledge base (Benchmarks, Insights, Seasonality).

### Industries

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `getIndustries()` | READ | - | `Industry[]` |
| `getIndustry(id)` | READ | `id: string` | `Industry \| null` |
| `createIndustry(data)` | CREATE | `{ code, name, description?, icon? }` | `{ id: string }` |
| `updateIndustry(id, data)` | UPDATE | `id: string`, partial fields | `void` |
| `deleteIndustry(id)` | DELETE | `id: string` | `void` |

### Industry Benchmarks

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `addBenchmark(industryId, data)` | CREATE | `industryId`, `{ metric, p25?, p50?, p75?, sample_size?, confidence?, quarter?, source?, notes? }` | `{ id: string }` |
| `updateBenchmark(benchmarkId, data)` | UPDATE | `benchmarkId: string`, partial fields | `void` |
| `deleteBenchmark(benchmarkId)` | DELETE | `benchmarkId: string` | `void` |

### Industry Insights

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `addInsight(industryId, data)` | CREATE | `industryId`, `{ insight_type, title, content, ai_instruction?, source?, valid_from?, valid_until? }` | `{ id: string }` |
| `deleteInsight(insightId)` | DELETE | `insightId: string` | `void` |

### Industry Seasonality

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `addSeasonality(industryId, data)` | CREATE | `industryId`, `{ period_type, period_value, impact, cpm_modifier?, description? }` | `{ id: string }` |
| `deleteSeasonality(seasonalityId)` | DELETE | `seasonalityId: string` | `void` |

---

## Soul Documents API (`src/lib/soulDocumentsApi.ts`)

Manages AI prompts, personas, and templates with version control.

### Soul Documents

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `getSoulDocuments()` | READ | - | `SoulDocument[]` |
| `getSoulDocument(id)` | READ | `id: string` | `SoulDocument \| null` |
| `createSoulDocument(data)` | CREATE | `{ doc_type, name, slug, description?, content }` | `{ id: string }` |
| `updateSoulDocument(id, data)` | UPDATE | `id: string`, partial fields | `void` |
| `deleteSoulDocument(id)` | DELETE | `id: string` | `void` |

### Soul Document Versions

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `createVersion(documentId, data)` | CREATE | `documentId`, `{ content, change_summary? }` | `{ id: string, version: number }` |
| `publishVersion(versionId)` | UPDATE | `versionId: string` | `void` |
| `getVersion(versionId)` | READ | `versionId: string` | `SoulDocumentVersion \| null` |
| `compareVersions(v1Id, v2Id)` | READ | `v1Id: string`, `v2Id: string` | `{ v1, v2 }` |

---

## Sections API (`src/lib/sectionsApi.ts`)

Manages report sections configuration.

| Function | Operation | Parameters | Returns |
|----------|-----------|------------|---------|
| `getSections()` | READ | - | `ReportSection[]` |
| `createSection(data)` | CREATE | `{ name, order?, content }` | `ReportSection` |
| `updateSection(sectionId, data)` | UPDATE | `sectionId: number`, partial fields | `ReportSection` |
| `deleteSection(sectionId)` | DELETE | `sectionId: number` | `void` |

---

## Import/Export Services

### Export Service (`src/lib/importExport/exportService.ts`)

| Function | Description |
|----------|-------------|
| `exportProductsAsCSV(products)` | Export products hierarchy to CSV |
| `exportPlatformsAsCSV(platforms)` | Export platforms to CSV |
| `exportIndustriesAsCSV(industries)` | Export industries to CSV |
| `exportData(type, format)` | General export function |
| `generateTemplateBundle(entityType)` | Generate empty template for imports |

### Import Service (`src/lib/importExport/importService.ts`)

| Function | Description |
|----------|-------------|
| `parseZipFile(file)` | Parse uploaded ZIP file |
| `parseJSONFile(file)` | Parse uploaded JSON file |
| `generateImportPreview(data)` | Preview what will be imported |
| `commitImport(preview)` | Execute the import |

---

## Supabase Utilities (`src/lib/supabase.ts`)

| Function | Description |
|----------|-------------|
| `publishToKV(namespace)` | Sync data to Cloudflare KV cache |

---

## CRUD Status by Entity

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Product | ✅ | ✅ | ✅ | ✅ |
| SubProduct | ✅ | via Product | ✅ | ✅ |
| TacticType | ✅ | via SubProduct | ✅ | ✅ |
| Platform | ✅ | ✅ | ✅ | ✅ |
| Platform Quirk | ✅ | via Platform | ✅ | ✅ |
| Platform KPI | ✅ | via Platform | ✅ | ✅ |
| Platform Threshold | ✅ | via Platform | ✅ | ✅ |
| Platform Buyer Note | ✅ | via Platform | ✅ | ✅ |
| Industry | ✅ | ✅ | ✅ | ✅ |
| Industry Benchmark | ✅ | via Industry | ✅ | ✅ |
| Industry Insight | ✅ | via Industry | ❌ | ✅ |
| Industry Seasonality | ✅ | via Industry | ❌ | ✅ |
| Soul Document | ✅ | ✅ | ✅ | ✅ |
| Soul Doc Version | ✅ | ✅ | ✅ publish | ❌ |
| Report Section | ✅ | ✅ | ✅ | ✅ |

**Note:** ❌ = Not yet implemented (delete and re-add as workaround)

---

*Last Updated: 2025-01-17*
