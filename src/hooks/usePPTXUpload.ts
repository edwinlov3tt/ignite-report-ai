import { useState, useCallback } from 'react'
import type { PPTXExtractResponse, ExtractedTable, HeaderValidation } from '@/types/pptx'
import { generateFileId, validateHeadersAgainstSchema } from '@/lib/fileParser'
import { extractPPTX } from '@/lib/pptxExtractor'

interface UsePPTXUploadResult {
  /** Whether extraction is in progress */
  isLoading: boolean
  /** Error message if extraction failed */
  error: string | null
  /** Extracted data (null until extraction completes) */
  data: PPTXExtractResponse | null
  /** Upload and extract a PPTX file */
  uploadPPTX: (file: File) => Promise<void>
  /** Clear the current state */
  reset: () => void
  /** Update a table's assigned tactic with optional header validation */
  assignTactic: (tableId: string, tacticName: string, expectedHeaders?: string[]) => void
  /** Toggle whether a table is included */
  toggleIncluded: (tableId: string) => void
  /** Update a cell value in a table */
  updateCell: (tableId: string, rowIndex: number, header: string, value: string) => void
}

export function usePPTXUpload(): UsePPTXUploadResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PPTXExtractResponse | null>(null)

  const uploadPPTX = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setData(null)

    try {
      // Use client-side extraction (no server needed)
      const result = await extractPPTX(file)

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract data')
      }

      // Add unique IDs and default values to tables
      const tablesWithIds: ExtractedTable[] = result.tables.map((table) => ({
        ...table,
        id: generateFileId(),
        included: true,
        assignedTactic: undefined,
        headerMatch: undefined,
      }))

      setData({
        ...result,
        tables: tablesWithIds,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setData(null)
  }, [])

  const assignTactic = useCallback((tableId: string, tacticName: string, expectedHeaders?: string[]) => {
    setData((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        tables: prev.tables.map((table) => {
          if (table.id !== tableId) return table

          // Compute header validation if expected headers provided
          let headerMatch: HeaderValidation | undefined
          if (expectedHeaders && expectedHeaders.length > 0 && tacticName) {
            const validation = validateHeadersAgainstSchema(table.headers, expectedHeaders)
            headerMatch = {
              confidence: validation.confidence,
              matchedHeaders: validation.matchedHeaders,
              missingHeaders: validation.missingHeaders,
              extraHeaders: validation.extraHeaders,
            }
          }

          return {
            ...table,
            assignedTactic: tacticName || undefined,
            headerMatch,
          }
        }),
      }
    })
  }, [])

  const toggleIncluded = useCallback((tableId: string) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tables: prev.tables.map((table) =>
          table.id === tableId ? { ...table, included: !table.included } : table
        ),
      }
    })
  }, [])

  const updateCell = useCallback(
    (tableId: string, rowIndex: number, header: string, value: string) => {
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          tables: prev.tables.map((table) => {
            if (table.id !== tableId) return table
            const newRows = [...table.rows]
            newRows[rowIndex] = { ...newRows[rowIndex], [header]: value }
            return { ...table, rows: newRows }
          }),
        }
      })
    },
    []
  )

  return {
    isLoading,
    error,
    data,
    uploadPPTX,
    reset,
    assignTactic,
    toggleIncluded,
    updateCell,
  }
}
