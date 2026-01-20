import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface ChipItem {
  id: string
  name: string
  path: string
}

interface ClickableChipListProps {
  items: ChipItem[]
  maxVisible?: number
  emptyText?: string
}

export function ClickableChipList({ items, maxVisible = 3, emptyText = '—' }: ClickableChipListProps) {
  const navigate = useNavigate()
  const [showPopover, setShowPopover] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false)
      }
    }

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPopover])

  if (!items || items.length === 0) {
    return <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{emptyText}</span>
  }

  const visibleItems = items.slice(0, maxVisible)
  const hiddenItems = items.slice(maxVisible)
  const hasMore = hiddenItems.length > 0

  const handleChipClick = (item: ChipItem, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(item.path)
  }

  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: 'var(--color-surface-secondary)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: '1px solid transparent',
  }

  const chipHoverStyle: React.CSSProperties = {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-error)',
    borderColor: 'var(--color-error)',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', position: 'relative' }}>
      {visibleItems.map((item) => (
        <span
          key={item.id}
          onClick={(e) => handleChipClick(item, e)}
          style={chipStyle}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, chipHoverStyle)
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)'
            e.currentTarget.style.color = 'inherit'
            e.currentTarget.style.borderColor = 'transparent'
          }}
          title={`Go to ${item.name}`}
        >
          {item.name}
        </span>
      ))}

      {hasMore && (
        <span style={{ position: 'relative' }}>
          <span
            ref={triggerRef}
            onClick={(e) => {
              e.stopPropagation()
              setShowPopover(!showPopover)
            }}
            style={{
              ...chipStyle,
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-light)'
              e.currentTarget.style.color = 'var(--color-primary)'
            }}
          >
            +{hiddenItems.length} more
          </span>

          {showPopover && (
            <div
              ref={popoverRef}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '12px',
                zIndex: 1000,
                minWidth: '180px',
                maxWidth: '280px',
              }}
            >
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}>
                All Items ({items.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {items.map((item) => (
                  <span
                    key={item.id}
                    onClick={(e) => handleChipClick(item, e)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                      e.currentTarget.style.color = 'var(--color-error)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'inherit'
                    }}
                  >
                    {item.name}
                  </span>
                ))}
              </div>
              {/* Arrow */}
              <div style={{
                position: 'absolute',
                top: '-6px',
                left: '50%',
                width: '12px',
                height: '12px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRight: 'none',
                borderBottom: 'none',
                transform: 'translateX(-50%) rotate(45deg)',
              }} />
            </div>
          )}
        </span>
      )}
    </div>
  )
}
