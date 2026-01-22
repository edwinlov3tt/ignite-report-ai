/**
 * Types for PowerPoint extraction and preview
 */

/**
 * Header validation result from comparing extracted headers against expected schema
 */
export interface HeaderValidation {
  confidence: number
  matchedHeaders: string[]
  missingHeaders: string[]
  extraHeaders: string[]
}

/**
 * A single extracted table from a PowerPoint slide
 */
export interface ExtractedTable {
  /** Slide number (1-indexed) */
  slideNumber: number
  /** Slide title if present */
  slideTitle: string | null
  /** Index of table within the slide (0-indexed) */
  tableIndex: number
  /** Column headers from the first row */
  headers: string[]
  /** Data rows as key-value objects (header -> value) */
  rows: Record<string, string>[]
  /** Number of data rows (excluding header) */
  rowCount: number
  /** Unique ID for frontend tracking */
  id?: string
  /** Assigned tactic name (set by user in preview) */
  assignedTactic?: string
  /** Whether to include this table in import */
  included?: boolean
  /** Header validation result (computed on frontend) */
  headerMatch?: HeaderValidation
}

/**
 * Metadata about the extracted PowerPoint
 */
export interface PPTXMetadata {
  /** Original filename */
  filename: string
  /** Total number of slides in presentation */
  slideCount: number
}

/**
 * Response from the PPTX extraction API
 */
export interface PPTXExtractResponse {
  /** Whether extraction was successful */
  success: boolean
  /** Presentation metadata */
  metadata: PPTXMetadata
  /** Extracted tables */
  tables: ExtractedTable[]
  /** Warning message (e.g., no tables found) */
  warning?: string
  /** Error message if success is false */
  error?: string
}

/**
 * State for PPTX preview modal
 */
export interface PPTXPreviewState {
  /** Whether the modal is open */
  isOpen: boolean
  /** Whether extraction is in progress */
  isLoading: boolean
  /** Error message if extraction failed */
  error: string | null
  /** Extracted data (null until extraction completes) */
  data: PPTXExtractResponse | null
}
