import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import {
  Settings, Table, FileSpreadsheet, Trash2, Save, Plus, Edit2,
  Loader2, AlertTriangle, X, ChevronRight, ArrowLeft, Brain, Target, ShieldAlert, Clock
} from 'lucide-react'
import { DataTable } from '@/components/admin/DataTable'
import { Modal } from '@/components/admin/Modal'
import { FormField, Input, Textarea } from '@/components/admin/FormField'
import { Tabs, TabPanel } from '@/components/admin/Tabs'
import { ChipInput } from '@/components/admin/ChipInput'
import { TextArrayInput } from '@/components/admin/TextArrayInput'
import * as schemaApi from '@/lib/schemaApi'
import * as platformsApi from '@/lib/platformsApi'
import * as mediumsApi from '@/lib/mediumsApi'
import type { Product, SubProduct, TacticType, PerformanceTable } from '@/lib/schemaApi'

type SubProductTab = 'overview' | 'tactics' | 'tables' | 'analysis' | 'optimization' | 'constraints'

export function SubProductDetailPage() {
  const { id: productId, subId } = useParams<{ id: string; subId: string }>()
  const navigate = useNavigate()
  const parsedProductId = productId || ''
  const parsedSubId = subId || ''

  // Data State
  const [product, setProduct] = useState<Product | null>(null)
  const [subProduct, setSubProduct] = useState<SubProduct | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Original values for change detection
  const [originalValues, setOriginalValues] = useState<{
    name: string
    description: string
    platforms: string[]
    mediums: string[]
    notes: string
    analysisInstructions: string
    chainOfThought: string
    goodExamples: string
    badExamples: string
    criticalMetrics: string[]
    optimizationPriorities: string[]
    constraints: string
  } | null>(null)

  // UI State
  const [activeTab, setActiveTab] = useState<SubProductTab>('overview')

  // Form State - Overview
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPlatforms, setEditPlatforms] = useState<string[]>([])
  const [editMediums, setEditMediums] = useState<string[]>([])
  const [editNotes, setEditNotes] = useState('')
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([])
  const [availableMediums, setAvailableMediums] = useState<string[]>([])
  const [mediumDescriptions, setMediumDescriptions] = useState<Record<string, string>>({})

  // Add Medium Modal
  const [showAddMediumModal, setShowAddMediumModal] = useState(false)
  const [newMediumName, setNewMediumName] = useState('')
  const [newMediumDescription, setNewMediumDescription] = useState('')
  const [pendingMediumName, setPendingMediumName] = useState<string | null>(null)

  // Form State - Analysis (stored as newline-separated text)
  const [editAnalysisInstructions, setEditAnalysisInstructions] = useState('')
  const [editChainOfThoughtGuidance, setEditChainOfThoughtGuidance] = useState('')
  const [editExampleGoodAnalysis, setEditExampleGoodAnalysis] = useState('')
  const [editExampleBadAnalysis, setEditExampleBadAnalysis] = useState('')

  // Form State - Optimization
  const [editCriticalMetrics, setEditCriticalMetrics] = useState<string[]>([])
  const [editOptimizationPriorities, setEditOptimizationPriorities] = useState<string[]>([])

  // Form State - Constraints
  const [editConstraints, setEditConstraints] = useState('')

  // Add/Edit Tactic Type Modal
  const [showAddTacticModal, setShowAddTacticModal] = useState(false)
  const [editingTactic, setEditingTactic] = useState<TacticType | null>(null)
  const [newTacticName, setNewTacticName] = useState('')
  const [newTacticAliasCode, setNewTacticAliasCode] = useState('')
  const [newTacticOverview, setNewTacticOverview] = useState('')
  const [newTacticAnalysisInstructions, setNewTacticAnalysisInstructions] = useState('')
  const [newTacticLuminaData, setNewTacticLuminaData] = useState<string[]>([])

  // Available lumina extractors for tactic type (inherited from product)
  const [availableLuminaExtractors, setAvailableLuminaExtractors] = useState<string[]>([])

  // Performance Tables State
  const [performanceTables, setPerformanceTables] = useState<PerformanceTable[]>([])
  const [showAddTableModal, setShowAddTableModal] = useState(false)
  const [editingTable, setEditingTable] = useState<PerformanceTable | null>(null)
  const [tableFormData, setTableFormData] = useState({
    table_name: '',
    file_name: '',
    headers: '',
    description: '',
    is_required: false
  })

  // Helper: Convert array to newline-separated string
  const arrayToText = (arr: string[] | undefined): string => {
    return arr?.join('\n') || ''
  }

  // Helper: Convert newline-separated string to array (filter empty lines)
  const textToArray = (text: string): string[] => {
    return text.split('\n').map(s => s.trim()).filter(s => s.length > 0)
  }

  // Helper: Check if arrays are equal
  const arraysEqual = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false
    return a.every((val, i) => val === b[i])
  }

  // Detect unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!originalValues) return false
    return (
      editName !== originalValues.name ||
      editDescription !== originalValues.description ||
      !arraysEqual(editPlatforms, originalValues.platforms) ||
      !arraysEqual(editMediums, originalValues.mediums) ||
      editNotes !== originalValues.notes ||
      editAnalysisInstructions !== originalValues.analysisInstructions ||
      editChainOfThoughtGuidance !== originalValues.chainOfThought ||
      editExampleGoodAnalysis !== originalValues.goodExamples ||
      editExampleBadAnalysis !== originalValues.badExamples ||
      !arraysEqual(editCriticalMetrics, originalValues.criticalMetrics) ||
      !arraysEqual(editOptimizationPriorities, originalValues.optimizationPriorities) ||
      editConstraints !== originalValues.constraints
    )
  }, [
    originalValues, editName, editDescription, editPlatforms, editMediums,
    editNotes, editAnalysisInstructions, editChainOfThoughtGuidance,
    editExampleGoodAnalysis, editExampleBadAnalysis, editCriticalMetrics,
    editOptimizationPriorities, editConstraints
  ])

  // Load product and subproduct
  const loadData = useCallback(async () => {
    if (!parsedProductId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await schemaApi.getProduct(parsedProductId)
      if (data) {
        setProduct(data)
        // Extract lumina extractor names for tactic type dropdown
        const extractorNames = (data.lumina_extractors || []).map(e => e.name)
        setAvailableLuminaExtractors(extractorNames)
        const sub = data.subproducts?.find(s => s.id === parsedSubId)
        if (sub) {
          setSubProduct(sub)
          // Overview fields
          setEditName(sub.name)
          setEditDescription(sub.description || '')
          setEditPlatforms(sub.platforms || [])
          // Support both old medium field and new mediums array
          setEditMediums(sub.mediums || (sub.medium ? [sub.medium] : []))
          setEditNotes(sub.notes || '')

          // Analysis fields (convert arrays to text)
          setEditAnalysisInstructions(arrayToText(sub.analysis_instructions))
          setEditChainOfThoughtGuidance(arrayToText(sub.chain_of_thought_guidance))
          setEditExampleGoodAnalysis(arrayToText(sub.example_good_analysis))
          setEditExampleBadAnalysis(arrayToText(sub.example_bad_analysis))

          // Optimization fields
          setEditCriticalMetrics(sub.critical_metrics || [])
          setEditOptimizationPriorities(sub.optimization_priorities || [])

          // Constraints
          setEditConstraints(sub.important_constraints_restrictions || '')

          // Store original values for change detection
          setOriginalValues({
            name: sub.name,
            description: sub.description || '',
            platforms: sub.platforms || [],
            mediums: sub.mediums || (sub.medium ? [sub.medium] : []),
            notes: sub.notes || '',
            analysisInstructions: arrayToText(sub.analysis_instructions),
            chainOfThought: arrayToText(sub.chain_of_thought_guidance),
            goodExamples: arrayToText(sub.example_good_analysis),
            badExamples: arrayToText(sub.example_bad_analysis),
            criticalMetrics: sub.critical_metrics || [],
            optimizationPriorities: sub.optimization_priorities || [],
            constraints: sub.important_constraints_restrictions || ''
          })

          // Load performance tables
          const tables = await schemaApi.getPerformanceTables(sub.id)
          setPerformanceTables(tables)
        } else {
          setError('SubProduct not found')
        }
      } else {
        setError('Product not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [parsedProductId, parsedSubId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Warn on navigation with unsaved changes (browser close, back button, link clicks)
  useUnsavedChangesWarning(hasUnsavedChanges)

  // Load available platforms for autocomplete
  const loadPlatforms = useCallback(async () => {
    try {
      const platforms = await platformsApi.getPlatforms()
      const platformNames = platforms.map(p => p.name)
      setAvailablePlatforms(platformNames)

      // Filter out any selected platforms that no longer exist
      setEditPlatforms(prev => prev.filter(p => platformNames.includes(p)))
    } catch (err) {
      console.error('Failed to load platforms:', err)
    }
  }, [])

  useEffect(() => {
    loadPlatforms()
  }, [loadPlatforms])

  // Load available mediums for autocomplete
  const loadMediums = useCallback(async () => {
    try {
      const mediums = await mediumsApi.getMediums()
      const mediumNames = mediums.map(m => m.name)
      setAvailableMediums(mediumNames)
      // Build descriptions map for dropdown display
      const descriptions: Record<string, string> = {}
      mediums.forEach(m => {
        if (m.description) {
          descriptions[m.name] = m.description
        }
      })
      setMediumDescriptions(descriptions)
    } catch (err) {
      console.error('Failed to load mediums:', err)
    }
  }, [])

  useEffect(() => {
    loadMediums()
  }, [loadMediums])

  // Handle adding a new platform (creates it in the database)
  const handleAddNewPlatform = async (name: string) => {
    try {
      await platformsApi.createPlatformFromName(name)
      // Refresh the available platforms list
      await loadPlatforms()
    } catch (err) {
      console.error('Failed to create platform:', err)
    }
  }

  // Handle triggering add medium modal (when user types a new medium name)
  const handleTriggerAddMedium = (name: string) => {
    setPendingMediumName(name)
    setNewMediumName(name)
    setNewMediumDescription('')
    setShowAddMediumModal(true)
  }

  // Handle creating a new medium with description
  const handleAddNewMedium = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMediumName.trim()) return

    setIsSaving(true)
    try {
      await mediumsApi.createMediumFromName(newMediumName.trim(), newMediumDescription.trim() || undefined)
      await loadMediums()
      // Add the new medium to the current selection
      if (pendingMediumName) {
        setEditMediums(prev => [...prev, newMediumName.trim()])
      }
      setShowAddMediumModal(false)
      setNewMediumName('')
      setNewMediumDescription('')
      setPendingMediumName(null)
    } catch (err) {
      console.error('Failed to create medium:', err)
      setError(err instanceof Error ? err.message : 'Failed to create medium')
    } finally {
      setIsSaving(false)
    }
  }

  // Save subproduct
  const handleSaveSubProduct = async () => {
    if (!subProduct) return

    setIsSaving(true)
    try {
      await schemaApi.updateSubproduct(subProduct.id, {
        name: editName,
        slug: schemaApi.generateSlug(editName),
        description: editDescription || undefined,
        platforms: editPlatforms,
        mediums: editMediums,
        notes: editNotes || undefined,
        // Analysis fields (convert text to arrays)
        analysis_instructions: textToArray(editAnalysisInstructions).length > 0 ? textToArray(editAnalysisInstructions) : undefined,
        chain_of_thought_guidance: textToArray(editChainOfThoughtGuidance).length > 0 ? textToArray(editChainOfThoughtGuidance) : undefined,
        example_good_analysis: textToArray(editExampleGoodAnalysis).length > 0 ? textToArray(editExampleGoodAnalysis) : undefined,
        example_bad_analysis: textToArray(editExampleBadAnalysis).length > 0 ? textToArray(editExampleBadAnalysis) : undefined,
        // Optimization fields
        critical_metrics: editCriticalMetrics.length > 0 ? editCriticalMetrics : undefined,
        optimization_priorities: editOptimizationPriorities.length > 0 ? editOptimizationPriorities : undefined,
        // Constraints
        important_constraints_restrictions: editConstraints || undefined
      })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subproduct')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete subproduct
  const handleDeleteSubProduct = async () => {
    if (!subProduct || !product) return
    if (!confirm('Are you sure you want to delete this subproduct?')) return

    setIsSaving(true)
    try {
      // Find next or previous sibling to navigate to
      const siblings = product.subproducts || []
      const currentIndex = siblings.findIndex(s => s.id === subProduct.id)
      let nextPath = `/schema-admin/products/${product.id}`

      if (siblings.length > 1) {
        // Navigate to next sibling, or previous if we're deleting the last one
        const nextIndex = currentIndex < siblings.length - 1 ? currentIndex + 1 : currentIndex - 1
        if (nextIndex >= 0 && nextIndex < siblings.length) {
          nextPath = `/schema-admin/products/${product.id}/subproducts/${siblings[nextIndex].id}`
        }
      }

      await schemaApi.deleteSubproduct(subProduct.id)
      navigate(nextPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subproduct')
    } finally {
      setIsSaving(false)
    }
  }

  // Reset tactic type form
  const resetTacticForm = () => {
    setNewTacticName('')
    setNewTacticAliasCode('')
    setNewTacticOverview('')
    setNewTacticAnalysisInstructions('')
    setNewTacticLuminaData([])
    setEditingTactic(null)
  }

  // Open add tactic modal
  const openAddTacticModal = () => {
    resetTacticForm()
    setShowAddTacticModal(true)
  }

  // Open edit tactic modal
  const openEditTacticModal = (tactic: TacticType) => {
    setEditingTactic(tactic)
    setNewTacticName(tactic.name)
    setNewTacticAliasCode(tactic.alias_code || '')
    setNewTacticOverview(tactic.overview || '')
    setNewTacticAnalysisInstructions(tactic.analysis_instructions || '')
    setNewTacticLuminaData(tactic.lumina_data || [])
    setShowAddTacticModal(true)
  }

  // Save tactic type (create or update)
  const handleSaveTacticType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTacticName.trim() || !subProduct) return

    setIsSaving(true)
    try {
      if (editingTactic) {
        // Update existing
        await schemaApi.updateTacticType(editingTactic.id, {
          name: newTacticName,
          alias_code: newTacticAliasCode || undefined,
          overview: newTacticOverview || undefined,
          analysis_instructions: newTacticAnalysisInstructions || undefined,
          lumina_data: newTacticLuminaData.length > 0 ? newTacticLuminaData : undefined,
          slug: schemaApi.generateSlug(newTacticName),
          data_value: schemaApi.generateSlug(newTacticName),
        })
      } else {
        // Create new
        await schemaApi.createTacticType({
          subproduct_id: subProduct.id,
          name: newTacticName,
          alias_code: newTacticAliasCode || undefined,
          overview: newTacticOverview || undefined,
          analysis_instructions: newTacticAnalysisInstructions || undefined,
          lumina_data: newTacticLuminaData.length > 0 ? newTacticLuminaData : undefined,
          slug: schemaApi.generateSlug(newTacticName),
          data_value: schemaApi.generateSlug(newTacticName),
        })
      }
      setShowAddTacticModal(false)
      resetTacticForm()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tactic type')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete tactic type
  const handleDeleteTacticType = async (tacticTypeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this tactic type?')) return

    setIsSaving(true)
    try {
      await schemaApi.deleteTacticType(tacticTypeId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tactic type')
    } finally {
      setIsSaving(false)
    }
  }

  // Performance Table Handlers
  const resetTableForm = () => {
    setTableFormData({
      table_name: '',
      file_name: '',
      headers: '',
      description: '',
      is_required: false
    })
    setEditingTable(null)
  }

  const openAddTableModal = () => {
    resetTableForm()
    setShowAddTableModal(true)
  }

  const openEditTableModal = (table: PerformanceTable) => {
    setEditingTable(table)
    setTableFormData({
      table_name: table.table_name,
      file_name: table.file_name,
      headers: table.headers.join(', '),
      description: table.description || '',
      is_required: table.is_required
    })
    setShowAddTableModal(true)
  }

  const handleSavePerformanceTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tableFormData.table_name.trim() || !subProduct) return

    setIsSaving(true)
    try {
      const headers = tableFormData.headers
        ? tableFormData.headers.split(',').map(h => h.trim()).filter(h => h)
        : []

      if (editingTable) {
        // Update existing
        await schemaApi.updatePerformanceTable(editingTable.id, {
          table_name: tableFormData.table_name,
          file_name: tableFormData.file_name,
          headers,
          description: tableFormData.description || undefined,
          is_required: tableFormData.is_required
        })
      } else {
        // Create new
        await schemaApi.createPerformanceTable({
          subproduct_id: subProduct.id,
          table_name: tableFormData.table_name,
          file_name: tableFormData.file_name,
          headers,
          description: tableFormData.description || undefined,
          is_required: tableFormData.is_required,
          sort_order: performanceTables.length
        })
      }
      setShowAddTableModal(false)
      resetTableForm()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save performance table')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePerformanceTable = async (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this performance table?')) return

    setIsSaving(true)
    try {
      await schemaApi.deletePerformanceTable(tableId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete performance table')
    } finally {
      setIsSaving(false)
    }
  }

  // Inheritance notice component
  const InheritanceNotice = ({ fieldName }: { fieldName: string }) => (
    <div style={{
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      marginBottom: '20px',
      fontSize: '13px',
      color: 'var(--color-primary)'
    }}>
      <strong>Inheritance:</strong> If left empty, {fieldName} will be inherited from the parent Product ({product?.name}).
    </div>
  )

  // Tactic types table columns
  const tacticColumns = [
    {
      id: 'name',
      header: 'Tactic Name',
      accessor: (row: TacticType) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.name}</div>
          {row.overview && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {row.overview.length > 60 ? row.overview.substring(0, 60) + '...' : row.overview}
            </div>
          )}
        </div>
      ),
      sortable: true
    },
    {
      id: 'alias_code',
      header: 'Alias Code',
      accessor: (row: TacticType) => row.alias_code ? (
        <code style={{
          fontSize: '12px',
          backgroundColor: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 600
        }}>
          {row.alias_code}
        </code>
      ) : (
        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
      ),
      width: '100px'
    },
    {
      id: 'lumina_data',
      header: 'Lumina Data',
      accessor: (row: TacticType) => (
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {row.lumina_data && row.lumina_data.length > 0 ? (
            <span title={row.lumina_data.join(', ')}>
              {row.lumina_data.slice(0, 2).join(', ')}
              {row.lumina_data.length > 2 && (
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {' '}+{row.lumina_data.length - 2} more
                </span>
              )}
            </span>
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          )}
        </div>
      )
    }
  ]

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        color: 'var(--color-text-secondary)'
      }}>
        <Loader2 size={48} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--color-primary)' }} />
        <p>Loading subproduct...</p>
      </div>
    )
  }

  if (!product || !subProduct) {
    return (
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '40px',
        textAlign: 'center'
      }}>
        <AlertTriangle size={48} style={{ color: 'var(--color-warning)', marginBottom: '16px' }} />
        <h2 style={{ margin: '0 0 8px 0' }}>SubProduct Not Found</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          The subproduct you're looking for doesn't exist or has been deleted.
        </p>
        <Link to="/schema-admin/products" className="btn-primary">
          <ArrowLeft size={18} />
          Back to Products
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
        <Link to="/schema-admin/products" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
          Products
        </Link>
        <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
        <Link to={`/schema-admin/products/${product.id}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
          {product.name}
        </Link>
        <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{subProduct.name}</span>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--color-error)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)' }}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div style={{
          backgroundColor: 'var(--color-warning-light)',
          border: '1px solid #fcd34d',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          color: '#92400e'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={18} />
            <span style={{ fontWeight: 500 }}>You have unsaved changes</span>
          </div>
          <button
            onClick={handleSaveSubProduct}
            disabled={isSaving}
            className="btn-primary"
            style={{ padding: '8px 16px' }}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      )}

      {/* SubProduct Card */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{subProduct.name}</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>
              {subProduct.tactic_types?.length || 0} Tactic Types · Part of {product.name}
            </p>
          </div>
          <button
            onClick={handleDeleteSubProduct}
            disabled={isSaving}
            className="btn-secondary"
            style={{ color: 'var(--color-error)' }}
          >
            <Trash2 size={18} />
            Delete SubProduct
          </button>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview', icon: <Settings size={16} /> },
            { id: 'tactics', label: 'Tactic Types', icon: <Table size={16} /> },
            { id: 'tables', label: 'Tables', icon: <FileSpreadsheet size={16} /> },
            { id: 'analysis', label: 'Analysis', icon: <Brain size={16} /> },
            { id: 'optimization', label: 'Optimization', icon: <Target size={16} /> },
            { id: 'constraints', label: 'Constraints', icon: <ShieldAlert size={16} /> }
          ]}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as SubProductTab)}
        />

        {/* Tab Content */}
        <div style={{ padding: '24px' }}>
          {/* Overview Tab */}
          <TabPanel id="overview" activeTab={activeTab}>
            <div className="form-field">
              <label>SubProduct Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Slug: {schemaApi.generateSlug(editName)}
              </small>
            </div>

            <div className="form-field">
              <label>Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description of this subproduct..."
                rows={3}
              />
            </div>

            <ChipInput
              label="Platforms"
              value={editPlatforms}
              onChange={setEditPlatforms}
              suggestions={availablePlatforms}
              placeholder="Search or add platforms..."
              hint="Press Tab or Enter to add. Inherits from product if empty."
              allowCustom={true}
              onAddNew={handleAddNewPlatform}
            />

            <ChipInput
              label="Mediums"
              value={editMediums}
              onChange={setEditMediums}
              suggestions={availableMediums}
              suggestionDescriptions={mediumDescriptions}
              placeholder="Search or add mediums..."
              hint="Press Tab or Enter to add. Inherits from product if empty."
              allowCustom={true}
              onAddNew={handleTriggerAddMedium}
              itemLabel="medium"
            />

            <div className="form-field">
              <label>Notes</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Additional context..."
                rows={3}
              />
            </div>
          </TabPanel>

          {/* Tactic Types Tab */}
          <TabPanel id="tactics" activeTab={activeTab}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Tactic Types ({subProduct.tactic_types?.length || 0})</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  Define targeting approaches used within this subproduct
                </p>
              </div>
              <button className="btn-primary" onClick={openAddTacticModal}>
                <Plus size={18} />
                Add Tactic Type
              </button>
            </div>

            <DataTable
              columns={tacticColumns}
              data={subProduct.tactic_types || []}
              keyField="id"
              emptyMessage="No tactic types yet. Click 'Add Tactic Type' to create one."
              actions={(row) => (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => openEditTacticModal(row)}
                    style={{
                      padding: '4px 8px',
                      background: 'none',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleDeleteTacticType(row.id, e)}
                    disabled={isSaving}
                    style={{
                      padding: '4px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-error)'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            />
          </TabPanel>

          {/* Tables Tab */}
          <TabPanel id="tables" activeTab={activeTab}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Performance Tables ({performanceTables.length})</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  Define expected CSV tables for file detection and header matching
                </p>
              </div>
              <button className="btn-primary" onClick={openAddTableModal}>
                <Plus size={18} />
                Add Performance Table
              </button>
            </div>

            <DataTable
              columns={[
                {
                  id: 'table_name',
                  header: 'Table Name',
                  accessor: (row: PerformanceTable) => (
                    <div>
                      <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {row.table_name}
                        {row.is_required && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: 'var(--color-primary)',
                            backgroundColor: 'var(--color-primary-light)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            REQUIRED
                          </span>
                        )}
                      </div>
                      {row.description && (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {row.description}
                        </div>
                      )}
                    </div>
                  ),
                  sortable: true
                },
                {
                  id: 'file_name',
                  header: 'File Pattern',
                  accessor: (row: PerformanceTable) => (
                    <code style={{
                      fontSize: '12px',
                      backgroundColor: 'var(--color-surface-secondary)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'monospace'
                    }}>
                      {row.file_name}
                    </code>
                  )
                },
                {
                  id: 'headers',
                  header: 'Expected Headers',
                  accessor: (row: PerformanceTable) => (
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {row.headers && row.headers.length > 0 ? (
                        <span title={row.headers.join(', ')}>
                          {row.headers.slice(0, 4).join(', ')}
                          {row.headers.length > 4 && (
                            <span style={{ color: 'var(--color-text-muted)' }}>
                              {' '}+{row.headers.length - 4} more
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </div>
                  )
                }
              ]}
              data={performanceTables}
              keyField="id"
              emptyMessage="No performance tables configured. Add tables to define expected CSV files and their headers."
              actions={(row) => (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => openEditTableModal(row)}
                    style={{
                      padding: '4px 8px',
                      background: 'none',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleDeletePerformanceTable(row.id, e)}
                    disabled={isSaving}
                    style={{
                      padding: '4px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-error)'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            />
          </TabPanel>

          {/* Analysis Tab */}
          <TabPanel id="analysis" activeTab={activeTab}>
            <InheritanceNotice fieldName="these analysis fields" />

            <div className="form-field">
              <label>Analysis Instructions</label>
              <Textarea
                value={editAnalysisInstructions}
                onChange={(e) => setEditAnalysisInstructions(e.target.value)}
                placeholder="Enter analysis instructions (one per line)..."
                rows={5}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Specific instructions for AI when analyzing this subproduct's campaigns. Enter each instruction on a new line.
              </small>
            </div>

            <div className="form-field">
              <label>Chain of Thought Guidance</label>
              <Textarea
                value={editChainOfThoughtGuidance}
                onChange={(e) => setEditChainOfThoughtGuidance(e.target.value)}
                placeholder="Enter chain of thought guidance (one per line)..."
                rows={5}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Guide AI reasoning process during analysis. Enter each guidance item on a new line.
              </small>
            </div>

            <div className="form-field">
              <label>Example Good Analysis</label>
              <Textarea
                value={editExampleGoodAnalysis}
                onChange={(e) => setEditExampleGoodAnalysis(e.target.value)}
                placeholder="Enter examples of good analysis (one per line)..."
                rows={6}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Examples of high-quality analysis output to guide AI. Enter each example on a new line.
              </small>
            </div>

            <div className="form-field">
              <label>Example Bad Analysis</label>
              <Textarea
                value={editExampleBadAnalysis}
                onChange={(e) => setEditExampleBadAnalysis(e.target.value)}
                placeholder="Enter examples of bad analysis to avoid (one per line)..."
                rows={6}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Examples of poor analysis to help AI avoid common mistakes. Enter each example on a new line.
              </small>
            </div>
          </TabPanel>

          {/* Optimization Tab */}
          <TabPanel id="optimization" activeTab={activeTab}>
            <InheritanceNotice fieldName="these optimization fields" />

            <TextArrayInput
              label="Critical Metrics"
              value={editCriticalMetrics}
              onChange={setEditCriticalMetrics}
              placeholder="Add critical metric..."
              hint="Key metrics that must always be analyzed (e.g., ROAS, CPA, CTR)"
              multiline={false}
            />

            <TextArrayInput
              label="Optimization Priorities"
              value={editOptimizationPriorities}
              onChange={setEditOptimizationPriorities}
              placeholder="Add optimization priority..."
              hint="Ordered list of optimization priorities for AI recommendations"
              multiline={false}
            />
          </TabPanel>

          {/* Constraints Tab */}
          <TabPanel id="constraints" activeTab={activeTab}>
            <InheritanceNotice fieldName="these constraints" />

            <div className="form-field">
              <label>Important Constraints & Restrictions</label>
              <Textarea
                value={editConstraints}
                onChange={(e) => setEditConstraints(e.target.value)}
                placeholder="e.g., Budget constraints, platform limitations, compliance requirements, audience restrictions..."
                rows={8}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Limitations, restrictions, or important constraints the AI should be aware of when analyzing this subproduct.
              </small>
            </div>
          </TabPanel>
        </div>
      </div>

      {/* Add/Edit Tactic Type Modal */}
      <Modal
        isOpen={showAddTacticModal}
        onClose={() => {
          setShowAddTacticModal(false)
          resetTacticForm()
        }}
        title={editingTactic ? 'Edit Tactic Type' : 'Add Tactic Type'}
        subtitle={`${editingTactic ? 'Editing' : 'Adding to'} ${subProduct.name}`}
        footer={
          <>
            <button
              onClick={() => {
                setShowAddTacticModal(false)
                resetTacticForm()
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleSaveTacticType} disabled={isSaving || !newTacticName.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              {editingTactic ? 'Update Tactic Type' : 'Create Tactic Type'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveTacticType}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <FormField label="Tactic Name" required>
              <Input
                value={newTacticName}
                onChange={(e) => setNewTacticName(e.target.value)}
                placeholder="e.g., Advanced Audience Targeting"
              />
            </FormField>

            <FormField label="Alias Code" hint="Short identifier (e.g., AAT)">
              <Input
                value={newTacticAliasCode}
                onChange={(e) => setNewTacticAliasCode(e.target.value.toUpperCase())}
                placeholder="e.g., AAT"
                style={{ textTransform: 'uppercase' }}
              />
            </FormField>
          </div>

          <FormField label="Overview" hint="Brief description of what this tactic type represents">
            <Textarea
              value={newTacticOverview}
              onChange={(e) => setNewTacticOverview(e.target.value)}
              placeholder="e.g., Used with Targeted Display for audience targeting based on behavioral and demographic data"
              rows={2}
            />
          </FormField>

          <FormField label="Analysis Instructions" hint="How AI should analyze campaigns using this tactic">
            <Textarea
              value={newTacticAnalysisInstructions}
              onChange={(e) => setNewTacticAnalysisInstructions(e.target.value)}
              placeholder="e.g., Reference the audience targeting details from lumina data, consider if it aligns with campaign objective, industry and messaging"
              rows={3}
            />
          </FormField>

          <ChipInput
            label="Lumina Data"
            value={newTacticLuminaData}
            onChange={setNewTacticLuminaData}
            suggestions={availableLuminaExtractors}
            placeholder="Search lumina extractors..."
            hint="Select which Lumina data fields are needed for analysis. Options inherited from product."
            allowCustom={false}
            itemLabel="extractor"
          />
        </form>
      </Modal>

      {/* Add/Edit Performance Table Modal */}
      <Modal
        isOpen={showAddTableModal}
        onClose={() => {
          setShowAddTableModal(false)
          resetTableForm()
        }}
        title={editingTable ? 'Edit Performance Table' : 'Add Performance Table'}
        subtitle={`${editingTable ? 'Editing' : 'Adding to'} ${subProduct.name}`}
        footer={
          <>
            <button
              onClick={() => {
                setShowAddTableModal(false)
                resetTableForm()
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePerformanceTable}
              disabled={isSaving || !tableFormData.table_name.trim()}
              className="btn-primary"
            >
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              {editingTable ? 'Update Table' : 'Create Table'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSavePerformanceTable}>
          <FormField label="Table Name" required hint="Display name for this performance table">
            <Input
              value={tableFormData.table_name}
              onChange={(e) => setTableFormData(prev => ({ ...prev, table_name: e.target.value }))}
              placeholder="e.g., Monthly Performance"
            />
          </FormField>

          <FormField label="File Name Pattern" required hint="Expected file name for CSV matching">
            <Input
              value={tableFormData.file_name}
              onChange={(e) => setTableFormData(prev => ({ ...prev, file_name: e.target.value }))}
              placeholder="e.g., report-emailmarketing-monthly-performance"
            />
          </FormField>

          <FormField label="Expected Headers" hint="Comma-separated list of expected CSV column headers">
            <Textarea
              value={tableFormData.headers}
              onChange={(e) => setTableFormData(prev => ({ ...prev, headers: e.target.value }))}
              placeholder="Date, Sent, Delivered, Opens, Clicks, Conversions, Revenue"
              rows={3}
            />
          </FormField>

          <FormField label="Description" hint="Optional description for this table">
            <Input
              value={tableFormData.description}
              onChange={(e) => setTableFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Monthly aggregate performance metrics"
            />
          </FormField>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: 'var(--color-surface-secondary)',
            borderRadius: 'var(--radius-md)'
          }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <input
                type="checkbox"
                checked={tableFormData.is_required}
                onChange={(e) => setTableFormData(prev => ({ ...prev, is_required: e.target.checked }))}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: 'var(--color-primary)'
                }}
              />
              <span>Required Table</span>
            </label>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Mark as required for analysis validation
            </span>
          </div>
        </form>
      </Modal>

      {/* Add Medium Modal */}
      <Modal
        isOpen={showAddMediumModal}
        onClose={() => {
          setShowAddMediumModal(false)
          setPendingMediumName(null)
        }}
        title="Add New Medium"
        subtitle="Create a new medium with a description for AI prompts"
        footer={
          <>
            <button
              onClick={() => {
                setShowAddMediumModal(false)
                setPendingMediumName(null)
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleAddNewMedium} disabled={isSaving || !newMediumName.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Create Medium
            </button>
          </>
        }
      >
        <form onSubmit={handleAddNewMedium}>
          <FormField label="Medium Name" required>
            <Input
              value={newMediumName}
              onChange={(e) => setNewMediumName(e.target.value)}
              placeholder="e.g., Connected TV"
            />
          </FormField>
          <FormField
            label="Description (for AI)"
            hint="This description will be used in AI prompts to explain how to analyze this medium type."
          >
            <Textarea
              value={newMediumDescription}
              onChange={(e) => setNewMediumDescription(e.target.value)}
              placeholder="e.g., Streaming TV advertisements on connected devices. Focus on completion rate, reach, frequency, and household targeting."
              rows={4}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
