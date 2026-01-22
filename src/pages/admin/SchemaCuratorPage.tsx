/**
 * Schema Curator Page - Research Mode
 *
 * Full-screen research-first platform for seeding high-quality data
 * into products, platforms, and industries with source tracking.
 */

import { useState, useRef, useEffect } from 'react'
import {
  Bot, Loader2, AlertTriangle, CheckCircle2,
  FileText, ChevronDown, ChevronUp, Check, X,
  Sparkles, RefreshCw, Upload, History, Clock
} from 'lucide-react'
import { EntitySelector } from '@/components/admin/curator/EntitySelector'
import { ChainOfThoughtDisplay } from '@/components/admin/curator/ChainOfThoughtDisplay'
import type {
  ExtractedField,
  ResearchReadiness,
  ResearchDepth,
  ExtractedGuidanceFields,
  FeedbackType,
  ProductResearchResponse,
  ResearchSessionListItem,
  ListSessionsResponse,
  GetSessionResponse,
} from '@/types/curator'
import { API_CONFIG } from '@/config/api'

const API_BASE = API_CONFIG.worker.base

// Field display configuration
const GUIDANCE_FIELD_LABELS: Record<string, string> = {
  chain_of_thought_guidance: 'Chain of Thought Guidance',
  analysis_instructions: 'Analysis Instructions',
  example_good_analysis: 'Good Analysis Examples',
  example_bad_analysis: 'Anti-Patterns to Avoid',
  critical_metrics: 'Critical Metrics',
  optimization_priorities: 'Optimization Priorities',
  important_constraints_restrictions: 'Constraints & Restrictions',
}

export function SchemaCuratorPage() {
  // Entity selection state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedSubproductId, setSelectedSubproductId] = useState<string | null>(null)
  const [selectedPlatformFocus, setSelectedPlatformFocus] = useState<string | null>(null)
  const [researchDepth, setResearchDepth] = useState<ResearchDepth>('standard')
  const [userContext, setUserContext] = useState('')

  // Research state
  const [isResearching, setIsResearching] = useState(false)
  const [researchResult, setResearchResult] = useState<ProductResearchResponse | null>(null)
  const [readinessStatus, setReadinessStatus] = useState<ResearchReadiness | null>(null)

  // Approval state
  const [approvedFields, setApprovedFields] = useState<Set<string>>(new Set())
  const [isCommitting, setIsCommitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  // UI state
  const [error, setError] = useState<string | null>(null)
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
  const [tokensUsed, setTokensUsed] = useState(0)

  // Sessions state
  const [previousSessions, setPreviousSessions] = useState<ResearchSessionListItem[]>([])
  const [showSessionsDropdown, setShowSessionsDropdown] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sessionsDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch previous sessions on mount
  useEffect(() => {
    fetchPreviousSessions()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sessionsDropdownRef.current && !sessionsDropdownRef.current.contains(event.target as Node)) {
        setShowSessionsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch previous research sessions
  const fetchPreviousSessions = async () => {
    setIsLoadingSessions(true)
    try {
      const response = await fetch(`${API_BASE}/curator/research/product/sessions?limit=20`)
      const data: ListSessionsResponse = await response.json()
      if (data.success) {
        setPreviousSessions(data.sessions)
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  // Load a specific session
  const loadSession = async (sessionId: string) => {
    setIsLoadingSession(true)
    setShowSessionsDropdown(false)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/curator/research/product/sessions/${sessionId}`)
      const data: GetSessionResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load session')
      }

      const session = data.session

      // Convert session data to ProductResearchResponse format
      const researchResult: ProductResearchResponse = {
        success: true,
        session_id: session.id,
        readiness_check: session.readiness_check || {
          is_ready: true,
          warnings: [],
          missing_fields: [],
          recommendation: 'Loaded from previous session',
        },
        chain_of_thought: session.chain_of_thought,
        reasoning_steps: session.reasoning_steps || [],
        extracted_fields: session.extracted_fields || {},
        sources: session.sources_consulted || [],
        cross_entity_suggestions: session.cross_entity_suggestions || [],
        inheritance_analysis: session.inheritance_analysis,
        tokens_used: session.tokens_used,
        duration_ms: session.duration_ms || 0,
      }

      setResearchResult(researchResult)
      setReadinessStatus(researchResult.readiness_check)
      setSelectedProductId(session.target_product_id || null)
      setSelectedSubproductId(session.target_subproduct_id || null)
      setUserContext(session.user_context || '')
      setApprovedFields(new Set())
      setFeedbackSubmitted(false)

      // Auto-expand all fields
      const fieldKeys = Object.keys(researchResult.extracted_fields || {})
      setExpandedFields(new Set(fieldKeys))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session')
    } finally {
      setIsLoadingSession(false)
    }
  }

  // Format relative time
  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Handle research request
  const handleStartResearch = async () => {
    if (!selectedProductId) return

    setIsResearching(true)
    setError(null)
    setResearchResult(null)
    setApprovedFields(new Set())
    setFeedbackSubmitted(false)

    try {
      const response = await fetch(`${API_BASE}/curator/research/product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductId,
          subproduct_id: selectedSubproductId,
          platform_focus: selectedPlatformFocus,
          user_context: userContext.trim() || undefined,
          research_depth: researchDepth,
        }),
      })

      const data: ProductResearchResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Research failed')
      }

      setResearchResult(data)
      setReadinessStatus(data.readiness_check)
      setTokensUsed(prev => prev + data.tokens_used)

      // Auto-expand all fields
      const fieldKeys = Object.keys(data.extracted_fields || {})
      setExpandedFields(new Set(fieldKeys))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed')
    } finally {
      setIsResearching(false)
    }
  }

  // Handle feedback submission
  const handleFeedback = async (type: FeedbackType, fieldName?: string) => {
    if (!researchResult?.session_id) return

    try {
      const response = await fetch(`${API_BASE}/curator/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          research_session_id: researchResult.session_id,
          feedback_type: type,
          field_name: fieldName,
        }),
      })

      if (response.ok) {
        setFeedbackSubmitted(true)
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    }
  }

  // Toggle field expansion
  const toggleFieldExpansion = (fieldName: string) => {
    const newExpanded = new Set(expandedFields)
    if (newExpanded.has(fieldName)) {
      newExpanded.delete(fieldName)
    } else {
      newExpanded.add(fieldName)
    }
    setExpandedFields(newExpanded)
  }

  // Toggle field approval
  const toggleFieldApproval = (fieldName: string) => {
    const newApproved = new Set(approvedFields)
    if (newApproved.has(fieldName)) {
      newApproved.delete(fieldName)
    } else {
      newApproved.add(fieldName)
    }
    setApprovedFields(newApproved)
  }

  // Approve all fields
  const approveAllFields = () => {
    if (researchResult?.extracted_fields) {
      setApprovedFields(new Set(Object.keys(researchResult.extracted_fields)))
    }
  }

  // Clear all approvals
  const clearApprovals = () => {
    setApprovedFields(new Set())
  }

  // Commit approved fields
  const handleCommit = async () => {
    if (!researchResult || approvedFields.size === 0 || !selectedProductId) return

    setIsCommitting(true)
    setError(null)

    try {
      // Build fields to commit
      const fieldsToCommit: ExtractedField[] = []
      const extractedFields = researchResult.extracted_fields

      for (const fieldName of approvedFields) {
        const value = extractedFields[fieldName as keyof ExtractedGuidanceFields]
        if (value !== undefined) {
          fieldsToCommit.push({
            name: fieldName,
            value,
            confidence: 0.85, // Research-based confidence
            source: 'web_research',
          })
        }
      }

      // Commit to the appropriate entity (product or subproduct)
      const entityType = selectedSubproductId ? 'subproduct' : 'product'
      const entityId = selectedSubproductId || selectedProductId

      const response = await fetch(`${API_BASE}/curator/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            entity_type: entityType,
            entity_id: entityId,
            fields: fieldsToCommit,
          }],
        }),
      })

      const data = await response.json()

      if (data.failed_count > 0) {
        setError(`Some fields failed to commit`)
      } else {
        // Clear approved fields and show success
        setApprovedFields(new Set())
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed')
    } finally {
      setIsCommitting(false)
    }
  }

  // Start new research session
  const startNewSession = () => {
    setSelectedProductId(null)
    setSelectedSubproductId(null)
    setSelectedPlatformFocus(null)
    setUserContext('')
    setResearchResult(null)
    setReadinessStatus(null)
    setApprovedFields(new Set())
    setFeedbackSubmitted(false)
    setError(null)
  }

  // Format field value for display
  const formatFieldValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Not set</span>
    }

    if (Array.isArray(value)) {
      return (
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {value.map((item, i) => (
            <li key={i} style={{ marginBottom: '4px', fontSize: '13px', lineHeight: 1.5 }}>
              {String(item)}
            </li>
          ))}
        </ul>
      )
    }

    if (typeof value === 'string') {
      return (
        <p style={{
          margin: 0,
          fontSize: '13px',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}>
          {value}
        </p>
      )
    }

    return <pre style={{ margin: 0, fontSize: '12px' }}>{JSON.stringify(value, null, 2)}</pre>
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '240px 1fr 420px',
      // Use negative margins to break out of AdminLayout's padding
      margin: '-24px -32px',
      // Fill the available space accounting for the negative margins
      height: 'calc(100% + 48px)',
      width: 'calc(100% + 64px)',
      overflow: 'hidden',
      backgroundColor: 'var(--color-bg)',
    }}>
      {/* Left Panel: Entity Selector */}
      <EntitySelector
        selectedProductId={selectedProductId}
        selectedSubproductId={selectedSubproductId}
        selectedPlatformFocus={selectedPlatformFocus}
        researchDepth={researchDepth}
        readinessStatus={readinessStatus}
        onProductSelect={setSelectedProductId}
        onSubproductSelect={setSelectedSubproductId}
        onPlatformFocusSelect={setSelectedPlatformFocus}
        onResearchDepthChange={setResearchDepth}
        onStartResearch={handleStartResearch}
        isResearching={isResearching}
        disabled={isResearching || isCommitting}
      />

      {/* Middle Panel: Research Chat / Results */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        borderRight: '1px solid var(--color-border)',
      }}>
        {/* Header - consistent 56px height */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '56px',
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Bot size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              Research Assistant
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Token Counter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              fontSize: '12px',
              color: 'var(--color-primary)',
            }}>
              <Sparkles size={14} />
              {tokensUsed.toLocaleString()} tokens
            </div>

            {/* Previous Sessions Dropdown */}
            <div ref={sessionsDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSessionsDropdown(!showSessionsDropdown)}
                className="btn-secondary"
                style={{ gap: '6px', fontSize: '13px', padding: '6px 12px' }}
                disabled={isLoadingSession}
              >
                {isLoadingSession ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <History size={14} />
                )}
                History
                <ChevronDown size={12} style={{
                  transform: showSessionsDropdown ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }} />
              </button>

              {showSessionsDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  width: '320px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 100,
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Previous Sessions</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        fetchPreviousSessions()
                      }}
                      style={{
                        padding: '4px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-secondary)',
                      }}
                      title="Refresh"
                    >
                      <RefreshCw size={14} className={isLoadingSessions ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {isLoadingSessions ? (
                    <div style={{
                      padding: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-secondary)',
                    }}>
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  ) : previousSessions.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: 'var(--color-text-secondary)',
                      fontSize: '13px',
                    }}>
                      No previous sessions
                    </div>
                  ) : (
                    <div>
                      {previousSessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => loadSession(session.id)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'none',
                            border: 'none',
                            borderBottom: '1px solid var(--color-border)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'var(--color-text)',
                            }}>
                              {session.product_name || 'Unknown Product'}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              color: 'var(--color-text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <Clock size={10} />
                              {formatRelativeTime(session.created_at)}
                            </span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '11px',
                            color: 'var(--color-text-secondary)',
                          }}>
                            {session.subproduct_name && (
                              <span style={{
                                padding: '2px 6px',
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-primary)',
                              }}>
                                {session.subproduct_name}
                              </span>
                            )}
                            <span style={{
                              padding: '2px 6px',
                              backgroundColor: session.status === 'completed'
                                ? 'rgba(34, 197, 94, 0.1)'
                                : 'rgba(234, 179, 8, 0.1)',
                              borderRadius: 'var(--radius-sm)',
                              color: session.status === 'completed'
                                ? '#22c55e'
                                : '#eab308',
                            }}>
                              {session.research_depth}
                            </span>
                            {session.tokens_used && (
                              <span>{session.tokens_used.toLocaleString()} tokens</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {researchResult && (
              <button
                onClick={startNewSession}
                className="btn-secondary"
                style={{ gap: '6px', fontSize: '13px', padding: '6px 12px' }}
              >
                <RefreshCw size={14} />
                New Research
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!researchResult ? (
            // Welcome / Context Input
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}>
              <Bot size={48} style={{ color: 'var(--color-primary)', opacity: 0.5, marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
                Research-First Schema Curator
              </h3>
              <p style={{
                margin: '0 0 24px 0',
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
                maxWidth: '400px',
              }}>
                Select a product from the left panel, then provide any additional context
                to guide the AI research.
              </p>

              {/* Context Input */}
              <div style={{ width: '100%', maxWidth: '500px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                }}>
                  Research Context (Optional)
                </label>
                <textarea
                  ref={textareaRef}
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="e.g., Focus on Google Ads best practices for lead generation campaigns..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg)',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                }}>
                  Add specific focus areas, platforms, or use cases to narrow the research scope.
                </p>
              </div>
            </div>
          ) : (
            // Chain of Thought Display
            <ChainOfThoughtDisplay
              chainOfThought={researchResult.chain_of_thought}
              reasoningSteps={researchResult.reasoning_steps}
              sources={researchResult.sources}
              onFeedback={handleFeedback}
              feedbackSubmitted={feedbackSubmitted}
            />
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            padding: '12px 20px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderTop: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-error)',
            fontSize: '14px',
          }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Right Panel: Extracted Fields */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface)',
      }}>
        {/* Header - consistent 56px height */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '56px',
          boxSizing: 'border-box',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Extracted Fields
          </h2>
          {researchResult && (
            <span style={{
              padding: '4px 10px',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-primary)',
            }}>
              {Object.keys(researchResult.extracted_fields || {}).length} fields
            </span>
          )}
        </div>

        {/* Fields List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {!researchResult ? (
            <div style={{
              padding: '40px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: 'var(--color-text-secondary)',
            }}>
              <FileText size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '14px', textAlign: 'center' }}>
                Run research to extract guidance fields
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(researchResult.extracted_fields || {}).map(([fieldName, value]) => {
                const isExpanded = expandedFields.has(fieldName)
                const isApproved = approvedFields.has(fieldName)
                const label = GUIDANCE_FIELD_LABELS[fieldName] || fieldName

                return (
                  <div
                    key={fieldName}
                    style={{
                      backgroundColor: 'var(--color-bg)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: isApproved ? '#22c55e' : 'var(--color-border)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Field Header */}
                    <div
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleFieldExpansion(fieldName)}
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} style={{ color: 'var(--color-text-secondary)' }} />
                      ) : (
                        <ChevronUp size={16} style={{ color: 'var(--color-text-secondary)', transform: 'rotate(180deg)' }} />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--color-text)',
                        }}>
                          {label}
                        </div>
                        {!isExpanded && Array.isArray(value) && (
                          <div style={{
                            fontSize: '11px',
                            color: 'var(--color-text-secondary)',
                          }}>
                            {value.length} items
                          </div>
                        )}
                      </div>

                      {isApproved && (
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#22c55e',
                        }}>
                          <Check size={12} />
                          Approved
                        </span>
                      )}
                    </div>

                    {/* Field Content (Expanded) */}
                    {isExpanded && (
                      <div style={{
                        padding: '12px 16px',
                        borderTop: '1px solid var(--color-border)',
                      }}>
                        <div style={{ marginBottom: '12px' }}>
                          {formatFieldValue(value)}
                        </div>

                        {/* Approve/Reject Buttons */}
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          paddingTop: '12px',
                          borderTop: '1px solid var(--color-border)',
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFieldApproval(fieldName)
                            }}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '8px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid',
                              borderColor: isApproved ? '#22c55e' : 'var(--color-border)',
                              backgroundColor: isApproved ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                              color: isApproved ? '#22c55e' : 'var(--color-text)',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            {isApproved ? (
                              <>
                                <Check size={14} />
                                Approved
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={14} />
                                Approve
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Cross-Entity Suggestions */}
              {researchResult.cross_entity_suggestions && researchResult.cross_entity_suggestions.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--color-text-secondary)',
                  }}>
                    Cross-Entity Intelligence
                  </h4>
                  {researchResult.cross_entity_suggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        backgroundColor: 'rgba(99, 102, 241, 0.05)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                        {suggestion.target_entity_type}: {suggestion.target_entity_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        {suggestion.suggested_field}: {String(suggestion.suggested_value).substring(0, 100)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Commit Section */}
        {researchResult && Object.keys(researchResult.extracted_fields || {}).length > 0 && (
          <div style={{
            padding: '16px',
            borderTop: '1px solid var(--color-border)',
          }}>
            {/* Approve All / Clear */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px',
            }}>
              <button
                onClick={approveAllFields}
                className="btn-secondary"
                style={{ flex: 1, fontSize: '12px', padding: '8px' }}
                disabled={approvedFields.size === Object.keys(researchResult.extracted_fields).length}
              >
                <Check size={14} />
                Approve All
              </button>
              <button
                onClick={clearApprovals}
                className="btn-secondary"
                style={{ flex: 1, fontSize: '12px', padding: '8px' }}
                disabled={approvedFields.size === 0}
              >
                <X size={14} />
                Clear
              </button>
            </div>

            {/* Commit Button */}
            <button
              onClick={handleCommit}
              className="btn-primary"
              style={{ width: '100%' }}
              disabled={approvedFields.size === 0 || isCommitting}
            >
              {isCommitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Committing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Commit {approvedFields.size} {approvedFields.size === 1 ? 'Field' : 'Fields'}
                </>
              )}
            </button>

            {approvedFields.size === 0 && (
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
              }}>
                Approve fields to enable commit
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
