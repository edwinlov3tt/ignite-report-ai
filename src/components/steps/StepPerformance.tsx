import { useCallback, useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { parseCSV, extractZip, createUploadedFile } from '@/lib/fileParser'
import { getSubproductHeadersMap, type SubproductHeadersMap } from '@/lib/schemaApi'
import { usePPTXUpload } from '@/hooks/usePPTXUpload'
import { PPTXPreviewModal } from './PPTXPreviewModal'
import type { UploadedFile } from '@/types'
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  FileSpreadsheet,
  Loader2,
  ExternalLink,
  Package,
  Presentation,
} from 'lucide-react'

// Tactic to report type mappings
const tacticReportMappings: Record<string, string> = {
  'Email Marketing': 'emailMarketing',
  'emailMarketing': 'emailMarketing',
  'Social Media': 'socialMedia',
  'socialMedia': 'socialMedia',
  'Display': 'display',
  'display': 'display',
  'Programmatic Display': 'programmaticDisplay',
  'programmaticDisplay': 'programmaticDisplay',
  'Paid Search': 'paidSearch',
  'paidSearch': 'paidSearch',
  'SEM': 'paidSearch',
  'OTT': 'ott',
  'ott': 'ott',
  'CTV': 'ctv',
  'ctv': 'ctv',
  'Video': 'video',
  'video': 'video',
  'Pre-Roll': 'preRoll',
  'preRoll': 'preRoll',
  'Audio': 'audio',
  'audio': 'audio',
  'Digital Endorsement': 'digitalEndorsement',
  'digitalEndorsement': 'digitalEndorsement',
  'Endorsement': 'digitalEndorsement',
  'Native': 'native',
  'native': 'native',
  'Geofencing': 'geofencing',
  'geofencing': 'geofencing',
  'Retargeting': 'retargeting',
  'retargeting': 'retargeting',
  'SEO': 'seo',
  'seo': 'seo',
}

function getReportTypeForTactic(tacticName: string): string {
  // Try direct match first
  if (tacticReportMappings[tacticName]) {
    return tacticReportMappings[tacticName]
  }

  // Try case-insensitive match
  const lowerTacticName = tacticName.toLowerCase()
  for (const [key, value] of Object.entries(tacticReportMappings)) {
    if (key.toLowerCase() === lowerTacticName || value.toLowerCase() === lowerTacticName) {
      return value
    }
  }

  // Default fallback
  return 'overall'
}

export function StepPerformance() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [dragOverTactic, setDragOverTactic] = useState<string | null>(null)
  const [showPPTXModal, setShowPPTXModal] = useState(false)
  const [subproductHeaders, setSubproductHeaders] = useState<SubproductHeadersMap>({})
  const bulkInputRef = useRef<HTMLInputElement>(null)
  const pptxInputRef = useRef<HTMLInputElement>(null)

  // Fetch subproduct headers from database on mount
  useEffect(() => {
    getSubproductHeadersMap()
      .then(setSubproductHeaders)
      .catch((err) => console.error('Failed to load subproduct headers:', err))
  }, [])

  // PPTX upload hook
  const {
    isLoading: isPPTXLoading,
    error: pptxError,
    data: pptxData,
    uploadPPTX,
    reset: resetPPTX,
    assignTactic,
    toggleIncluded,
    updateCell,
  } = usePPTXUpload()

  const detectedTactics = useAppStore((state) => state.detectedTactics)
  const filesByTactic = useAppStore((state) => state.filesByTactic)
  const addFileToTactic = useAppStore((state) => state.addFileToTactic)
  const removeFileFromTactic = useAppStore((state) => state.removeFileFromTactic)
  const campaignData = useAppStore((state) => state.campaignData)
  const timeRange = useAppStore((state) => state.timeRange)
  const setError = useAppStore((state) => state.setError)
  const nextStep = useAppStore((state) => state.nextStep)
  const prevStep = useAppStore((state) => state.prevStep)

  // Generate report URL for a tactic
  const generateReportURL = (tacticName: string): string | null => {
    if (!campaignData || !timeRange) {
      return null
    }

    const reportType = getReportTypeForTactic(tacticName)

    // Try multiple possible field names for the Wide Orbit number
    let wideOrbitNumber = campaignData.wideOrbitNumber ||
                         campaignData.orderId ||
                         campaignData.id

    // If not found at top level, try to get it from the first line item
    if (!wideOrbitNumber && campaignData.lineItems && campaignData.lineItems.length > 0) {
      const firstLineItem = campaignData.lineItems[0]
      wideOrbitNumber = firstLineItem.woOrderNumber || firstLineItem.wideOrbitOrderNumber || ''
    }

    if (!wideOrbitNumber) {
      return null
    }

    // Format dates for URL
    const startDate = new Date(timeRange.startDate)
    const endDate = new Date(timeRange.endDate)
    endDate.setHours(23, 59, 59, 999)

    const baseURL = 'https://townsquarelumina.com/lumina/view/reports/max'
    const params = new URLSearchParams({
      reportType: reportType,
      timePeriod: 'custom',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      woOrderNumber: String(wideOrbitNumber),
      reportFormat: 'web'
    })

    return `${baseURL}?${params.toString()}`
  }

  const handleReportsClick = (tacticName: string) => {
    const reportURL = generateReportURL(tacticName)

    if (reportURL) {
      window.open(reportURL, '_blank')
    } else {
      alert('Unable to generate report link. Please ensure campaign data and time range are set.')
    }
  }

  // Process files for a specific tactic
  const processFilesForTactic = async (files: File[], tacticName: string) => {
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError(`Skipping ${file.name}: Please upload CSV files only`)
        continue
      }

      if (file.size > 10 * 1024 * 1024) {
        setError(`Skipping ${file.name}: File size must be less than 10MB`)
        continue
      }

      try {
        const parsed = await parseCSV(file)
        const uploadedFile = createUploadedFile(
          file,
          parsed,
          tacticName,
          1.0, // Direct upload = 100% confidence
          'manual'
        )
        addFileToTactic(tacticName, uploadedFile)
      } catch (err) {
        setError(`Error parsing ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
  }

  // Bulk upload handler (auto-sorts files to tactics)
  const processBulkFiles = useCallback(
    async (files: File[]) => {
      setIsProcessing(true)

      try {
        for (const file of files) {
          const isZip = file.name.toLowerCase().endsWith('.zip')
          const isCsv = file.name.toLowerCase().endsWith('.csv')

          if (isZip) {
            setProcessingStatus(`Extracting ${file.name}...`)
            const extractedFiles = await extractZip(file, (percent, currentFile) => {
              setProcessingStatus(`Extracting: ${currentFile} (${Math.round(percent)}%)`)
            })

            for (const extracted of extractedFiles) {
              const matchedTactic = findMatchingTactic(extracted.name, detectedTactics)
              const uploadedFile = createUploadedFile(
                { name: extracted.name, size: extracted.content.length },
                extracted.parsed,
                matchedTactic?.name || 'Unassigned',
                matchedTactic ? 0.8 : 0,
                'zip_extraction'
              )
              addFileToTactic(uploadedFile.tacticName, uploadedFile)
            }
          } else if (isCsv) {
            setProcessingStatus(`Parsing ${file.name}...`)
            const parsed = await parseCSV(file)
            const matchedTactic = findMatchingTactic(file.name, detectedTactics)
            const uploadedFile = createUploadedFile(
              file,
              parsed,
              matchedTactic?.name || 'Unassigned',
              matchedTactic ? 0.8 : 0,
              'drag_drop'
            )
            addFileToTactic(uploadedFile.tacticName, uploadedFile)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process files')
      } finally {
        setIsProcessing(false)
        setProcessingStatus('')
      }
    },
    [detectedTactics, addFileToTactic, setError]
  )

  // Drag handlers for bulk upload
  const handleBulkDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleBulkDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files)
    await processBulkFiles(files)
  }

  // Drag handlers for per-tactic upload
  const handleTacticDragOver = (e: React.DragEvent, tacticName: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTactic(tacticName)
  }

  const handleTacticDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTactic(null)
  }

  const handleTacticDrop = async (e: React.DragEvent, tacticName: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTactic(null)
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.csv'))
    await processFilesForTactic(files, tacticName)
  }

  // Get expected headers for a tactic (used for PPTX validation)
  // Fetches from performance_tables schema in database, falls back to defaults
  const getExpectedHeadersForTactic = useCallback((tacticName: string): string[] => {
    // Find the matching tactic to get the subProduct name
    const tactic = detectedTactics.find(t => t.name === tacticName)

    if (tactic?.subProduct && subproductHeaders[tactic.subProduct]) {
      // Return headers from database
      return subproductHeaders[tactic.subProduct].headers
    }

    // Also try matching by product name in case subProduct is empty
    if (tactic?.product && subproductHeaders[tactic.product]) {
      return subproductHeaders[tactic.product].headers
    }

    // Fallback: try matching the tactic name directly (for backwards compatibility)
    if (subproductHeaders[tacticName]) {
      return subproductHeaders[tacticName].headers
    }

    // Final fallback: hardcoded defaults for common tactics
    const defaultHeadersByTactic: Record<string, string[]> = {
      'Email Marketing': ['Campaign', 'Sends', 'Opens', 'Clicks', 'CTR', 'Open Rate'],
      'Social Media': ['Campaign', 'Impressions', 'Reach', 'Clicks', 'CTR', 'Engagement'],
      'Display': ['Campaign', 'Impressions', 'Clicks', 'CTR', 'Spend', 'CPC', 'CPM'],
      'Paid Search': ['Campaign', 'Impressions', 'Clicks', 'CTR', 'Spend', 'CPC'],
      'SEM': ['Campaign', 'Impressions', 'Clicks', 'CTR', 'Spend', 'CPC'],
      'OTT': ['Campaign', 'Impressions', 'Completions', 'Completion Rate', 'Spend'],
      'CTV': ['Campaign', 'Impressions', 'Completions', 'Completion Rate', 'Spend'],
      'Video': ['Campaign', 'Impressions', 'Views', 'Completions', 'View Rate'],
      'Audio': ['Campaign', 'Impressions', 'Listens', 'Completion Rate', 'Spend'],
      'Native': ['Campaign', 'Impressions', 'Clicks', 'CTR', 'Spend'],
    }
    return defaultHeadersByTactic[tacticName] || []
  }, [detectedTactics, subproductHeaders])

  // PPTX upload handler
  const handlePPTXUpload = async (file: File) => {
    await uploadPPTX(file)
    setShowPPTXModal(true)
  }

  // Handle PPTX import (from modal)
  const handlePPTXImport = (files: UploadedFile[]) => {
    for (const file of files) {
      addFileToTactic(file.tacticName, file)
    }
    resetPPTX()
    setShowPPTXModal(false)
  }

  // Close PPTX modal
  const handleClosePPTXModal = () => {
    setShowPPTXModal(false)
    resetPPTX()
  }

  // Calculate progress
  const totalTactics = detectedTactics.length
  const tacticsWithFiles = detectedTactics.filter(t => (filesByTactic[t.name]?.length || 0) > 0).length
  const totalFiles = Object.values(filesByTactic).flat().length
  const progressPercent = totalTactics > 0 ? (tacticsWithFiles / totalTactics) * 100 : 0

  return (
    <div className="report-container animate-fade-in">
      {/* Section Header */}
      <div className="section-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="step-indicator">4</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Performance Tables by Tactic</h2>
        </div>
        <span className="step-status">STEP PENDING</span>
      </div>

      {/* Description */}
      <p className="form-description">
        Upload performance data files for each detected tactic. Drag multiple files to auto-sort them.
      </p>

      {/* Bulk Upload Area */}
      <div
        onDragOver={handleBulkDragOver}
        onDrop={handleBulkDrop}
        onClick={() => bulkInputRef.current?.click()}
        style={{
          border: '3px dashed var(--color-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          textAlign: 'center',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          backgroundColor: 'var(--color-surface)',
          transition: 'all 0.3s ease',
          marginBottom: '24px',
          opacity: isProcessing ? 0.6 : 1,
        }}
      >
        <input
          ref={bulkInputRef}
          type="file"
          accept=".csv,.zip"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            if (files.length) processBulkFiles(files)
            e.target.value = ''
          }}
          disabled={isProcessing}
        />
        {isProcessing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            <p style={{ margin: 0, fontWeight: 500 }}>{processingStatus}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Package size={40} style={{ color: 'var(--color-primary)', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Smart File Upload</h4>
            <p style={{ margin: '0 0 8px 0', color: 'var(--color-text-secondary)' }}>
              Upload ZIP files, folders, or individual CSV files
            </p>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              ZIP files will be extracted and CSVs automatically sorted to tactics
            </span>
          </div>
        )}
      </div>

      {/* PowerPoint Upload */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <input
          ref={pptxInputRef}
          type="file"
          accept=".pptx"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handlePPTXUpload(file)
            e.target.value = ''
          }}
          disabled={isPPTXLoading}
        />
        <button
          onClick={() => pptxInputRef.current?.click()}
          disabled={isPPTXLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isPPTXLoading ? 'not-allowed' : 'pointer',
            opacity: isPPTXLoading ? 0.6 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {isPPTXLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Extracting tables...
            </>
          ) : (
            <>
              <Presentation size={18} />
              Upload PowerPoint
            </>
          )}
        </button>
        {pptxError && (
          <span style={{ marginLeft: '12px', color: 'var(--color-error)', fontSize: '14px' }}>
            {pptxError}
          </span>
        )}
      </div>

      {/* Progress Summary */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Uploads: <strong style={{ color: 'var(--color-text-primary)' }}>{tacticsWithFiles}</strong> / <strong>{totalTactics}</strong> tactics complete
          </span>
          <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            ({totalFiles} files total)
          </span>
        </div>
        <div style={{
          height: '8px',
          backgroundColor: 'var(--color-gray-200)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: progressPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Tactic Cards Grid */}
      {detectedTactics.length === 0 ? (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          backgroundColor: 'var(--color-surface-secondary)',
          borderRadius: 'var(--radius-md)'
        }}>
          <p style={{ margin: 0 }}>No tactics detected. Please complete the campaign data step first.</p>
        </div>
      ) : (
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {detectedTactics.map((tactic) => {
            const tacticFiles = filesByTactic[tactic.name] || []
            const hasFiles = tacticFiles.length > 0
            const isDragOver = dragOverTactic === tactic.name

            return (
              <div
                key={tactic.name}
                className="upload-card tactic-card-hover"
                style={{
                  borderColor: isDragOver ? 'var(--color-success)' : hasFiles ? 'var(--color-success)' : 'var(--color-border)',
                  backgroundColor: isDragOver ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-surface)',
                  transition: 'all 0.2s ease'
                }}
                onDragOver={(e) => handleTacticDragOver(e, tactic.name)}
                onDragLeave={handleTacticDragLeave}
                onDrop={(e) => handleTacticDrop(e, tactic.name)}
              >
                {/* Card Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{tactic.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {hasFiles && (
                        <span style={{
                          fontSize: '12px',
                          color: 'var(--color-success)',
                          fontWeight: 600
                        }}>
                          {tacticFiles.length} file{tacticFiles.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span className={`tactic-badge ${hasFiles ? 'status-complete' : 'status-pending'}`}>
                        {hasFiles ? 'Complete' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    Upload {tactic.name} performance data (CSV format)
                  </p>

                  {/* Per-Tactic Upload Area */}
                  <div
                    style={{
                      border: `2px dashed ${isDragOver ? 'var(--color-success)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundColor: isDragOver ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                      transition: 'all 0.2s',
                      marginBottom: tacticFiles.length > 0 ? '16px' : '0'
                    }}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = '.csv'
                      input.multiple = true
                      input.onchange = async (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files || [])
                        await processFilesForTactic(files, tactic.name)
                      }
                      input.click()
                    }}
                  >
                    <Upload size={24} style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      Choose CSV files or drag & drop
                    </p>
                  </div>

                  {/* Uploaded Files List */}
                  {tacticFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {tacticFiles.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            backgroundColor: 'var(--color-surface-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <FileSpreadsheet size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                            <span style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {file.name}
                            </span>
                            {file.source === 'zip_extraction' && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                backgroundColor: 'var(--color-info-light)',
                                color: '#1e40af',
                                borderRadius: 'var(--radius-full)',
                                fontWeight: 500,
                                flexShrink: 0
                              }}>
                                Auto-sorted
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFileFromTactic(tactic.name, file.id)
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-text-muted)',
                              fontSize: '12px',
                              fontWeight: 500
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reports Button */}
                <button
                  onClick={() => handleReportsClick(tactic.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '16px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <ExternalLink size={16} />
                  Reports
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="section-actions">
        <button onClick={prevStep} className="btn-secondary">
          <ChevronLeft size={20} />
          Back
        </button>
        <button onClick={nextStep} className="btn-primary">
          Continue to Analysis
          <ChevronRight size={20} />
        </button>
      </div>

      {/* PPTX Preview Modal */}
      {showPPTXModal && pptxData && (
        <PPTXPreviewModal
          isOpen={showPPTXModal}
          data={pptxData}
          detectedTactics={detectedTactics}
          getExpectedHeaders={getExpectedHeadersForTactic}
          onClose={handleClosePPTXModal}
          onImport={handlePPTXImport}
          onAssignTactic={assignTactic}
          onToggleIncluded={toggleIncluded}
          onUpdateCell={updateCell}
        />
      )}
    </div>
  )
}

function findMatchingTactic(
  filename: string,
  tactics: { name: string; product: string }[]
) {
  const normalizedFilename = filename.toLowerCase()
  return tactics.find((t) => {
    const tacticLower = t.name.toLowerCase().replace(/\s+/g, '')
    const productLower = t.product.toLowerCase().replace(/\s+/g, '')
    return (
      normalizedFilename.includes(tacticLower) ||
      normalizedFilename.includes(productLower)
    )
  })
}
