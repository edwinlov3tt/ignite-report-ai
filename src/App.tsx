import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
// Admin Pages (unified under AdminLayout)
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage'
import { ProductsPage } from '@/pages/admin/ProductsPage'
import { ProductDetailPage } from '@/pages/admin/ProductDetailPage'
import { SubProductDetailPage } from '@/pages/admin/SubProductDetailPage'
import { SectionsManagerPage } from '@/pages/SectionsManagerPage'
import { AITestingPage } from '@/pages/AITestingPage'
import { PlatformsPage } from '@/pages/admin/PlatformsPage'
import { PlatformDetailPage } from '@/pages/admin/PlatformDetailPage'
import { IndustriesPage } from '@/pages/admin/IndustriesPage'
import { IndustryDetailPage } from '@/pages/admin/IndustryDetailPage'
import { SoulDocumentsPage } from '@/pages/admin/SoulDocumentsPage'
import { SoulDocumentEditorPage } from '@/pages/admin/SoulDocumentEditorPage'
import { ImportExportPage } from '@/pages/admin/ImportExportPage'
import { useAppStore } from '@/store/useAppStore'

function App() {
  const error = useAppStore((state) => state.error)
  const setError = useAppStore((state) => state.setError)

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
        </Route>
        {/* Schema Admin Routes (all under AdminLayout) */}
        <Route element={<AdminLayout />}>
          <Route path="/schema-admin" element={<AdminOverviewPage />} />
          <Route path="/schema-admin/products" element={<ProductsPage />} />
          <Route path="/schema-admin/products/:id" element={<ProductDetailPage />} />
          <Route path="/schema-admin/products/:id/subproducts/:subId" element={<SubProductDetailPage />} />
          <Route path="/schema-admin/sections" element={<SectionsManagerPage />} />
          <Route path="/schema-admin/ai-testing" element={<AITestingPage />} />
          <Route path="/schema-admin/platforms" element={<PlatformsPage />} />
          <Route path="/schema-admin/platforms/:id" element={<PlatformDetailPage />} />
          <Route path="/schema-admin/industries" element={<IndustriesPage />} />
          <Route path="/schema-admin/industries/:id" element={<IndustryDetailPage />} />
          <Route path="/schema-admin/soul-documents" element={<SoulDocumentsPage />} />
          <Route path="/schema-admin/soul-documents/:id" element={<SoulDocumentEditorPage />} />
          <Route path="/schema-admin/import-export" element={<ImportExportPage />} />
        </Route>
      </Routes>

      {/* Error Modal */}
      {error && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: '32px',
            maxWidth: '400px',
            margin: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--color-primary)',
              marginBottom: '12px',
              marginTop: 0
            }}>
              Error
            </h3>
            <p style={{
              color: 'var(--color-text-secondary)',
              marginBottom: '24px',
              lineHeight: 1.6
            }}>
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default App
