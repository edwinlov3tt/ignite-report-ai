import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Plus, Search, AlertTriangle, Loader2, X } from 'lucide-react'
import { DataTable } from '@/components/admin/DataTable'
import { Modal } from '@/components/admin/Modal'
import { FormField, Input, Textarea } from '@/components/admin/FormField'
import { ClickableChipList } from '@/components/admin/ClickableChipList'
import * as schemaApi from '@/lib/schemaApi'
import * as platformsApi from '@/lib/platformsApi'
import type { Product } from '@/lib/schemaApi'
import type { Platform } from '@/types/admin'

export function ProductsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    platforms: '',
    notes: ''
  })

  // Load products and platforms
  const loadProducts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [productsData, platformsData] = await Promise.all([
        schemaApi.getProducts(),
        platformsApi.getPlatforms()
      ])
      setProducts(productsData)
      setPlatforms(platformsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }

  // Get platforms for a product with navigation paths
  const getPlatformsForProduct = (platformNames: string[] | undefined) => {
    if (!platformNames || platformNames.length === 0) return []

    return platformNames.map(name => {
      const platform = platforms.find(p => p.name === name)
      return {
        id: platform?.id || name,
        name: name,
        path: platform ? `/schema-admin/platforms/${platform.id}` : '#'
      }
    })
  }

  useEffect(() => {
    loadProducts()
  }, [])

  // Filter products
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.platforms?.some(plat => plat.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Handle add product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProduct.name.trim()) return

    setIsSaving(true)
    try {
      const result = await schemaApi.createProduct({
        name: newProduct.name,
        slug: schemaApi.generateSlug(newProduct.name),
        platforms: newProduct.platforms ? newProduct.platforms.split(',').map(p => p.trim()) : [],
        notes: newProduct.notes || undefined
      })
      setShowAddModal(false)
      setNewProduct({ name: '', platforms: '', notes: '' })
      await loadProducts()
      // Navigate to the new product's detail page
      navigate(`/schema-admin/products/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setIsSaving(false)
    }
  }

  // Table columns
  const columns = [
    {
      id: 'name',
      header: 'Name',
      accessor: (row: Product) => (
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
            <Package size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{row.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{row.slug}</div>
          </div>
        </div>
      ),
      sortable: true,
      width: '400px'
    },
    {
      id: 'platforms',
      header: 'Platforms',
      accessor: (row: Product) => (
        <ClickableChipList
          items={getPlatformsForProduct(row.platforms)}
          maxVisible={3}
          emptyText="No platforms"
        />
      )
    },
    {
      id: 'subproducts',
      header: 'SubProducts',
      accessor: (row: Product) => row.subproducts?.length || 0,
      align: 'center' as const,
      width: '120px'
    },
    {
      id: 'tactics',
      header: 'Tactic Types',
      accessor: (row: Product) => {
        const count = row.subproducts?.reduce((acc, sub) => acc + (sub.tactic_types?.length || 0), 0) || 0
        return count
      },
      align: 'center' as const,
      width: '120px'
    }
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
              Products
            </h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              Manage product hierarchies, subproducts, and tactic configurations
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={18} />
            Add Product
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
            placeholder="Search products..."
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
          <p>Loading products...</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredProducts}
          keyField="id"
          onRowClick={(product) => navigate(`/schema-admin/products/${product.id}`)}
          emptyMessage="No products found. Click 'Add Product' to create one."
        />
      )}

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Product"
        subtitle="Create a new product to organize tactic configurations"
        footer={
          <>
            <button onClick={() => setShowAddModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleAddProduct} disabled={isSaving || !newProduct.name.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Create Product
            </button>
          </>
        }
      >
        <form onSubmit={handleAddProduct}>
          <FormField label="Product Name" required hint={`Slug: ${newProduct.name ? schemaApi.generateSlug(newProduct.name) : '—'}`}>
            <Input
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="e.g., Google Ads"
            />
          </FormField>

          <FormField label="Platforms" hint="Comma-separated list">
            <Input
              value={newProduct.platforms}
              onChange={(e) => setNewProduct({ ...newProduct, platforms: e.target.value })}
              placeholder="e.g., Google Ads, YouTube"
            />
          </FormField>

          <FormField label="Notes">
            <Textarea
              value={newProduct.notes}
              onChange={(e) => setNewProduct({ ...newProduct, notes: e.target.value })}
              placeholder="Additional context about this product..."
              rows={3}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
