/**
 * Sources Page
 * Browse, search, and manage curator sources
 */

import { useState, useEffect } from 'react'
import {
  Search, ExternalLink, Plus, Loader2,
  RefreshCw, Star, Circle, Diamond
} from 'lucide-react'
import type { CuratorSource, AuthorityTier } from '@/types/curator'
import { AUTHORITY_TIERS, getAuthorityBadge } from '@/types/curator'
import { API_CONFIG } from '@/config/api'

const API_BASE = API_CONFIG.worker.base

export function SourcesPage() {
  // State
  const [sources, setSources] = useState<CuratorSource[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [authorityFilter, setAuthorityFilter] = useState<AuthorityTier | ''>('')
  // Domain filter not yet implemented in UI
  const domainFilter = ''

  // Pagination
  const [offset, setOffset] = useState(0)
  const limit = 20

  // Add source modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [newSourceTitle, setNewSourceTitle] = useState('')
  const [isAddingSource, setIsAddingSource] = useState(false)

  // Load sources
  const loadSources = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (authorityFilter) params.append('authority', authorityFilter)
      if (domainFilter) params.append('domain', domainFilter)
      params.append('limit', String(limit))
      params.append('offset', String(offset))

      const response = await fetch(`${API_BASE}/curator/sources?${params}`)
      const data = await response.json()

      if (data.success) {
        setSources(data.sources)
        setTotalCount(data.total_count)
      }
    } catch (error) {
      console.error('Failed to load sources:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSources()
  }, [authorityFilter, domainFilter, offset])

  // Add new source
  const handleAddSource = async () => {
    if (!newSourceUrl.trim()) return

    setIsAddingSource(true)
    try {
      const response = await fetch(`${API_BASE}/curator/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newSourceUrl.trim(),
          title: newSourceTitle.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setShowAddModal(false)
        setNewSourceUrl('')
        setNewSourceTitle('')
        loadSources()
      }
    } catch (error) {
      console.error('Failed to add source:', error)
    } finally {
      setIsAddingSource(false)
    }
  }

  // Filter sources by search query (client-side)
  const filteredSources = sources.filter(source => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      source.domain.toLowerCase().includes(query) ||
      (source.title?.toLowerCase().includes(query)) ||
      source.url.toLowerCase().includes(query)
    )
  })

  // Get authority icon component
  const getAuthorityIcon = (tier: AuthorityTier) => {
    switch (tier) {
      case 'authoritative':
        return <Star size={14} style={{ color: '#22c55e', fill: '#22c55e' }} />
      case 'standard':
        return <Circle size={14} style={{ color: '#3b82f6' }} />
      case 'user_provided':
        return <Diamond size={14} style={{ color: '#eab308' }} />
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
            Research Sources
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>
            Browse and manage sources used in AI research
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <Plus size={18} />
          Add Source
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-secondary)',
            }}
          />
          <input
            type="text"
            placeholder="Search by domain or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              fontSize: '14px',
            }}
          />
        </div>

        {/* Authority Filter */}
        <select
          value={authorityFilter}
          onChange={(e) => {
            setAuthorityFilter(e.target.value as AuthorityTier | '')
            setOffset(0)
          }}
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg)',
            fontSize: '14px',
            minWidth: '160px',
          }}
        >
          <option value="">All Authority Levels</option>
          {AUTHORITY_TIERS.map(tier => (
            <option key={tier.value} value={tier.value}>
              {tier.icon} {tier.label}
            </option>
          ))}
        </select>

        {/* Refresh Button */}
        <button
          onClick={loadSources}
          className="btn-secondary"
          disabled={loading}
          style={{ padding: '10px 16px' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Summary */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '20px',
      }}>
        {AUTHORITY_TIERS.map(tier => {
          const count = sources.filter(s => s.authority_tier === tier.value).length

          return (
            <div
              key={tier.value}
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ color: tier.color }}>{tier.icon}</span>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{count}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {tier.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Sources List */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'var(--color-text-secondary)',
          }}>
            <Loader2 size={32} className="animate-spin" style={{ marginBottom: '12px' }} />
            <p style={{ margin: 0 }}>Loading sources...</p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div style={{
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'var(--color-text-secondary)',
          }}>
            <Search size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ margin: 0 }}>No sources found</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 150px 100px 100px',
              padding: '12px 20px',
              backgroundColor: 'var(--color-bg)',
              borderBottom: '1px solid var(--color-border)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
            }}>
              <div></div>
              <div>Source</div>
              <div>Categories</div>
              <div>Authority</div>
              <div>Used</div>
            </div>

            {/* Table Body */}
            {filteredSources.map((source) => {
              const badge = getAuthorityBadge(source.authority_tier)

              return (
                <div
                  key={source.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 150px 100px 100px',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    alignItems: 'center',
                  }}
                >
                  {/* Authority Icon */}
                  <div>
                    {getAuthorityIcon(source.authority_tier)}
                  </div>

                  {/* Source Info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--color-text)',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {source.title || source.domain}
                        <ExternalLink size={12} style={{ color: 'var(--color-text-secondary)' }} />
                      </a>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {source.domain}
                    </div>
                  </div>

                  {/* Categories */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {(source.categories || []).slice(0, 2).map((cat, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          fontSize: '11px',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                    {(source.categories || []).length > 2 && (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        +{source.categories!.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Authority Score */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: badge.color,
                    fontSize: '13px',
                    fontWeight: 500,
                  }}>
                    {Math.round(source.authority_score * 100)}%
                  </div>

                  {/* Fetch Count */}
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                  }}>
                    {source.fetch_count} {source.fetch_count === 1 ? 'time' : 'times'}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalCount > limit && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '20px',
        }}>
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="btn-secondary"
            style={{ padding: '8px 16px' }}
          >
            Previous
          </button>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
          }}>
            {offset + 1} - {Math.min(offset + limit, totalCount)} of {totalCount}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= totalCount}
            className="btn-secondary"
            style={{ padding: '8px 16px' }}
          >
            Next
          </button>
        </div>
      )}

      {/* Add Source Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600 }}>
              Add Source
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
              }}>
                URL *
              </label>
              <input
                type="url"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                placeholder="https://example.com/article"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
              }}>
                Title (Optional)
              </label>
              <input
                type="text"
                value={newSourceTitle}
                onChange={(e) => setNewSourceTitle(e.target.value)}
                placeholder="Article or page title"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSource}
                disabled={!newSourceUrl.trim() || isAddingSource}
                className="btn-primary"
              >
                {isAddingSource ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Source
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
