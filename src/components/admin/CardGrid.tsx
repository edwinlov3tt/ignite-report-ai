import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'

interface CardGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4
}

export function CardGrid({ children, columns = 3 }: CardGridProps) {
  const colWidths = {
    2: 'repeat(auto-fill, minmax(320px, 1fr))',
    3: 'repeat(auto-fill, minmax(280px, 1fr))',
    4: 'repeat(auto-fill, minmax(240px, 1fr))'
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: colWidths[columns],
      gap: '20px'
    }}>
      {children}
    </div>
  )
}

interface CardProps {
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  hover?: boolean
}

export function Card({ children, onClick, selected, hover = true }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        boxShadow: selected ? '0 0 0 3px var(--color-primary-light)' : 'none'
      }}
      onMouseEnter={(e) => {
        if (hover && onClick) {
          e.currentTarget.style.borderColor = 'var(--color-primary)'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        }
      }}
      onMouseLeave={(e) => {
        if (hover && onClick && !selected) {
          e.currentTarget.style.borderColor = 'var(--color-border)'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  badge?: ReactNode
  actions?: ReactNode
}

export function CardHeader({ title, subtitle, icon, badge, actions }: CardHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {icon && (
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'var(--color-surface-secondary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: 'var(--color-primary)'
          }}>
            {icon}
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div>{actions}</div>}
    </div>
  )
}

interface CardBodyProps {
  children: ReactNode
}

export function CardBody({ children }: CardBodyProps) {
  return <div>{children}</div>
}

interface CardStatsProps {
  stats: { label: string; value: string | number }[]
}

export function CardStats({ stats }: CardStatsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      paddingTop: '12px',
      borderTop: '1px solid var(--color-border)',
      marginTop: '16px'
    }}>
      {stats.map(stat => (
        <div key={stat.label}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-primary)' }}>
            {stat.value}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}

interface AddCardProps {
  title: string
  description?: string
  onClick: () => void
}

export function AddCard({ title, description, onClick }: AddCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '2px dashed var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 20px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        minHeight: '180px',
        transition: 'all 0.2s',
        width: '100%'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)'
        e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.backgroundColor = 'var(--color-surface)'
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        backgroundColor: 'var(--color-primary-light)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-primary)'
      }}>
        <Plus size={24} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {title}
        </h4>
        {description && (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
    </button>
  )
}
