import { type ReactNode, useState, useRef, useEffect } from 'react'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [displayMode, setDisplayMode] = useState<'full' | 'compact' | 'icon'>('full')

  useEffect(() => {
    const checkWidth = () => {
      if (!containerRef.current) return
      const width = containerRef.current.offsetWidth
      const tabCount = tabs.length

      // Calculate approximate width needed
      // Full mode: ~120px per tab, Compact: ~80px, Icon: ~50px
      if (width < tabCount * 50) {
        setDisplayMode('icon')
      } else if (width < tabCount * 90) {
        setDisplayMode('compact')
      } else {
        setDisplayMode('full')
      }
    }

    checkWidth()
    const resizeObserver = new ResizeObserver(checkWidth)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [tabs.length])

  const getButtonStyle = (isActive: boolean): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: displayMode === 'icon' ? '12px 14px' : displayMode === 'compact' ? '12px 14px' : '12px 20px',
      border: 'none',
      borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontWeight: isActive ? 600 : 400,
      color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: displayMode === 'icon' ? '0' : '8px',
      fontSize: displayMode === 'compact' ? '13px' : '14px',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
      flexShrink: 0
    }
    return baseStyle
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '0',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={getButtonStyle(activeTab === tab.id)}
          title={displayMode === 'icon' ? tab.label : undefined}
        >
          {tab.icon}
          {displayMode !== 'icon' && <span>{tab.label}</span>}
        </button>
      ))}
    </div>
  )
}

interface TabPanelProps {
  id: string
  activeTab: string
  children: ReactNode
}

export function TabPanel({ id, activeTab, children }: TabPanelProps) {
  if (id !== activeTab) return null
  return <div>{children}</div>
}
