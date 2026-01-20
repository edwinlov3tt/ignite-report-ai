import { useState, useEffect, useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import { ProductNavigationSidebar } from './ProductNavigationSidebar'

export function AdminLayout() {
  const location = useLocation()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) return saved as 'light' | 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Detect if we're on a product or subproduct detail page
  const productPageMatch = useMemo(() => {
    const path = location.pathname
    // Match /schema-admin/products/:id or /schema-admin/products/:id/subproducts/:subId
    const productMatch = path.match(/^\/schema-admin\/products\/([^/]+)(?:\/subproducts\/([^/]+))?$/)
    if (productMatch) {
      return {
        isProductPage: true,
        productId: productMatch[1],
        subProductId: productMatch[2] || undefined
      }
    }
    return { isProductPage: false, productId: undefined, subProductId: undefined }
  }, [location.pathname])

  const { isProductPage, productId, subProductId } = productPageMatch

  // Auto-collapse main sidebar when entering product/subproduct pages
  useEffect(() => {
    if (isProductPage) {
      setSidebarCollapsed(true)
    }
  }, [isProductPage])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <div style={{
      height: '100vh',
      maxHeight: '100vh',
      backgroundColor: 'var(--color-canvas)',
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* Sidebar */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPath={location.pathname}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        marginLeft: sidebarCollapsed ? '64px' : '280px',
        transition: 'margin-left 0.2s ease',
        height: '100vh',
        maxHeight: '100vh',
        width: sidebarCollapsed ? 'calc(100% - 64px)' : 'calc(100% - 280px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Top Header Bar */}
        <header style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexShrink: 0,
          zIndex: 10
        }}>
          {/* Theme Toggle */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-surface-secondary)',
            borderRadius: '9999px',
            padding: '4px',
            border: '1px solid var(--color-border)'
          }}>
            <button
              type="button"
              onClick={() => setTheme('light')}
              style={{
                background: theme === 'light' ? 'var(--color-surface)' : 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                boxShadow: theme === 'light' ? 'var(--shadow-sm)' : 'none',
                color: theme === 'light' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              }}
            >
              <Sun size={18} />
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              style={{
                background: theme === 'dark' ? 'var(--color-surface)' : 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'none',
                color: theme === 'dark' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              }}
            >
              <Moon size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0 // Important: allows flex child to shrink below content size
        }}>
          {/* Product Navigation Sidebar - Only shows on product/subproduct detail pages */}
          {isProductPage && (
            <ProductNavigationSidebar
              currentProductId={productId}
              currentSubProductId={subProductId}
            />
          )}

          {/* Main Content */}
          <main style={{
            flex: 1,
            padding: '24px 32px',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            minHeight: 0 // Important: allows flex child to shrink
          }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
