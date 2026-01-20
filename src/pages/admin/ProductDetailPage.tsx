import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Settings, Table, Cpu, FileText, Trash2, Save, Plus,
  Loader2, AlertTriangle, X, ChevronRight, ArrowLeft,
  Zap, ShieldAlert, Clock
} from 'lucide-react'
import { DataTable } from '@/components/admin/DataTable'
import { Badge } from '@/components/admin/Badge'
import { Modal } from '@/components/admin/Modal'
import { FormField, Input, Textarea } from '@/components/admin/FormField'
import { Tabs, TabPanel } from '@/components/admin/Tabs'
import { ChipInput } from '@/components/admin/ChipInput'
import { TextArrayInput } from '@/components/admin/TextArrayInput'
import { LuminaExtractorPanel } from '@/components/admin/LuminaExtractorPanel'
import * as schemaApi from '@/lib/schemaApi'
import * as platformsApi from '@/lib/platformsApi'
import * as mediumsApi from '@/lib/mediumsApi'
import type { Product, SubProduct } from '@/lib/schemaApi'

type EditorTab = 'overview' | 'subproducts' | 'analysis' | 'optimization' | 'constraints' | 'lumina'

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const productId = id || ''

  // Data State
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // UI State
  const [activeTab, setActiveTab] = useState<EditorTab>('overview')

  // Form State - Overview
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPlatforms, setEditPlatforms] = useState<string[]>([])
  const [editMediums, setEditMediums] = useState<string[]>([])
  const [editNotes, setEditNotes] = useState('')

  // Form State - Analysis (stored as newline-separated text)
  const [editAnalysisInstructions, setEditAnalysisInstructions] = useState('')
  const [editChainOfThought, setEditChainOfThought] = useState('')
  const [editGoodExamples, setEditGoodExamples] = useState('')
  const [editBadExamples, setEditBadExamples] = useState('')

  // Form State - Optimization
  const [editCriticalMetrics, setEditCriticalMetrics] = useState<string[]>([])
  const [editOptimizationPriorities, setEditOptimizationPriorities] = useState<string[]>([])

  // Form State - Constraints
  const [editConstraints, setEditConstraints] = useState('')

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

  // Available platforms for autocomplete
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([])

  // Available mediums for autocomplete
  const [availableMediums, setAvailableMediums] = useState<string[]>([])
  const [mediumDescriptions, setMediumDescriptions] = useState<Record<string, string>>({})

  // Add Medium Modal
  const [showAddMediumModal, setShowAddMediumModal] = useState(false)
  const [newMediumName, setNewMediumName] = useState('')
  const [newMediumDescription, setNewMediumDescription] = useState('')
  const [pendingMediumName, setPendingMediumName] = useState<string | null>(null)

  // Add SubProduct Modal
  const [showAddSubProductModal, setShowAddSubProductModal] = useState(false)
  const [newSubProductName, setNewSubProductName] = useState('')

  // Helper: Convert array to newline-separated string
  const arrayToText = (arr: string[] | undefined): string => {
    return arr?.join('\n') || ''
  }

  // Helper: Convert newline-separated string to array (filter empty lines)
  const textToArray = (text: string): string[] => {
    return text.split('\n').map(s => s.trim()).filter(s => s.length > 0)
  }

  // Check if arrays are equal
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
      editChainOfThought !== originalValues.chainOfThought ||
      editGoodExamples !== originalValues.goodExamples ||
      editBadExamples !== originalValues.badExamples ||
      !arraysEqual(editCriticalMetrics, originalValues.criticalMetrics) ||
      !arraysEqual(editOptimizationPriorities, originalValues.optimizationPriorities) ||
      editConstraints !== originalValues.constraints
    )
  }, [
    originalValues, editName, editDescription, editPlatforms, editMediums,
    editNotes, editAnalysisInstructions, editChainOfThought, editGoodExamples,
    editBadExamples, editCriticalMetrics, editOptimizationPriorities, editConstraints
  ])

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Load product
  const loadProduct = useCallback(async () => {
    if (!productId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await schemaApi.getProduct(productId)
      if (data) {
        setProduct(data)
        // Overview
        setEditName(data.name)
        setEditDescription(data.description || '')
        setEditPlatforms(data.platforms || [])
        // Support both old medium field and new mediums array
        setEditMediums(data.mediums || (data.medium ? [data.medium] : []))
        setEditNotes(data.notes || '')
        // Analysis (convert arrays to text)
        setEditAnalysisInstructions(arrayToText(data.analysis_instructions))
        setEditChainOfThought(arrayToText(data.chain_of_thought_guidance))
        setEditGoodExamples(arrayToText(data.example_good_analysis))
        setEditBadExamples(arrayToText(data.example_bad_analysis))
        // Optimization
        setEditCriticalMetrics(data.critical_metrics || [])
        setEditOptimizationPriorities(data.optimization_priorities || [])
        // Constraints
        setEditConstraints(data.important_constraints_restrictions || '')

        // Store original values for change detection
        setOriginalValues({
          name: data.name,
          description: data.description || '',
          platforms: data.platforms || [],
          mediums: data.mediums || (data.medium ? [data.medium] : []),
          notes: data.notes || '',
          analysisInstructions: arrayToText(data.analysis_instructions),
          chainOfThought: arrayToText(data.chain_of_thought_guidance),
          goodExamples: arrayToText(data.example_good_analysis),
          badExamples: arrayToText(data.example_bad_analysis),
          criticalMetrics: data.critical_metrics || [],
          optimizationPriorities: data.optimization_priorities || [],
          constraints: data.important_constraints_restrictions || ''
        })
      } else {
        setError('Product not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product')
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  // Load available platforms for autocomplete
  const loadPlatforms = useCallback(async () => {
    try {
      const platforms = await platformsApi.getPlatforms()
      const platformNames = platforms.map(p => p.name)
      setAvailablePlatforms(platformNames)
      setEditPlatforms(prev => prev.filter(p => platformNames.includes(p)))
    } catch (err) {
      console.error('Failed to load platforms:', err)
    }
  }, [])

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
    loadPlatforms()
  }, [loadPlatforms])

  useEffect(() => {
    loadMediums()
  }, [loadMediums])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  // Handle adding a new platform
  const handleAddNewPlatform = async (name: string) => {
    try {
      await platformsApi.createPlatformFromName(name)
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

  // Save product
  const handleSaveProduct = async () => {
    if (!product) return

    setIsSaving(true)
    try {
      await schemaApi.updateProduct(product.id, {
        name: editName,
        slug: schemaApi.generateSlug(editName),
        description: editDescription || undefined,
        platforms: editPlatforms,
        mediums: editMediums,
        notes: editNotes || undefined,
        // Analysis (convert text to arrays)
        analysis_instructions: textToArray(editAnalysisInstructions),
        chain_of_thought_guidance: textToArray(editChainOfThought),
        example_good_analysis: textToArray(editGoodExamples),
        example_bad_analysis: textToArray(editBadExamples),
        // Optimization
        critical_metrics: editCriticalMetrics,
        optimization_priorities: editOptimizationPriorities,
        // Constraints
        important_constraints_restrictions: editConstraints || undefined
      })
      await loadProduct()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete product
  const handleDeleteProduct = async () => {
    if (!product) return
    if (!confirm('Are you sure you want to delete this product and all its subproducts?')) return

    setIsSaving(true)
    try {
      await schemaApi.deleteProduct(product.id)
      navigate('/schema-admin/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setIsSaving(false)
    }
  }

  // Add subproduct
  const handleAddSubProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubProductName.trim() || !product) return

    setIsSaving(true)
    try {
      const result = await schemaApi.createSubproduct({
        product_id: product.id,
        name: newSubProductName,
        slug: schemaApi.generateSlug(newSubProductName)
      })
      setShowAddSubProductModal(false)
      setNewSubProductName('')
      await loadProduct()
      navigate(`/schema-admin/products/${product.id}/subproducts/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subproduct')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete subproduct
  const handleDeleteSubProduct = async (subProductId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this subproduct?')) return

    setIsSaving(true)
    try {
      await schemaApi.deleteSubproduct(subProductId)
      await loadProduct()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subproduct')
    } finally {
      setIsSaving(false)
    }
  }

  // SubProducts table columns
  const subProductColumns = [
    {
      id: 'name',
      header: 'Name',
      accessor: (row: SubProduct) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{row.slug}</div>
        </div>
      ),
      sortable: true
    },
    {
      id: 'platforms',
      header: 'Platforms',
      accessor: (row: SubProduct) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {row.platforms && row.platforms.length > 0 ? (
            row.platforms.map(platform => (
              <Badge key={platform} variant="default" size="sm">{platform}</Badge>
            ))
          ) : (
            <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Inherits from product</span>
          )}
        </div>
      )
    },
    {
      id: 'tactics',
      header: 'Tactic Types',
      accessor: (row: SubProduct) => row.tactic_types?.length || 0,
      align: 'center' as const,
      width: '120px'
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
        <p>Loading product...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '40px',
        textAlign: 'center'
      }}>
        <AlertTriangle size={48} style={{ color: 'var(--color-warning)', marginBottom: '16px' }} />
        <h2 style={{ margin: '0 0 8px 0' }}>Product Not Found</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          The product you're looking for doesn't exist or has been deleted.
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
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{product.name}</span>
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
          <button onClick={handleSaveProduct} disabled={isSaving} className="btn-primary" style={{ padding: '8px 16px' }}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      )}

      {/* Product Card */}
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
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{product.name}</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>
              {product.subproducts?.length || 0} SubProducts
            </p>
          </div>
          <button
            onClick={handleDeleteProduct}
            disabled={isSaving}
            className="btn-secondary"
            style={{ color: 'var(--color-error)' }}
          >
            <Trash2 size={18} />
            Delete Product
          </button>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview', icon: <Settings size={16} /> },
            { id: 'subproducts', label: 'SubProducts', icon: <Table size={16} /> },
            { id: 'analysis', label: 'Analysis', icon: <FileText size={16} /> },
            { id: 'optimization', label: 'Optimization', icon: <Zap size={16} /> },
            { id: 'constraints', label: 'Constraints', icon: <ShieldAlert size={16} /> },
            { id: 'lumina', label: 'Lumina Data', icon: <Cpu size={16} /> }
          ]}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as EditorTab)}
        />

        {/* Tab Content */}
        <div style={{ padding: '24px' }}>
          {/* Overview Tab */}
          <TabPanel id="overview" activeTab={activeTab}>
            <div className="form-field">
              <label>Product Name</label>
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
                placeholder="Brief description of this product..."
                rows={3}
              />
            </div>

            <ChipInput
              label="Platforms"
              value={editPlatforms}
              onChange={setEditPlatforms}
              suggestions={availablePlatforms}
              placeholder="Search or add platforms..."
              hint="Press Tab or Enter to add. Type to search existing platforms."
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
              hint="Press Tab or Enter to add. Type to search existing mediums, or add a new one with a description."
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

          {/* SubProducts Tab */}
          <TabPanel id="subproducts" activeTab={activeTab}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>SubProducts ({product.subproducts?.length || 0})</h3>
              <button className="btn-primary" onClick={() => setShowAddSubProductModal(true)}>
                <Plus size={18} />
                Add SubProduct
              </button>
            </div>

            <DataTable
              columns={subProductColumns}
              data={product.subproducts || []}
              keyField="id"
              onRowClick={(sub) => navigate(`/schema-admin/products/${product.id}/subproducts/${sub.id}`)}
              emptyMessage="No subproducts yet. Click 'Add SubProduct' to create one."
              actions={(row) => (
                <button
                  onClick={(e) => handleDeleteSubProduct(row.id, e)}
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
              )}
            />
          </TabPanel>

          {/* Analysis Tab */}
          <TabPanel id="analysis" activeTab={activeTab}>
            <div className="form-field">
              <label>Analysis Instructions</label>
              <Textarea
                value={editAnalysisInstructions}
                onChange={(e) => setEditAnalysisInstructions(e.target.value)}
                placeholder="Enter analysis instructions (one per line)..."
                rows={5}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Step-by-step instructions for how AI should analyze this product type. Enter each instruction on a new line.
              </small>
            </div>

            <div className="form-field">
              <label>Chain of Thought Guidance</label>
              <Textarea
                value={editChainOfThought}
                onChange={(e) => setEditChainOfThought(e.target.value)}
                placeholder="Enter chain of thought guidance (one per line)..."
                rows={5}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Guide the AI's reasoning process for more accurate analysis. Enter each guidance item on a new line.
              </small>
            </div>

            <div className="form-field">
              <label>Example Good Analysis</label>
              <Textarea
                value={editGoodExamples}
                onChange={(e) => setEditGoodExamples(e.target.value)}
                placeholder="Enter examples of good analysis (one per line)..."
                rows={6}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Examples of high-quality analysis output to guide the AI. Enter each example on a new line.
              </small>
            </div>

            <div className="form-field">
              <label>Example Bad Analysis</label>
              <Textarea
                value={editBadExamples}
                onChange={(e) => setEditBadExamples(e.target.value)}
                placeholder="Enter examples of bad analysis to avoid (one per line)..."
                rows={6}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Examples of poor analysis that the AI should avoid. Enter each example on a new line.
              </small>
            </div>
          </TabPanel>

          {/* Optimization Tab */}
          <TabPanel id="optimization" activeTab={activeTab}>
            <TextArrayInput
              label="Critical Metrics"
              value={editCriticalMetrics}
              onChange={setEditCriticalMetrics}
              placeholder="Add critical metric..."
              hint="Key performance metrics that must be analyzed for this product."
              multiline={false}
            />

            <TextArrayInput
              label="Optimization Priorities"
              value={editOptimizationPriorities}
              onChange={setEditOptimizationPriorities}
              placeholder="Add optimization priority..."
              hint="Ordered list of optimization priorities for recommendations."
              multiline={false}
            />
          </TabPanel>

          {/* Constraints Tab */}
          <TabPanel id="constraints" activeTab={activeTab}>
            <div className="form-field">
              <label>Important Constraints & Restrictions</label>
              <Textarea
                value={editConstraints}
                onChange={(e) => setEditConstraints(e.target.value)}
                placeholder="Describe any constraints or restrictions on tactics and recommendations for this product..."
                rows={8}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Define restrictions to prevent recommendations that wouldn't be suitable for certain conditions.
              </small>
            </div>
          </TabPanel>

          {/* Lumina Data Tab */}
          <TabPanel id="lumina" activeTab={activeTab}>
            <LuminaExtractorPanel
              productId={productId}
              productName={product?.name || ''}
            />
          </TabPanel>
        </div>
      </div>

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

      {/* Add SubProduct Modal */}
      <Modal
        isOpen={showAddSubProductModal}
        onClose={() => setShowAddSubProductModal(false)}
        title="Add New SubProduct"
        subtitle={`Creating subproduct under ${product.name}`}
        footer={
          <>
            <button onClick={() => setShowAddSubProductModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleAddSubProduct} disabled={isSaving || !newSubProductName.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Create SubProduct
            </button>
          </>
        }
      >
        <form onSubmit={handleAddSubProduct}>
          <FormField label="SubProduct Name" required hint={`Slug: ${newSubProductName ? schemaApi.generateSlug(newSubProductName) : '—'}`}>
            <Input
              value={newSubProductName}
              onChange={(e) => setNewSubProductName(e.target.value)}
              placeholder="e.g., Search Campaigns"
            />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
