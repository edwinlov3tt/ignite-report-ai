import { Outlet } from 'react-router-dom'
import { ProgressStepper } from './ProgressStepper'
import { Footer } from './Footer'
import { Sun, Moon, RotateCcw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function Layout() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) return saved as 'light' | 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  const resetStore = useAppStore((state) => state.resetStore)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const handleReset = () => {
    if (confirm('Are you sure you want to clear all data and start over?')) {
      resetStore()
      localStorage.removeItem('report-ai-storage')
      window.location.reload()
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--color-primary)', fontSize: '40px', fontWeight: 700, margin: 0 }}>
          Report.AI
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Theme Toggle */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-surface)',
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
                gap: '6px',
                boxShadow: theme === 'light' ? 'var(--shadow-md)' : 'none',
                color: theme === 'light' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize: '14px'
              }}
            >
              <Sun size={18} />
              Light
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
                gap: '6px',
                boxShadow: theme === 'dark' ? 'var(--shadow-md)' : 'none',
                color: theme === 'dark' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize: '14px'
              }}
            >
              <Moon size={18} />
              Dark
            </button>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary"
          >
            <RotateCcw size={18} />
            Clear & Reset
          </button>
        </div>
      </header>

      {/* Progress Container */}
      <div className="report-container" style={{ marginBottom: '32px', padding: '32px' }}>
        <ProgressStepper />
      </div>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
