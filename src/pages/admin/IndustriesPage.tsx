import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, Plus, Search, AlertTriangle, Loader2, X } from 'lucide-react'
import { DataTable } from '@/components/admin/DataTable'
import { Badge } from '@/components/admin/Badge'
import { Modal } from '@/components/admin/Modal'
import { FormField, Input, Textarea } from '@/components/admin/FormField'
import * as industriesApi from '@/lib/industriesApi'
import type { Industry } from '@/types/admin'

export function IndustriesPage() {
  const navigate = useNavigate()
  const [industries, setIndustries] = useState<Industry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newIndustry, setNewIndustry] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true
  })

  // Load industries
  useEffect(() => {
    loadIndustries()
  }, [])

  const loadIndustries = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await industriesApi.getIndustries()
      setIndustries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load industries')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter industries
  const filteredIndustries = industries.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle add industry
  const handleAddIndustry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIndustry.name.trim()) return

    setIsSaving(true)
    try {
      await industriesApi.createIndustry({
        ...newIndustry,
        code: newIndustry.code || newIndustry.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      })
      setShowAddModal(false)
      setNewIndustry({ name: '', code: '', description: '', is_active: true })
      await loadIndustries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create industry')
    } finally {
      setIsSaving(false)
    }
  }

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
              Industry Knowledge
            </h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              Manage industry benchmarks, insights, and seasonality patterns
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={18} />
            Add Industry
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
            placeholder="Search industries..."
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
          <p>Loading industries...</p>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              id: 'name',
              header: 'Name',
              accessor: (row: Industry) => (
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
                    <Factory size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{row.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{row.code}</div>
                  </div>
                </div>
              ),
              sortable: true
            },
            {
              id: 'description',
              header: 'Description',
              accessor: (row: Industry) => (
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {row.description || '—'}
                </span>
              )
            },
            {
              id: 'benchmarks',
              header: 'Benchmarks',
              accessor: (row: Industry) => row.benchmarks?.length || 0,
              align: 'center' as const,
              width: '100px'
            },
            {
              id: 'insights',
              header: 'Insights',
              accessor: (row: Industry) => row.insights?.length || 0,
              align: 'center' as const,
              width: '100px'
            },
            {
              id: 'seasonality',
              header: 'Seasonal',
              accessor: (row: Industry) => row.seasonality?.length || 0,
              align: 'center' as const,
              width: '100px'
            },
            {
              id: 'status',
              header: 'Status',
              accessor: (row: Industry) => (
                <Badge variant={row.is_active ? 'success' : 'default'} size="sm">
                  {row.is_active ? 'Active' : 'Inactive'}
                </Badge>
              ),
              width: '100px'
            }
          ]}
          data={filteredIndustries}
          keyField="id"
          onRowClick={(industry) => navigate(`/schema-admin/industries/${industry.id}`)}
          emptyMessage="No industries found. Click 'Add Industry' to create one."
        />
      )}

      {/* Add Industry Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Industry"
        subtitle="Create a new industry to track benchmarks and insights"
        footer={
          <>
            <button onClick={() => setShowAddModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleAddIndustry} disabled={isSaving || !newIndustry.name.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Create Industry
            </button>
          </>
        }
      >
        <form onSubmit={handleAddIndustry}>
          <FormField label="Industry Name" required>
            <Input
              value={newIndustry.name}
              onChange={(e) => setNewIndustry({ ...newIndustry, name: e.target.value })}
              placeholder="e.g., Automotive, Healthcare"
            />
          </FormField>

          <FormField label="Code" hint="Used for identification (auto-generated if empty)">
            <Input
              value={newIndustry.code}
              onChange={(e) => setNewIndustry({ ...newIndustry, code: e.target.value })}
              placeholder="e.g., automotive, healthcare"
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={newIndustry.description}
              onChange={(e) => setNewIndustry({ ...newIndustry, description: e.target.value })}
              placeholder="Brief description of this industry vertical..."
              rows={3}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
