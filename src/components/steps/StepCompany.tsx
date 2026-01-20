import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ChevronLeft, ChevronRight, Loader2, Check, X } from 'lucide-react'

const industries = [
  'Technology',
  'Healthcare',
  'Finance & Banking',
  'Retail & E-commerce',
  'Education',
  'Automotive',
  'Real Estate',
  'Food & Beverage',
  'Travel & Tourism',
  'Entertainment & Media',
  'Professional Services',
  'Manufacturing',
  'Non-Profit',
  'Government',
  'Energy & Utilities',
  'Other',
]

export function StepCompany() {
  const companyConfig = useAppStore((state) => state.companyConfig)
  const setCompanyConfig = useAppStore((state) => state.setCompanyConfig)
  const campaignData = useAppStore((state) => state.campaignData)
  const nextStep = useAppStore((state) => state.nextStep)
  const prevStep = useAppStore((state) => state.prevStep)

  // Market Research URL state
  const [researchUrl, setResearchUrl] = useState(companyConfig.marketResearchUrl || '')
  const [researchStatus, setResearchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // Industry search state
  const [industrySearch, setIndustrySearch] = useState(companyConfig.industry || '')
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false)
  const industryRef = useRef<HTMLDivElement>(null)

  // Auto-fill company name from campaign data
  const companyName = companyConfig.companyName || campaignData?.companyName || ''

  // Filter industries based on search
  const filteredIndustries = industries.filter(ind =>
    ind.toLowerCase().includes(industrySearch.toLowerCase())
  )

  const handleChange = (field: string, value: string) => {
    setCompanyConfig({ [field]: value })
  }

  const handleIndustrySelect = (industry: string) => {
    setIndustrySearch(industry)
    setCompanyConfig({ industry })
    setShowIndustryDropdown(false)
  }

  const handleResearchUrlChange = (url: string) => {
    setResearchUrl(url)
    setCompanyConfig({ marketResearchUrl: url })

    // Auto-fetch if valid URL
    if (url && url.includes('ignite.edwinlovett.com/research')) {
      fetchResearchContext(url)
    }
  }

  const fetchResearchContext = async (_url: string) => {
    setResearchStatus('loading')
    try {
      // Simulate API call - in production this would fetch from the research API
      await new Promise(resolve => setTimeout(resolve, 1500))
      setResearchStatus('success')
    } catch {
      setResearchStatus('error')
    }
  }

  const handleContinue = () => {
    if (!companyConfig.companyName && companyName) {
      setCompanyConfig({ companyName })
    }
    if (!companyConfig.industry && industrySearch) {
      setCompanyConfig({ industry: industrySearch })
    }
    nextStep()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (industryRef.current && !industryRef.current.contains(event.target as Node)) {
        setShowIndustryDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="report-container animate-fade-in">
      {/* Section Header */}
      <div className="section-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="step-indicator">3</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Company Information</h2>
        </div>
        <span className="step-status">STEP PENDING</span>
      </div>

      {/* Description */}
      <p className="form-description">
        Configure company details to enhance the analysis context. Start by pasting a research URL to auto-fill company information.
      </p>

      {/* Market Research Context - Priority Field */}
      <div style={{
        border: '2px solid var(--color-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '24px',
        backgroundColor: 'var(--color-surface)'
      }}>
        <label style={{
          display: 'block',
          color: 'var(--color-primary)',
          fontWeight: 600,
          marginBottom: '8px',
          fontSize: '16px'
        }}>
          Market Research Context (Optional)
        </label>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '14px',
          marginBottom: '12px',
          marginTop: 0
        }}>
          Paste a research URL to automatically fetch company context, industry insights, and competitor analysis. This will auto-fill the fields below.
        </p>
        <div style={{ position: 'relative' }}>
          <input
            type="url"
            value={researchUrl}
            onChange={(e) => handleResearchUrlChange(e.target.value)}
            placeholder="https://ignite.edwinlovett.com/research/?company=example.com"
            className="input-field"
            style={{ paddingRight: '48px' }}
          />
          {researchStatus !== 'idle' && (
            <div style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center'
            }}>
              {researchStatus === 'loading' && (
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
              )}
              {researchStatus === 'success' && (
                <Check size={20} style={{ color: 'var(--color-success)' }} />
              )}
              {researchStatus === 'error' && (
                <X size={20} style={{ color: 'var(--color-error)' }} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Company Information Fields */}
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Company Name */}
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label>Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => handleChange('companyName', e.target.value)}
            placeholder="Enter company name"
            className="input-field"
          />
        </div>

        {/* Industry - Searchable Input */}
        <div className="form-field" style={{ marginBottom: 0 }} ref={industryRef}>
          <label>Industry (Optional)</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={industrySearch}
              onChange={(e) => {
                setIndustrySearch(e.target.value)
                setShowIndustryDropdown(true)
              }}
              onFocus={() => setShowIndustryDropdown(true)}
              placeholder="Search or type industry..."
              className="input-field"
            />
            {showIndustryDropdown && filteredIndustries.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 10,
                maxHeight: '200px',
                overflowY: 'auto',
                marginTop: '4px'
              }}>
                {filteredIndustries.map((industry) => (
                  <div
                    key={industry}
                    onClick={() => handleIndustrySelect(industry)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {industry}
                  </div>
                ))}
                {industrySearch && !filteredIndustries.includes(industrySearch) && (
                  <div
                    onClick={() => handleIndustrySelect(industrySearch)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      color: 'var(--color-primary)',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    + Add "{industrySearch}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Goals */}
      <div className="form-field">
        <label>Campaign Goals</label>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px', marginTop: '-4px' }}>
          What are the main objectives of this campaign?
        </p>
        <textarea
          value={companyConfig.campaignGoals}
          onChange={(e) => handleChange('campaignGoals', e.target.value)}
          placeholder="Describe the main objectives of this campaign..."
          className="textarea-field"
        />
      </div>

      {/* Additional Notes */}
      <div className="form-field" style={{ marginBottom: 0 }}>
        <label>Additional Notes <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px', marginTop: '-4px' }}>
          Any additional context the AI should consider during analysis.
        </p>
        <textarea
          value={companyConfig.additionalNotes}
          onChange={(e) => handleChange('additionalNotes', e.target.value)}
          placeholder="Any additional context the AI should consider..."
          className="textarea-field"
        />
      </div>

      {/* Navigation */}
      <div className="section-actions">
        <button onClick={prevStep} className="btn-secondary">
          <ChevronLeft size={20} />
          Back
        </button>
        <button onClick={handleContinue} className="btn-primary">
          Continue to Performance Data
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
