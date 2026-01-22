/**
 * Client-side PPTX Table Extraction
 * Extracts tables from PowerPoint files directly in the browser using JSZip
 */

import JSZip from 'jszip'

// Constants
const MAX_FILE_SIZE_MB = 50
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const PPTX_MAGIC_BYTES = [0x50, 0x4b] // 'PK' - ZIP file signature

export interface ExtractedTable {
  slideNumber: number
  slideTitle: string | null
  tableIndex: number
  headers: string[]
  rows: Record<string, string>[]
  rowCount: number
}

export interface PPTXExtractResult {
  success: boolean
  metadata: {
    filename: string
    slideCount: number
  }
  tables: ExtractedTable[]
  error?: string
  warning?: string
}

/**
 * Validate that the file is a valid PPTX
 */
function validatePPTXFile(file: File, arrayBuffer: ArrayBuffer): string | null {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.pptx')) {
    return 'Please upload a .pptx file'
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File size must be less than ${MAX_FILE_SIZE_MB}MB`
  }

  // Check magic bytes (PPTX files are ZIP archives starting with 'PK')
  const bytes = new Uint8Array(arrayBuffer.slice(0, 2))
  if (bytes[0] !== PPTX_MAGIC_BYTES[0] || bytes[1] !== PPTX_MAGIC_BYTES[1]) {
    return 'Invalid PowerPoint file format'
  }

  return null
}

/**
 * Extract slide title from slide XML
 */
function extractSlideTitle(slideXml: string): string | null {
  // Look for title shape (p:sp with p:ph type="title" or type="ctrTitle")
  const titleMatch = slideXml.match(/<p:sp[^>]*>[\s\S]*?<p:ph[^>]*type="(?:title|ctrTitle)"[^>]*\/>[\s\S]*?<a:t>([^<]+)<\/a:t>[\s\S]*?<\/p:sp>/i)
  if (titleMatch) {
    return titleMatch[1].trim()
  }

  // Fallback: look for any text in a title placeholder
  const altMatch = slideXml.match(/<p:txBody>[\s\S]*?<a:t>([^<]+)<\/a:t>/i)
  if (altMatch) {
    return altMatch[1].trim()
  }

  return null
}

/**
 * Extract tables from slide XML
 */
function extractTablesFromSlide(slideXml: string, slideNumber: number, slideTitle: string | null): ExtractedTable[] {
  const tables: ExtractedTable[] = []

  // Find all table elements (a:tbl)
  const tableRegex = /<a:tbl[^>]*>([\s\S]*?)<\/a:tbl>/gi
  let tableMatch
  let tableIndex = 0

  while ((tableMatch = tableRegex.exec(slideXml)) !== null) {
    const tableXml = tableMatch[1]

    // Extract rows (a:tr)
    const rowRegex = /<a:tr[^>]*>([\s\S]*?)<\/a:tr>/gi
    const rows: string[][] = []
    let rowMatch

    while ((rowMatch = rowRegex.exec(tableXml)) !== null) {
      const rowXml = rowMatch[1]

      // Extract cells (a:tc)
      const cellRegex = /<a:tc[^>]*>([\s\S]*?)<\/a:tc>/gi
      const cells: string[] = []
      let cellMatch

      while ((cellMatch = cellRegex.exec(rowXml)) !== null) {
        const cellXml = cellMatch[1]

        // Extract all text content from the cell (a:t elements)
        const textRegex = /<a:t>([^<]*)<\/a:t>/gi
        const textParts: string[] = []
        let textMatch

        while ((textMatch = textRegex.exec(cellXml)) !== null) {
          textParts.push(textMatch[1])
        }

        cells.push(textParts.join(' ').trim())
      }

      if (cells.length > 0) {
        rows.push(cells)
      }
    }

    // Convert to headers + row objects
    if (rows.length > 1) {
      const headers = rows[0]
      const dataRows = rows.slice(1).map(row => {
        const rowObj: Record<string, string> = {}
        headers.forEach((header, i) => {
          rowObj[header || `Column ${i + 1}`] = row[i] || ''
        })
        return rowObj
      })

      // Only include tables with data
      if (dataRows.length > 0) {
        tables.push({
          slideNumber,
          slideTitle,
          tableIndex,
          headers: headers.map(h => h || `Column ${headers.indexOf(h) + 1}`),
          rows: dataRows,
          rowCount: dataRows.length
        })
        tableIndex++
      }
    }
  }

  return tables
}

/**
 * Extract all tables from a PPTX file
 */
export async function extractPPTX(file: File): Promise<PPTXExtractResult> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // Validate file
    const validationError = validatePPTXFile(file, arrayBuffer)
    if (validationError) {
      return {
        success: false,
        metadata: { filename: file.name, slideCount: 0 },
        tables: [],
        error: validationError
      }
    }

    // Load ZIP
    const zip = await JSZip.loadAsync(arrayBuffer)

    // Find all slide files
    const slideFiles: { name: string; index: number }[] = []
    zip.forEach((relativePath, _zipObject) => {
      const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/)
      if (match) {
        slideFiles.push({ name: relativePath, index: parseInt(match[1], 10) })
      }
    })

    // Sort by slide number
    slideFiles.sort((a, b) => a.index - b.index)

    // Extract tables from each slide
    const allTables: ExtractedTable[] = []

    for (const slideFile of slideFiles) {
      const slideXml = await zip.file(slideFile.name)?.async('string')
      if (slideXml) {
        const slideTitle = extractSlideTitle(slideXml)
        const tables = extractTablesFromSlide(slideXml, slideFile.index, slideTitle)
        allTables.push(...tables)
      }
    }

    const result: PPTXExtractResult = {
      success: true,
      metadata: {
        filename: file.name,
        slideCount: slideFiles.length
      },
      tables: allTables
    }

    if (allTables.length === 0) {
      result.warning = 'No data tables found in this PowerPoint'
    }

    return result

  } catch (err) {
    return {
      success: false,
      metadata: { filename: file.name, slideCount: 0 },
      tables: [],
      error: err instanceof Error ? err.message : 'Failed to extract data from PowerPoint'
    }
  }
}
