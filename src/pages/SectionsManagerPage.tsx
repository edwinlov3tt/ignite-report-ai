import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Save, Trash2, X, RefreshCw,
  FileText, Loader2, ChevronLeft
} from 'lucide-react'
import * as sectionsApi from '@/lib/sectionsApi'
import type { ReportSection, SectionFormData } from '@/lib/sectionsApi'

export function SectionsManagerPage() {
  // Data State
  const [sections, setSections] = useState<ReportSection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // UI State
  const [showEditor, setShowEditor] = useState(false)
  const [selectedSection, setSelectedSection] = useState<ReportSection | null>(null)

  // Form State
  const [formData, setFormData] = useState<SectionFormData>({
    name: '',
    section_key: '',
    description: '',
    instructions: '',
    display_order: 1,
    is_default: true,
    scope: 'global',
  })

  // Load sections from API
  const loadSections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await sectionsApi.getSections()
      setSections(data)
    } catch (err) {
      console.error('Failed to load sections:', err)
      // Fall back to default sections
      setSections(sectionsApi.getDefaultSections())
      setError('Using default sections - API connection issue')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSections()
  }, [loadSections])

  // Calculate stats
  const totalSections = sections.length
  const activeSections = sections.filter(s => s.is_default).length
  const customSections = sections.filter(s => !s.is_default).length

  // Open editor for new section
  const handleAddSection = () => {
    setSelectedSection(null)
    setFormData({
      name: '',
      section_key: '',
      description: '',
      instructions: '',
      display_order: sections.length + 1,
      is_default: true,
      scope: 'global',
    })
    setShowEditor(true)
  }

  // Open editor for existing section
  const handleEditSection = (section: ReportSection) => {
    setSelectedSection(section)
    setFormData({
      name: section.name,
      section_key: section.section_key,
      description: section.description || '',
      instructions: section.instructions || '',
      display_order: section.display_order,
      is_default: section.is_default,
      scope: section.scope || 'global',
      product_name: section.product_name,
      subproduct_name: section.subproduct_name,
    })
    setShowEditor(true)
  }

  // Close editor
  const handleCloseEditor = () => {
    setShowEditor(false)
    setSelectedSection(null)
  }

  // Handle form field changes
  const handleFormChange = (field: keyof SectionFormData, value: string | number | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }

      // Auto-generate section key from name if not editing
      if (field === 'name' && !selectedSection) {
        updated.section_key = sectionsApi.generateSectionKey(value as string)
      }

      return updated
    })
  }

  // Save section
  const handleSaveSection = async () => {
    if (!formData.name.trim()) {
      setError('Section name is required')
      return
    }
    if (!formData.section_key.trim()) {
      setError('Section key is required')
      return
    }
    if (!formData.instructions.trim()) {
      setError('AI instructions are required')
      return
    }

    // Check for duplicate section key
    const existingSection = sections.find(s =>
      s.section_key === formData.section_key &&
      (!selectedSection || s.id !== selectedSection.id)
    )
    if (existingSection) {
      setError('Section key must be unique')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      if (selectedSection) {
        await sectionsApi.updateSection(selectedSection.id, formData)
      } else {
        await sectionsApi.createSection(formData)
      }
      await loadSections()
      handleCloseEditor()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save section')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete section
  const handleDeleteSection = async () => {
    if (!selectedSection) return
    if (!confirm(`Are you sure you want to delete "${selectedSection.name}"?`)) return

    setIsSaving(true)
    try {
      await sectionsApi.deleteSection(selectedSection.id)
      await loadSections()
      handleCloseEditor()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete section')
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
              Report Sections
            </h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              Configure custom sections for AI-generated reports
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={loadSections}
              disabled={isLoading}
              className="btn-secondary"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button onClick={handleAddSection} className="btn-primary">
              <Plus size={18} />
              Add Section
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          backgroundColor: error.includes('default') ? 'var(--color-warning)' : 'var(--color-error)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && sections.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          color: 'var(--color-text-secondary)'
        }}>
          <Loader2 size={48} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--color-primary)' }} />
          <p>Loading sections...</p>
        </div>
      )}

      {/* Main Content */}
      {(!isLoading || sections.length > 0) && !showEditor && (
        <div>
          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {[
              { value: totalSections, label: 'Total Sections' },
              { value: activeSections, label: 'Default Sections' },
              { value: customSections, label: 'Custom Sections' }
            ].map(stat => (
              <div key={stat.label} style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)' }}>{stat.value}</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Sections Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '16px'
          }}>
            {sections.length === 0 && !isLoading && (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)'
              }}>
                <FileText size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>No sections yet</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                  Create your first custom report section to get started.
                </p>
                <button onClick={handleAddSection} className="btn-primary">
                  <Plus size={18} />
                  Create Section
                </button>
              </div>
            )}

            {sections.map(section => (
              <div
                key={section.id}
                onClick={() => handleEditSection(section)}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>{section.name}</h3>
                  <code style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-surface-secondary)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    {section.section_key}
                  </code>
                </div>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5
                }}>
                  {section.description || 'No description provided.'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: section.is_default ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                    color: section.is_default ? '#3b82f6' : '#8b5cf6'
                  }}>
                    {section.is_default ? 'Default' : 'Custom'}
                  </span>
                  <span style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    color: 'var(--color-text-secondary)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 500
                  }}>
                    Order: {section.display_order}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Editor */}
      {showEditor && (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden'
        }}>
          {/* Editor Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                {selectedSection ? 'Edit Section' : 'Create New Section'}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleCloseEditor} className="btn-secondary">
                <ChevronLeft size={18} />
                Back to Sections
              </button>
              {selectedSection && (
                <button
                  onClick={handleDeleteSection}
                  disabled={isSaving}
                  className="btn-secondary"
                  style={{ color: 'var(--color-error)' }}
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Editor Content */}
          <div style={{ padding: '32px' }}>
            {/* Basic Information */}
            <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Basic Information</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '16px' }}>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label>Section Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="e.g., Executive Summary"
                    className="input-field"
                  />
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label>Section Key *</label>
                  <input
                    type="text"
                    value={formData.section_key}
                    onChange={(e) => handleFormChange('section_key', e.target.value)}
                    placeholder="e.g., executive_summary"
                    className="input-field"
                  />
                  <small style={{ color: 'var(--color-text-muted)' }}>
                    Lowercase letters, numbers, and underscores only
                  </small>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '16px' }}>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label>Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => handleFormChange('display_order', parseInt(e.target.value) || 1)}
                    min={1}
                    max={999}
                    className="input-field"
                  />
                </div>
                <div className="form-field" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', paddingTop: '28px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => handleFormChange('is_default', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                    />
                    <span>Default section (included in all reports)</span>
                  </label>
                </div>
              </div>

              <div className="form-field" style={{ marginBottom: 0 }}>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Brief description of this section"
                  className="textarea-field"
                  rows={2}
                />
              </div>
            </div>

            {/* AI Configuration */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>AI Configuration</h3>

              <div className="form-field" style={{ marginBottom: 0 }}>
                <label>Instructions for AI *</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => handleFormChange('instructions', e.target.value)}
                  placeholder="Provide detailed instructions for how the AI should generate content for this section..."
                  className="textarea-field"
                  rows={6}
                  style={{ fontFamily: 'monospace' }}
                />
                <small style={{ color: 'var(--color-text-muted)' }}>
                  These instructions will be sent to the AI when generating this section of the report.
                </small>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '24px',
              borderTop: '1px solid var(--color-border)'
            }}>
              <button onClick={handleCloseEditor} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveSection} disabled={isSaving} className="btn-primary">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {selectedSection ? 'Update Section' : 'Create Section'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
