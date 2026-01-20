import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: ReactNode
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: 'var(--color-gray-200)', color: 'var(--color-gray-700)' },
  primary: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
  success: { bg: 'var(--color-success-light)', color: '#166534' },
  warning: { bg: 'var(--color-warning-light)', color: '#92400e' },
  error: { bg: '#fee2e2', color: '#991b1b' },
  info: { bg: 'var(--color-info-light)', color: '#1e40af' }
}

const sizeStyles: Record<BadgeSize, { padding: string; fontSize: string }> = {
  sm: { padding: '2px 8px', fontSize: '11px' },
  md: { padding: '4px 12px', fontSize: '12px' }
}

export function Badge({ children, variant = 'default', size = 'md', icon }: BadgeProps) {
  const { bg, color } = variantStyles[variant]
  const { padding, fontSize } = sizeStyles[size]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding,
      fontSize,
      fontWeight: 600,
      borderRadius: 'var(--radius-full)',
      backgroundColor: bg,
      color,
      whiteSpace: 'nowrap'
    }}>
      {icon}
      {children}
    </span>
  )
}

// Specialized badges
export function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, BadgeVariant> = {
    active: 'success',
    inactive: 'default',
    published: 'success',
    draft: 'warning',
    verified: 'success',
    pending: 'warning',
    high: 'error',
    medium: 'warning',
    low: 'info'
  }

  return (
    <Badge variant={statusMap[status.toLowerCase()] || 'default'}>
      {status}
    </Badge>
  )
}

export function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null

  const categoryMap: Record<string, BadgeVariant> = {
    social: 'info',
    search: 'primary',
    display: 'warning',
    video: 'error',
    programmatic: 'success',
    other: 'default'
  }

  return (
    <Badge variant={categoryMap[category.toLowerCase()] || 'default'}>
      {category}
    </Badge>
  )
}
