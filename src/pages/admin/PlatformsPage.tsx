import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Plus, Search, AlertTriangle, Loader2, X, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/admin/DataTable'
import { Badge } from '@/components/admin/Badge'
import { Modal } from '@/components/admin/Modal'
import { FormField, Input, Select } from '@/components/admin/FormField'
import { ClickableChipList } from '@/components/admin/ClickableChipList'
import * as platformsApi from '@/lib/platformsApi'
import * as schemaApi from '@/lib/schemaApi'
import type { Platform, PlatformCategory } from '@/types/admin'
import type { Product } from '@/lib/schemaApi'

export function PlatformsPage() {
  const navigate = useNavigate()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newPlatform, setNewPlatform] = useState({
    name: '',
    code: '',
    category: 'social' as PlatformCategory,
    is_active: true
  })

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [platformToDelete, setPlatformToDelete] = useState<Platform | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ removedFromProducts: number; removedFromSubproducts: number } | null>(null)

  // Load platforms
  useEffect(() => {
    loadPlatforms()
  }, [])

  const loadPlatforms = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [platformsData, productsData] = await Promise.all([
        platformsApi.getPlatforms(),
        schemaApi.getProducts()
      ])
      setPlatforms(platformsData)
      setProducts(productsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platforms')
    } finally {
      setIsLoading(false)
    }
  }

  // Get products that use a specific platform
  const getProductsForPlatform = (platformName: string) => {
    return products
      .filter(p => p.platforms?.includes(platformName))
      .map(p => ({
        id: p.id,
        name: p.name,
        path: `/schema-admin/products/${p.id}`
      }))
  }

  // Filter platforms
  const filteredPlatforms = platforms.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle add platform
  const handleAddPlatform = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlatform.name.trim()) return

    setIsSaving(true)
    try {
      await platformsApi.createPlatform({
        ...newPlatform,
        code: newPlatform.code || newPlatform.name.toLowerCase().replace(/\s+/g, '_')
      })
      setShowAddModal(false)
      setNewPlatform({ name: '', code: '', category: 'social', is_active: true })
      await loadPlatforms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create platform')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete platform
  const openDeleteModal = (platform: Platform, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click navigation
    setPlatformToDelete(platform)
    setDeleteResult(null)
    setShowDeleteModal(true)
  }

  const handleDeletePlatform = async () => {
    if (!platformToDelete) return

    setIsDeleting(true)
    try {
      const result = await platformsApi.deletePlatform(platformToDelete.id)
      setDeleteResult(result)
      // Wait a moment to show the result, then close and refresh
      setTimeout(async () => {
        setShowDeleteModal(false)
        setPlatformToDelete(null)
        setDeleteResult(null)
        await loadPlatforms()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete platform')
      setShowDeleteModal(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const categoryOptions = [
    { value: 'social', label: 'Social Media' },
    { value: 'search', label: 'Search' },
    { value: 'display', label: 'Display' },
    { value: 'video', label: 'Video' },
    { value: 'programmatic', label: 'Programmatic' },
    { value: 'other', label: 'Other' }
  ]

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)' }}>
              Platform Knowledge
            </h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              Manage platform quirks, KPIs, thresholds, and buyer notes
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={18} />
            Add Platform
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)'
          }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search platforms..."
            className="input-field"
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {/* Error */}
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

      {/* Loading */}
      {isLoading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          color: 'var(--color-text-secondary)'
        }}>
          <Loader2 size={48} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--color-primary)' }} />
          <p>Loading platforms...</p>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              id: 'name',
              header: 'Name',
              accessor: (row: Platform) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Smartphone size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{row.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{row.code}</div>
                  </div>
                </div>
              ),
              sortable: true,
              width: '400px'
            },
            {
              id: 'products',
              header: 'Products',
              accessor: (row: Platform) => (
                <ClickableChipList
                  items={getProductsForPlatform(row.name)}
                  maxVisible={3}
                  emptyText="No products"
                />
              )
            },
            {
              id: 'status',
              header: 'Status',
              accessor: (row: Platform) => (
                <Badge variant={row.is_active ? 'success' : 'default'} size="sm">
                  {row.is_active ? 'Active' : 'Inactive'}
                </Badge>
              ),
              width: '100px'
            }
          ]}
          data={filteredPlatforms}
          keyField="id"
          onRowClick={(platform) => navigate(`/schema-admin/platforms/${platform.id}`)}
          emptyMessage="No platforms found. Click 'Add Platform' to create one."
          actions={(row) => (
            <button
              onClick={(e) => openDeleteModal(row, e)}
              disabled={isDeleting}
              style={{
                padding: '6px 10px',
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: 'var(--color-error)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                e.currentTarget.style.borderColor = 'var(--color-error)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = 'var(--color-border)'
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        />
      )}

      {/* Add Platform Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Platform"
        subtitle="Create a new platform to track quirks and KPIs"
        footer={
          <>
            <button onClick={() => setShowAddModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleAddPlatform} disabled={isSaving || !newPlatform.name.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Create Platform
            </button>
          </>
        }
      >
        <form onSubmit={handleAddPlatform}>
          <FormField label="Platform Name" required>
            <Input
              value={newPlatform.name}
              onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })}
              placeholder="e.g., Facebook, Google Ads"
            />
          </FormField>

          <FormField label="Code" hint="Used for identification (auto-generated if empty)">
            <Input
              value={newPlatform.code}
              onChange={(e) => setNewPlatform({ ...newPlatform, code: e.target.value })}
              placeholder="e.g., facebook, google_ads"
            />
          </FormField>

          <FormField label="Category" required>
            <Select
              value={newPlatform.category}
              onChange={(e) => setNewPlatform({ ...newPlatform, category: e.target.value as PlatformCategory })}
              options={categoryOptions}
            />
          </FormField>
        </form>
      </Modal>

      {/* Delete Platform Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isDeleting && !deleteResult) {
            setShowDeleteModal(false)
            setPlatformToDelete(null)
          }
        }}
        title="Delete Platform"
        subtitle={platformToDelete ? `Are you sure you want to delete "${platformToDelete.name}"?` : ''}
        footer={
          deleteResult ? null : (
            <>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setPlatformToDelete(null)
                }}
                className="btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlatform}
                disabled={isDeleting}
                className="btn-primary"
                style={{ backgroundColor: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              >
                {isDeleting && <Loader2 size={18} className="animate-spin" />}
                Delete Platform
              </button>
            </>
          )
        }
      >
        {deleteResult ? (
          <div style={{
            textAlign: 'center',
            padding: '20px 0'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-success)' }}>Platform Deleted</h3>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              Removed from {deleteResult.removedFromProducts} product{deleteResult.removedFromProducts !== 1 ? 's' : ''} and {deleteResult.removedFromSubproducts} subproduct{deleteResult.removedFromSubproducts !== 1 ? 's' : ''}
            </p>
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            This will also remove the platform from any products or subproducts using it.
          </p>
        )}
      </Modal>
    </div>
  )
}
