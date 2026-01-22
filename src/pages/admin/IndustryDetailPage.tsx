import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Factory, BarChart3, Lightbulb, CalendarDays,
  Plus, Trash2, Loader2, Edit2, Eye, BookOpen, ShieldCheck, Save,
  Sparkles, Users, Globe, TrendingUp
} from 'lucide-react'
import { Tabs, TabPanel } from '@/components/admin/Tabs'
import { Modal } from '@/components/admin/Modal'
import { FormField, Input, Textarea, Select } from '@/components/admin/FormField'
import { Badge } from '@/components/admin/Badge'
import * as industriesApi from '@/lib/industriesApi'
import type { InsightType, SeasonalityPeriodType, SeasonalityImpact } from '@/types/admin'
import type { Industry } from '@/lib/industriesApi'

export function IndustryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [industry, setIndustry] = useState<Industry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('benchmarks')
  const [isSaving, setIsSaving] = useState(false)

  // Edit industry modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    description: ''
  })

  // Benchmark modal state
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false)
  const [benchmarkForm, setBenchmarkForm] = useState({
    metric: '',
    p25: '',
    p50: '',
    p75: '',
    quarter: 'Q1 2025',
    source: '',
    notes: ''
  })

  // Insight modal state
  const [showInsightModal, setShowInsightModal] = useState(false)
  const [insightForm, setInsightForm] = useState({
    insight_type: 'trend' as InsightType,
    title: '',
    content: '',
    ai_instruction: '',
    source: ''
  })

  // Seasonality modal state
  const [showSeasonalityModal, setShowSeasonalityModal] = useState(false)
  const [seasonalityForm, setSeasonalityForm] = useState({
    period_type: 'month' as SeasonalityPeriodType,
    period_value: '',
    impact: 'medium' as SeasonalityImpact,
    cpm_modifier: '',
    description: ''
  })

  useEffect(() => {
    if (id) loadIndustry()
  }, [id])

  const loadIndustry = async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await industriesApi.getIndustry(id)
      setIndustry(data)
      // Populate edit form
      if (data) {
        setEditForm({
          name: data.name,
          code: data.code,
          description: data.description || ''
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load industry')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateIndustry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!industry || !editForm.name.trim()) return

    setIsSaving(true)
    try {
      await industriesApi.updateIndustry(industry.id, {
        name: editForm.name,
        code: editForm.code,
        description: editForm.description || undefined
      })
      setShowEditModal(false)
      await loadIndustry()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update industry')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteIndustry = async () => {
    if (!industry) return
    if (!confirm('Are you sure you want to delete this industry and all its benchmarks, insights, and seasonality data?')) return

    setIsSaving(true)
    try {
      await industriesApi.deleteIndustry(industry.id)
      navigate('/schema-admin/industries')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete industry')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddBenchmark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!industry || !benchmarkForm.metric.trim() || !benchmarkForm.p50) return

    setIsSaving(true)
    try {
      await industriesApi.addBenchmark(industry.id, {
        metric: benchmarkForm.metric,
        p25: benchmarkForm.p25 ? parseFloat(benchmarkForm.p25) : undefined,
        p50: parseFloat(benchmarkForm.p50),
        p75: benchmarkForm.p75 ? parseFloat(benchmarkForm.p75) : undefined,
        quarter: benchmarkForm.quarter,
        source: benchmarkForm.source || undefined,
        notes: benchmarkForm.notes || undefined
      })
      setShowBenchmarkModal(false)
      setBenchmarkForm({ metric: '', p25: '', p50: '', p75: '', quarter: 'Q1 2025', source: '', notes: '' })
      await loadIndustry()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add benchmark')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddInsight = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!industry || !insightForm.title.trim()) return

    setIsSaving(true)
    try {
      await industriesApi.addInsight(industry.id, insightForm)
      setShowInsightModal(false)
      setInsightForm({ insight_type: 'trend', title: '', content: '', ai_instruction: '', source: '' })
      await loadIndustry()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add insight')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddSeasonality = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!industry || !seasonalityForm.period_value.trim()) return

    setIsSaving(true)
    try {
      await industriesApi.addSeasonality(industry.id, {
        ...seasonalityForm,
        cpm_modifier: seasonalityForm.cpm_modifier ? parseFloat(seasonalityForm.cpm_modifier) : undefined
      })
      setShowSeasonalityModal(false)
      setSeasonalityForm({ period_type: 'month', period_value: '', impact: 'medium', cpm_modifier: '', description: '' })
      await loadIndustry()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add seasonality')
    } finally {
      setIsSaving(false)
    }
  }

  // Check if industry has curator research data
  const hasResearchData = industry?.curator_benchmarks || industry?.curator_seasonality ||
    industry?.curator_insights || industry?.buyer_notes

  const tabs = [
    { id: 'benchmarks', label: 'Benchmarks', icon: <BarChart3 size={16} /> },
    { id: 'insights', label: 'Insights', icon: <Lightbulb size={16} /> },
    { id: 'seasonality', label: 'Seasonality', icon: <CalendarDays size={16} /> },
    ...(hasResearchData ? [{ id: 'research', label: 'AI Research', icon: <Sparkles size={16} /> }] : []),
    { id: 'compliance', label: 'Compliance', icon: <ShieldCheck size={16} /> },
    { id: 'case-studies', label: 'Case Studies', icon: <BookOpen size={16} /> },
    { id: 'preview', label: 'AI Preview', icon: <Eye size={16} /> }
  ]

  const insightTypeOptions = [
    { value: 'trend', label: 'Trend' },
    { value: 'recommendation', label: 'Recommendation' },
    { value: 'warning', label: 'Warning' },
    { value: 'opportunity', label: 'Opportunity' }
  ]

  const periodTypeOptions = [
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'holiday', label: 'Holiday' },
    { value: 'event', label: 'Event' }
  ]

  const impactOptions = [
    { value: 'high', label: 'High Impact' },
    { value: 'medium', label: 'Medium Impact' },
    { value: 'low', label: 'Low Impact' }
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
        <p>Loading industry...</p>
      </div>
    )
  }

  if (!industry) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Industry not found</h2>
        <Link to="/schema-admin/industries">Back to Industries</Link>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/schema-admin/industries"
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
          Back to Industries
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
            <Factory size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>{industry.name}</h1>
              <Badge variant={industry.is_active ? 'success' : 'default'}>
                {industry.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {industry.description && (
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                {industry.description}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={() => setShowEditModal(true)}>
              <Edit2 size={16} />
              Edit
            </button>
            <button
              className="btn-secondary"
              style={{ color: 'var(--color-error)' }}
              onClick={handleDeleteIndustry}
              disabled={isSaving}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid var(--color-border)'
        }}>
          {[
            { label: 'Benchmarks', value: industry.benchmarks?.length || 0 },
            { label: 'Insights', value: industry.insights?.length || 0 },
            { label: 'Seasonal Patterns', value: industry.seasonality?.length || 0 }
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
          {/* Benchmarks Tab */}
          <TabPanel id="benchmarks" activeTab={activeTab}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Industry Benchmarks ({industry.benchmarks?.length || 0})</h3>
              <button className="btn-secondary" onClick={() => setShowBenchmarkModal(true)}>
                <Plus size={16} />
                Add Benchmark
              </button>
            </div>

            {industry.benchmarks && industry.benchmarks.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Metric</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Bottom</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--color-primary)' }}>Average</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Top</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Quarter</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Source</th>
                      <th style={{ padding: '12px 16px', width: '60px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {industry.benchmarks.map(bm => (
                      <tr key={bm.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 500 }}>{bm.metric}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{bm.p25 ?? '—'}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--color-primary)' }}>{bm.p50}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{bm.p75 ?? '—'}</td>
                        <td style={{ padding: '14px 16px' }}><Badge size="sm">{bm.quarter}</Badge></td>
                        <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)' }}>{bm.source || '—'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <button
                            onClick={() => industriesApi.deleteBenchmark(bm.id).then(loadIndustry)}
                            style={{
                              padding: '4px',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-error)'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                No benchmarks added yet. Add P25/P50/P75 benchmarks for key metrics.
              </p>
            )}
          </TabPanel>

          {/* Insights Tab */}
          <TabPanel id="insights" activeTab={activeTab}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Industry Insights ({industry.insights?.length || 0})</h3>
              <button className="btn-secondary" onClick={() => setShowInsightModal(true)}>
                <Plus size={16} />
                Add Insight
              </button>
            </div>

            {industry.insights && industry.insights.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {industry.insights.map(insight => (
                  <div
                    key={insight.id}
                    style={{
                      backgroundColor: 'var(--color-surface-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Badge variant="info" size="sm">{insight.insight_type}</Badge>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{insight.title}</h4>
                        </div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
                          {insight.content}
                        </p>
                        {insight.ai_instruction && (
                          <div style={{
                            backgroundColor: 'var(--color-surface)',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '13px',
                            color: 'var(--color-text-muted)'
                          }}>
                            <strong>AI Instruction:</strong> {insight.ai_instruction}
                          </div>
                        )}
                        {insight.source && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            Source: {insight.source}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => industriesApi.deleteInsight(insight.id).then(loadIndustry)}
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
                No insights added yet. Document industry-specific knowledge for AI analysis.
              </p>
            )}
          </TabPanel>

          {/* Seasonality Tab */}
          <TabPanel id="seasonality" activeTab={activeTab}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Seasonal Patterns ({industry.seasonality?.length || 0})</h3>
              <button className="btn-secondary" onClick={() => setShowSeasonalityModal(true)}>
                <Plus size={16} />
                Add Pattern
              </button>
            </div>

            {industry.seasonality && industry.seasonality.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {industry.seasonality.map(season => (
                  <div
                    key={season.id}
                    style={{
                      backgroundColor: 'var(--color-surface-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Badge size="sm">{season.period_type}</Badge>
                          <Badge
                            variant={season.impact === 'high' ? 'error' : season.impact === 'medium' ? 'warning' : 'info'}
                            size="sm"
                          >
                            {season.impact}
                          </Badge>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{season.period_value}</h4>
                      </div>
                      {season.cpm_modifier && (
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: season.cpm_modifier > 1 ? 'var(--color-error)' : 'var(--color-success)'
                        }}>
                          {season.cpm_modifier > 1 ? '+' : ''}{((season.cpm_modifier - 1) * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                    {season.description && (
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        {season.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>
                No seasonal patterns documented. Add monthly, quarterly, or holiday patterns.
              </p>
            )}
          </TabPanel>

          {/* AI Research Tab - Curator-generated data */}
          {hasResearchData && (
            <TabPanel id="research" activeTab={activeTab}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ margin: 0 }}>AI-Researched Industry Data</h3>
                {industry.research_metadata?.researched_at && (
                  <Badge size="sm" variant="info">
                    Researched {new Date(industry.research_metadata.researched_at).toLocaleDateString()}
                  </Badge>
                )}
              </div>

              {/* Research Metadata */}
              {industry.research_metadata && (
                <div style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  gap: '24px',
                  flexWrap: 'wrap'
                }}>
                  {industry.research_metadata.sources && (
                    <span><Globe size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{industry.research_metadata.sources.length} sources</span>
                  )}
                  {industry.research_metadata.tokens_used && (
                    <span><TrendingUp size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{industry.research_metadata.tokens_used.toLocaleString()} tokens</span>
                  )}
                  {industry.research_metadata.query && (
                    <span>Query: "{industry.research_metadata.query}"</span>
                  )}
                </div>
              )}

              {/* Benchmarks Section */}
              {industry.curator_benchmarks && (
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={18} /> Benchmark Ranges
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {industry.curator_benchmarks.cpc_range && (
                      <div style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>CPC (Cost Per Click)</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
                          ${industry.curator_benchmarks.cpc_range.avg?.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          Range: ${industry.curator_benchmarks.cpc_range.min?.toFixed(2)} - ${industry.curator_benchmarks.cpc_range.max?.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {industry.curator_benchmarks.cpa_range && (
                      <div style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>CPA (Cost Per Acquisition)</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
                          ${industry.curator_benchmarks.cpa_range.avg?.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          Range: ${industry.curator_benchmarks.cpa_range.min?.toFixed(2)} - ${industry.curator_benchmarks.cpa_range.max?.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {industry.curator_benchmarks.ctr_range && (
                      <div style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>CTR (Click-Through Rate)</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {industry.curator_benchmarks.ctr_range.avg?.toFixed(2)}%
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          Range: {industry.curator_benchmarks.ctr_range.min?.toFixed(2)}% - {industry.curator_benchmarks.ctr_range.max?.toFixed(2)}%
                        </div>
                      </div>
                    )}
                    {industry.curator_benchmarks.cpm_range && (
                      <div style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>CPM (Cost Per 1000)</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
                          ${industry.curator_benchmarks.cpm_range.avg?.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          Range: ${industry.curator_benchmarks.cpm_range.min?.toFixed(2)} - ${industry.curator_benchmarks.cpm_range.max?.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {industry.curator_benchmarks.roas_range && (
                      <div style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>ROAS (Return on Ad Spend)</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {industry.curator_benchmarks.roas_range.avg?.toFixed(1)}x
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          Range: {industry.curator_benchmarks.roas_range.min?.toFixed(1)}x - {industry.curator_benchmarks.roas_range.max?.toFixed(1)}x
                        </div>
                      </div>
                    )}
                  </div>
                  {industry.curator_benchmarks.notes && (
                    <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      {industry.curator_benchmarks.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Seasonality Section */}
              {industry.curator_seasonality && (
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarDays size={18} /> Seasonality Patterns
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {industry.curator_seasonality.peak_months && industry.curator_seasonality.peak_months.length > 0 && (
                      <div style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Peak Months</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {industry.curator_seasonality.peak_months.map((month: number) => (
                            <Badge key={month} variant="success" size="sm">
                              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {industry.curator_seasonality.slow_months && industry.curator_seasonality.slow_months.length > 0 && (
                      <div style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Slow Months</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {industry.curator_seasonality.slow_months.map((month: number) => (
                            <Badge key={month} variant="warning" size="sm">
                              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {industry.curator_seasonality.holidays_impact && industry.curator_seasonality.holidays_impact.length > 0 && (
                      <div style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Holiday Impact</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {industry.curator_seasonality.holidays_impact.map((holiday: string, i: number) => (
                            <Badge key={i} variant="info" size="sm">{holiday}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {industry.curator_seasonality.quarterly_trends && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Quarterly Trends</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {['q1', 'q2', 'q3', 'q4'].map((q) => (
                          <div key={q} style={{
                            backgroundColor: 'var(--color-surface-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px',
                            fontSize: '13px'
                          }}>
                            <strong style={{ color: 'var(--color-primary)' }}>{q.toUpperCase()}</strong>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)' }}>
                              {industry.curator_seasonality?.quarterly_trends?.[q as 'q1' | 'q2' | 'q3' | 'q4'] || '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {industry.curator_seasonality.notes && (
                    <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      {industry.curator_seasonality.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Buyer Notes Section */}
              {industry.buyer_notes && (
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} /> Buyer Notes
                  </h4>
                  <div style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    border: '1px solid var(--color-border)',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {industry.buyer_notes}
                  </div>
                </div>
              )}

              {/* AI Insights Section */}
              {industry.curator_insights && industry.curator_insights.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lightbulb size={18} /> AI-Generated Insights ({industry.curator_insights.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {industry.curator_insights.map((insight, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: 'var(--color-surface-secondary)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px 20px',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{insight.topic}</h5>
                          <Badge
                            variant={insight.confidence >= 0.8 ? 'success' : insight.confidence >= 0.6 ? 'warning' : 'default'}
                            size="sm"
                          >
                            {Math.round(insight.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                          {insight.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {industry.research_metadata?.sources && industry.research_metadata.sources.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Research Sources
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {industry.research_metadata.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                          backgroundColor: 'var(--color-surface-secondary)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        {new URL(source).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </TabPanel>
          )}

          {/* Compliance Tab */}
          <TabPanel id="compliance" activeTab={activeTab}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'var(--color-primary-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <ShieldCheck size={36} style={{ color: 'var(--color-primary)' }} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600 }}>
                Compliance Coming Soon
              </h3>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>
                Track industry-specific regulations, advertising restrictions, and compliance requirements. This feature is under development.
              </p>
            </div>
          </TabPanel>

          {/* Case Studies Tab */}
          <TabPanel id="case-studies" activeTab={activeTab}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'var(--color-primary-light)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <BookOpen size={36} style={{ color: 'var(--color-primary)' }} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600 }}>
                Case Studies Coming Soon
              </h3>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>
                Document successful campaigns, winning strategies, and real-world examples for this industry. This feature is under development.
              </p>
            </div>
          </TabPanel>

          {/* AI Preview Tab */}
          <TabPanel id="preview" activeTab={activeTab}>
            <div style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              border: '1px solid var(--color-border)'
            }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Context Preview
              </h4>
              <pre style={{
                margin: 0,
                padding: '16px',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                lineHeight: 1.6,
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
{`## Industry Context: ${industry.name}

### Benchmarks
${industry.benchmarks?.map(b => `- ${b.metric}: Average = ${b.p50}${b.p25 ? `, Bottom = ${b.p25}` : ''}${b.p75 ? `, Top = ${b.p75}` : ''} (${b.quarter})`).join('\n') || 'No benchmarks available'}

### Key Insights
${industry.insights?.map(i => `- [${i.insight_type}] ${i.title}: ${i.content}`).join('\n') || 'No insights available'}

### Seasonal Considerations
${industry.seasonality?.map(s => `- ${s.period_value} (${s.impact} impact): ${s.description || 'CPM modifier: ' + s.cpm_modifier}`).join('\n') || 'No seasonal patterns documented'}`}
              </pre>
            </div>
          </TabPanel>
        </div>
      </div>

      {/* Add Benchmark Modal */}
      <Modal
        isOpen={showBenchmarkModal}
        onClose={() => setShowBenchmarkModal(false)}
        title="Add Benchmark"
        subtitle={`For ${industry.name}`}
        size="md"
        footer={
          <>
            <button onClick={() => setShowBenchmarkModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAddBenchmark} disabled={isSaving || !benchmarkForm.metric.trim() || !benchmarkForm.p50} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Add Benchmark
            </button>
          </>
        }
      >
        <form onSubmit={handleAddBenchmark}>
          <FormField label="Metric" required hint="e.g., CTR, CPC, ROAS">
            <Input
              value={benchmarkForm.metric}
              onChange={(e) => setBenchmarkForm({ ...benchmarkForm, metric: e.target.value })}
              placeholder="e.g., CTR"
            />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <FormField label="Bottom" hint="Lower performers">
              <Input
                type="number"
                step="0.01"
                value={benchmarkForm.p25}
                onChange={(e) => setBenchmarkForm({ ...benchmarkForm, p25: e.target.value })}
                placeholder="0.00"
              />
            </FormField>
            <FormField label="Average" required hint="Typical performance">
              <Input
                type="number"
                step="0.01"
                value={benchmarkForm.p50}
                onChange={(e) => setBenchmarkForm({ ...benchmarkForm, p50: e.target.value })}
                placeholder="0.00"
              />
            </FormField>
            <FormField label="Top" hint="Top performers">
              <Input
                type="number"
                step="0.01"
                value={benchmarkForm.p75}
                onChange={(e) => setBenchmarkForm({ ...benchmarkForm, p75: e.target.value })}
                placeholder="0.00"
              />
            </FormField>
          </div>
          <FormField label="Quarter">
            <Input
              value={benchmarkForm.quarter}
              onChange={(e) => setBenchmarkForm({ ...benchmarkForm, quarter: e.target.value })}
              placeholder="e.g., Q1 2025"
            />
          </FormField>
          <FormField label="Source">
            <Input
              value={benchmarkForm.source}
              onChange={(e) => setBenchmarkForm({ ...benchmarkForm, source: e.target.value })}
              placeholder="e.g., Internal data, WordStream"
            />
          </FormField>
        </form>
      </Modal>

      {/* Add Insight Modal */}
      <Modal
        isOpen={showInsightModal}
        onClose={() => setShowInsightModal(false)}
        title="Add Insight"
        subtitle={`For ${industry.name}`}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowInsightModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAddInsight} disabled={isSaving || !insightForm.title.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Add Insight
            </button>
          </>
        }
      >
        <form onSubmit={handleAddInsight}>
          <FormField label="Insight Type" required>
            <Select
              value={insightForm.insight_type}
              onChange={(e) => setInsightForm({ ...insightForm, insight_type: e.target.value as InsightType })}
              options={insightTypeOptions}
            />
          </FormField>
          <FormField label="Title" required>
            <Input
              value={insightForm.title}
              onChange={(e) => setInsightForm({ ...insightForm, title: e.target.value })}
              placeholder="e.g., EV Interest Surge"
            />
          </FormField>
          <FormField label="Content" required>
            <Textarea
              value={insightForm.content}
              onChange={(e) => setInsightForm({ ...insightForm, content: e.target.value })}
              placeholder="Describe the insight..."
              rows={3}
            />
          </FormField>
          <FormField label="AI Instruction" hint="How should AI use this insight?">
            <Textarea
              value={insightForm.ai_instruction}
              onChange={(e) => setInsightForm({ ...insightForm, ai_instruction: e.target.value })}
              placeholder="When analyzing this industry..."
              rows={2}
            />
          </FormField>
          <FormField label="Source">
            <Input
              value={insightForm.source}
              onChange={(e) => setInsightForm({ ...insightForm, source: e.target.value })}
              placeholder="e.g., Google Trends, Industry Report"
            />
          </FormField>
        </form>
      </Modal>

      {/* Add Seasonality Modal */}
      <Modal
        isOpen={showSeasonalityModal}
        onClose={() => setShowSeasonalityModal(false)}
        title="Add Seasonal Pattern"
        subtitle={`For ${industry.name}`}
        size="md"
        footer={
          <>
            <button onClick={() => setShowSeasonalityModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAddSeasonality} disabled={isSaving || !seasonalityForm.period_value.trim()} className="btn-primary">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              Add Pattern
            </button>
          </>
        }
      >
        <form onSubmit={handleAddSeasonality}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Period Type" required>
              <Select
                value={seasonalityForm.period_type}
                onChange={(e) => setSeasonalityForm({ ...seasonalityForm, period_type: e.target.value as SeasonalityPeriodType })}
                options={periodTypeOptions}
              />
            </FormField>
            <FormField label="Impact Level" required>
              <Select
                value={seasonalityForm.impact}
                onChange={(e) => setSeasonalityForm({ ...seasonalityForm, impact: e.target.value as SeasonalityImpact })}
                options={impactOptions}
              />
            </FormField>
          </div>
          <FormField label="Period Value" required hint="e.g., December, Black Friday, Q4">
            <Input
              value={seasonalityForm.period_value}
              onChange={(e) => setSeasonalityForm({ ...seasonalityForm, period_value: e.target.value })}
              placeholder="e.g., December"
            />
          </FormField>
          <FormField label="CPM Modifier" hint="e.g., 1.35 for +35% CPM increase, 0.85 for -15%">
            <Input
              type="number"
              step="0.01"
              value={seasonalityForm.cpm_modifier}
              onChange={(e) => setSeasonalityForm({ ...seasonalityForm, cpm_modifier: e.target.value })}
              placeholder="1.00"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={seasonalityForm.description}
              onChange={(e) => setSeasonalityForm({ ...seasonalityForm, description: e.target.value })}
              placeholder="Explain the seasonal impact..."
              rows={2}
            />
          </FormField>
        </form>
      </Modal>

      {/* Edit Industry Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Industry"
        size="md"
        footer={
          <>
            <button onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleUpdateIndustry} disabled={isSaving || !editForm.name.trim()} className="btn-primary">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          </>
        }
      >
        <form onSubmit={handleUpdateIndustry}>
          <FormField label="Industry Name" required>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="e.g., Automotive"
            />
          </FormField>
          <FormField label="Code" required hint="Unique identifier (lowercase, no spaces)">
            <Input
              value={editForm.code}
              onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              placeholder="e.g., automotive"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Brief description of this industry..."
              rows={3}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
