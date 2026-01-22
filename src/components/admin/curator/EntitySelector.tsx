/**
 * EntitySelector Component
 * Allows selection of product, subproduct, and platform for research
 */

import { useState, useEffect } from 'react'
import {
  ChevronDown, AlertTriangle, CheckCircle, Package, Layers, Smartphone
} from 'lucide-react'
import { getProducts, type Product } from '@/lib/schemaApi'
import type { ResearchReadiness, ResearchDepth } from '@/types/curator'
import { RESEARCH_DEPTHS } from '@/types/curator'

interface EntitySelectorProps {
  selectedProductId: string | null
  selectedSubproductId: string | null
  selectedPlatformFocus: string | null
  researchDepth: ResearchDepth
  readinessStatus: ResearchReadiness | null
  onProductSelect: (productId: string | null) => void
  onSubproductSelect: (subproductId: string | null) => void
  onPlatformFocusSelect: (platform: string | null) => void
  onResearchDepthChange: (depth: ResearchDepth) => void
  onStartResearch: () => void
  isResearching: boolean
  disabled?: boolean
}

export function EntitySelector({
  selectedProductId,
  selectedSubproductId,
  selectedPlatformFocus,
  researchDepth,
  readinessStatus,
  onProductSelect,
  onSubproductSelect,
  onPlatformFocusSelect,
  onResearchDepthChange,
  onStartResearch,
  isResearching,
  disabled = false,
}: EntitySelectorProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Load products on mount
  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProducts()
        setProducts(data)
      } catch (error) {
        console.error('Failed to load products:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  // Get selected product data
  const selectedProduct = products.find(p => p.id === selectedProductId)
  const subproducts = selectedProduct?.subproducts || []
  const selectedSubproduct = subproducts.find(sp => sp.id === selectedSubproductId)

  // Aggregate platforms from product and subproduct
  const availablePlatforms = new Set<string>([
    ...(selectedProduct?.platforms || []),
    ...(selectedSubproduct?.platforms || []),
  ])

  // Handle product change - reset subproduct and platform
  const handleProductChange = (productId: string) => {
    onProductSelect(productId || null)
    onSubproductSelect(null)
    onPlatformFocusSelect(null)
  }

  // Handle subproduct change - optionally reset platform
  const handleSubproductChange = (subproductId: string) => {
    onSubproductSelect(subproductId || null)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--color-surface)',
    }}>
      {/* Header - matches other panel headers (56px) */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '56px',
        boxSizing: 'border-box',
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
          Research Target
        </h3>
        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          Select entity to research
        </p>
      </div>

      {/* Selectors */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Product Selector (Required) */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text)',
          }}>
            <Package size={14} />
            Product *
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedProductId || ''}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={disabled || loading}
              style={{
                width: '100%',
                padding: '8px 28px 8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                fontSize: '13px',
                cursor: 'pointer',
                appearance: 'none',
              }}
            >
              <option value="">Select product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--color-text-secondary)',
              }}
            />
          </div>
        </div>

        {/* Subproduct Selector (Optional) */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text)',
          }}>
            <Layers size={14} />
            Subproduct
            <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedSubproductId || ''}
              onChange={(e) => handleSubproductChange(e.target.value)}
              disabled={disabled || !selectedProductId || subproducts.length === 0}
              style={{
                width: '100%',
                padding: '8px 28px 8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                fontSize: '13px',
                cursor: selectedProductId ? 'pointer' : 'not-allowed',
                appearance: 'none',
                opacity: selectedProductId ? 1 : 0.6,
              }}
            >
              <option value="">All subproducts</option>
              {subproducts.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--color-text-secondary)',
              }}
            />
          </div>
        </div>

        {/* Platform Focus (Optional) */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text)',
          }}>
            <Smartphone size={14} />
            Platform Focus
            <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedPlatformFocus || ''}
              onChange={(e) => onPlatformFocusSelect(e.target.value || null)}
              disabled={disabled || availablePlatforms.size === 0}
              style={{
                width: '100%',
                padding: '8px 28px 8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                fontSize: '13px',
                cursor: availablePlatforms.size > 0 ? 'pointer' : 'not-allowed',
                appearance: 'none',
                opacity: availablePlatforms.size > 0 ? 1 : 0.6,
              }}
            >
              <option value="">All platforms</option>
              {Array.from(availablePlatforms).map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--color-text-secondary)',
              }}
            />
          </div>
        </div>

        {/* Research Depth */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text)',
          }}>
            Research Depth
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {RESEARCH_DEPTHS.map(depth => (
              <label
                key={depth.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: researchDepth === depth.value ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: researchDepth === depth.value ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <input
                  type="radio"
                  name="researchDepth"
                  value={depth.value}
                  checked={researchDepth === depth.value}
                  onChange={(e) => onResearchDepthChange(e.target.value as ResearchDepth)}
                  disabled={disabled}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{depth.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {depth.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />

        {/* Readiness Status */}
        {readinessStatus && (
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: readinessStatus.is_ready
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(234, 179, 8, 0.1)',
            border: '1px solid',
            borderColor: readinessStatus.is_ready
              ? 'rgba(34, 197, 94, 0.3)'
              : 'rgba(234, 179, 8, 0.3)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: readinessStatus.warnings.length > 0 ? '8px' : 0,
            }}>
              {readinessStatus.is_ready ? (
                <CheckCircle size={16} style={{ color: '#22c55e' }} />
              ) : (
                <AlertTriangle size={16} style={{ color: '#eab308' }} />
              )}
              <span style={{
                fontSize: '12px',
                fontWeight: 500,
                color: readinessStatus.is_ready ? '#22c55e' : '#eab308',
              }}>
                {readinessStatus.is_ready ? 'Ready for Research' : 'Warnings'}
              </span>
            </div>

            {readinessStatus.warnings.length > 0 && (
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
              }}>
                {readinessStatus.warnings.map((warning, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{warning}</li>
                ))}
              </ul>
            )}

            {readinessStatus.data_quality_score !== undefined && (
              <div style={{
                marginTop: '8px',
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
              }}>
                Data quality: {Math.round(readinessStatus.data_quality_score * 100)}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* Start Research Button */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--color-border)',
      }}>
        <button
          onClick={onStartResearch}
          disabled={disabled || !selectedProductId || isResearching}
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            opacity: !selectedProductId || isResearching ? 0.6 : 1,
            cursor: !selectedProductId || isResearching ? 'not-allowed' : 'pointer',
          }}
        >
          {isResearching ? (
            <>
              <span className="animate-spin">⏳</span>
              Researching...
            </>
          ) : (
            <>
              🔬 Start Research
            </>
          )}
        </button>
        {!selectedProductId && (
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
          }}>
            Select a product to begin
          </p>
        )}
      </div>
    </div>
  )
}
