import { useAppStore } from '@/store/useAppStore'
import { Check } from 'lucide-react'
import type { WorkflowStep } from '@/types'

const steps: { step: WorkflowStep; label: string }[] = [
  { step: 1, label: 'Campaign Data' },
  { step: 2, label: 'Time Range' },
  { step: 3, label: 'Company Info' },
  { step: 4, label: 'Performance Data' },
  { step: 5, label: 'AI Analysis' },
]

export function ProgressStepper() {
  const currentStep = useAppStore((state) => state.currentStep)

  // Progress fills from step 1 to current step
  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Progress Line Container */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '65px',
        right: '35px',
        height: '2px',
        zIndex: 1
      }}>
        {/* Background Line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          backgroundColor: 'var(--color-border)'
        }} />
        {/* Fill Line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          backgroundColor: 'var(--color-success)',
          width: `${progressPercent}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Steps */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        position: 'relative',
        zIndex: 2
      }}>
        {steps.map(({ step, label }) => {
          const isCompleted = step < currentStep
          const isCurrent = step === currentStep
          const isPending = step > currentStep

          return (
            <div key={step} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              {/* Step Circle */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s',
                backgroundColor: isCompleted ? 'var(--color-success)' :
                                 isCurrent ? 'var(--color-primary)' : 'var(--color-surface)',
                color: (isCompleted || isCurrent) ? 'white' : 'var(--color-text-secondary)',
                border: isPending ? '2px solid var(--color-border)' : 'none'
              }}>
                {isCompleted ? (
                  <Check size={16} />
                ) : (
                  step
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                color: isCurrent ? 'var(--color-primary)' :
                       isCompleted ? 'var(--color-success)' : 'var(--color-text-muted)',
                textAlign: 'center'
              }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
