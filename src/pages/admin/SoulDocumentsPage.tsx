import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Search, AlertTriangle, Loader2, X } from 'lucide-react'
import { DataTable } from '@/components/admin/DataTable'
import { Badge } from '@/components/admin/Badge'
import { Modal } from '@/components/admin/Modal'
import { FormField, Input, Textarea, Select } from '@/components/admin/FormField'
import * as soulDocsApi from '@/lib/soulDocumentsApi'
import type { SoulDocument, SoulDocumentType } from '@/types/admin'

export function SoulDocumentsPage() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<SoulDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('')

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newDoc, setNewDoc] = useState({
    name: '',
    slug: '',
    doc_type: 'system_prompt' as SoulDocumentType,
    description: '',
    is_active: true
  })

  // Load documents
  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await soulDocsApi.getSoulDocuments()
      setDocuments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter documents
  const filteredDocuments = documents.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !filterType || d.doc_type === filterType
    return matchesSearch && matchesType
  })

  // Handle add document
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDoc.name.trim()) return

    setIsSaving(true)
    try {
      const result = await soulDocsApi.createSoulDocument({
        ...newDoc,
        slug: newDoc.slug || newDoc.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      })
      setShowAddModal(false)
      setNewDoc({ name: '', slug: '', doc_type: 'system_prompt', description: '', is_active: true })
      // Navigate to editor for new document
      navigate(`/schema-admin/soul-documents/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document')
    } finally {
      setIsSaving(false)
    }
  }

  const docTypeOptions = [
    { value: 'system_prompt', label: 'System Prompt' },
    { value: 'agent_persona', label: 'Agent Persona' },
    { value: 'skill', label: 'Skill' },
    { value: 'template', label: 'Template' }
  ]

  const getDocTypeColor = (type: SoulDocumentType): 'primary' | 'success' | 'warning' | 'info' => {
    switch (type) {
      case 'system_prompt': return 'primary'
      case 'agent_persona': return 'success'
      case 'skill': return 'warning'
      case 'template': return 'info'
      default: return 'primary'
    }
  }

  const getPublishedVersion = (doc: SoulDocument) => {
    return doc.versions?.find(v => v.is_published)
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
              Soul Documents
            </h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              Version-controlled prompts, personas, and templates with diff viewer and test playground
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={18} />
            New Document
          </button>
        </div>

        {/* Search and Filter */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
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
              placeholder="Search documents..."
              className="input-field"
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={[{ value: '', label: 'All Types' }, ...docTypeOptions]}
            fullWidth={false}
            style={{ width: '180px' }}
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
          <p>Loading documents...</p>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              id: 'name',
              header: 'Name',
              accessor: (row: SoulDocument) => (
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
                    <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{row.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{row.slug}</div>
                  </div>
                </div>
              ),
              sortable: true
            },
            {
              id: 'type',
              header: 'Type',
              accessor: (row: SoulDocument) => (
                <Badge variant={getDocTypeColor(row.doc_type)} size="sm">
                  {row.doc_type.replace('_', ' ')}
                </Badge>
              ),
              width: '140px'
            },
            {
              id: 'status',
              header: 'Status',
              accessor: (row: SoulDocument) => {
                const published = getPublishedVersion(row)
                return published ? (
                  <Badge variant="success" size="sm">v{published.version}</Badge>
                ) : (
                  <Badge variant="warning" size="sm">Draft</Badge>
                )
              },
              width: '100px'
            },
            {
              id: 'versions',
              header: 'Versions',
              accessor: (row: SoulDocument) => row.versions?.length || 0,
              align: 'center' as const,
              width: '100px'
            },
            {
              id: 'active',
              header: 'Active',
              accessor: (row: SoulDocument) => (
                <Badge variant={row.is_active ? 'success' : 'default'} size="sm">
                  {row.is_active ? 'Yes' : 'No'}
                </Badge>
              ),
              width: '80px'
            }
          ]}
          data={filteredDocuments}
          keyField="id"
          onRowClick={(doc) => navigate(`/schema-admin/soul-documents/${doc.id}`)}
          emptyMessage="No documents found. Click 'New Document' to create one."
        />
      )}

      {/* Add Document Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create New Document"
        subtitle="Start with a name and type, then add content in the editor"
        footer={
          <>
            <button onClick={() => setShowAddModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleAddDocument} disabled={isSaving || !newDoc.name.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Create & Edit
            </button>
          </>
        }
      >
        <form onSubmit={handleAddDocument}>
          <FormField label="Document Name" required>
            <Input
              value={newDoc.name}
              onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
              placeholder="e.g., Campaign Analyst, Executive Summary Template"
            />
          </FormField>

          <FormField label="Slug" hint="URL-friendly identifier (auto-generated if empty)">
            <Input
              value={newDoc.slug}
              onChange={(e) => setNewDoc({ ...newDoc, slug: e.target.value })}
              placeholder="e.g., campaign-analyst"
            />
          </FormField>

          <FormField label="Document Type" required>
            <Select
              value={newDoc.doc_type}
              onChange={(e) => setNewDoc({ ...newDoc, doc_type: e.target.value as SoulDocumentType })}
              options={docTypeOptions}
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={newDoc.description}
              onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
              placeholder="Brief description of this document's purpose..."
              rows={2}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
