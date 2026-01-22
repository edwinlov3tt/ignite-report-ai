import { useState, useEffect } from 'react'
import {
  Sparkles, Check, X, AlertTriangle, Loader2, RefreshCw,
  Download, Zap, Filter, ChevronDown, ChevronRight
} from 'lucide-react'
import * as suggestionsApi from '@/lib/extractorSuggestionsApi'
import type { ExtractorSuggestion, SuggestionStats } from '@/lib/extractorSuggestionsApi'

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'modified' | 'all'

const CATEGORY_COLORS: Record<string, string> = {
  budget: '#22c55e',
  performance: '#3b82f6',
  creative: '#a855f7',
  targeting: '#f97316',
  timeline: '#6366f1',
  structure: '#64748b',
  metadata: '#94a3b8'
}

const AGGREGATION_LABELS: Record<string, string> = {
  sum: 'Sum',
  avg: 'Average',
  first: 'First',
  last: 'Last',
  concat: 'Concatenate',
  unique: 'Unique Values',
  count: 'Count'
}

export function ExtractorSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<ExtractorSuggestion[]>([])
  const [stats, setStats] = useState<SuggestionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Load data
  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [suggestionsData, statsData] = await Promise.all([
        suggestionsApi.getSuggestions({ status: statusFilter }),
        suggestionsApi.getSuggestionStats()
      ])
      setSuggestions(suggestionsData)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  // Generate new suggestions
  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const result = await suggestionsApi.generateSuggestions({ onlyNew: true })
      await loadData()
      alert(`Generated ${result.suggestionsGenerated} suggestions from ${result.fieldsAnalyzed} fields`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
    } finally {
      setIsGenerating(false)
    }
  }

  // Approve suggestion
  const handleApprove = async (id: string) => {
    try {
      await suggestionsApi.approveSuggestion(id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
    }
  }

  // Reject suggestion
  const handleReject = async (id: string) => {
    try {
      await suggestionsApi.rejectSuggestion(id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject')
    }
  }

  // Export approved
  const handleExport = async () => {
    try {
      const data = await suggestionsApi.exportSuggestions()
      const blob = new Blob([JSON.stringify(data.extractors, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'extractors-config.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export')
    }
  }

  // Bulk approve high confidence
  const handleBulkApprove = async () => {
    if (!confirm('Auto-approve all suggestions with 80%+ confidence?')) return
    try {
      const result = await suggestionsApi.bulkApprove(0.8)
      await loadData()
      alert(`Approved ${result.approved} of ${result.total} high-confidence suggestions`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk approve')
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#22c55e'
    if (confidence >= 0.6) return '#eab308'
    return '#ef4444'
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
              Extractor Suggestions
            </h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              AI-powered field analysis and extractor recommendations
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleExport} className="btn-secondary" title="Export approved extractors">
              <Download size={18} />
              Export
            </button>
            <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary">
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Generate
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '16px',
            padding: '16px',
            backgroundColor: 'var(--color-surface-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>{stats.total}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Total</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>{stats.pending}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Pending</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{stats.approved}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Approved</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{stats.rejected}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Rejected</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                {Math.round(stats.avgConfidence * 100)}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Avg Confidence</div>
            </div>
          </div>
        )}
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

      {/* Filters & Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={18} style={{ color: 'var(--color-text-muted)' }} />
          {(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: statusFilter === status ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                backgroundColor: statusFilter === status ? 'var(--color-primary-light)' : 'var(--color-surface)',
                color: statusFilter === status ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {status}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {statusFilter === 'pending' && stats && stats.pending > 0 && (
            <button onClick={handleBulkApprove} className="btn-secondary" style={{ fontSize: '13px' }}>
              <Zap size={16} />
              Auto-Approve 80%+
            </button>
          )}
          <button onClick={loadData} className="btn-secondary" style={{ fontSize: '13px' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Suggestions List */}
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
          <p>Loading suggestions...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--color-text-muted)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)'
        }}>
          <Sparkles size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 500 }}>No suggestions found</p>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {statusFilter === 'pending'
              ? 'Click "Generate" to analyze discovered fields with AI'
              : `No ${statusFilter} suggestions yet`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {suggestions.map(suggestion => (
            <div
              key={suggestion.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden'
              }}
            >
              {/* Main Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
              >
                {/* Expand Icon */}
                <div style={{ color: 'var(--color-text-muted)' }}>
                  {expandedId === suggestion.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>

                {/* Confidence Badge */}
                <div style={{
                  width: '48px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: `${getConfidenceColor(suggestion.confidence)}20`,
                  color: getConfidenceColor(suggestion.confidence),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                  {Math.round(suggestion.confidence * 100)}%
                </div>

                {/* Field Path */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: 'var(--color-text-primary)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {suggestion.field_path}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    → {suggestion.suggested_name}
                  </div>
                </div>

                {/* Category & Aggregation Tags */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    backgroundColor: `${CATEGORY_COLORS[suggestion.aggregation_type] || '#94a3b8'}20`,
                    color: CATEGORY_COLORS[suggestion.aggregation_type] || '#94a3b8'
                  }}>
                    {AGGREGATION_LABELS[suggestion.aggregation_type] || suggestion.aggregation_type}
                  </span>
                </div>

                {/* Actions */}
                {suggestion.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleApprove(suggestion.id)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Approve"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => handleReject(suggestion.id)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Reject"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}

                {/* Status Badge for non-pending */}
                {suggestion.status !== 'pending' && (
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: suggestion.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' :
                                    suggestion.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' :
                                    'rgba(99, 102, 241, 0.1)',
                    color: suggestion.status === 'approved' ? '#22c55e' :
                           suggestion.status === 'rejected' ? '#ef4444' :
                           '#6366f1',
                    textTransform: 'capitalize'
                  }}>
                    {suggestion.status}
                  </span>
                )}
              </div>

              {/* Expanded Details */}
              {expandedId === suggestion.id && (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderTop: '1px solid var(--color-border)'
                }}>
                  <p style={{ margin: '0 0 12px 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                    {suggestion.description}
                  </p>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    <span>Created: {new Date(suggestion.created_at).toLocaleDateString()}</span>
                    {suggestion.reviewed_at && (
                      <span>Reviewed: {new Date(suggestion.reviewed_at).toLocaleDateString()}</span>
                    )}
                    {suggestion.source_order_id && (
                      <span>Source: {suggestion.source_order_id.substring(0, 8)}...</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
