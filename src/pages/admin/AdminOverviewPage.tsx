import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, Link2, Smartphone, Factory, FileText, Layers, TestTube,
  Loader2, RefreshCw, CheckCircle, AlertTriangle
} from 'lucide-react'
import * as schemaApi from '@/lib/schemaApi'
import * as platformsApi from '@/lib/platformsApi'
import * as industriesApi from '@/lib/industriesApi'
import * as soulDocsApi from '@/lib/soulDocumentsApi'
import * as sectionsApi from '@/lib/sectionsApi'
import type { Product } from '@/lib/schemaApi'
import type { Platform, Industry, SoulDocument } from '@/types/admin'
import type { ReportSection } from '@/lib/sectionsApi'

interface Stats {
  products: number
  subProducts: number
  tacticTypes: number
  platforms: number
  industries: number
  soulDocuments: number
  sections: number
}

export function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats>({
    products: 0,
    subProducts: 0,
    tacticTypes: 0,
    platforms: 0,
    industries: 0,
    soulDocuments: 0,
    sections: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'error'>('healthy')

  const loadStats = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Load all data in parallel
      const [products, platforms, industries, soulDocs, sections] = await Promise.all([
        schemaApi.getProducts().catch(() => [] as Product[]),
        platformsApi.getPlatforms().catch(() => [] as Platform[]),
        industriesApi.getIndustries().catch(() => [] as Industry[]),
        soulDocsApi.getSoulDocuments().catch(() => [] as SoulDocument[]),
        sectionsApi.getSections().catch(() => [] as ReportSection[])
      ])

      const subProducts = products.reduce((acc, p) => acc + (p.subproducts?.length || 0), 0)
      const tacticTypes = products.reduce((acc, p) =>
        acc + (p.subproducts?.reduce((subAcc, sub) => subAcc + (sub.tactic_types?.length || 0), 0) || 0), 0
      )

      setStats({
        products: products.length,
        subProducts,
        tacticTypes,
        platforms: platforms.length,
        industries: industries.length,
        soulDocuments: soulDocs.length,
        sections: sections.length
      })

      // Check system health based on data availability
      if (products.length === 0 && platforms.length === 0) {
        setSystemStatus('warning')
      } else {
        setSystemStatus('healthy')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
      setSystemStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const statCards = [
    { label: 'Products', value: stats.products, icon: <Package size={24} />, path: '/schema-admin/products' },
    { label: 'SubProducts', value: stats.subProducts, icon: <Link2 size={24} />, path: '/schema-admin/products' },
    { label: 'Tactic Types', value: stats.tacticTypes, icon: <Layers size={24} />, path: '/schema-admin/products' },
    { label: 'Platforms', value: stats.platforms, icon: <Smartphone size={24} />, path: '/schema-admin/platforms' },
    { label: 'Industries', value: stats.industries, icon: <Factory size={24} />, path: '/schema-admin/industries' },
    { label: 'Soul Documents', value: stats.soulDocuments, icon: <FileText size={24} />, path: '/schema-admin/soul-documents' }
  ]

  const quickLinks = [
    { title: 'Products', desc: 'Manage product hierarchies and tactic types', icon: <Package size={24} />, path: '/schema-admin/products' },
    { title: 'Section Headers', desc: 'Configure report section templates', icon: <Layers size={24} />, path: '/schema-admin/sections' },
    { title: 'AI Testing', desc: 'Test AI models with report sections', icon: <TestTube size={24} />, path: '/schema-admin/ai-testing' },
    { title: 'Platforms', desc: 'Platform quirks, KPIs, thresholds', icon: <Smartphone size={24} />, path: '/schema-admin/platforms' },
    { title: 'Industries', desc: 'Benchmarks, insights, seasonality', icon: <Factory size={24} />, path: '/schema-admin/industries' },
    { title: 'Soul Documents', desc: 'Prompts, personas, templates', icon: <FileText size={24} />, path: '/schema-admin/soul-documents' }
  ]

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)' }}>
              Schema Admin Overview
            </h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              Manage product schemas, platform knowledge, industry insights, and AI configuration
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* System Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: systemStatus === 'healthy' ? 'rgba(34, 197, 94, 0.1)' :
                              systemStatus === 'warning' ? 'rgba(234, 179, 8, 0.1)' :
                              'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px'
            }}>
              {systemStatus === 'healthy' ? (
                <><CheckCircle size={16} style={{ color: '#22c55e' }} /> System Healthy</>
              ) : systemStatus === 'warning' ? (
                <><AlertTriangle size={16} style={{ color: '#eab308' }} /> Limited Data</>
              ) : (
                <><AlertTriangle size={16} style={{ color: '#ef4444' }} /> Connection Issue</>
              )}
            </div>
            <button
              onClick={loadStats}
              disabled={isLoading}
              className="btn-secondary"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--color-error)'
        }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
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
          <p>Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '16px',
            marginBottom: '32px'
          }}>
            {statCards.map(stat => (
              <Link
                key={stat.label}
                to={stat.path}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>{stat.icon}</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)' }}>{stat.value}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{stat.label}</div>
              </Link>
            ))}
          </div>

          {/* Quick Links */}
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>Tools</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            {quickLinks.map(link => (
              <Link
                key={link.title}
                to={link.path}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ color: 'var(--color-primary)' }}>{link.icon}</div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{link.title}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>{link.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
