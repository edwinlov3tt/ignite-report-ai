import { useState } from 'react'
import { Plus, X, GripVertical } from 'lucide-react'

interface TextArrayInputProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  hint?: string
  multiline?: boolean
  rows?: number
}

export function TextArrayInput({
  label,
  value,
  onChange,
  placeholder = 'Add item...',
  hint,
  multiline = true,
  rows = 3
}: TextArrayInputProps) {
  const [newItem, setNewItem] = useState('')

  const handleAdd = () => {
    if (!newItem.trim()) return
    onChange([...value, newItem.trim()])
    setNewItem('')
  }

  const handleRemove = (index: number) => {
    const updated = [...value]
    updated.splice(index, 1)
    onChange(updated)
  }

  const handleUpdate = (index: number, newValue: string) => {
    const updated = [...value]
    updated[index] = newValue
    onChange(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !multiline) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="form-field" style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        fontWeight: 500,
        marginBottom: '8px',
        fontSize: '14px',
        color: 'var(--color-text-primary)'
      }}>
        {label}
      </label>

      {hint && (
        <p style={{
          margin: '0 0 12px 0',
          fontSize: '13px',
          color: 'var(--color-text-muted)'
        }}>
          {hint}
        </p>
      )}

      {/* Existing items */}
      {value.length > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {value.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}
            >
              <div style={{
                color: 'var(--color-text-muted)',
                cursor: 'grab',
                padding: '8px 0'
              }}>
                <GripVertical size={16} />
              </div>
              {multiline ? (
                <textarea
                  value={item}
                  onChange={(e) => handleUpdate(index, e.target.value)}
                  rows={rows}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5
                  }}
                />
              ) : (
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleUpdate(index, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                style={{
                  padding: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-error)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new item */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        {multiline ? (
          <textarea
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.5
            }}
          />
        ) : (
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)'
            }}
          />
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="btn-secondary"
          style={{ flexShrink: 0, padding: '10px 16px' }}
        >
          <Plus size={18} />
          Add
        </button>
      </div>
    </div>
  )
}
