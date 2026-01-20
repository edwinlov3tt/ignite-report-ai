import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import ReactMarkdown from 'react-markdown'
import {
  ChevronLeft,
  Loader2,
  Copy,
  Check,
  Wand2,
  Download,
  RefreshCw,
} from 'lucide-react'
import type { ToneType, UploadedFile, DetectedTactic } from '@/types'
import { DEMO_ORDER_ID } from './StepCampaign'
import { getAnalyzeEndpoint } from '@/config/api'

// Demo analysis sections
const DEMO_SECTIONS = {
  executiveSummary: `The Q1 2024 Digital Marketing Campaign for Sample Company Inc. has demonstrated strong performance across all digital channels. The multi-platform approach utilizing Facebook, Google, and LinkedIn has effectively reached diverse audience segments with a total budget allocation of $113,000.

Key highlights include exceptional engagement rates on Instagram Stories, strong lead generation through Google Search ads, and successful B2B outreach via LinkedIn Sponsored Content. The campaign has achieved a 95% delivery rate with over 1.45 million impressions generated to date.`,

  performanceByPlatform: `**Facebook/Instagram Performance:**
The Instagram Stories campaign has exceeded expectations with a CTR of 2.8%, significantly above the industry average of 1.5%. The retargeting (RTG) and keyword targeting (KWT) strategies have proven highly effective, delivering a 35% lower cost-per-acquisition than projected.

**Google Search Performance:**
Search campaigns are delivering strong ROI with an average conversion rate of 4.2%. The SEM strategy has successfully captured high-intent traffic, with 'Sample Company' branded searches increasing by 150% during the campaign period.

**LinkedIn Performance:**
B2B engagement has been robust with a 3.5% engagement rate on sponsored content. Decision-maker targeting has resulted in 450 qualified leads, with a cost-per-lead 20% below industry benchmarks.

**Programmatic Display Performance:**
Display retargeting has maintained strong brand recall metrics with a 0.12% CTR. Frequency capping at 5 impressions per user has optimized budget efficiency while maintaining reach.

**YouTube Performance:**
Video completion rates are averaging 65%, with strong brand lift metrics showing 18% increase in brand awareness among exposed audiences.`,

  trendAnalysis: `Monthly performance data reveals consistent improvement across all platforms:

• January: Initial learning phase with optimization of targeting parameters
• February: 25% improvement in CTR following creative refresh
• March: Peak performance with highest conversion rates recorded

Seasonal trends indicate stronger performance during weekdays for B2B content, while consumer-focused campaigns see better engagement during evenings and weekends.

Week-over-week analysis shows steady improvement in cost efficiency, with CPA decreasing by an average of 3% each week as algorithms optimize delivery.`,

  recommendations: `Based on the analysis, we recommend the following optimizations:

1. **Increase Instagram Budget Allocation:** Given the exceptional performance, consider reallocating 15% of budget from lower-performing channels

2. **Expand Google Search Keywords:** High conversion rates suggest opportunity for keyword expansion in related categories

3. **LinkedIn Content Diversification:** Test video content and carousel ads to potentially improve engagement rates further

4. **Implement Cross-Platform Retargeting:** Create audience segments from high-performing platforms for cross-channel remarketing

5. **A/B Test Ad Scheduling:** Optimize delivery times based on platform-specific engagement patterns identified`,

  competitiveInsights: `Comparative analysis against industry benchmarks reveals Sample Company Inc. is outperforming competitors in several key areas:

• CTR rates are 45% above industry average across all platforms
• Cost-per-acquisition is 30% lower than competitive benchmark
• Brand awareness lift of 22% exceeds typical campaign performance by 8 percentage points

Competitor analysis suggests opportunity to capture additional market share through increased investment in emerging platforms and continued optimization of current successful strategies.

Market positioning remains strong with digital share of voice increasing from 12% to 18% during the campaign period.`,
}

const models = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Advanced reasoning with balanced performance and speed. Excellent for comprehensive business analysis.', badge: 'claude' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable model for complex analysis and deep insights.', badge: 'claude' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Google\'s advanced model with strong analytical capabilities.', badge: 'gemini' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI\'s flagship model with broad capabilities.', badge: 'openai' },
]

const tones: { id: ToneType; emoji: string; label: string; description: string }[] = [
  { id: 'concise', emoji: '🎯', label: 'Concise', description: 'Brief, to-the-point analysis with key insights only' },
  { id: 'professional', emoji: '💼', label: 'Professional', description: 'Formal business language suitable for executive reports' },
  { id: 'conversational', emoji: '💬', label: 'Conversational', description: 'Friendly, approachable tone for team discussions' },
  { id: 'encouraging', emoji: '📈', label: 'Encouraging', description: 'Positive, motivational language highlighting opportunities' },
  { id: 'analytical', emoji: '📊', label: 'Analytical', description: 'Data-driven insights with detailed metrics and benchmarks' },
  { id: 'casual', emoji: '👤', label: 'Casual', description: 'Relaxed, informal tone for internal team use' },
]

const reportSections = [
  { id: 'executiveSummary', label: 'Executive Summary' },
  { id: 'performanceByPlatform', label: 'Performance Analysis by Platform' },
  { id: 'trendAnalysis', label: 'Trend Analysis' },
  { id: 'recommendations', label: 'Optimization Recommendations' },
  { id: 'competitiveInsights', label: 'Competitive Insights' },
]

function getTemperatureLabel(temp: number): { label: string; color: string } {
  if (temp <= 0.3) return { label: 'Focused', color: '#3b82f6' }
  if (temp <= 0.7) return { label: 'Balanced', color: '#10b981' }
  if (temp <= 0.8) return { label: 'Creative', color: '#f59e0b' }
  return { label: 'Diverse', color: '#ef4444' }
}

function getTemperatureDescription(temp: number): string {
  if (temp <= 0.3) return 'Precise, deterministic responses with minimal variation'
  if (temp <= 0.7) return 'Balanced approach with consistent insights'
  if (temp <= 0.8) return 'More creative and varied analysis'
  return 'Highly creative with diverse perspectives'
}

function formatDate(date: string | undefined): string {
  if (!date) return '--'
  return new Date(date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  })
}

function formatTimestamp(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Custom markdown components for styling
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: '0 0 16px 0', lineHeight: 1.8 }}>{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: '16px 0', paddingLeft: '24px', listStyleType: 'disc' }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: '16px 0', paddingLeft: '24px' }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ margin: '8px 0', lineHeight: 1.7 }}>{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 600 }}>{children}</strong>
  ),
}

export function StepAnalysis() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState('executiveSummary')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const navRef = useRef<HTMLDivElement>(null)

  const analysisConfig = useAppStore((state) => state.analysisConfig)
  const setAnalysisConfig = useAppStore((state) => state.setAnalysisConfig)
  const analysisResults = useAppStore((state) => state.analysisResults)
  const setAnalysisResults = useAppStore((state) => state.setAnalysisResults)
  const campaignData = useAppStore((state) => state.campaignData)
  const companyConfig = useAppStore((state) => state.companyConfig)
  const timeRange = useAppStore((state) => state.timeRange)
  const filesByTactic = useAppStore((state) => state.filesByTactic)
  const detectedTactics = useAppStore((state) => state.detectedTactics)
  const setError = useAppStore((state) => state.setError)
  const prevStep = useAppStore((state) => state.prevStep)

  const currentModel = models.find(m => m.id === analysisConfig.model) || models[0]
  const tempInfo = getTemperatureLabel(analysisConfig.temperature)
  const currentTone = tones.find(t => t.id === analysisConfig.tone)

  // Get sections for display
  const sections = campaignData?.id === DEMO_ORDER_ID ? DEMO_SECTIONS : null

  // Scroll spy effect
  useEffect(() => {
    if (!analysisResults) return

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200 // Offset for sticky nav

      for (const section of reportSections) {
        const element = sectionRefs.current[section.id]
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [analysisResults])

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId]
    if (element) {
      const navHeight = navRef.current?.offsetHeight || 60
      const offsetTop = element.offsetTop - navHeight - 24
      window.scrollTo({ top: offsetTop, behavior: 'smooth' })
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setActiveSection('executiveSummary')

    const isDemo = campaignData?.id === DEMO_ORDER_ID

    if (isDemo) {
      setTimeout(() => {
        setAnalysisResults({
          executiveSummary: DEMO_SECTIONS.executiveSummary,
          tacticPerformance: {},
          overallMetrics: {},
          recommendations: [],
          generatedAt: new Date().toISOString(),
          campaignName: campaignData?.orderName || 'Demo Campaign',
          companyName: campaignData?.companyName || 'Sample Company Inc.',
        })
        setIsGenerating(false)
      }, 2500)
      return
    }

    try {
      // Transform files to worker format
      const transformedFiles = transformFilesToWorkerFormat(filesByTactic, detectedTactics)

      // Build request payload for worker
      const workerPayload = {
        campaignData: {
          orderId: campaignData?.orderId || campaignData?.id || '',
          orderName: campaignData?.orderName,
          startDate: timeRange?.startDate || campaignData?.startDate,
          endDate: timeRange?.endDate || campaignData?.endDate,
        },
        companyConfig: {
          companyName: companyConfig.companyName || campaignData?.companyName || '',
          industry: companyConfig.industry,
          customInstructions: analysisConfig.customInstructions || companyConfig.additionalNotes,
        },
        files: transformedFiles,
        config: {
          model: analysisConfig.model,
          temperature: analysisConfig.temperature,
          tone: analysisConfig.tone,
        },
      }

      const response = await fetch(getAnalyzeEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workerPayload),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || result.message || 'Analysis failed')
      }

      // Transform worker response to frontend format
      setAnalysisResults({
        executiveSummary: result.analysis,
        tacticPerformance: {},
        overallMetrics: {},
        recommendations: [],
        generatedAt: new Date().toISOString(),
        campaignName: campaignData?.orderName || 'Campaign',
        companyName: companyConfig.companyName || campaignData?.companyName || 'Company',
      })
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate analysis')
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Transform frontend file structure to worker format
   */
  function transformFilesToWorkerFormat(
    filesByTactic: Record<string, UploadedFile[]>,
    detectedTactics: DetectedTactic[]
  ) {
    // Combine all files into performance data
    const allFiles = Object.values(filesByTactic).flat()

    if (allFiles.length === 0) {
      return {}
    }

    // Build tactics from detected tactics and file data
    const tactics = detectedTactics.map((tactic) => ({
      platform: tactic.platform || 'unknown',
      product: tactic.product || '',
      subproduct: tactic.subProduct || '',
      tacticType: tactic.name || '',
      dataValue: tactic.name?.toLowerCase().replace(/\s+/g, '_') || '',
      matchConfidence: 1.0,
    }))

    // Combine all file data
    const combinedData: Record<string, unknown>[] = []
    const allHeaders: Set<string> = new Set()

    for (const file of allFiles) {
      for (const header of file.headers) {
        allHeaders.add(header)
      }
      combinedData.push(...file.data)
    }

    return {
      performance: {
        data: combinedData,
        headers: Array.from(allHeaders),
        tactics,
      },
    }
  }

  const handleCopy = async () => {
    if (sections) {
      const fullContent = reportSections
        .filter(s => sections[s.id as keyof typeof sections])
        .map(s => `## ${s.label}\n\n${sections[s.id as keyof typeof sections]}`)
        .join('\n\n---\n\n')
      await navigator.clipboard.writeText(fullContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExport = () => {
    if (!sections || !analysisResults) return

    const fullContent = `# Campaign Performance Analysis

**${analysisResults.companyName}**
Analysis Range: ${formatDate(timeRange?.startDate)} - ${formatDate(timeRange?.endDate)}
Generated: ${formatTimestamp(analysisResults.generatedAt)}

---

${reportSections
  .filter(s => sections[s.id as keyof typeof sections])
  .map(s => `## ${s.label}\n\n${sections[s.id as keyof typeof sections]}`)
  .join('\n\n---\n\n')}`

    const blob = new Blob([fullContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaign-analysis-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCustomInstructionsChange = (value: string) => {
    if (value.length <= 500) {
      setAnalysisConfig({ customInstructions: value })
    }
  }

  // Render the full report view when results are available
  if (analysisResults && !isGenerating && sections) {
    return (
      <div className="report-container animate-fade-in" style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}>
        {/* Report Header */}
        <div className="report-header" style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontSize: 'clamp(22px, 5vw, 28px)',
            fontWeight: 700,
            margin: '0 0 8px 0',
            color: 'var(--color-text-primary)'
          }}>
            Campaign Performance Analysis
          </h1>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px 24px',
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            marginBottom: '16px'
          }}>
            <span>{analysisResults.companyName}</span>
            <span>Analysis Range: {formatDate(timeRange?.startDate)} - {formatDate(timeRange?.endDate)}</span>
            <span>Generated {formatTimestamp(analysisResults.generatedAt)}</span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button onClick={handleExport} className="report-action-btn">
              <Download size={16} />
              Export
            </button>
            <button onClick={handleCopy} className="report-action-btn">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={() => setAnalysisResults(null)} className="report-action-btn">
              <RefreshCw size={16} />
              New Analysis
            </button>
          </div>
        </div>

        {/* Sticky Navigation */}
        <nav
          ref={navRef}
          className="report-nav"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid var(--color-border)',
            marginLeft: '-32px',
            marginRight: '-32px',
            paddingLeft: '32px',
            paddingRight: '32px',
            paddingTop: '12px',
            paddingBottom: '12px',
          }}
        >
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {reportSections.map((section) => {
              const hasContent = sections[section.id as keyof typeof sections]
              if (!hasContent) return null

              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`report-nav-item ${isActive ? 'active' : ''}`}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                    border: '1px solid transparent',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  {section.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* All Sections Content */}
        <div className="report-content" style={{ paddingTop: '32px' }}>
          {reportSections.map((section) => {
            const content = sections[section.id as keyof typeof sections]
            if (!content) return null

            return (
              <section
                key={section.id}
                id={section.id}
                ref={(el) => { sectionRefs.current[section.id] = el }}
                style={{ marginBottom: '48px' }}
              >
                {/* Section Title with Accent */}
                <h2 style={{
                  fontSize: 'clamp(18px, 4vw, 22px)',
                  fontWeight: 700,
                  margin: '0 0 24px 0',
                  paddingLeft: '16px',
                  borderLeft: '4px solid var(--color-primary)',
                  color: 'var(--color-text-primary)',
                }}>
                  {section.label}
                </h2>

                {/* Section Content */}
                <div style={{
                  fontSize: '15px',
                  lineHeight: 1.8,
                  color: 'var(--color-text-primary)',
                }}>
                  <ReactMarkdown components={markdownComponents}>
                    {content}
                  </ReactMarkdown>
                </div>
              </section>
            )
          })}
        </div>

        {/* Back Button */}
        <div className="section-actions" style={{ justifyContent: 'flex-start', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={prevStep} className="btn-secondary">
            <ChevronLeft size={20} />
            Back to Configuration
          </button>
        </div>

        {/* Styles for report */}
        <style>{`
          .report-action-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: var(--radius-full);
            border: 1px solid var(--color-border);
            background: #ffffff;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: var(--color-text-primary);
            transition: all 0.2s;
          }
          .report-action-btn:hover {
            background: var(--color-surface-secondary);
            border-color: var(--color-text-muted);
          }
          .report-nav::-webkit-scrollbar {
            display: none;
          }
          .report-nav-item:hover:not(.active) {
            color: var(--color-primary) !important;
            border-color: var(--color-primary) !important;
          }
          @media (max-width: 768px) {
            .report-container {
              padding: 20px !important;
            }
            .report-nav {
              margin-left: -20px !important;
              margin-right: -20px !important;
              padding-left: 20px !important;
              padding-right: 20px !important;
            }
            .report-nav-item {
              padding: 6px 12px !important;
              font-size: 13px !important;
            }
            .report-action-btn {
              padding: 6px 12px;
              font-size: 13px;
            }
          }
        `}</style>
      </div>
    )
  }

  // Render configuration view
  return (
    <div className="report-container animate-fade-in">
      {/* Section Header */}
      <div className="section-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="step-indicator">5</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>AI Analysis Configuration</h2>
        </div>
        <span className="step-status">STEP PENDING</span>
      </div>

      {/* Description */}
      <p className="form-description">
        Customize how the AI analyzes your campaign data
      </p>

      {/* Loading State */}
      {isGenerating && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          backgroundColor: 'var(--color-surface-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px'
        }}>
          <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
          <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Analyzing your campaign data...</p>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>This may take 30-60 seconds</p>
        </div>
      )}

      {/* Config Section */}
      {!isGenerating && (
        <>
          {/* AI Model Selection */}
          <div className="form-field">
            <label>AI Model</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <select
                value={analysisConfig.model}
                onChange={(e) => {
                  const model = models.find(m => m.id === e.target.value)
                  if (model) {
                    setAnalysisConfig({ model: model.id, modelName: model.name })
                  }
                }}
                className="select-field"
                style={{ flex: 1, minWidth: '200px' }}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
              <span style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: currentModel.badge === 'claude' ? 'rgba(234, 88, 12, 0.15)' :
                               currentModel.badge === 'gemini' ? 'rgba(66, 133, 244, 0.15)' :
                               'rgba(16, 163, 127, 0.15)',
                color: currentModel.badge === 'claude' ? '#ea580c' :
                       currentModel.badge === 'gemini' ? '#4285f4' :
                       '#10a37f',
                border: `1px solid ${currentModel.badge === 'claude' ? 'rgba(234, 88, 12, 0.25)' :
                                     currentModel.badge === 'gemini' ? 'rgba(66, 133, 244, 0.25)' :
                                     'rgba(16, 163, 127, 0.25)'}`
              }}>
                {currentModel.name}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              {currentModel.description}
            </p>
          </div>

          {/* Temperature Slider */}
          <div className="form-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ margin: 0 }}>Analysis Creativity (Temperature)</label>
              <span style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: `${tempInfo.color}15`,
                color: tempInfo.color,
                border: `1px solid ${tempInfo.color}30`
              }}>
                {tempInfo.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={analysisConfig.temperature}
                onChange={(e) => setAnalysisConfig({ temperature: parseFloat(e.target.value) })}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: 'var(--radius-full)',
                  accentColor: 'var(--color-primary)',
                  cursor: 'pointer'
                }}
              />
              <span style={{
                minWidth: '35px',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '16px',
                fontFamily: 'monospace'
              }}>
                {analysisConfig.temperature.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              <span>0.0 - Deterministic</span>
              <span>0.5 - Balanced</span>
              <span>1.0 - Creative</span>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              {getTemperatureDescription(analysisConfig.temperature)}
            </p>
          </div>

          {/* Tone & Style Selection */}
          <div className="form-field">
            <label>Analysis Tone & Style</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {tones.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setAnalysisConfig({ tone: tone.id })}
                  style={{
                    padding: '15px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${analysisConfig.tone === tone.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: analysisConfig.tone === tone.id ? 'rgba(207, 14, 15, 0.08)' : 'var(--color-surface)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    boxShadow: analysisConfig.tone === tone.id ? '0 0 0 3px rgba(207, 14, 15, 0.15)' : 'none'
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '15px' }}>
                    {tone.emoji} {tone.label}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    {tone.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="form-field">
            <label>Additional AI Instructions</label>
            <textarea
              value={analysisConfig.customInstructions}
              onChange={(e) => handleCustomInstructionsChange(e.target.value)}
              placeholder="Add specific instructions for the AI analysis..."
              className="textarea-field"
              rows={4}
            />
            <div style={{
              textAlign: 'right',
              fontSize: '13px',
              color: analysisConfig.customInstructions.length >= 450 ? 'var(--color-warning)' : 'var(--color-text-muted)',
              marginTop: '4px'
            }}>
              {analysisConfig.customInstructions.length} / 500 characters
            </div>
          </div>

          {/* Configuration Summary */}
          <div style={{
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            marginTop: '8px'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontWeight: 700 }}>Current Configuration</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Model:</span>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{currentModel.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Temperature:</span>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{analysisConfig.temperature.toFixed(1)} - {tempInfo.label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Tone:</span>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{currentTone?.label || 'Professional'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Custom Instructions:</span>
                <span style={{ fontWeight: 600, fontSize: '14px', color: analysisConfig.customInstructions ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                  {analysisConfig.customInstructions ? `${analysisConfig.customInstructions.length} chars` : 'None'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="section-actions">
        <button onClick={prevStep} className="btn-secondary">
          <ChevronLeft size={20} />
          Back
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="btn-primary"
          style={{ minWidth: '200px' }}
        >
          {isGenerating ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Wand2 size={20} />
          )}
          {isGenerating ? 'Generating...' : 'Generate AI Analysis'}
        </button>
      </div>
    </div>
  )
}
