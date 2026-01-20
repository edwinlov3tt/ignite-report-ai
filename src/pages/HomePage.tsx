import { useAppStore } from '@/store/useAppStore'
import { StepCampaign } from '@/components/steps/StepCampaign'
import { StepTimeRange } from '@/components/steps/StepTimeRange'
import { StepCompany } from '@/components/steps/StepCompany'
import { StepPerformance } from '@/components/steps/StepPerformance'
import { StepAnalysis } from '@/components/steps/StepAnalysis'

export function HomePage() {
  const currentStep = useAppStore((state) => state.currentStep)

  return (
    <div className="animate-in fade-in duration-300">
      {currentStep === 1 && <StepCampaign />}
      {currentStep === 2 && <StepTimeRange />}
      {currentStep === 3 && <StepCompany />}
      {currentStep === 4 && <StepPerformance />}
      {currentStep === 5 && <StepAnalysis />}
    </div>
  )
}
