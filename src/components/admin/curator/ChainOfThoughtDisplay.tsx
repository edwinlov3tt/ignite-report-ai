/**
 * ChainOfThoughtDisplay Component
 * Displays AI reasoning steps with collapsible details and feedback buttons
 */

import { useState } from 'react'
import {
  ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, ExternalLink,
  Brain, Lightbulb, AlertCircle, CheckCircle
} from 'lucide-react'
import type {
  ReasoningStep,
  SourceWithAuthority,
  FeedbackType,
} from '@/types/curator'
import { getAuthorityBadge } from '@/types/curator'

interface ChainOfThoughtDisplayProps {
  chainOfThought: string
  reasoningSteps: ReasoningStep[]
  sources: SourceWithAuthority[]
  onFeedback: (type: FeedbackType, fieldName?: string) => void
  feedbackSubmitted: boolean
}

export function ChainOfThoughtDisplay({
  chainOfThought,
  reasoningSteps,
  sources,
  onFeedback,
  feedbackSubmitted,
}: ChainOfThoughtDisplayProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]))
  const [showFullChainOfThought, setShowFullChainOfThought] = useState(false)

  const toggleStep = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber)
    } else {
      newExpanded.add(stepNumber)
    }
    setExpandedSteps(newExpanded)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return '#22c55e'
    if (confidence >= 0.70) return '#eab308'
    return '#ef4444'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.85) return <CheckCircle size={14} style={{ color: '#22c55e' }} />
    if (confidence >= 0.70) return <Lightbulb size={14} style={{ color: '#eab308' }} />
    return <AlertCircle size={14} style={{ color: '#ef4444' }} />
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header with Feedback Buttons - consistent 56px height */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--color-surface)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
            AI Research Analysis
          </h3>
        </div>

        {/* Feedback Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onFeedback('good')}
            disabled={feedbackSubmitted}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid',
              borderColor: feedbackSubmitted ? 'var(--color-border)' : '#22c55e',
              backgroundColor: feedbackSubmitted ? 'var(--color-bg)' : 'rgba(34, 197, 94, 0.1)',
              color: feedbackSubmitted ? 'var(--color-text-secondary)' : '#22c55e',
              fontSize: '12px',
              fontWeight: 500,
              cursor: feedbackSubmitted ? 'not-allowed' : 'pointer',
            }}
          >
            <ThumbsUp size={14} />
            Good
          </button>
          <button
            onClick={() => onFeedback('bad')}
            disabled={feedbackSubmitted}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid',
              borderColor: feedbackSubmitted ? 'var(--color-border)' : '#ef4444',
              backgroundColor: feedbackSubmitted ? 'var(--color-bg)' : 'rgba(239, 68, 68, 0.1)',
              color: feedbackSubmitted ? 'var(--color-text-secondary)' : '#ef4444',
              fontSize: '12px',
              fontWeight: 500,
              cursor: feedbackSubmitted ? 'not-allowed' : 'pointer',
            }}
          >
            <ThumbsDown size={14} />
            Bad
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Reasoning Steps */}
        <div>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text)',
          }}>
            Reasoning Steps
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reasoningSteps.map((step) => {
              const isExpanded = expandedSteps.has(step.step_number)

              return (
                <div
                  key={step.step_number}
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Step Header */}
                  <div
                    onClick={() => toggleStep(step.step_number)}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    ) : (
                      <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    )}

                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                    }}>
                      {step.step_number}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--color-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {step.description.split('\n')[0]}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: `${getConfidenceColor(step.confidence)}15`,
                    }}>
                      {getConfidenceIcon(step.confidence)}
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: getConfidenceColor(step.confidence),
                      }}>
                        {Math.round(step.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Step Content (Expanded) */}
                  {isExpanded && (
                    <div style={{
                      padding: '12px 16px',
                      paddingTop: 0,
                      borderTop: '1px solid var(--color-border)',
                    }}>
                      <p style={{
                        margin: '12px 0',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        color: 'var(--color-text-secondary)',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {step.description}
                      </p>

                      {step.sources_used.length > 0 && (
                        <div>
                          <h5 style={{
                            margin: '8px 0 4px 0',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            color: 'var(--color-text-secondary)',
                          }}>
                            Sources Used
                          </h5>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {step.sources_used.map((sourceUrl, i) => {
                              const source = sources.find(s => s.url === sourceUrl)
                              const badge = source ? getAuthorityBadge(source.authority_tier) : null

                              return (
                                <a
                                  key={i}
                                  href={sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                    fontSize: '11px',
                                    color: 'var(--color-primary)',
                                    textDecoration: 'none',
                                  }}
                                >
                                  {badge && (
                                    <span style={{ color: badge.color }}>{badge.icon}</span>
                                  )}
                                  {source?.domain || (() => { try { return new URL(sourceUrl).hostname } catch { return sourceUrl } })()}
                                  <ExternalLink size={10} />
                                </a>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Full Chain of Thought (Collapsible) */}
        <div>
          <button
            onClick={() => setShowFullChainOfThought(!showFullChainOfThought)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: 0,
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            {showFullChainOfThought ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            Full Reasoning Narrative
          </button>

          {showFullChainOfThought && (
            <div style={{
              marginTop: '12px',
              padding: '16px',
              backgroundColor: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}>
              <div
                style={{
                  fontSize: '13px',
                  lineHeight: 1.7,
                  color: 'var(--color-text)',
                  whiteSpace: 'pre-wrap',
                }}
                dangerouslySetInnerHTML={{
                  __html: chainOfThought
                    .replace(/\n/g, '<br/>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                }}
              />
            </div>
          )}
        </div>

        {/* Sources Summary */}
        <div>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text)',
          }}>
            Sources ({sources.length})
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sources.slice(0, 5).map((source, i) => {
              const badge = getAuthorityBadge(source.authority_tier)

              return (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span style={{
                    fontSize: '16px',
                    color: badge.color,
                  }}>
                    {badge.icon}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--color-text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {source.title || source.domain}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--color-text-secondary)',
                    }}>
                      {source.domain} • {source.authority_tier}
                    </div>
                  </div>

                  <ExternalLink size={14} style={{ color: 'var(--color-text-secondary)' }} />
                </a>
              )
            })}

            {sources.length > 5 && (
              <div style={{
                padding: '8px',
                textAlign: 'center',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
              }}>
                +{sources.length - 5} more sources
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
