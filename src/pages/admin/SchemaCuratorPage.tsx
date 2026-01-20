import { useState, useRef, useEffect } from 'react'
import {
  Bot, Send, Loader2, AlertTriangle, CheckCircle2,
  FileText, Link2, Type, Sparkles, ChevronDown, ChevronUp,
  RefreshCw, Trash2, Smartphone, Factory, Package, Layers, Target,
  Check, X, Upload, Search, Lightbulb
} from 'lucide-react'
import type {
  ExtractedItem,
  ExtractedField,
  ChatMessage,
  EntityType,
  CommitResponse,
} from '@/types/curator'
import {
  ENTITY_TYPES,
  getConfidenceLevel,
  getConfidenceColor,
} from '@/types/curator'

const API_BASE = import.meta.env.VITE_API_URL || 'https://report-ai-api.edwin-6f1.workers.dev'

export function SchemaCuratorPage() {
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pendingItems, setPendingItems] = useState<ExtractedItem[]>([])
  const [approvedItemIds, setApprovedItemIds] = useState<Set<string>>(new Set())
  const [tokensUsed, setTokensUsed] = useState(0)
  const [tokensLimit, setTokensLimit] = useState(500000)
  const [isCommitting, setIsCommitting] = useState(false)
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null)

  // Input state
  const [inputMode, setInputMode] = useState<'text' | 'url' | 'file' | 'research'>('text')
  const [inputContent, setInputContent] = useState('')
  const [targetTypes, setTargetTypes] = useState<EntityType[]>([])
  const [isResearching, setIsResearching] = useState(false)

  // UI state
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle extraction
  const handleExtract = async () => {
    if (!inputContent.trim()) return

    setIsExtracting(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/curator/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          content: inputContent,
          content_type: inputMode === 'url' ? 'url' : inputMode === 'file' ? 'file_content' : 'text',
          target_types: targetTypes.length > 0 ? targetTypes : undefined,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Extraction failed')
      }

      // Update session state
      setSessionId(data.session_id)
      setTokensUsed(prev => prev + data.tokens_used)

      // Add user message
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: inputContent.length > 200
          ? `${inputContent.substring(0, 200)}...`
          : inputContent,
        timestamp: new Date().toISOString(),
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.message || `Extracted ${data.extracted_items.length} items`,
        timestamp: new Date().toISOString(),
        metadata: {
          extracted_items: data.extracted_items.length,
          tokens_used: data.tokens_used,
        },
      }

      setMessages(prev => [...prev, userMessage, assistantMessage])
      setPendingItems(prev => [...prev, ...data.extracted_items])

      // Auto-expand new items
      const newExpandedIds = new Set(expandedItems)
      data.extracted_items.forEach((item: ExtractedItem) => newExpandedIds.add(item.id))
      setExpandedItems(newExpandedIds)

      // Clear input
      setInputContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsExtracting(false)
    }
  }

  // Toggle item expansion
  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  // Remove pending item
  const removeItem = (itemId: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== itemId))
  }

  // Start new session
  const startNewSession = () => {
    setSessionId(null)
    setMessages([])
    setPendingItems([])
    setApprovedItemIds(new Set())
    setTokensUsed(0)
    setInputContent('')
    setError(null)
    setCommitResult(null)
  }

  // Toggle target type filter
  const toggleTargetType = (type: EntityType) => {
    setTargetTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // Approve an item for commit
  const approveItem = (itemId: string) => {
    setApprovedItemIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Commit approved items
  const commitItems = async () => {
    const itemsToCommit = pendingItems.filter(item => approvedItemIds.has(item.id))
    if (itemsToCommit.length === 0) return

    setIsCommitting(true)
    setError(null)
    setCommitResult(null)

    try {
      const response = await fetch(`${API_BASE}/curator/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          items: itemsToCommit.map(item => ({
            entity_type: item.entity_type,
            fields: item.fields,
          })),
        }),
      })

      const data: CommitResponse = await response.json()

      if (data.failed_count > 0) {
        const failedErrors = data.results.filter(r => !r.success).map(r => r.error).join(', ')
        setError(`Some items failed to commit: ${failedErrors}`)
      }

      setCommitResult(data)

      // Remove successfully committed items from pending
      const committedIds = new Set(
        data.results.filter(r => r.success).map((_, idx) => itemsToCommit[idx].id)
      )
      setPendingItems(prev => prev.filter(item => !committedIds.has(item.id)))
      setApprovedItemIds(prev => {
        const newSet = new Set(prev)
        committedIds.forEach(id => newSet.delete(id))
        return newSet
      })

      // Add success message
      const successMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Successfully committed ${data.committed_count} item${data.committed_count !== 1 ? 's' : ''} to the database.${data.failed_count > 0 ? ` ${data.failed_count} item${data.failed_count !== 1 ? 's' : ''} failed.` : ''}`,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, successMsg])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed')
    } finally {
      setIsCommitting(false)
    }
  }

  // Approve all pending items
  const approveAll = () => {
    setApprovedItemIds(new Set(pendingItems.map(item => item.id)))
  }

  // Clear all approvals
  const clearApprovals = () => {
    setApprovedItemIds(new Set())
  }

  // Handle research request (AI-powered industry seeding)
  const handleResearch = async () => {
    if (!inputContent.trim()) return

    setIsResearching(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/curator/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: inputContent,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Research failed')
      }

      // Update tokens
      setTokensUsed(prev => prev + data.tokens_used)

      // Add user message
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: `Research request: ${inputContent}`,
        timestamp: new Date().toISOString(),
      }

      // Add assistant message with research summary
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: `${data.research_summary}\n\nResearched ${data.sources_used.length} sources to create this industry profile.`,
        timestamp: new Date().toISOString(),
        metadata: {
          extracted_items: data.extracted_items.length,
          tokens_used: data.tokens_used,
        },
      }

      setMessages(prev => [...prev, userMessage, assistantMessage])
      setPendingItems(prev => [...prev, ...data.extracted_items])

      // Auto-expand new items
      const newExpandedIds = new Set(expandedItems)
      data.extracted_items.forEach((item: ExtractedItem) => newExpandedIds.add(item.id))
      setExpandedItems(newExpandedIds)

      // Clear input
      setInputContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed')
    } finally {
      setIsResearching(false)
    }
  }

  // Handle submit based on mode
  const handleSubmit = () => {
    if (inputMode === 'research') {
      handleResearch()
    } else {
      handleExtract()
    }
  }

  // Get entity type icon component
  const getEntityTypeIcon = (type: EntityType, size = 18) => {
    const iconProps = { size, strokeWidth: 1.5 }
    switch (type) {
      case 'platform': return <Smartphone {...iconProps} />
      case 'industry': return <Factory {...iconProps} />
      case 'product': return <Package {...iconProps} />
      case 'subproduct': return <Layers {...iconProps} />
      case 'tactic_type': return <Target {...iconProps} />
      case 'soul_doc': return <FileText {...iconProps} />
      default: return <FileText {...iconProps} />
    }
  }

  // Get entity type display info
  const getEntityTypeInfo = (type: EntityType) => {
    return ENTITY_TYPES.find(t => t.value === type) || { value: type, label: type }
  }

  // Format confidence display
  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`
  }

  // Format field value for display
  const formatFieldValue = (name: string, value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Not set</span>
    }

    // Handle complex objects
    if (typeof value === 'object') {
      // Benchmarks - show summary
      if (name === 'benchmarks' && typeof value === 'object') {
        const b = value as Record<string, unknown>
        const cpc = b.cpc_range as { min: number; max: number; avg: number } | undefined
        const cpa = b.cpa_range as { min: number; max: number; avg: number } | undefined
        const ctr = b.ctr_range as { min: number; max: number; avg: number } | undefined
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {cpc && <span>CPC: ${cpc.min.toFixed(2)} - ${cpc.max.toFixed(2)} (avg ${cpc.avg.toFixed(2)})</span>}
            {cpa && <span>CPA: ${cpa.min.toFixed(0)} - ${cpa.max.toFixed(0)} (avg ${cpa.avg.toFixed(0)})</span>}
            {ctr && <span>CTR: {ctr.min.toFixed(1)}% - {ctr.max.toFixed(1)}% (avg {ctr.avg.toFixed(1)}%)</span>}
            {b.notes && (
              <details style={{ marginTop: '4px' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '12px' }}>View notes</summary>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {String(b.notes)}
                </p>
              </details>
            )}
          </div>
        )
      }

      // Seasonality - show summary
      if (name === 'seasonality' && typeof value === 'object') {
        const s = value as Record<string, unknown>
        const peakMonths = s.peak_months as number[] | undefined
        const slowMonths = s.slow_months as number[] | undefined
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {peakMonths && <span>Peak: {peakMonths.map(m => monthNames[m - 1]).join(', ')}</span>}
            {slowMonths && <span>Slow: {slowMonths.map(m => monthNames[m - 1]).join(', ')}</span>}
            {s.notes && (
              <details style={{ marginTop: '4px' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '12px' }}>View details</summary>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {String(s.notes)}
                </p>
              </details>
            )}
          </div>
        )
      }

      // Insights - show list
      if (name === 'insights' && Array.isArray(value)) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>{value.length} insights</span>
            <details>
              <summary style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '12px' }}>View all</summary>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '12px' }}>
                {value.map((insight: { topic: string; content: string }, i: number) => (
                  <li key={i} style={{ marginBottom: '4px' }}>
                    <strong>{insight.topic}</strong>
                    <details>
                      <summary style={{ cursor: 'pointer', color: 'var(--color-text-secondary)' }}>Details</summary>
                      <p style={{ margin: '2px 0', color: 'var(--color-text-secondary)' }}>{insight.content}</p>
                    </details>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )
      }

      // Research metadata - show summary
      if (name === 'research_metadata' && typeof value === 'object') {
        const m = value as Record<string, unknown>
        const sources = m.sources as string[] | undefined
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>{sources?.length || 0} sources researched</span>
            {m.researched_at && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {new Date(m.researched_at as string).toLocaleString()}
              </span>
            )}
          </div>
        )
      }

      // Default object handling - show JSON
      return (
        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '12px' }}>View data</summary>
          <pre style={{
            margin: '4px 0 0 0',
            fontSize: '11px',
            backgroundColor: 'var(--color-bg)',
            padding: '8px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '200px',
          }}>
            {JSON.stringify(value, null, 2)}
          </pre>
        </details>
      )
    }

    // Long text fields - show with expandable
    if (typeof value === 'string' && (name === 'buyer_notes' || name === 'description') && value.length > 200) {
      return (
        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '12px' }}>
            {value.substring(0, 100)}...
          </summary>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            whiteSpace: 'pre-wrap',
            maxHeight: '300px',
            overflow: 'auto',
          }}>
            {value}
          </p>
        </details>
      )
    }

    // Simple values
    return String(value)
  }

  // Token budget percentage
  const tokenBudgetPercent = (tokensUsed / tokensLimit) * 100
  const tokenBudgetStatus = tokenBudgetPercent >= 100 ? 'exceeded' :
                           tokenBudgetPercent >= 80 ? 'warning' : 'ok'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Page Header */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '20px 24px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Bot size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
              Schema Curator
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              AI-powered schema data extraction and management
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Token Budget */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: tokenBudgetStatus === 'ok' ? 'rgba(34, 197, 94, 0.1)' :
                            tokenBudgetStatus === 'warning' ? 'rgba(234, 179, 8, 0.1)' :
                            'rgba(239, 68, 68, 0.1)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
          }}>
            <Sparkles size={14} />
            <span>{tokensUsed.toLocaleString()} / {tokensLimit.toLocaleString()} tokens</span>
          </div>

          {/* New Session Button */}
          {sessionId && (
            <button
              onClick={startNewSession}
              className="btn-secondary"
              style={{ gap: '6px' }}
            >
              <RefreshCw size={16} />
              New Session
            </button>
          )}
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '16px',
        flex: 1,
        minHeight: 0,
      }}>
        {/* Left Column: Chat + Input */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}>
          {/* Chat Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {messages.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
                padding: '40px',
              }}>
                <Bot size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <h3 style={{ margin: '0 0 8px 0', fontWeight: 500 }}>
                  Start Extracting Schema Data
                </h3>
                <p style={{ margin: 0, maxWidth: '400px', fontSize: '14px' }}>
                  Paste text, enter a URL, or upload a file containing information about
                  platforms, industries, products, or other schema entities.
                </p>
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: message.role === 'user'
                      ? 'rgba(99, 102, 241, 0.1)'
                      : 'rgba(34, 197, 94, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {message.role === 'user' ? (
                      <Type size={16} style={{ color: 'var(--color-primary)' }} />
                    ) : (
                      <Bot size={16} style={{ color: '#22c55e' }} />
                    )}
                  </div>
                  <div style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: message.role === 'user'
                      ? 'rgba(99, 102, 241, 0.1)'
                      : 'var(--color-bg)',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {message.content}
                    {message.metadata?.tokens_used && (
                      <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--color-border)',
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                      }}>
                        Tokens used: {message.metadata.tokens_used.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
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

          {/* Input Area */}
          <div style={{
            borderTop: '1px solid var(--color-border)',
            padding: '16px 20px',
          }}>
            {/* Input Mode Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px',
            }}>
              {[
                { mode: 'text' as const, icon: <Type size={14} />, label: 'Text' },
                { mode: 'url' as const, icon: <Link2 size={14} />, label: 'URL' },
                { mode: 'file' as const, icon: <FileText size={14} />, label: 'File' },
                { mode: 'research' as const, icon: <Search size={14} />, label: 'Research' },
              ].map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: inputMode === mode ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: inputMode === mode ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    color: inputMode === mode ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {icon}
                  {label}
                </button>
              ))}

              {/* Target Type Filters */}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                {ENTITY_TYPES.slice(0, 4).map(type => (
                  <button
                    key={type.value}
                    onClick={() => toggleTargetType(type.value)}
                    title={`Filter: ${type.label}`}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid',
                      borderColor: targetTypes.includes(type.value) ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: targetTypes.includes(type.value) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      color: targetTypes.includes(type.value) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getEntityTypeIcon(type.value, 16)}
                  </button>
                ))}
              </div>
            </div>

            {/* Text/URL Input */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <textarea
                ref={textareaRef}
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder={
                  inputMode === 'url'
                    ? 'Enter a URL to extract schema data from...'
                    : inputMode === 'file'
                    ? 'File upload coming soon. For now, paste the file contents here...'
                    : inputMode === 'research'
                    ? 'e.g., "Create an industry for Electric Services with benchmarks" or "Research jewelry industry for Northeastern Fine Jewelry"'
                    : 'Paste or type content containing platform, industry, or product information...'
                }
                style={{
                  flex: 1,
                  minHeight: '80px',
                  maxHeight: '200px',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={(isExtracting || isResearching) || !inputContent.trim() || tokenBudgetStatus === 'exceeded'}
                className="btn-primary"
                style={{
                  alignSelf: 'flex-end',
                  minWidth: '100px',
                  height: '44px',
                }}
              >
                {isExtracting || isResearching ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : inputMode === 'research' ? (
                  <>
                    <Search size={18} />
                    Research
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Extract
                  </>
                )}
              </button>
            </div>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
            }}>
              Press <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--color-bg)', borderRadius: '4px' }}>⌘</kbd>+<kbd style={{ padding: '2px 6px', backgroundColor: 'var(--color-bg)', borderRadius: '4px' }}>Enter</kbd> to extract
            </p>
          </div>
        </div>

        {/* Right Column: Review Panel */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Review Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              Extracted Items
            </h2>
            <span style={{
              padding: '4px 10px',
              backgroundColor: pendingItems.length > 0 ? 'rgba(99, 102, 241, 0.1)' : 'var(--color-bg)',
              borderRadius: 'var(--radius-full)',
              fontSize: '13px',
              fontWeight: 500,
              color: pendingItems.length > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}>
              {pendingItems.length} pending
            </span>
          </div>

          {/* Extracted Items List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
          }}>
            {pendingItems.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-secondary)',
              }}>
                <FileText size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>
                  No items extracted yet
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingItems.map(item => {
                  const typeInfo = getEntityTypeInfo(item.entity_type)
                  const nameField = item.fields.find(f => f.name === 'name')
                  const isExpanded = expandedItems.has(item.id)

                  return (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: 'var(--color-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Item Header */}
                      <div
                        onClick={() => toggleItem(item.id)}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ color: 'var(--color-primary)', display: 'flex' }}>{getEntityTypeIcon(item.entity_type, 20)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {nameField ? String(nameField.value) : 'Unnamed'}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--color-text-secondary)',
                          }}>
                            {typeInfo.label}
                          </div>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}>
                          {approvedItemIds.has(item.id) && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              fontWeight: 500,
                              backgroundColor: 'rgba(34, 197, 94, 0.15)',
                              color: '#22c55e',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <Check size={12} />
                              Ready
                            </span>
                          )}
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: getConfidenceLevel(item.overall_confidence) === 'high'
                              ? 'rgba(34, 197, 94, 0.1)'
                              : getConfidenceLevel(item.overall_confidence) === 'medium'
                              ? 'rgba(234, 179, 8, 0.1)'
                              : 'rgba(239, 68, 68, 0.1)',
                            color: getConfidenceColor(item.overall_confidence),
                          }}>
                            {formatConfidence(item.overall_confidence)}
                          </span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Item Details (Expanded) */}
                      {isExpanded && (
                        <div style={{
                          padding: '12px 16px',
                          borderTop: '1px solid var(--color-border)',
                        }}>
                          {/* Classification Reason */}
                          <div style={{
                            marginBottom: '12px',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(99, 102, 241, 0.05)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '13px',
                            color: 'var(--color-text-secondary)',
                          }}>
                            {item.classification_reason}
                          </div>

                          {/* Fields */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {item.fields.map((field, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '8px',
                                  fontSize: '13px',
                                }}
                              >
                                <span style={{
                                  minWidth: '100px',
                                  flexShrink: 0,
                                  color: 'var(--color-text-secondary)',
                                }}>
                                  {field.name}:
                                </span>
                                <div style={{ flex: 1, wordBreak: 'break-word' }}>
                                  {formatFieldValue(field.name, field.value)}
                                </div>
                                <span style={{
                                  color: getConfidenceColor(field.confidence),
                                  fontSize: '11px',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {formatConfidence(field.confidence)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Actions */}
                          <div style={{
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid var(--color-border)',
                            display: 'flex',
                            gap: '8px',
                          }}>
                            <button
                              onClick={() => approveItem(item.id)}
                              className={approvedItemIds.has(item.id) ? 'btn-success' : 'btn-primary'}
                              style={{
                                flex: 1,
                                fontSize: '13px',
                                padding: '8px',
                                backgroundColor: approvedItemIds.has(item.id) ? 'rgba(34, 197, 94, 0.15)' : undefined,
                                borderColor: approvedItemIds.has(item.id) ? '#22c55e' : undefined,
                                color: approvedItemIds.has(item.id) ? '#22c55e' : undefined,
                              }}
                            >
                              {approvedItemIds.has(item.id) ? (
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
                            <button
                              onClick={() => removeItem(item.id)}
                              className="btn-secondary"
                              style={{ fontSize: '13px', padding: '8px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Commit Section */}
          {pendingItems.length > 0 && (
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--color-border)',
            }}>
              {/* Approve All / Clear Actions */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
              }}>
                <button
                  onClick={approveAll}
                  className="btn-secondary"
                  style={{ flex: 1, fontSize: '13px', padding: '8px' }}
                  disabled={approvedItemIds.size === pendingItems.length}
                >
                  <Check size={14} />
                  Approve All
                </button>
                <button
                  onClick={clearApprovals}
                  className="btn-secondary"
                  style={{ flex: 1, fontSize: '13px', padding: '8px' }}
                  disabled={approvedItemIds.size === 0}
                >
                  <X size={14} />
                  Clear
                </button>
              </div>

              {/* Commit Button */}
              <button
                onClick={commitItems}
                className="btn-primary"
                style={{ width: '100%' }}
                disabled={approvedItemIds.size === 0 || isCommitting}
              >
                {isCommitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Committing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Commit {approvedItemIds.size} {approvedItemIds.size === 1 ? 'Item' : 'Items'}
                  </>
                )}
              </button>
              {approvedItemIds.size === 0 && (
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  textAlign: 'center',
                }}>
                  Approve items to enable commit
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
