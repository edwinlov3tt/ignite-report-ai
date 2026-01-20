import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Plus } from 'lucide-react'

interface ChipInputProps {
  value: string[]
  onChange: (value: string[]) => void
  suggestions?: string[]
  suggestionDescriptions?: Record<string, string> // Optional map of suggestion name -> description
  placeholder?: string
  label?: string
  hint?: string
  onAddNew?: (value: string) => void
  allowCustom?: boolean
  itemLabel?: string // Label for items (e.g., "platform", "medium")
}

export function ChipInput({
  value,
  onChange,
  suggestions = [],
  suggestionDescriptions,
  placeholder = 'Search or add...',
  label,
  hint,
  onAddNew,
  allowCustom = true,
  itemLabel = 'platform'
}: ChipInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter suggestions based on input and exclude already selected
  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s)
  )

  // Check if input matches any suggestion exactly (case-insensitive)
  const exactMatch = suggestions.find(
    s => s.toLowerCase() === inputValue.toLowerCase()
  )

  // Show "Add New" option if input has value, no exact match, and custom is allowed
  const showAddNew = inputValue.trim() && !exactMatch && allowCustom

  // Reset highlight when filtered results change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [inputValue])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addChip = useCallback((chip: string) => {
    const trimmed = chip.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputValue('')
    setIsOpen(false)
    inputRef.current?.focus()
  }, [value, onChange])

  const removeChip = useCallback((chip: string) => {
    onChange(value.filter(v => v !== chip))
  }, [value, onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last chip on backspace if input is empty
      removeChip(value[value.length - 1])
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      if (isOpen && filteredSuggestions.length > 0) {
        // Select highlighted suggestion
        addChip(filteredSuggestions[highlightedIndex])
      } else if (inputValue.trim()) {
        // Add as new chip if allowed
        if (allowCustom || exactMatch) {
          addChip(exactMatch || inputValue)
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
      const maxIndex = filteredSuggestions.length + (showAddNew ? 0 : -1)
      setHighlightedIndex(prev => Math.min(prev + 1, maxIndex))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === ',') {
      e.preventDefault()
      if (inputValue.trim()) {
        if (allowCustom || exactMatch) {
          addChip(exactMatch || inputValue)
        }
      }
    }
  }

  const handleAddNew = () => {
    if (onAddNew) {
      onAddNew(inputValue.trim())
    }
    addChip(inputValue.trim())
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--color-text-primary)'
        }}>
          {label}
        </label>
      )}

      {/* Input container with chips */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          minHeight: '42px',
          backgroundColor: 'var(--color-surface)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'text',
          transition: 'border-color 0.15s'
        }}
      >
        {/* Chips */}
        {value.map(chip => (
          <span
            key={chip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            {chip}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeChip(chip)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-primary)',
                opacity: 0.7,
                borderRadius: '2px'
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: '120px',
            padding: '4px 0',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: '14px',
            color: 'var(--color-text-primary)'
          }}
        />
      </div>

      {hint && (
        <small style={{
          display: 'block',
          marginTop: '4px',
          fontSize: '12px',
          color: 'var(--color-text-muted)'
        }}>
          {hint}
        </small>
      )}

      {/* Dropdown */}
      {isOpen && (filteredSuggestions.length > 0 || showAddNew) && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 50
        }}>
          {filteredSuggestions.map((suggestion, index) => {
            const description = suggestionDescriptions?.[suggestion]
            return (
              <button
                key={suggestion}
                type="button"
                onClick={() => addChip(suggestion)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: description ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: 'none',
                  background: highlightedIndex === index ? 'var(--color-surface-secondary)' : 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                  textAlign: 'left'
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div style={{ flex: 1 }}>
                  <span>{suggestion}</span>
                  {description && (
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                      lineHeight: '1.3'
                    }}>
                      {description}
                    </div>
                  )}
                </div>
                {highlightedIndex === index && (
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                    marginLeft: '8px',
                    flexShrink: 0
                  }}>
                    Tab to add
                  </span>
                )}
              </button>
            )
          })}

          {showAddNew && (
            <>
              {filteredSuggestions.length > 0 && (
                <div style={{
                  height: '1px',
                  backgroundColor: 'var(--color-border)',
                  margin: '4px 0'
                }} />
              )}
              <button
                type="button"
                onClick={handleAddNew}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  border: 'none',
                  background: highlightedIndex === filteredSuggestions.length ? 'var(--color-surface-secondary)' : 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--color-primary)',
                  textAlign: 'left',
                  fontWeight: 500
                }}
                onMouseEnter={() => setHighlightedIndex(filteredSuggestions.length)}
              >
                <Plus size={16} />
                Add "{inputValue.trim()}" as new {itemLabel}
              </button>
            </>
          )}
        </div>
      )}

      {/* Empty state when searching with no results */}
      {isOpen && inputValue && filteredSuggestions.length === 0 && !showAddNew && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          padding: '12px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
          zIndex: 50
        }}>
          No {itemLabel}s found
        </div>
      )}
    </div>
  )
}
