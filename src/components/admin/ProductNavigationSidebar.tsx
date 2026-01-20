import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, ChevronDown, Search, Package, Layers } from 'lucide-react'
import * as schemaApi from '@/lib/schemaApi'
import type { Product } from '@/lib/schemaApi'

interface ProductNavigationSidebarProps {
  currentProductId?: string
  currentSubProductId?: string
}

export function ProductNavigationSidebar({
  currentProductId,
  currentSubProductId
}: ProductNavigationSidebarProps) {
  const location = useLocation()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  // Load products - refresh when location changes (e.g., after delete)
  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await schemaApi.getProducts()
        setProducts(data)
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadProducts()
  }, [location.pathname])

  // Auto-expand current product
  useEffect(() => {
    if (currentProductId) {
      setExpandedProducts(prev => new Set([...prev, currentProductId]))
    }
  }, [currentProductId])

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products

    const query = searchQuery.toLowerCase()
    return products.filter(product => {
      // Match product name
      if (product.name.toLowerCase().includes(query)) return true
      // Match any subproduct name
      if (product.subproducts?.some(sp => sp.name.toLowerCase().includes(query))) return true
      return false
    })
  }, [products, searchQuery])

  const toggleProduct = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const isProductActive = (productId: string) => productId === currentProductId
  const isSubProductActive = (subProductId: string) => subProductId === currentSubProductId

  if (isLoading) {
    return (
      <div style={{
        width: '260px',
        minWidth: '260px',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
        flexShrink: 0
      }}>
        Loading...
      </div>
    )
  }

  return (
    <aside style={{
      width: '260px',
      minWidth: '260px',
      backgroundColor: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Products
        </h3>

        {/* Search */}
        <div style={{
          position: 'relative'
        }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              fontSize: '13px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Product List */}
      <nav style={{
        flex: 1,
        minHeight: 0, // Important: allows flex child to shrink
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px 0'
      }}>
        {filteredProducts.length === 0 ? (
          <div style={{
            padding: '20px 16px',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: '13px'
          }}>
            {searchQuery ? 'No products found' : 'No products yet'}
          </div>
        ) : (
          filteredProducts.map(product => {
            const isExpanded = expandedProducts.has(product.id)
            const isActive = isProductActive(product.id)
            const hasSubProducts = product.subproducts && product.subproducts.length > 0

            return (
              <div key={product.id}>
                {/* Product Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                  transition: 'all 0.15s'
                }}>
                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => hasSubProducts && toggleProduct(product.id)}
                    disabled={!hasSubProducts}
                    style={{
                      padding: '10px 4px 10px 12px',
                      background: 'none',
                      border: 'none',
                      cursor: hasSubProducts ? 'pointer' : 'default',
                      color: hasSubProducts ? 'var(--color-text-secondary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>

                  {/* Product Link */}
                  <Link
                    to={`/schema-admin/products/${product.id}`}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px 10px 0',
                      textDecoration: 'none',
                      color: isActive ? 'var(--color-primary)' : 'var(--color-text-primary)',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500
                    }}
                  >
                    <Package size={16} style={{ opacity: 0.7, flexShrink: 0 }} />
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {product.name}
                    </span>
                    {hasSubProducts && (
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        marginLeft: 'auto',
                        flexShrink: 0
                      }}>
                        {product.subproducts!.length}
                      </span>
                    )}
                  </Link>
                </div>

                {/* SubProducts (expanded) */}
                {isExpanded && hasSubProducts && (
                  <div style={{
                    backgroundColor: 'var(--color-surface-secondary)'
                  }}>
                    {product.subproducts!.map(subProduct => {
                      const isSubActive = isSubProductActive(subProduct.id)

                      return (
                        <Link
                          key={subProduct.id}
                          to={`/schema-admin/products/${product.id}/subproducts/${subProduct.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px 8px 44px',
                            textDecoration: 'none',
                            color: isSubActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            fontSize: '12px',
                            fontWeight: isSubActive ? 600 : 400,
                            backgroundColor: isSubActive ? 'var(--color-primary-light)' : 'transparent',
                            borderLeft: isSubActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                            transition: 'all 0.15s'
                          }}
                        >
                          <Layers size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {subProduct.name}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </nav>

      {/* Footer with count */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--color-border)',
        fontSize: '12px',
        color: 'var(--color-text-muted)',
        flexShrink: 0
      }}>
        {products.length} products · {products.reduce((acc, p) => acc + (p.subproducts?.length || 0), 0)} subproducts
      </div>
    </aside>
  )
}
