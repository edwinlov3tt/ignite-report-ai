import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Play, Trash2, Settings, Loader2,
  Thermometer, Hash, MessageSquare, RefreshCw
} from 'lucide-react'
import { getSections, type ReportSection } from '@/lib/sectionsApi'

// Types
interface AIModel {
  id: string
  name: string
  provider: string
  configured: boolean
}

interface TestResult {
  success: boolean
  response?: string
  model?: { name: string }
  config?: { temperature: number; maxTokens: number }
  timestamp?: string
  error?: string
}

// API base URL
const API_BASE = import.meta.env.DEV
  ? '/api'
  : 'https://ignite.edwinlovett.com/report-ai/api'

export function AITestingPage() {
  // Data state
  const [models, setModels] = useState<AIModel[]>([])
  const [sections, setSections] = useState<ReportSection[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [isLoadingSections, setIsLoadingSections] = useState(true)

  // Configuration state
  const [selectedModel, setSelectedModel] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [analysisTone, setAnalysisTone] = useState('professional')

  // Test state
  const [selectedSection, setSelectedSection] = useState<ReportSection | null>(null)
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  // Load models
  useEffect(() => {
    async function loadModels() {
      try {
        const response = await fetch(`${API_BASE}/models.php`)
        const data = await response.json()
        if (data.success && data.data) {
          setModels(data.data.models || [])
          if (data.data.defaultModel) {
            setSelectedModel(data.data.defaultModel)
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error)
      } finally {
        setIsLoadingModels(false)
      }
    }
    loadModels()
  }, [])

  // Load sections
  useEffect(() => {
    async function loadSections() {
      try {
        const data = await getSections()
        setSections(data.filter(s => s.is_default))
      } catch (error) {
        console.error('Failed to load sections:', error)
      } finally {
        setIsLoadingSections(false)
      }
    }
    loadSections()
  }, [])

  const configuredModels = models.filter(m => m.configured)

  const toneDescriptions: Record<string, string> = {
    concise: 'Brief, to-the-point analysis with key insights only',
    professional: 'Formal business language suitable for executive reports',
    conversational: 'Friendly, approachable tone for team discussions',
    encouraging: 'Positive, motivational language highlighting opportunities',
    analytical: 'Data-driven insights with detailed metrics and benchmarks',
    casual: 'Relaxed, informal tone for internal team use'
  }

  // Generate prompt for section
  const generateSectionPrompt = (section: ReportSection): string => {
    const sampleCampaignData = {
      campaign_name: 'Holiday Marketing Campaign 2024',
      advertiser: 'Acme Corp',
      start_date: '2024-11-01',
      end_date: '2024-12-31',
      total_spend: 85000,
      impressions: 2500000,
      clicks: 105000,
      conversions: 4200,
      ctr: 4.2,
      conversion_rate: 4.0,
      cost_per_click: 0.81,
      cost_per_conversion: 20.24,
      channels: {
        'Google Search': { impressions: 800000, clicks: 40000, conversions: 2000, spend: 32000 },
        'Facebook/Instagram': { impressions: 1200000, clicks: 45000, conversions: 1500, spend: 28000 },
        'LinkedIn': { impressions: 300000, clicks: 12000, conversions: 480, spend: 15000 },
        'Display': { impressions: 200000, clicks: 8000, conversions: 220, spend: 10000 }
      }
    }

    return `${section.instructions}

Context: You are generating the "${section.name}" section for a campaign analysis report.
Analysis Tone: ${analysisTone}

Sample Campaign Data:
- Campaign: ${sampleCampaignData.campaign_name}
- Advertiser: ${sampleCampaignData.advertiser}
- Duration: ${sampleCampaignData.start_date} to ${sampleCampaignData.end_date}
- Total Spend: $${sampleCampaignData.total_spend.toLocaleString()}
- Impressions: ${sampleCampaignData.impressions.toLocaleString()}
- Clicks: ${sampleCampaignData.clicks.toLocaleString()}
- Conversions: ${sampleCampaignData.conversions.toLocaleString()}
- CTR: ${sampleCampaignData.ctr}%
- Conversion Rate: ${sampleCampaignData.conversion_rate}%
- Cost per Click: $${sampleCampaignData.cost_per_click}
- Cost per Conversion: $${sampleCampaignData.cost_per_conversion}

Channel Performance:
${Object.entries(sampleCampaignData.channels).map(([channel, data]) =>
  `- ${channel}: ${data.impressions.toLocaleString()} impressions, ${data.clicks.toLocaleString()} clicks, ${data.conversions} conversions, $${data.spend.toLocaleString()} spend`
).join('\n')}

Please generate the "${section.name}" section following the instructions above.`
  }

  // Run AI test
  const runTest = async () => {
    if (!selectedSection || !selectedModel) return

    const selectedModelObj = models.find(m => m.id === selectedModel)
    if (!selectedModelObj?.configured) return

    setIsRunningTest(true)
    setTestResult(null)

    try {
      const prompt = generateSectionPrompt(selectedSection)
      const response = await fetch(`${API_BASE}/ai-test.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          temperature,
          maxTokens,
          prompt
        })
      })

      const data = await response.json()

      if (data.success) {
        setTestResult({
          success: true,
          response: data.data.response,
          model: data.data.model,
          config: data.data.configuration,
          timestamp: data.data.timestamp
        })
      } else {
        setTestResult({
          success: false,
          error: data.message || 'AI test failed'
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsRunningTest(false)
    }
  }

  // Run all sections test
  const runAllSectionsTest = async () => {
    if (sections.length === 0 || !selectedModel) return

    const selectedModelObj = models.find(m => m.id === selectedModel)
    if (!selectedModelObj?.configured) return

    setIsRunningTest(true)
    setTestResult(null)
    setSelectedSection(null)

    const results: { section: ReportSection; success: boolean; response?: string; error?: string }[] = []

    for (const section of sections) {
      try {
        const prompt = generateSectionPrompt(section)
        const response = await fetch(`${API_BASE}/ai-test.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedModel,
            temperature,
            maxTokens,
            prompt
          })
        })

        const data = await response.json()
        results.push({
          section,
          success: data.success,
          response: data.success ? data.data?.response : undefined,
          error: !data.success ? data.message : undefined
        })
      } catch (error) {
        results.push({
          section,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Show combined results
    const successCount = results.filter(r => r.success).length
    setTestResult({
      success: successCount > 0,
      response: results.map(r =>
        `### ${r.section.name}\n${r.success ? r.response?.substring(0, 300) + '...' : `Error: ${r.error}`}`
      ).join('\n\n'),
      timestamp: new Date().toISOString()
    })

    setIsRunningTest(false)
  }

  const clearResults = () => {
    setTestResult(null)
    setSelectedSection(null)
  }

  // Format AI response
  const formatResponse = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/###\s*(.*)/g, '<h4 style="margin: 16px 0 8px; font-size: 16px;">$1</h4>')
      .replace(/##\s*(.*)/g, '<h3 style="margin: 16px 0 8px; font-size: 18px;">$1</h3>')
      .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
      .replace(/\n/g, '<br>')
  }

  const selectedModelConfigured = models.find(m => m.id === selectedModel)?.configured

  return (
    <div>
      {/* Page Header */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)' }}>
          AI Testing
        </h1>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          Test AI models with report sections using sample campaign data
        </p>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        {/* Left Panel - Configuration */}
        <aside style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          {/* Model Configuration */}
          <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Settings size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Model Configuration</h3>
            </div>

            {/* Model Select */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>AI Model</label>
              {isLoadingModels ? (
                <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                  Loading models...
                </div>
              ) : (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="input-field"
                  style={{ padding: '10px 12px', fontSize: '14px' }}
                >
                  <option value="">Select a model...</option>
                  {models.map(model => (
                    <option key={model.id} value={model.id} disabled={!model.configured}>
                      {model.name}{!model.configured ? ' (API key required)' : ''}
                    </option>
                  ))}
                </select>
              )}
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {configuredModels.length}/{models.length} models ready
              </div>
            </div>

            {/* Temperature */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                <Thermometer size={14} />
                Temperature: {temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                <Hash size={14} />
                Max Tokens
              </label>
              <select
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="input-field"
                style={{ padding: '10px 12px', fontSize: '14px' }}
              >
                <option value="1024">1,024 tokens</option>
                <option value="2048">2,048 tokens</option>
                <option value="4096">4,096 tokens</option>
                <option value="8192">8,192 tokens</option>
              </select>
            </div>

            {/* Analysis Tone */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                <MessageSquare size={14} />
                Analysis Tone
              </label>
              <select
                value={analysisTone}
                onChange={(e) => setAnalysisTone(e.target.value)}
                className="input-field"
                style={{ padding: '10px 12px', fontSize: '14px' }}
              >
                <option value="concise">Concise</option>
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="encouraging">Encouraging</option>
                <option value="analytical">Analytical</option>
                <option value="casual">Casual</option>
              </select>
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {toneDescriptions[analysisTone]}
              </div>
            </div>
          </div>

          {/* Section Scenarios */}
          <div style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Report Sections</h3>
            {isLoadingSections ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading sections...
              </div>
            ) : sections.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <p style={{ margin: '0 0 8px 0' }}>No sections available</p>
                <Link to="/schema-admin/sections-manager" style={{ color: 'var(--color-primary)', fontSize: '13px' }}>
                  Create sections in Sections Manager
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: selectedSection?.id === section.id ? 'var(--color-primary-light)' : 'var(--color-surface-secondary)',
                      border: selectedSection?.id === section.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '4px' }}>{section.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{section.section_key}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Test Controls */}
          <div style={{ padding: '20px', borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={selectedSection ? runTest : runAllSectionsTest}
              disabled={!selectedModel || !selectedModelConfigured || isRunningTest || (sections.length === 0)}
              className="btn-primary"
              style={{ width: '100%', marginBottom: '12px' }}
            >
              {isRunningTest ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play size={18} />
                  {selectedSection ? 'Test Section' : 'Test All Sections'}
                </>
              )}
            </button>
            {testResult && (
              <button onClick={clearResults} className="btn-secondary" style={{ width: '100%' }}>
                <Trash2 size={18} />
                Clear Results
              </button>
            )}
          </div>
        </aside>

        {/* Right Panel - Results */}
        <main style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          {/* Results Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Test Results</h2>
            {testResult && (
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                {testResult.timestamp && new Date(testResult.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Results Content */}
          <div style={{ padding: '24px', minHeight: '500px' }}>
            {isRunningTest ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--color-text-secondary)' }}>
                <Loader2 size={48} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--color-primary)' }} />
                <h3 style={{ margin: '0 0 8px 0' }}>Running AI Test...</h3>
                <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>This may take 10-30 seconds depending on the model</p>
              </div>
            ) : testResult ? (
              <div>
                {/* Section Info */}
                {selectedSection && (
                  <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{selectedSection.name}</strong>
                      <span style={{ padding: '2px 8px', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>
                        {selectedSection.section_key}
                      </span>
                    </div>
                  </div>
                )}

                {/* Test Meta */}
                {testResult.success && testResult.model && (
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <span>Model: {testResult.model.name}</span>
                    <span>Temperature: {testResult.config?.temperature}</span>
                    <span>Tokens: {testResult.config?.maxTokens}</span>
                  </div>
                )}

                {/* Response */}
                {testResult.success ? (
                  <div
                    style={{
                      backgroundColor: 'var(--color-surface-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      lineHeight: 1.7
                    }}
                    dangerouslySetInnerHTML={{ __html: formatResponse(testResult.response || '') }}
                  />
                ) : (
                  <div style={{ padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--color-error)' }}>
                    <strong>Error:</strong> {testResult.error}
                    <div style={{ marginTop: '16px' }}>
                      <button onClick={runTest} className="btn-primary">
                        <RefreshCw size={16} />
                        Retry Test
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedSection ? (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0 }}>{selectedSection.name}</h3>
                    <span style={{ padding: '2px 8px', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>
                      {selectedSection.section_key}
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 16px 0' }}>
                    {selectedSection.description || 'No description provided'}
                  </p>
                </div>

                <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  <span><strong>Display Order:</strong> {selectedSection.display_order}</span>
                  <span><strong>Type:</strong> {selectedSection.is_default ? 'Default' : 'Custom'}</span>
                </div>

                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>AI Instructions</h4>
                <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: 1.6 }}>
                  {selectedSection.instructions || 'No instructions provided'}
                </div>

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                  <strong>Ready to test:</strong> Click "Test Section" to generate content using your selected model and parameters.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Select a report section and click "Test Section" to see AI-generated content</p>
                <p style={{ margin: 0, fontSize: '14px' }}>Results will appear here with model configuration and response details</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
