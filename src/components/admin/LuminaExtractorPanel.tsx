/**
 * Lumina Extractor Panel
 * UI for fetching and configuring Lumina data extractors
 */

import { useState, useEffect } from 'react'
import {
  Link2, Loader2, AlertTriangle, Package, ChevronDown, ChevronRight,
  Check, Eye, EyeOff, Trash2, RefreshCw, Copy, ExternalLink
} from 'lucide-react'
import {
  parseLuminaUrl,
  fetchLuminaData,
  extractDataKeys,
  getNestedValue,
  formatValue,
  type LuminaOrder,
  type LuminaLineItem,
  type LuminaUrlType
} from '@/lib/luminaApi'

interface LuminaExtractorPanelProps {
  productId: string
  productName: string
  onSave?: (extractors: ExtractorConfig[]) => void
  initialExtractors?: ExtractorConfig[]
}

export interface ExtractorConfig {
  id: string
  name: string
  path: string
  description?: string
  selectedKeys: string[]
}

interface LineItemCardProps {
  lineItem: LuminaLineItem
  index: number
  isSelected: boolean
  onToggle: () => void
  onRemove: () => void
  expandedKeys: Set<string>
  onToggleKey: (key: string) => void
  selectedKeys: Set<string>
  onToggleKeySelection: (key: string) => void
}

function LineItemCard({
  lineItem,
  index,
  isSelected,
  onToggle,
  onRemove,
  expandedKeys,
  onToggleKey,
  selectedKeys,
  onToggleKeySelection
}: LineItemCardProps) {
  const [showAllKeys, setShowAllKeys] = useState(false)
  const allKeys = extractDataKeys(lineItem as Record<string, unknown>)
  const visibleKeys = showAllKeys ? allKeys : allKeys.slice(0, 8)

  const displayName = lineItem.name || lineItem.type || `Line Item ${index + 1}`
  const platform = lineItem.platform || 'Unknown Platform'

  return (
    <div
      style={{
        backgroundColor: isSelected ? 'var(--color-surface)' : 'var(--color-surface-secondary)',
        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: 'all 0.2s',
        opacity: isSelected ? 1 : 0.6
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: isSelected ? 'var(--color-primary-light)' : 'transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onToggle}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: 'var(--radius-sm)',
              border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
              backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {isSelected && <Check size={14} color="white" />}
          </button>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {platform} • {lineItem.status || 'No status'}
            </div>
          </div>
        </div>
        <button
          onClick={onRemove}
          style={{
            padding: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.15s'
          }}
          title="Remove line item"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Data Keys */}
      {isSelected && (
        <div style={{ padding: '16px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px'
          }}>
            Data Fields ({selectedKeys.size} selected)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {visibleKeys.map(key => {
              const value = getNestedValue(lineItem as Record<string, unknown>, key)
              const isKeySelected = selectedKeys.has(key)
              const isExpanded = expandedKeys.has(key)
              const hasNestedValue = typeof value === 'object' && value !== null

              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    backgroundColor: isKeySelected ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-surface-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onClick={() => onToggleKeySelection(key)}
                >
                  <button
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '3px',
                      border: `1.5px solid ${isKeySelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: isKeySelected ? 'var(--color-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleKeySelection(key)
                    }}
                  >
                    {isKeySelected && <Check size={11} color="white" />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <code style={{
                        fontSize: '12px',
                        color: isKeySelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontWeight: 500
                      }}>
                        {key}
                      </code>
                      {hasNestedValue && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleKey(key)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px',
                            cursor: 'pointer',
                            color: 'var(--color-text-muted)'
                          }}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                      maxHeight: isExpanded ? 'none' : '20px',
                      fontFamily: hasNestedValue ? 'monospace' : 'inherit'
                    }}>
                      {formatValue(value)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {allKeys.length > 8 && (
            <button
              onClick={() => setShowAllKeys(!showAllKeys)}
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                fontSize: '12px',
                color: 'var(--color-primary)',
                background: 'none',
                border: '1px solid var(--color-primary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              {showAllKeys ? 'Show Less' : `Show All ${allKeys.length} Fields`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function LuminaExtractorPanel({
  productId,
  productName,
  // onSave and initialExtractors will be used when save functionality is implemented
  // onSave,
  // initialExtractors = []
}: LuminaExtractorPanelProps) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedType, setDetectedType] = useState<LuminaUrlType | null>(null)

  // Order data state
  const [orderData, setOrderData] = useState<LuminaOrder | null>(null)
  const [lineItems, setLineItems] = useState<LuminaLineItem[]>([])
  const [selectedLineItems, setSelectedLineItems] = useState<Set<string>>(new Set())
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  // Single line item state
  const [singleLineItem, setSingleLineItem] = useState<LuminaLineItem | null>(null)

  // Detect URL type as user types
  useEffect(() => {
    if (url.trim()) {
      const parsed = parseLuminaUrl(url)
      setDetectedType(parsed?.type || null)
    } else {
      setDetectedType(null)
    }
  }, [url])

  const handleFetch = async () => {
    if (!url.trim()) return

    setIsLoading(true)
    setError(null)
    setOrderData(null)
    setLineItems([])
    setSingleLineItem(null)
    setSelectedLineItems(new Set())
    setSelectedKeys(new Set())

    const result = await fetchLuminaData(url)

    setIsLoading(false)

    if (!result.success) {
      setError(result.error || 'Failed to fetch data')
      return
    }

    if (result.type === 'order') {
      const order = result.data as LuminaOrder
      setOrderData(order)
      const items = order.lineItems || []
      setLineItems(items)
      // Select all line items by default
      setSelectedLineItems(new Set(items.map(item => item._id)))
      // Pre-select common useful keys
      const commonKeys = ['name', 'type', 'platform', 'status', 'budget', 'spent', 'impressions', 'clicks']
      setSelectedKeys(new Set(commonKeys))
    } else {
      const lineItem = result.data as LuminaLineItem
      setSingleLineItem(lineItem)
      // Pre-select common useful keys
      const commonKeys = ['name', 'type', 'platform', 'status', 'budget', 'spent', 'impressions', 'clicks']
      setSelectedKeys(new Set(commonKeys))
    }
  }

  const handleToggleLineItem = (id: string) => {
    setSelectedLineItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleRemoveLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item._id !== id))
    setSelectedLineItems(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleToggleKey = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleToggleKeySelection = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSelectAllKeys = () => {
    if (lineItems.length > 0) {
      const allKeys = new Set<string>()
      lineItems.forEach(item => {
        extractDataKeys(item as Record<string, unknown>).forEach(key => allKeys.add(key))
      })
      setSelectedKeys(allKeys)
    } else if (singleLineItem) {
      setSelectedKeys(new Set(extractDataKeys(singleLineItem as Record<string, unknown>)))
    }
  }

  const handleDeselectAllKeys = () => {
    setSelectedKeys(new Set())
  }

  const handleCopyConfig = () => {
    const config = {
      productId,
      productName,
      selectedLineItems: Array.from(selectedLineItems),
      selectedKeys: Array.from(selectedKeys),
      orderData: orderData ? { _id: orderData._id, name: orderData.name } : null
    }
    navigator.clipboard.writeText(JSON.stringify(config, null, 2))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* URL Input Section */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <Link2 size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Fetch Lumina Data
          </h3>
        </div>

        <p style={{
          margin: '0 0 16px 0',
          fontSize: '13px',
          color: 'var(--color-text-secondary)'
        }}>
          Paste a Lumina order or line item URL to fetch and configure the data you want to use for this product.
        </p>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://townsquarelumina.com/lumina/view/order/..."
              className="input-field"
              style={{ width: '100%' }}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            />
            {detectedType && (
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: detectedType === 'order' ? 'var(--color-primary-light)' : 'rgba(59, 130, 246, 0.1)',
                  color: detectedType === 'order' ? 'var(--color-primary)' : '#3b82f6',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  {detectedType}
                </span>
                <span>
                  {detectedType === 'order'
                    ? 'Will fetch order with all line items'
                    : 'Will fetch single line item'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleFetch}
            disabled={isLoading || !url.trim()}
            className="btn-primary"
            style={{ minWidth: '120px' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Fetch Data
              </>
            )}
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--color-error)'
          }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Order Data Display */}
      {orderData && (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {orderData.name || 'Order'}
              </h3>
              <div style={{
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                marginTop: '4px'
              }}>
                {orderData.advertiser && <span>{orderData.advertiser} • </span>}
                {lineItems.length} line items • {selectedLineItems.size} selected
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCopyConfig}
                className="btn-secondary"
                style={{ padding: '8px 12px' }}
                title="Copy configuration"
              >
                <Copy size={16} />
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ padding: '8px 12px', textDecoration: 'none' }}
                title="Open in Lumina"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          {/* Key Selection Controls */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--color-border)'
          }}>
            <button
              onClick={handleSelectAllKeys}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <Eye size={14} />
              Select All Keys
            </button>
            <button
              onClick={handleDeselectAllKeys}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <EyeOff size={14} />
              Deselect All
            </button>
            <div style={{
              marginLeft: 'auto',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}>
              {selectedKeys.size} keys selected
            </div>
          </div>

          {/* Line Item Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '16px'
          }}>
            {lineItems.map((lineItem, index) => (
              <LineItemCard
                key={lineItem._id}
                lineItem={lineItem}
                index={index}
                isSelected={selectedLineItems.has(lineItem._id)}
                onToggle={() => handleToggleLineItem(lineItem._id)}
                onRemove={() => handleRemoveLineItem(lineItem._id)}
                expandedKeys={expandedKeys}
                onToggleKey={handleToggleKey}
                selectedKeys={selectedKeys}
                onToggleKeySelection={handleToggleKeySelection}
              />
            ))}
          </div>

          {lineItems.length === 0 && (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--color-text-muted)'
            }}>
              <Package size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No line items found in this order</p>
            </div>
          )}
        </div>
      )}

      {/* Single Line Item Display */}
      {singleLineItem && (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {singleLineItem.name || 'Line Item'}
              </h3>
              <div style={{
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                marginTop: '4px'
              }}>
                {singleLineItem.platform || 'Unknown platform'} • {singleLineItem.status || 'No status'}
              </div>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: '8px 12px', textDecoration: 'none' }}
            >
              <ExternalLink size={16} />
            </a>
          </div>

          {/* Key Selection Controls */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--color-border)'
          }}>
            <button
              onClick={handleSelectAllKeys}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <Eye size={14} />
              Select All Keys
            </button>
            <button
              onClick={handleDeselectAllKeys}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <EyeOff size={14} />
              Deselect All
            </button>
          </div>

          {/* Data Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {extractDataKeys(singleLineItem as Record<string, unknown>).map(key => {
              const value = getNestedValue(singleLineItem as Record<string, unknown>, key)
              const isKeySelected = selectedKeys.has(key)
              const isExpanded = expandedKeys.has(key)
              const hasNestedValue = typeof value === 'object' && value !== null

              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    backgroundColor: isKeySelected ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-surface-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onClick={() => handleToggleKeySelection(key)}
                >
                  <button
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '3px',
                      border: `1.5px solid ${isKeySelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: isKeySelected ? 'var(--color-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    {isKeySelected && <Check size={11} color="white" />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <code style={{
                        fontSize: '12px',
                        color: isKeySelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontWeight: 500
                      }}>
                        {key}
                      </code>
                      {hasNestedValue && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleKey(key)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px',
                            cursor: 'pointer',
                            color: 'var(--color-text-muted)'
                          }}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                      maxHeight: isExpanded ? 'none' : '20px',
                      fontFamily: hasNestedValue ? 'monospace' : 'inherit'
                    }}>
                      {formatValue(value)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary / Save Section */}
      {(selectedLineItems.size > 0 || singleLineItem) && selectedKeys.size > 0 && (
        <div style={{
          backgroundColor: 'var(--color-primary-light)',
          border: '1px solid var(--color-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
              Configuration Summary
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              {singleLineItem ? '1 line item' : `${selectedLineItems.size} line items`} with {selectedKeys.size} data keys selected
            </div>
          </div>
          <button className="btn-primary">
            Save Configuration
          </button>
        </div>
      )}
    </div>
  )
}
