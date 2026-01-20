import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}

export function FormField({ label, required, hint, error, children }: FormFieldProps) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        fontWeight: 500,
        marginBottom: '6px',
        fontSize: '14px',
        color: 'var(--color-text-primary)'
      }}>
        {label}
        {required && <span style={{ color: 'var(--color-error)', marginLeft: '4px' }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <small style={{
          display: 'block',
          marginTop: '4px',
          fontSize: '12px',
          color: 'var(--color-text-muted)'
        }}>
          {hint}
        </small>
      )}
      {error && (
        <small style={{
          display: 'block',
          marginTop: '4px',
          fontSize: '12px',
          color: 'var(--color-error)'
        }}>
          {error}
        </small>
      )}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean
}

export function Input({ fullWidth = true, style, ...props }: InputProps) {
  return (
    <input
      {...props}
      className="input-field"
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '12px 16px',
        fontSize: '14px',
        ...style
      }}
    />
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  fullWidth?: boolean
}

export function Textarea({ fullWidth = true, style, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      rows={rows}
      className="textarea-field"
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '12px 16px',
        fontSize: '14px',
        minHeight: 'auto',
        ...style
      }}
    />
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  fullWidth?: boolean
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ fullWidth = true, options, placeholder, style, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className="input-field"
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '12px 16px',
        fontSize: '14px',
        cursor: 'pointer',
        ...style
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function Checkbox({ label, ...props }: CheckboxProps) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      color: 'var(--color-text-primary)'
    }}>
      <input
        type="checkbox"
        {...props}
        style={{
          width: '18px',
          height: '18px',
          cursor: 'pointer',
          accentColor: 'var(--color-primary)'
        }}
      />
      {label}
    </label>
  )
}
