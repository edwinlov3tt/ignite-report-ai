import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const presets = [
  { value: 'last-month', label: 'Last', sublabel: 'MONTH', days: 30 },
  { value: 'this-month', label: 'This', sublabel: 'MONTH', days: 0 },
  { value: '30', label: '30', sublabel: 'DAYS', days: 30 },
  { value: '90', label: '90', sublabel: 'DAYS', days: 90 },
  { value: '120', label: '120', sublabel: 'DAYS', days: 120 },
  { value: '150', label: '150', sublabel: 'DAYS', days: 150 },
  { value: '180', label: '180', sublabel: 'DAYS', days: 180 },
  { value: 'custom', label: 'CUSTOM', sublabel: 'RANGE', days: 0, icon: true },
]

export function StepTimeRange() {
  const timeRange = useAppStore((state) => state.timeRange)
  const setTimeRange = useAppStore((state) => state.setTimeRange)
  const nextStep = useAppStore((state) => state.nextStep)
  const prevStep = useAppStore((state) => state.prevStep)

  const [selectedPreset, setSelectedPreset] = useState(timeRange?.preset || '')
  const [startDate, setStartDate] = useState(timeRange?.startDate || '')
  const [endDate, setEndDate] = useState(timeRange?.endDate || '')

  const handlePresetSelect = (preset: typeof presets[0]) => {
    setSelectedPreset(preset.value)

    if (preset.value === 'custom') {
      // Don't set dates for custom, let user pick
      return
    }

    const end = new Date()
    let start: Date

    if (preset.value === 'last-month') {
      // Last month: first to last day of previous month
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1)
      const lastDayOfLastMonth = new Date(end.getFullYear(), end.getMonth(), 0)
      const startStr = start.toISOString().split('T')[0]
      const endStr = lastDayOfLastMonth.toISOString().split('T')[0]
      setStartDate(startStr)
      setEndDate(endStr)
      const days = Math.ceil((lastDayOfLastMonth.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      setTimeRange({ startDate: startStr, endDate: endStr, preset: preset.value, durationDays: days })
    } else if (preset.value === 'this-month') {
      // This month: first day of current month to today
      start = new Date(end.getFullYear(), end.getMonth(), 1)
      const startStr = start.toISOString().split('T')[0]
      const endStr = end.toISOString().split('T')[0]
      setStartDate(startStr)
      setEndDate(endStr)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      setTimeRange({ startDate: startStr, endDate: endStr, preset: preset.value, durationDays: days })
    } else {
      // Number of days back from today
      const days = preset.days
      start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
      const startStr = start.toISOString().split('T')[0]
      const endStr = end.toISOString().split('T')[0]
      setStartDate(startStr)
      setEndDate(endStr)
      setTimeRange({ startDate: startStr, endDate: endStr, preset: preset.value, durationDays: days })
    }
  }

  useEffect(() => {
    if (selectedPreset === 'custom' && startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      setTimeRange({
        startDate,
        endDate,
        preset: 'custom',
        durationDays: days,
      })
    }
  }, [startDate, endDate, selectedPreset, setTimeRange])

  // Format current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  // Format selected range for display
  const formatRangeDate = (dateStr: string) => {
    if (!dateStr) return '--'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'UTC' })
  }

  return (
    <div className="report-container animate-fade-in">
      {/* Section Header */}
      <div className="section-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="step-indicator">2</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Analysis Time Range</h2>
        </div>
        <span className="step-status">STEP PENDING</span>
      </div>

      {/* Description */}
      <p className="form-description">
        Select the time period for your campaign analysis. Choose from preset ranges or select custom dates.
      </p>

      {/* Preset Buttons - Horizontal Full Width */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: '0',
        marginBottom: '24px',
      }}>
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetSelect(preset)}
            style={{
              flex: 1,
              padding: '16px 8px',
              borderRadius: preset.value === 'last-month' ? 'var(--radius-sm) 0 0 var(--radius-sm)' :
                           preset.value === 'custom' ? '0 var(--radius-sm) var(--radius-sm) 0' : '0',
              border: selectedPreset === preset.value ? 'none' : '1px solid var(--color-border)',
              borderLeft: preset.value !== 'last-month' ? 'none' : undefined,
              backgroundColor: selectedPreset === preset.value ? 'var(--color-primary)' : 'var(--color-surface)',
              color: selectedPreset === preset.value ? 'white' : 'var(--color-text-primary)',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '70px'
            }}
          >
            {preset.icon && (
              <Calendar size={20} style={{ marginBottom: '4px' }} />
            )}
            <span style={{ fontWeight: 700, fontSize: preset.label.length > 3 ? '14px' : '24px' }}>
              {preset.label}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', marginTop: '2px' }}>
              {preset.sublabel}
            </span>
          </button>
        ))}
      </div>

      {/* Date Inputs Card */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block' }}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                if (selectedPreset !== 'custom') setSelectedPreset('custom')
              }}
              className="input-field"
            />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block' }}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                if (selectedPreset !== 'custom') setSelectedPreset('custom')
              }}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Info Display Card */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        padding: '20px 24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          <div>Current Date: {currentDate}</div>
          <div>Selected Range: {startDate && endDate ? `${formatRangeDate(startDate)} - ${formatRangeDate(endDate)}` : '--'}</div>
          <div>Duration: {timeRange?.durationDays ? `${timeRange.durationDays} days` : '--'}</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="section-actions">
        <button onClick={prevStep} className="btn-secondary">
          <ChevronLeft size={20} />
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={!timeRange}
          className="btn-primary"
        >
          Continue to Performance Data
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
