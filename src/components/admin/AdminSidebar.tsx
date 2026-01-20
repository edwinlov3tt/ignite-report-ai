import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3, Smartphone, Factory, FileText, ChevronLeft, ChevronRight, ChevronDown,
  Home, Package, Layers, TestTube, FolderInput, Settings, Bot
} from 'lucide-react'

interface AdminSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  currentPath: string
}

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
}

interface NavGroup {
  id: string
  label: string
  icon: React.ReactNode
  items: NavItem[]
}

// Main navigation items (always visible)
const mainNavItems: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <Home size={20} />,
    path: '/schema-admin'
  },
  {
    id: 'products',
    label: 'Products',
    icon: <Package size={20} />,
    path: '/schema-admin/products'
  },
  {
    id: 'platforms',
    label: 'Platforms',
    icon: <Smartphone size={20} />,
    path: '/schema-admin/platforms'
  },
  {
    id: 'industries',
    label: 'Industries',
    icon: <Factory size={20} />,
    path: '/schema-admin/industries'
  },
  {
    id: 'curator',
    label: 'Schema Curator',
    icon: <Bot size={20} />,
    path: '/schema-admin/curator'
  }
]

// Configurations submenu group
const configurationsGroup: NavGroup = {
  id: 'configurations',
  label: 'Configurations',
  icon: <Settings size={20} />,
  items: [
    {
      id: 'soul-documents',
      label: 'Soul Documents',
      icon: <FileText size={18} />,
      path: '/schema-admin/soul-documents'
    },
    {
      id: 'sections',
      label: 'Section Headers',
      icon: <Layers size={18} />,
      path: '/schema-admin/sections'
    },
    {
      id: 'ai-testing',
      label: 'AI Testing',
      icon: <TestTube size={18} />,
      path: '/schema-admin/ai-testing'
    },
    {
      id: 'import-export',
      label: 'Import/Export',
      icon: <FolderInput size={18} />,
      path: '/schema-admin/import-export'
    }
  ]
}

export function AdminSidebar({ collapsed, onToggleCollapse, currentPath }: AdminSidebarProps) {
  // Track expanded state for collapsible groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Auto-expand if current path is in a group
    const groups = new Set<string>()
    if (configurationsGroup.items.some(item => currentPath.startsWith(item.path))) {
      groups.add('configurations')
    }
    return groups
  })

  const isActive = (path: string) => {
    if (path === '/schema-admin') {
      return currentPath === '/schema-admin'
    }
    return currentPath.startsWith(path)
  }

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => currentPath.startsWith(item.path))
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const renderNavItem = (item: NavItem, isSubItem = false) => (
    <Link
      key={item.id}
      to={item.path}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: isSubItem ? '10px 20px 10px 44px' : '12px 20px',
        textDecoration: 'none',
        color: isActive(item.path) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        backgroundColor: isActive(item.path) ? 'var(--color-primary-light)' : 'transparent',
        borderLeft: isActive(item.path) ? '3px solid var(--color-primary)' : '3px solid transparent',
        fontSize: isSubItem ? '13px' : '14px',
        fontWeight: 500,
        transition: 'all 0.15s'
      }}
    >
      <span style={{ flexShrink: 0 }}>{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )

  const renderNavGroup = (group: NavGroup) => {
    const isExpanded = expandedGroups.has(group.id)
    const groupActive = isGroupActive(group)

    return (
      <div key={group.id}>
        {/* Group Header */}
        <button
          onClick={() => toggleGroup(group.id)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: groupActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: groupActive && !isExpanded ? 'var(--color-primary-light)' : 'transparent',
            borderLeft: groupActive ? '3px solid var(--color-primary)' : '3px solid transparent',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.15s',
            textAlign: 'left'
          }}
        >
          <span style={{ flexShrink: 0 }}>{group.icon}</span>
          {!collapsed && (
            <>
              <span style={{ flex: 1 }}>{group.label}</span>
              <ChevronDown
                size={16}
                style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  opacity: 0.6
                }}
              />
            </>
          )}
        </button>

        {/* Group Items */}
        {!collapsed && isExpanded && (
          <div style={{
            backgroundColor: 'var(--color-surface-secondary)',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)'
          }}>
            {group.items.map(item => renderNavItem(item, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: collapsed ? '64px' : '280px',
      backgroundColor: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      zIndex: 20,
      overflow: 'hidden'
    }}>
      {/* Logo / Brand */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minHeight: '72px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          backgroundColor: 'var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <BarChart3 size={20} color="white" />
        </div>
        {!collapsed && (
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
              Schema Admin
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Knowledge Hub
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        padding: '12px 0',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {/* Main Nav Items */}
        {mainNavItems.map(item => renderNavItem(item))}

        {/* Divider */}
        <div style={{
          height: '1px',
          backgroundColor: 'var(--color-border)',
          margin: '12px 20px'
        }} />

        {/* Configurations Group */}
        {renderNavGroup(configurationsGroup)}
      </nav>

      {/* Footer / Collapse Toggle */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        padding: '12px'
      }}>
        <button
          onClick={onToggleCollapse}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px',
            padding: '10px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-surface)',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            fontSize: '13px'
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : (
            <>
              <ChevronLeft size={18} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
