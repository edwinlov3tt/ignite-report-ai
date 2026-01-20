import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Smartphone, AlertTriangle, Target, BarChart3, MessageSquare,
  Plus, Trash2, Loader2, History, Edit2, ThumbsUp, CheckCircle
} from 'lucide-react'
import { Tabs, TabPanel } from '@/components/admin/Tabs'
import { Modal } from '@/components/admin/Modal'
import { FormField, Input, Textarea, Select } from '@/components/admin/FormField'
import { Badge } from '@/components/admin/Badge'
import * as platformsApi from '@/lib/platformsApi'
import type {
  Platform,
  PlatformQuirk,
  QuirkType,
  ImpactLevel,
  Objective,
  Direction,
  NoteType
} from '@/types/admin'
import {
  QUIRK_TYPES,
  IMPACT_LEVELS,
  OBJECTIVES,
  DIRECTIONS,
  NOTE_TYPES
} from '@/types/admin'

export function PlatformDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('quirks')
  const [isSaving, setIsSaving] = useState(false)

  // Quirk modal state
  const [showQuirkModal, setShowQuirkModal] = useState(false)
  const [editingQuirk, setEditingQuirk] = useState<PlatformQuirk | null>(null)
  const [quirkForm, setQuirkForm] = useState({
    quirk_type: 'reporting' as QuirkType,
    title: '',
    description: '',
    impact: 'medium' as ImpactLevel,
    ai_instruction: '',
    source: '',
    contributed_by: ''
  })

  // KPI modal state
  const [showKPIModal, setShowKPIModal] = useState(false)
  const [kpiForm, setKPIForm] = useState({
    objective: 'general' as Objective,
    primary_kpis: '' as string,
    secondary_kpis: '' as string,
    notes: ''
  })

  // Threshold modal state
  const [showThresholdModal, setShowThresholdModal] = useState(false)
  const [thresholdForm, setThresholdForm] = useState({
    metric: '',
    warning_value: '',
    critical_value: '',
    direction: 'above' as Direction,
    context: ''
  })

  // Buyer Note modal state
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteForm, setNoteForm] = useState({
    note_type: 'tip' as NoteType,
    content: '',
    contributed_by: ''
  })

  useEffect(() => {
    if (id) loadPlatform()
  }, [id])

  const loadPlatform = async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await platformsApi.getPlatform(id)
      setPlatform(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platform')
    } finally {
      setIsLoading(false)
    }
  }

  // Quirk handlers
  const handleSaveQuirk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!platform || !quirkForm.title.trim()) return

    setIsSaving(true)
    try {
      if (editingQuirk) {
        await platformsApi.updateQuirk(editingQuirk.id, quirkForm)
      } else {
        await platformsApi.addQuirk(platform.id, quirkForm)
      }
      setShowQuirkModal(false)
      setEditingQuirk(null)
      resetQuirkForm()
      await loadPlatform()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quirk')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteQuirk = async (quirkId: string) => {
    if (!confirm('Are you sure you want to delete this quirk?')) return
    try {
      await platformsApi.deleteQuirk(quirkId)
      await loadPlatform()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quirk')
    }
  }

  const openEditQuirk = (quirk: PlatformQuirk) => {
    setEditingQuirk(quirk)
    setQuirkForm({
      quirk_type: quirk.quirk_type,
      title: quirk.title,
      description: quirk.description,
      impact: quirk.impact,
      ai_instruction: quirk.ai_instruction || '',
      source: quirk.source || '',
      contributed_by: quirk.contributed_by || ''
    })
    setShowQuirkModal(true)
  }

  const resetQuirkForm = () => {
    setQuirkForm({
      quirk_type: 'reporting',
      title: '',
      description: '',
      impact: 'medium',
      ai_instruction: '',
      source: '',
      contributed_by: ''
    })
  }

  // KPI handlers
  const handleSaveKPI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!platform || !kpiForm.primary_kpis.trim()) return

    setIsSaving(true)
    try {
      await platformsApi.addKPI(platform.id, {
        objective: kpiForm.objective,
        primary_kpis: kpiForm.primary_kpis.split(',').map(k => k.trim()).filter(Boolean),
        secondary_kpis: kpiForm.secondary_kpis ? kpiForm.secondary_kpis.split(',').map(k => k.trim()).filter(Boolean) : undefined,
        notes: kpiForm.notes || undefined
      })
      setShowKPIModal(false)
      setKPIForm({ objective: 'general', primary_kpis: '', secondary_kpis: '', notes: '' })
      await loadPlatform()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add KPI')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteKPI = async (kpiId: string) => {
    if (!confirm('Are you sure you want to delete this KPI?')) return
    try {
      await platformsApi.deleteKPI(kpiId)
      await loadPlatform()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete KPI')
    }
  }

  // Threshold handlers
  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!platform || !thresholdForm.metric.trim()) return

    setIsSaving(true)
    try {
      await platformsApi.addThreshold(platform.id, {
        metric: thresholdForm.metric,
        warning_value: thresholdForm.warning_value ? parseFloat(thresholdForm.warning_value) : undefined,
        critical_value: thresholdForm.critical_value ? parseFloat(thresholdForm.critical_value) : undefined,
        direction: thresholdForm.direction,
        context: thresholdForm.context || undefined
      })
      setShowThresholdModal(false)
      setThresholdForm({ metric: '', warning_value: '', critical_value: '', direction: 'above', context: '' })
      await loadPlatform()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add threshold')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteThreshold = async (thresholdId: string) => {
    if (!confirm('Are you sure you want to delete this threshold?')) return
    try {
      await platformsApi.deleteThreshold(thresholdId)
      await loadPlatform()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete threshold')
    }
  }

  // Buyer Note handlers
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!platform || !noteForm.content.trim()) return

    setIsSaving(true)
    try {
      await platformsApi.addBuyerNote(platform.id, {
        note_type: noteForm.note_type,
        content: noteForm.content,
        contributed_by: noteForm.contributed_by || 'Anonymous'
      })
      setShowNoteModal(false)
      setNoteForm({ note_type: 'tip', content: '', contributed_by: '' })
      await loadPlatform()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return
    try {
      await platformsApi.deleteBuyerNote(noteId)
      await loadPlatform()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note')
    }
  }

  const tabs = [
    { id: 'quirks', label: 'Quirks', icon: <AlertTriangle size={16} /> },
    { id: 'kpis', label: 'KPIs', icon: <Target size={16} /> },
    { id: 'thresholds', label: 'Thresholds', icon: <BarChart3 size={16} /> },
    { id: 'buyer_notes', label: 'Buyer Notes', icon: <MessageSquare size={16} /> },
    { id: 'history', label: 'History', icon: <History size={16} /> }
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
        <p>Loading platform...</p>
      </div>
    )
  }

  if (!platform) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Platform not found</h2>
        <Link to="/schema-admin/platforms">Back to Platforms</Link>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/schema-admin/platforms"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={16} />
          Back to Platforms
        </Link>
      </div>

      {/* Header */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'var(--color-surface-secondary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)'
          }}>
            <Smartphone size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>{platform.name}</h1>
              <Badge variant={platform.is_active ? 'success' : 'default'}>
                {platform.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {platform.category && (
                <Badge variant="info">{platform.category}</Badge>
              )}
            </div>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {platform.code} {platform.description && `• ${platform.description}`}
            </p>
          </div>
          <button className="btn-secondary">
            <Edit2 size={16} />
            Edit Platform
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid var(--color-border)'
        }}>
          {[
            { label: 'Quirks', value: platform.quirks?.length || 0 },
            { label: 'KPIs', value: platform.kpis?.length || 0 },
            { label: 'Thresholds', value: platform.thresholds?.length || 0 },
            { label: 'Buyer Notes', value: platform.buyer_notes?.length || 0 }
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '24px',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      {/* Content */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div style={{ padding: '24px' }}>
          {/* Quirks Tab */}
          <TabPanel id="quirks" activeTab={activeTab}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Platform Quirks ({platform.quirks?.length || 0})</h3>
              <button className="btn-secondary" onClick={() => { resetQuirkForm(); setShowQuirkModal(true); }}>
                <Plus size={16} />
                Add Quirk
              </button>
            </div>

            {platform.quirks && platform.quirks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {platform.quirks.map(quirk => (
                  <div
                    key={quirk.id}
                    style={{
                      backgroundColor: 'var(--color-surface-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Badge variant="default" size="sm">{quirk.quirk_type}</Badge>
                          <Badge
                            variant={quirk.impact === 'high' ? 'error' : quirk.impact === 'medium' ? 'warning' : 'info'}
                            size="sm"
                          >
                            {quirk.impact} impact
                          </Badge>
                          {quirk.verified_by && (
                            <Badge variant="success" size="sm">
                              <CheckCircle size={12} style={{ marginRight: '4px' }} />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>{quirk.title}</h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: 1.5 }}>
                          {quirk.description}
                        </p>
                        {quirk.ai_instruction && (
                          <div style={{
                            backgroundColor: 'var(--color-surface)',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '13px',
                            color: 'var(--color-text-muted)',
                            marginBottom: '8px'
                          }}>
                            <strong>AI Instruction:</strong> {quirk.ai_instruction}
                          </div>
                        )}
                        {quirk.source && (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            Source: {quirk.source}
                            {quirk.contributed_by && ` • Contributed by ${quirk.contributed_by}`}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                        <button
                          onClick={() => openEditQuirk(quirk)}
                          style={{
                            padding: '6px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-surface)',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteQuirk(quirk.id)}
                          style={{
                            padding: '6px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-surface)',
                            cursor: 'pointer',
                            color: 'var(--color-error)'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                No quirks documented yet. Add quirks to help AI understand platform-specific behaviors.
              </p>
            )}
          </TabPanel>

          {/* KPIs Tab */}
          <TabPanel id="kpis" activeTab={activeTab}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>KPIs ({platform.kpis?.length || 0})</h3>
              <button className="btn-secondary" onClick={() => setShowKPIModal(true)}>
                <Plus size={16} />
                Add KPI
              </button>
            </div>

            {platform.kpis && platform.kpis.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {platform.kpis.map(kpi => (
                  <div
                    key={kpi.id}
                    style={{
                      backgroundColor: 'var(--color-surface-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Badge variant="info" size="sm">{kpi.objective}</Badge>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Primary KPIs:</strong>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {(Array.isArray(kpi.primary_kpis) ? kpi.primary_kpis : []).map((k, i) => (
                              <Badge key={i} variant="default" size="sm">{k}</Badge>
                            ))}
                          </div>
                        </div>
                        {kpi.secondary_kpis && kpi.secondary_kpis.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Secondary KPIs:</strong>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                              {kpi.secondary_kpis.map((k, i) => (
                                <Badge key={i} variant="default" size="sm">{k}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {kpi.notes && (
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>{kpi.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteKPI(kpi.id)}
                        style={{
                          padding: '6px',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-surface)',
                          cursor: 'pointer',
                          color: 'var(--color-error)'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                No KPIs configured. Define KPIs by objective for this platform.
              </p>
            )}
          </TabPanel>

          {/* Thresholds Tab */}
          <TabPanel id="thresholds" activeTab={activeTab}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Performance Thresholds ({platform.thresholds?.length || 0})</h3>
              <button className="btn-secondary" onClick={() => setShowThresholdModal(true)}>
                <Plus size={16} />
                Add Threshold
              </button>
            </div>

            {platform.thresholds && platform.thresholds.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {platform.thresholds.map(threshold => (
                  <div
                    key={threshold.id}
                    style={{
                      backgroundColor: 'var(--color-surface-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>{threshold.metric}</h4>
                      {threshold.context && (
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>{threshold.context}</p>
                      )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Direction</div>
                      <Badge variant="default" size="sm">{threshold.direction}</Badge>
                    </div>
                    {threshold.warning_value !== undefined && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Warning</div>
                        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-warning)' }}>
                          {threshold.warning_value}
                        </div>
                      </div>
                    )}
                    {threshold.critical_value !== undefined && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Critical</div>
                        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-error)' }}>
                          {threshold.critical_value}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteThreshold(threshold.id)}
                      style={{
                        padding: '6px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-surface)',
                        cursor: 'pointer',
                        color: 'var(--color-error)'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                No thresholds configured. Set warning and critical thresholds for key metrics.
              </p>
            )}
          </TabPanel>

          {/* Buyer Notes Tab */}
          <TabPanel id="buyer_notes" activeTab={activeTab}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Buyer Notes ({platform.buyer_notes?.length || 0})</h3>
              <button className="btn-secondary" onClick={() => setShowNoteModal(true)}>
                <Plus size={16} />
                Add Note
              </button>
            </div>

            {platform.buyer_notes && platform.buyer_notes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {platform.buyer_notes.map(note => (
                  <div
                    key={note.id}
                    style={{
                      backgroundColor: 'var(--color-surface-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Badge
                            variant={note.note_type === 'warning' ? 'warning' : note.note_type === 'gotcha' ? 'error' : 'info'}
                            size="sm"
                          >
                            {note.note_type}
                          </Badge>
                          {note.is_verified && (
                            <Badge variant="success" size="sm">
                              <CheckCircle size={12} style={{ marginRight: '4px' }} />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: 1.5 }}>{note.content}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          <span>By {note.contributed_by}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ThumbsUp size={12} /> {note.upvotes}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        style={{
                          padding: '6px',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-surface)',
                          cursor: 'pointer',
                          color: 'var(--color-error)'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                No buyer notes yet. Share tips and gotchas from real campaign experience.
              </p>
            )}
          </TabPanel>

          {/* History Tab */}
          <TabPanel id="history" activeTab={activeTab}>
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
              Change history will be available in a future update.
            </p>
          </TabPanel>
        </div>
      </div>

      {/* Add/Edit Quirk Modal */}
      <Modal
        isOpen={showQuirkModal}
        onClose={() => { setShowQuirkModal(false); setEditingQuirk(null); }}
        title={editingQuirk ? 'Edit Quirk' : 'Add Quirk'}
        subtitle={`For ${platform.name}`}
        size="lg"
        footer={
          <>
            <button onClick={() => { setShowQuirkModal(false); setEditingQuirk(null); }} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSaveQuirk} disabled={isSaving || !quirkForm.title.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              {editingQuirk ? 'Update Quirk' : 'Add Quirk'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveQuirk}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField label="Quirk Type" required>
              <Select
                value={quirkForm.quirk_type}
                onChange={(e) => setQuirkForm({ ...quirkForm, quirk_type: e.target.value as QuirkType })}
                options={QUIRK_TYPES.map(t => ({ value: t.value, label: t.label }))}
              />
            </FormField>

            <FormField label="Impact Level" required>
              <Select
                value={quirkForm.impact}
                onChange={(e) => setQuirkForm({ ...quirkForm, impact: e.target.value as ImpactLevel })}
                options={IMPACT_LEVELS.map(i => ({ value: i.value, label: i.label }))}
              />
            </FormField>
          </div>

          <FormField label="Title" required hint="Brief summary of the quirk">
            <Input
              value={quirkForm.title}
              onChange={(e) => setQuirkForm({ ...quirkForm, title: e.target.value })}
              placeholder="e.g., 7-day click attribution window"
            />
          </FormField>

          <FormField label="Description" required hint="Detailed explanation of the quirk">
            <Textarea
              value={quirkForm.description}
              onChange={(e) => setQuirkForm({ ...quirkForm, description: e.target.value })}
              placeholder="e.g., Facebook uses a 7-day click attribution window by default, which can inflate conversion counts..."
              rows={3}
            />
          </FormField>

          <FormField label="AI Instruction" hint="How should the AI handle this quirk?">
            <Textarea
              value={quirkForm.ai_instruction}
              onChange={(e) => setQuirkForm({ ...quirkForm, ai_instruction: e.target.value })}
              placeholder="When analyzing this platform's data, consider..."
              rows={2}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField label="Source" hint="Where did this info come from?">
              <Input
                value={quirkForm.source}
                onChange={(e) => setQuirkForm({ ...quirkForm, source: e.target.value })}
                placeholder="e.g., Facebook Business Help Center"
              />
            </FormField>

            <FormField label="Contributed By">
              <Input
                value={quirkForm.contributed_by}
                onChange={(e) => setQuirkForm({ ...quirkForm, contributed_by: e.target.value })}
                placeholder="Your name"
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* Add KPI Modal */}
      <Modal
        isOpen={showKPIModal}
        onClose={() => setShowKPIModal(false)}
        title="Add KPI"
        subtitle={`For ${platform.name}`}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowKPIModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveKPI} disabled={isSaving || !kpiForm.primary_kpis.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Add KPI
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveKPI}>
          <FormField label="Objective" required>
            <Select
              value={kpiForm.objective}
              onChange={(e) => setKPIForm({ ...kpiForm, objective: e.target.value as Objective })}
              options={OBJECTIVES.map(o => ({ value: o.value, label: o.label }))}
            />
          </FormField>

          <FormField label="Primary KPIs" required hint="Comma-separated list of KPIs">
            <Input
              value={kpiForm.primary_kpis}
              onChange={(e) => setKPIForm({ ...kpiForm, primary_kpis: e.target.value })}
              placeholder="e.g., CTR, CPM, CPC"
            />
          </FormField>

          <FormField label="Secondary KPIs" hint="Comma-separated list of secondary KPIs">
            <Input
              value={kpiForm.secondary_kpis}
              onChange={(e) => setKPIForm({ ...kpiForm, secondary_kpis: e.target.value })}
              placeholder="e.g., Frequency, Reach"
            />
          </FormField>

          <FormField label="Notes">
            <Textarea
              value={kpiForm.notes}
              onChange={(e) => setKPIForm({ ...kpiForm, notes: e.target.value })}
              placeholder="Additional context about these KPIs..."
              rows={2}
            />
          </FormField>
        </form>
      </Modal>

      {/* Add Threshold Modal */}
      <Modal
        isOpen={showThresholdModal}
        onClose={() => setShowThresholdModal(false)}
        title="Add Threshold"
        subtitle={`For ${platform.name}`}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowThresholdModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveThreshold} disabled={isSaving || !thresholdForm.metric.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Add Threshold
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveThreshold}>
          <FormField label="Metric" required>
            <Input
              value={thresholdForm.metric}
              onChange={(e) => setThresholdForm({ ...thresholdForm, metric: e.target.value })}
              placeholder="e.g., CTR, CPM, Frequency"
            />
          </FormField>

          <FormField label="Direction" required hint="Is the threshold above or below?">
            <Select
              value={thresholdForm.direction}
              onChange={(e) => setThresholdForm({ ...thresholdForm, direction: e.target.value as Direction })}
              options={DIRECTIONS.map(d => ({ value: d.value, label: d.label }))}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField label="Warning Value" hint="Trigger a warning">
              <Input
                type="number"
                step="0.01"
                value={thresholdForm.warning_value}
                onChange={(e) => setThresholdForm({ ...thresholdForm, warning_value: e.target.value })}
                placeholder="e.g., 0.5"
              />
            </FormField>

            <FormField label="Critical Value" hint="Trigger critical alert">
              <Input
                type="number"
                step="0.01"
                value={thresholdForm.critical_value}
                onChange={(e) => setThresholdForm({ ...thresholdForm, critical_value: e.target.value })}
                placeholder="e.g., 0.3"
              />
            </FormField>
          </div>

          <FormField label="Context" hint="When does this threshold apply?">
            <Textarea
              value={thresholdForm.context}
              onChange={(e) => setThresholdForm({ ...thresholdForm, context: e.target.value })}
              placeholder="e.g., For awareness campaigns..."
              rows={2}
            />
          </FormField>
        </form>
      </Modal>

      {/* Add Buyer Note Modal */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="Add Buyer Note"
        subtitle={`For ${platform.name}`}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowNoteModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveNote} disabled={isSaving || !noteForm.content.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Add Note
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveNote}>
          <FormField label="Note Type" required>
            <Select
              value={noteForm.note_type}
              onChange={(e) => setNoteForm({ ...noteForm, note_type: e.target.value as NoteType })}
              options={NOTE_TYPES.map(n => ({ value: n.value, label: n.label }))}
            />
          </FormField>

          <FormField label="Content" required>
            <Textarea
              value={noteForm.content}
              onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
              placeholder="Share your insight or tip..."
              rows={4}
            />
          </FormField>

          <FormField label="Your Name">
            <Input
              value={noteForm.contributed_by}
              onChange={(e) => setNoteForm({ ...noteForm, contributed_by: e.target.value })}
              placeholder="e.g., John Smith"
            />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
