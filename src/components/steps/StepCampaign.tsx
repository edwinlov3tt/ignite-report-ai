import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Search, Loader2, ChevronRight, X, ExternalLink } from 'lucide-react'
import type { LineItem, CampaignData, DetectedTactic } from '@/types'

// Demo mode constant
export const DEMO_ORDER_ID = '507f1f77bcf86cd799439011'

// Demo campaign data
const DEMO_CAMPAIGN_DATA: CampaignData = {
  id: DEMO_ORDER_ID,
  orderId: DEMO_ORDER_ID,
  companyName: 'Sample Company Inc.',
  orderName: 'Q1 2024 Digital Marketing Campaign',
  wideOrbitNumber: 'WO-2024-DEMO-001',
  status: 'Live',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  daysElapsed: 180,
  daysRemaining: 185,
  lineItems: [
    {
      id: 'demo-li-001',
      product: 'Facebook',
      subProduct: 'Instagram Stories',
      tacticTypeSpecial: ['RTG', 'KWT'],
      status: 'Active',
      workflowStepName: 'Live',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      woOrderNumber: 'WO-2024-DEMO-001',
      totalBudget: 25000,
      monthlyBudget: 2083,
    },
    {
      id: 'demo-li-002',
      product: 'Google',
      subProduct: 'Search Ads',
      tacticTypeSpecial: ['SEM'],
      status: 'Active',
      workflowStepName: 'Live',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      woOrderNumber: 'WO-2024-DEMO-001',
      totalBudget: 35000,
      monthlyBudget: 2917,
    },
    {
      id: 'demo-li-003',
      product: 'LinkedIn',
      subProduct: 'Sponsored Content',
      tacticTypeSpecial: ['B2B'],
      status: 'Active',
      workflowStepName: 'Live',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      woOrderNumber: 'WO-2024-DEMO-001',
      totalBudget: 15000,
      monthlyBudget: 1250,
    },
    {
      id: 'demo-li-004',
      product: 'Programmatic Display',
      subProduct: 'Standard Display',
      tacticTypeSpecial: ['RTG'],
      status: 'Active',
      workflowStepName: 'Live',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      woOrderNumber: 'WO-2024-DEMO-001',
      totalBudget: 20000,
      monthlyBudget: 1667,
    },
    {
      id: 'demo-li-005',
      product: 'YouTube',
      subProduct: 'Video Ads',
      tacticTypeSpecial: ['Video', 'Brand'],
      status: 'Active',
      workflowStepName: 'Live',
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      woOrderNumber: 'WO-2024-DEMO-001',
      totalBudget: 18000,
      monthlyBudget: 3000,
    },
  ],
}

const DEMO_TACTICS: DetectedTactic[] = [
  { name: 'Facebook - Instagram Stories', product: 'Facebook', subProduct: 'Instagram Stories', platform: 'Facebook', lineItemIds: ['demo-li-001'], status: 'pending' },
  { name: 'Google - Search Ads', product: 'Google', subProduct: 'Search Ads', platform: 'Google', lineItemIds: ['demo-li-002'], status: 'pending' },
  { name: 'LinkedIn - Sponsored Content', product: 'LinkedIn', subProduct: 'Sponsored Content', platform: 'LinkedIn', lineItemIds: ['demo-li-003'], status: 'pending' },
  { name: 'Programmatic Display - Standard Display', product: 'Programmatic Display', subProduct: 'Standard Display', platform: 'Programmatic Display', lineItemIds: ['demo-li-004'], status: 'pending' },
  { name: 'YouTube - Video Ads', product: 'YouTube', subProduct: 'Video Ads', platform: 'YouTube', lineItemIds: ['demo-li-005'], status: 'pending' },
]

// Helper function to format dates as "MMM DD, YYYY"
function formatDate(dateString: string): string {
  if (!dateString) return '--'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

// Helper function to get status class for color coding
function getStatusClass(status: string): string {
  const statusLower = status?.toLowerCase() || ''
  if (statusLower.includes('pending submission') || statusLower.includes('pending')) {
    return 'status-pending'
  } else if (statusLower === 'complete' || statusLower === 'completed') {
    return 'status-complete'
  } else if (statusLower === 'revision live' || statusLower === 'live - revision') {
    return 'status-live-revision'
  } else if (statusLower === 'live' || statusLower === 'active') {
    return 'status-live'
  } else if (statusLower === 'cancelled') {
    return 'status-cancelled'
  } else if (statusLower.includes('pending cancellation')) {
    return 'status-pending-cancellation'
  }
  return ''
}

// Get the most common status from line items
function getMostCommonStatus(lineItems: LineItem[]): string {
  if (!lineItems || lineItems.length === 0) return 'Unknown'
  const statusCounts: Record<string, number> = {}
  lineItems.forEach(li => {
    const status = li.workflowStepName || li.status || 'Unknown'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })
  return Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0][0]
}

interface TacticGroup {
  platform: string
  subProduct: string
  tacticSpecial: string
  lineItems: LineItem[]
  status: string
}

export function StepCampaign() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTactic, setSelectedTactic] = useState<TacticGroup | null>(null)
  const [removedTacticIds, setRemovedTacticIds] = useState<Set<string>>(new Set())

  const campaignData = useAppStore((state) => state.campaignData)
  const setCampaignData = useAppStore((state) => state.setCampaignData)
  const detectedTactics = useAppStore((state) => state.detectedTactics)
  const setDetectedTactics = useAppStore((state) => state.setDetectedTactics)
  const removeTactic = useAppStore((state) => state.removeTactic)
  const setError = useAppStore((state) => state.setError)
  const nextStep = useAppStore((state) => state.nextStep)

  const extractOrderId = (input: string): string | null => {
    const hexMatch = input.match(/[a-f0-9]{24}/i)
    if (hexMatch) return hexMatch[0]
    return null
  }

  // Load demo data
  const loadDemoData = () => {
    setIsLoading(true)
    // Simulate network delay for realistic feel
    setTimeout(() => {
      setCampaignData(DEMO_CAMPAIGN_DATA)
      setDetectedTactics(DEMO_TACTICS)
      setRemovedTacticIds(new Set())
      setIsLoading(false)
    }, 1000)
  }

  const handleFetchCampaign = async () => {
    // Check for demo mode first
    if (url.toLowerCase().trim() === 'demo') {
      loadDemoData()
      return
    }

    const orderId = extractOrderId(url)
    if (!orderId) {
      setError('Please enter a valid Lumina URL, Order ID (24-character hex), or "demo" for a sample workflow')
      return
    }

    // Check if this is the demo order ID
    if (orderId === DEMO_ORDER_ID) {
      loadDemoData()
      return
    }

    setIsLoading(true)
    try {
      // Call Lumina API worker directly
      const response = await fetch(`https://api.edwinlovett.com/order?query=${orderId}`)

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`)
      }

      const result = await response.json()

      // Worker returns { type, order, lineItems }
      const orderData = result.order || {}
      const lineItems = result.lineItems || []

      // Helper to normalize subProduct (can be string or array)
      const normalizeSubProduct = (subProduct: unknown): string => {
        if (!subProduct) return ''
        if (Array.isArray(subProduct)) return subProduct.join(', ')
        return String(subProduct)
      }

      // Get Wide Orbit Number from various possible fields
      let wideOrbitNumber = orderData.woOrderNumber || orderData.wideOrbitNumber || orderData.orderNumber || ''
      if (!wideOrbitNumber && lineItems.length > 0) {
        wideOrbitNumber = lineItems[0].woOrderNumber || lineItems[0].wideOrbitNumber || lineItems[0].orderNumber || ''
      }

      // Get dates - prefer order level, fallback to line items
      let startDate = orderData.startDate || ''
      let endDate = orderData.endDate || ''
      if ((!startDate || !endDate) && lineItems.length > 0) {
        // Find earliest start and latest end from all line items
        const validStarts = lineItems.filter((li: Record<string, unknown>) => li.startDate).map((li: Record<string, unknown>) => li.startDate as string)
        const validEnds = lineItems.filter((li: Record<string, unknown>) => li.endDate).map((li: Record<string, unknown>) => li.endDate as string)
        if (validStarts.length > 0) startDate = validStarts.sort()[0]
        if (validEnds.length > 0) endDate = validEnds.sort().reverse()[0]
      }

      // Get status - prefer order level workflowStepName, fallback to most common line item status
      let orderStatus = orderData.workflowStepName || orderData.status || 'Unknown'
      if (orderStatus === 'Unknown' && lineItems.length > 0) {
        const statusCounts: Record<string, number> = {}
        lineItems.forEach((li: Record<string, unknown>) => {
          const status = (li.workflowStepName || li.status || 'Unknown') as string
          statusCounts[status] = (statusCounts[status] || 0) + 1
        })
        orderStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0][0]
      }

      // Transform to expected format
      setCampaignData({
        id: orderData.orderId || orderId,
        orderId: orderId,
        companyName: orderData.companyName || orderData.advertiser || 'Unknown',
        orderName: orderData.orderName || orderData.enteredOrderName || 'Campaign',
        wideOrbitNumber: wideOrbitNumber,
        startDate: startDate,
        endDate: endDate,
        status: orderStatus,
        daysElapsed: 0,
        daysRemaining: 0,
        lineItems: lineItems.map((item: Record<string, unknown>) => ({
          id: (item.lineitemId || item._id || item.id || String(Math.random())) as string,
          product: (item.product || 'Unknown') as string,
          subProduct: normalizeSubProduct(item.subProduct),
          tacticTypeSpecial: item.tacticTypeSpecial as string | string[] | undefined,
          status: (item.status || 'Unknown') as string,
          workflowStepName: item.workflowStepName as string | undefined,
          startDate: (item.startDate || '') as string,
          endDate: (item.endDate || '') as string,
          woOrderNumber: (item.woOrderNumber || item.wideOrbitNumber) as string | undefined,
          totalBudget: item.totalBudget as number | undefined,
          monthlyBudget: item.monthlyBudget as number | undefined,
        })),
      })

      // Group line items by product to create tactics
      const tacticMap = new Map<string, LineItem[]>()
      lineItems.forEach((item: Record<string, unknown>) => {
        const key = item.product as string || 'Unknown'
        const existing = tacticMap.get(key) || []
        existing.push({
          id: (item.lineitemId || item._id || item.id || String(Math.random())) as string,
          product: (item.product || 'Unknown') as string,
          subProduct: normalizeSubProduct(item.subProduct),
          tacticTypeSpecial: item.tacticTypeSpecial as string | string[] | undefined,
          status: (item.status || 'Unknown') as string,
          workflowStepName: item.workflowStepName as string | undefined,
          startDate: (item.startDate || '') as string,
          endDate: (item.endDate || '') as string,
          woOrderNumber: (item.woOrderNumber || item.wideOrbitNumber) as string | undefined,
          totalBudget: item.totalBudget as number | undefined,
          monthlyBudget: item.monthlyBudget as number | undefined,
        })
        tacticMap.set(key, existing)
      })

      // Convert to tactics array
      const tactics = Array.from(tacticMap.entries()).map(([platform, items]) => {
        const firstItem = items[0]
        return {
          name: `${platform}${firstItem.subProduct ? ` - ${firstItem.subProduct}` : ''}`,
          product: platform,
          subProduct: firstItem.subProduct || '',
          platform: platform,
          lineItemIds: items.map(i => i.id),
          status: 'pending' as const,
        }
      })
      setDetectedTactics(tactics)
      setRemovedTacticIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveTactic = (tacticName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeTactic(tacticName)
    setRemovedTacticIds(prev => new Set([...prev, tacticName]))
  }

  const handleContinue = () => {
    if (campaignData) {
      nextStep()
    }
  }

  // Group line items by product for tactic cards
  const tacticGroups: TacticGroup[] = campaignData?.lineItems
    ? Array.from(
        campaignData.lineItems.reduce((map, item) => {
          const key = item.product
          const existing = map.get(key) || {
            platform: item.product,
            subProduct: item.subProduct,
            tacticSpecial: Array.isArray(item.tacticTypeSpecial)
              ? item.tacticTypeSpecial.join(', ')
              : item.tacticTypeSpecial || '',
            lineItems: [],
            status: '',
          }
          existing.lineItems.push(item)
          existing.status = getMostCommonStatus(existing.lineItems)
          map.set(key, existing)
          return map
        }, new Map<string, TacticGroup>())
      ).map(([, group]) => group).filter(g => !removedTacticIds.has(g.platform))
    : []

  const activeTacticsCount = detectedTactics.filter(t => !removedTacticIds.has(t.name)).length

  return (
    <div className="report-container animate-fade-in">
      {/* Section Header */}
      <div className="section-header">
        <div className="step-indicator">1</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Campaign Data</h2>
      </div>

      {/* Description */}
      <p className="form-description">
        Enter your Lumina campaign URL to fetch order data and line items for analysis.
      </p>

      {/* URL Input */}
      <div className="input-group" style={{ marginBottom: '32px' }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter Lumina URL, order ID, or 'demo' (e.g., https://townsquarelumina.com/lumina/view/order/6774742077ff89a87f05af9c)"
          className="input-field"
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === 'Enter' && handleFetchCampaign()}
        />
        <button
          onClick={handleFetchCampaign}
          disabled={isLoading || !url.trim()}
          className="btn-primary"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Search size={20} />
          )}
          Fetch Order
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px', justifyContent: 'center' }}>
          <div className="spinner" />
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Fetching campaign data...</p>
        </div>
      )}

      {/* Campaign Results */}
      {campaignData && !isLoading && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '24px', marginTop: '24px' }}>
          <h3 style={{ color: 'var(--color-primary)', fontSize: '20px', marginBottom: '16px' }}>Campaign Summary</h3>

          {/* Info Grid - 4 columns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
            marginBottom: '32px'
          }}>
            <div className="info-item">
              <span className="label">Company:</span>
              <span className="value">{campaignData.companyName}</span>
            </div>
            <div className="info-item">
              <span className="label">Wide Orbit Number:</span>
              <span className="value">{campaignData.wideOrbitNumber || '--'}</span>
            </div>
            <div className="info-item">
              <span className="label">Order Dates:</span>
              <span className="value">
                {campaignData.startDate && campaignData.endDate
                  ? `${formatDate(campaignData.startDate)} - ${formatDate(campaignData.endDate)}`
                  : '--'}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Status:</span>
              <span className={`status-chip ${getStatusClass(campaignData.status)}`}>
                {campaignData.status}
              </span>
            </div>
          </div>

          {/* Line Items Header */}
          <h4 style={{ marginBottom: '8px' }}>
            Discovered Line Items: <span style={{ color: 'var(--color-primary)' }}>{activeTacticsCount}</span>
          </h4>
          <p className="form-description" style={{ marginBottom: '16px' }}>
            Remove unneeded tactics with the X on each chip.
          </p>

          {/* Tactic Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {tacticGroups.map((group) => (
              <div
                key={group.platform}
                onClick={() => setSelectedTactic(group)}
                style={{
                  padding: '16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '140px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                className="tactic-card-hover"
              >
                {/* Header with platform and status */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <h5 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{group.platform}</h5>
                  <span className={`tactic-badge ${getStatusClass(group.status)}`}>
                    {group.status}
                  </span>
                </div>

                {/* SubProduct and Tactic Special */}
                <div style={{ flex: 1, marginBottom: '8px' }}>
                  {group.subProduct && (
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{group.subProduct}</div>
                  )}
                  {group.tacticSpecial && (
                    <div style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                      {group.tacticSpecial}
                    </div>
                  )}
                </div>

                {/* Line Items Count */}
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                  Line Items: {group.lineItems.length}
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => handleRemoveTactic(group.platform, e)}
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    transition: 'all 0.2s'
                  }}
                  title="Remove this tactic"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Continue Button */}
          <div className="section-actions" style={{ justifyContent: 'flex-end' }}>
            <button onClick={handleContinue} className="btn-primary">
              Continue to Time Range
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Line Item Detail Modal */}
      {selectedTactic && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          onClick={() => setSelectedTactic(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '1px solid var(--color-border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--color-primary)' }}>
                {selectedTactic.platform} Details
              </h3>
              <button
                onClick={() => setSelectedTactic(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--color-text-muted)'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontWeight: 600, marginBottom: '4px' }}>{selectedTactic.platform}</p>
              {selectedTactic.subProduct && (
                <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 8px 0' }}>
                  {selectedTactic.subProduct}
                </p>
              )}
              {selectedTactic.tacticSpecial && (
                <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', margin: 0 }}>
                  Special: {selectedTactic.tacticSpecial}
                </p>
              )}
            </div>

            {/* Line Items List */}
            <h4 style={{ marginBottom: '12px' }}>Line Items ({selectedTactic.lineItems.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedTactic.lineItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 500 }}>{item.subProduct || item.product}</span>
                    <span className={`tactic-badge ${getStatusClass(item.workflowStepName || item.status)}`}>
                      {item.workflowStepName || item.status}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Dates: </span>
                      {item.startDate && item.endDate
                        ? `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`
                        : '--'}
                    </div>
                    {item.woOrderNumber && (
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>WO#: </span>
                        {item.woOrderNumber}
                      </div>
                    )}
                  </div>
                  {/* View Line Link */}
                  <div style={{ marginTop: '12px' }}>
                    <a
                      href={`https://townsquarelumina.com/lumina/view/lineItem/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                        color: 'var(--color-primary)',
                        textDecoration: 'none'
                      }}
                    >
                      <ExternalLink size={14} />
                      View Line
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setSelectedTactic(null)}
                className="btn-secondary"
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
