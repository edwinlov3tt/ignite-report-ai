/**
 * Import/Export Page
 * Bulk import and export of schema data (Products, Platforms, Industries)
 */

import { useState, useRef, useCallback } from 'react'
import {
  Download, Upload, FileJson, FolderArchive, Package, Smartphone, Factory,
  Loader2, AlertTriangle, CheckCircle, X, FileDown
} from 'lucide-react'
import { Tabs, TabPanel } from '@/components/admin/Tabs'
import { ImportPreview } from '@/components/admin/ImportPreview'
import { FormField, Select } from '@/components/admin/FormField'
import type { EntityType, ExportOptions, ImportOptions, ImportPreviewResult } from '@/lib/importExport'
import {
  exportData,
  downloadFile,
  generateTemplateBundle,
  generateImportPreview,
  downloadErrorReport,
  commitImport
} from '@/lib/importExport'
import * as schemaApi from '@/lib/schemaApi'
import * as platformsApi from '@/lib/platformsApi'
import * as industriesApi from '@/lib/industriesApi'

type TabId = 'import' | 'export'

export function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<TabId>('export')

  return (
    <div>
      {/* Page Header */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)' }}>
              Import/Export
            </h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              Bulk import and export Products, Platforms, and Industries data
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'export', label: 'Export', icon: <Download size={18} /> },
          { id: 'import', label: 'Import', icon: <Upload size={18} /> }
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
      />

      <TabPanel id="export" activeTab={activeTab}>
        <ExportPanel />
      </TabPanel>

      <TabPanel id="import" activeTab={activeTab}>
        <ImportPanel />
      </TabPanel>
    </div>
  )
}

// ============================================
// Export Panel
// ============================================

function ExportPanel() {
  const [entityType, setEntityType] = useState<EntityType>('products')
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [includeNested, setIncludeNested] = useState(true)
  const [activeOnly, setActiveOnly] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    setSuccess(null)

    try {
      // Fetch the data
      let data: unknown[]
      switch (entityType) {
        case 'products':
          data = await schemaApi.getProducts()
          break
        case 'platforms':
          data = await platformsApi.getPlatforms()
          break
        case 'industries':
          data = await industriesApi.getIndustries()
          break
      }

      // Export and download
      const options: ExportOptions = { format, includeNested, activeOnly }
      const result = await exportData(entityType, data as never, options)
      downloadFile(result)

      setSuccess(`Successfully exported ${entityType} to ${result.filename}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadTemplates = async () => {
    try {
      const result = await generateTemplateBundle(entityType)
      downloadFile(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate templates')
    }
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      padding: '24px'
    }}>
      <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 600 }}>
        Export Data
      </h2>

      {/* Entity Type Selection */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          marginBottom: '12px',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--color-text-secondary)'
        }}>
          Entity Type
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <EntityTypeButton
            selected={entityType === 'products'}
            onClick={() => setEntityType('products')}
            icon={<Package size={20} />}
            label="Products"
          />
          <EntityTypeButton
            selected={entityType === 'platforms'}
            onClick={() => setEntityType('platforms')}
            icon={<Smartphone size={20} />}
            label="Platforms"
          />
          <EntityTypeButton
            selected={entityType === 'industries'}
            onClick={() => setEntityType('industries')}
            icon={<Factory size={20} />}
            label="Industries"
          />
        </div>
      </div>

      {/* Format Selection */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          marginBottom: '12px',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--color-text-secondary)'
        }}>
          Format
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <FormatButton
            selected={format === 'json'}
            onClick={() => setFormat('json')}
            icon={<FileJson size={20} />}
            label="JSON"
            description="Preserves hierarchy, best for backups"
          />
          <FormatButton
            selected={format === 'csv'}
            onClick={() => setFormat('csv')}
            icon={<FolderArchive size={20} />}
            label="CSV Bundle (ZIP)"
            description="Editable in spreadsheets"
          />
        </div>
      </div>

      {/* Options */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeNested}
            onChange={(e) => setIncludeNested(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: '14px' }}>Include nested data</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: '14px' }}>Active only</span>
        </label>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--color-error)'
        }}>
          <AlertTriangle size={18} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--color-success)'
        }}>
          <CheckCircle size={18} />
          <span style={{ flex: 1 }}>{success}</span>
          <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {isExporting ? 'Exporting...' : 'Export Data'}
        </button>
        <button
          onClick={handleDownloadTemplates}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FileDown size={18} />
          Download Templates
        </button>
      </div>
    </div>
  )
}

// ============================================
// Import Panel
// ============================================

function ImportPanel() {
  const [entityType, setEntityType] = useState<EntityType>('products')
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'error'>('skip')
  const [missingReferenceHandling, setMissingReferenceHandling] = useState<'create' | 'skip'>('skip')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; message: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setPreview(null)
      setError(null)
      setSuccess(null)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handlePreview = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setError(null)
    setPreview(null)

    try {
      // Fetch existing data for validation context
      const existingData: {
        products?: Array<{ slug: string; id?: string }>
        platforms?: Array<{ code: string; id?: string }>
        industries?: Array<{ code: string; id?: string }>
      } = {}

      switch (entityType) {
        case 'products':
          existingData.products = await schemaApi.getProducts()
          break
        case 'platforms':
          existingData.platforms = await platformsApi.getPlatforms()
          break
        case 'industries':
          existingData.industries = await industriesApi.getIndustries()
          break
      }

      const options: ImportOptions = { duplicateHandling, missingReferenceHandling }
      const result = await generateImportPreview(selectedFile, entityType, existingData, options)
      setPreview(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!preview || !preview.canImport) return

    setIsImporting(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await commitImport(
        preview,
        { duplicateHandling, missingReferenceHandling },
        {
          onProgress: (current, total, message) => {
            setImportProgress({ current, total, message })
          },
          createProduct: entityType === 'products' ? schemaApi.createProduct as (data: unknown) => Promise<{ id: string }> : undefined,
          createPlatform: entityType === 'platforms' ? platformsApi.createPlatform as (data: unknown) => Promise<{ id: string }> : undefined,
          createIndustry: entityType === 'industries' ? industriesApi.createIndustry as (data: unknown) => Promise<{ id: string }> : undefined
        }
      )

      if (result.success) {
        setSuccess(`Successfully imported ${result.created} ${entityType}`)
        setPreview(null)
        setSelectedFile(null)
      } else {
        setError(`Import completed with ${result.errors.length} error(s)`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
      setImportProgress(null)
    }
  }

  const handleDownloadErrors = () => {
    if (preview) {
      downloadErrorReport(preview)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreview(null)
    setError(null)
    setSuccess(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      padding: '24px'
    }}>
      <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 600 }}>
        Import Data
      </h2>

      {/* Entity Type Selection */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          marginBottom: '12px',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--color-text-secondary)'
        }}>
          Entity Type
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <EntityTypeButton
            selected={entityType === 'products'}
            onClick={() => { setEntityType('products'); handleReset() }}
            icon={<Package size={20} />}
            label="Products"
          />
          <EntityTypeButton
            selected={entityType === 'platforms'}
            onClick={() => { setEntityType('platforms'); handleReset() }}
            icon={<Smartphone size={20} />}
            label="Platforms"
          />
          <EntityTypeButton
            selected={entityType === 'industries'}
            onClick={() => { setEntityType('industries'); handleReset() }}
            icon={<Factory size={20} />}
            label="Industries"
          />
        </div>
      </div>

      {/* File Drop Zone */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          marginBottom: '12px',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--color-text-secondary)'
        }}>
          Upload File
        </label>

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${selectedFile ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '40px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: selectedFile ? 'var(--color-primary-light)' : 'var(--color-background)',
            transition: 'all 0.2s'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.zip"
            onChange={(e) => handleFileSelect(e.target.files)}
            style={{ display: 'none' }}
          />

          {selectedFile ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FileJson size={40} style={{ color: 'var(--color-primary)', marginBottom: '12px' }} />
              <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-primary)' }}>
                {selectedFile.name}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Upload size={40} style={{ color: 'var(--color-text-muted)', marginBottom: '12px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>
                Drag and drop files here, or click to browse
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Accepts: .json, .csv, .zip
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Import Options */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '24px' }}>
        <div style={{ flex: 1 }}>
          <FormField label="Duplicate Handling">
            <Select
              value={duplicateHandling}
              onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update' | 'error')}
              options={[
                { value: 'skip', label: 'Skip duplicates' },
                { value: 'update', label: 'Update existing' },
                { value: 'error', label: 'Report as error' }
              ]}
            />
          </FormField>
        </div>
        <div style={{ flex: 1 }}>
          <FormField label="Missing References">
            <Select
              value={missingReferenceHandling}
              onChange={(e) => setMissingReferenceHandling(e.target.value as 'create' | 'skip')}
              options={[
                { value: 'skip', label: 'Skip rows' },
                { value: 'create', label: 'Create placeholders' }
              ]}
            />
          </FormField>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--color-error)'
        }}>
          <AlertTriangle size={18} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--color-success)'
        }}>
          <CheckCircle size={18} />
          <span style={{ flex: 1 }}>{success}</span>
          <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: preview ? '24px' : 0 }}>
        {!preview ? (
          <button
            onClick={handlePreview}
            disabled={!selectedFile || isProcessing}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {isProcessing ? 'Processing...' : 'Preview Import'}
          </button>
        ) : (
          <>
            <button
              onClick={handleImport}
              disabled={!preview.canImport || isImporting}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isImporting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {isImporting ? (importProgress ? `${importProgress.current}/${importProgress.total}` : 'Importing...') : 'Confirm Import'}
            </button>
            <button onClick={handleReset} className="btn-secondary">
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Import Progress */}
      {importProgress && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            height: '4px',
            backgroundColor: 'var(--color-border)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              height: '100%',
              width: `${(importProgress.current / importProgress.total) * 100}%`,
              backgroundColor: 'var(--color-primary)',
              transition: 'width 0.2s'
            }} />
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {importProgress.message}
          </p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <ImportPreview preview={preview} onDownloadErrors={handleDownloadErrors} />
      )}
    </div>
  )
}

// ============================================
// Shared Components
// ============================================

interface EntityTypeButtonProps {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function EntityTypeButton({ selected, onClick, icon, label }: EntityTypeButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '16px',
        border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        backgroundColor: selected ? 'var(--color-primary-light)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.15s'
      }}
    >
      <span style={{ color: selected ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
        {icon}
      </span>
      <span style={{
        fontSize: '14px',
        fontWeight: 500,
        color: selected ? 'var(--color-primary)' : 'var(--color-text-secondary)'
      }}>
        {label}
      </span>
    </button>
  )
}

interface FormatButtonProps {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  description: string
}

function FormatButton({ selected, onClick, icon, label, description }: FormatButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        backgroundColor: selected ? 'var(--color-primary-light)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s'
      }}
    >
      <span style={{ color: selected ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
        {icon}
      </span>
      <div>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          color: selected ? 'var(--color-primary)' : 'var(--color-text-secondary)'
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          marginTop: '4px'
        }}>
          {description}
        </div>
      </div>
    </button>
  )
}
