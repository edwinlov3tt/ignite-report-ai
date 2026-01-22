import { useState, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Search, Loader2, ChevronRight, ChevronDown, X, ExternalLink, Check, DollarSign, Calendar, Layers, Target } from 'lucide-react'
import type { LineItem, CampaignData, DetectedTactic, Initiative } from '@/types'

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
      initiative: 'Brand Awareness',
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
      initiative: 'Lead Generation',
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
      initiative: 'Lead Generation',
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
      initiative: 'Brand Awareness',
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
      initiative: 'Product Launch',
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

// Helper function to format currency
function formatCurrency(amount: number): string {
  if (!amount) return '--'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Helper function to format short date (MMM 'YY)
function formatShortDate(dateString: string): string {
  if (!dateString) return '--'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
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
  // Aggregated data for display
  totalBudget: number
  monthlyBudget: number
  earliestStart: string | null
  latestEnd: string | null
  subProducts: string[]
  tacticTypes: string[]
  initiatives: string[]
}

// Helper function to extract unique initiatives from line items
function extractInitiatives(lineItems: LineItem[]): Initiative[] {
  const initiativeMap = new Map<string, number>()

  lineItems.forEach(item => {
    const initiative = item.initiative || 'Uncategorized'
    initiativeMap.set(initiative, (initiativeMap.get(initiative) || 0) + 1)
  })

  return Array.from(initiativeMap.entries()).map(([name, count]) => ({
    name,
    lineItemCount: count,
    isActive: true, // All initiatives active by default
  }))
}

export function StepCampaign() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTactic, setSelectedTactic] = useState<TacticGroup | null>(null)
  const [initiativesCollapsed, setInitiativesCollapsed] = useState(false)

  // Store state (persisted)
  const campaignData = useAppStore((state) => state.campaignData)
  const setCampaignData = useAppStore((state) => state.setCampaignData)
  const setDetectedTactics = useAppStore((state) => state.setDetectedTactics)
  const removeTactic = useAppStore((state) => state.removeTactic)
  const removedTacticIds = useAppStore((state) => state.removedTacticIds)
  const setRemovedTacticIds = useAppStore((state) => state.setRemovedTacticIds)
  const addRemovedTacticId = useAppStore((state) => state.addRemovedTacticId)
  const initiatives = useAppStore((state) => state.initiatives)
  const setInitiatives = useAppStore((state) => state.setInitiatives)
  const toggleInitiative = useAppStore((state) => state.toggleInitiative)
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
      setRemovedTacticIds([])
      setInitiatives(extractInitiatives(DEMO_CAMPAIGN_DATA.lineItems))
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

      // Transform line items with initiative
      const transformedLineItems: LineItem[] = lineItems.map((item: Record<string, unknown>) => ({
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
        initiative: (item.campaignInitiative || item.initiative) as string | undefined,
      }))

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
        lineItems: transformedLineItems,
      })

      // Extract and set initiatives
      setInitiatives(extractInitiatives(transformedLineItems))

      // Group line items by product to create tactics (use transformed line items)
      const tacticMap = new Map<string, LineItem[]>()
      transformedLineItems.forEach((item) => {
        const key = item.product || 'Unknown'
        const existing = tacticMap.get(key) || []
        existing.push(item)
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
      setRemovedTacticIds([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveTactic = (tacticName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeTactic(tacticName)
    addRemovedTacticId(tacticName)
  }

  // Get active initiative names for filtering
  const activeInitiativeNames = useMemo(() =>
    new Set(initiatives.filter(i => i.isActive).map(i => i.name)),
    [initiatives]
  )

  // Convert removedTacticIds array to Set for efficient lookup
  const removedTacticIdsSet = useMemo(() =>
    new Set(removedTacticIds),
    [removedTacticIds]
  )

  const handleContinue = () => {
    if (campaignData) {
      nextStep()
    }
  }

  // Group line items by product for tactic cards with aggregated data
  // First filter by active initiatives, then group by product
  const tacticGroups: TacticGroup[] = useMemo(() => {
    if (!campaignData?.lineItems) return []

    // Filter line items by active initiatives
    const filteredLineItems = campaignData.lineItems.filter(item => {
      const initiative = item.initiative || 'Uncategorized'
      return activeInitiativeNames.has(initiative)
    })

    return Array.from(
      filteredLineItems.reduce((map, item) => {
        const key = item.product
        const existing = map.get(key) || {
          platform: item.product,
          subProduct: item.subProduct,
          tacticSpecial: Array.isArray(item.tacticTypeSpecial)
            ? item.tacticTypeSpecial.join(', ')
            : item.tacticTypeSpecial || '',
          lineItems: [],
          status: '',
          totalBudget: 0,
          monthlyBudget: 0,
          earliestStart: null as string | null,
          latestEnd: null as string | null,
          subProducts: [] as string[],
          tacticTypes: [] as string[],
          initiatives: [] as string[],
        }
        existing.lineItems.push(item)
        existing.status = getMostCommonStatus(existing.lineItems)

        // Aggregate budgets
        if (item.totalBudget) existing.totalBudget += item.totalBudget
        if (item.monthlyBudget) existing.monthlyBudget += item.monthlyBudget

        // Track date range (earliest start, latest end)
        if (item.startDate) {
          if (!existing.earliestStart || item.startDate < existing.earliestStart) {
            existing.earliestStart = item.startDate
          }
        }
        if (item.endDate) {
          if (!existing.latestEnd || item.endDate > existing.latestEnd) {
            existing.latestEnd = item.endDate
          }
        }

        // Collect unique sub-products
        if (item.subProduct && !existing.subProducts.includes(item.subProduct)) {
          existing.subProducts.push(item.subProduct)
        }

        // Collect unique tactic types
        const tactics = Array.isArray(item.tacticTypeSpecial)
          ? item.tacticTypeSpecial
          : item.tacticTypeSpecial ? [item.tacticTypeSpecial] : []
        tactics.forEach(t => {
          if (t && !existing.tacticTypes.includes(t)) {
            existing.tacticTypes.push(t)
          }
        })

        // Collect unique initiatives
        const initiative = item.initiative || 'Uncategorized'
        if (!existing.initiatives.includes(initiative)) {
          existing.initiatives.push(initiative)
        }

        map.set(key, existing)
        return map
      }, new Map<string, TacticGroup>())
    ).map(([, group]) => group).filter(g => !removedTacticIdsSet.has(g.platform))
  }, [campaignData?.lineItems, activeInitiativeNames, removedTacticIdsSet])

  // Computed stats for quick stats bar (based on filtered data)
  const quickStats = useMemo(() => {
    const totalBudget = tacticGroups.reduce((sum, g) => sum + g.totalBudget, 0)
    const totalMonthly = tacticGroups.reduce((sum, g) => sum + g.monthlyBudget, 0)
    const totalLineItems = tacticGroups.reduce((sum, g) => sum + g.lineItems.length, 0)
    const productCount = tacticGroups.length

    // Find date range across all filtered groups
    let earliestStart: string | null = null
    let latestEnd: string | null = null
    tacticGroups.forEach(g => {
      if (g.earliestStart && (!earliestStart || g.earliestStart < earliestStart)) {
        earliestStart = g.earliestStart
      }
      if (g.latestEnd && (!latestEnd || g.latestEnd > latestEnd)) {
        latestEnd = g.latestEnd
      }
    })

    // Collect unique initiatives in filtered data
    const activeInitiatives = new Set<string>()
    tacticGroups.forEach(g => {
      g.initiatives.forEach(init => activeInitiatives.add(init))
    })

    return {
      totalBudget,
      totalMonthly,
      totalLineItems,
      productCount,
      initiativeCount: activeInitiatives.size,
      earliestStart,
      latestEnd,
    }
  }, [tacticGroups])

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

          {/* Quick Stats Bar */}
          {tacticGroups.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '12px',
              padding: '16px',
              backgroundColor: 'var(--color-surface-secondary)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '24px',
              border: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <DollarSign size={20} style={{ color: 'rgb(34, 197, 94)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Budget</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>{formatCurrency(quickStats.totalBudget)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Calendar size={20} style={{ color: 'rgb(59, 130, 246)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Flight Dates</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                    {quickStats.earliestStart && quickStats.latestEnd
                      ? `${formatShortDate(quickStats.earliestStart)} → ${formatShortDate(quickStats.latestEnd)}`
                      : '--'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Layers size={20} style={{ color: 'rgb(168, 85, 247)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Products</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>{quickStats.productCount}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Target size={20} style={{ color: 'rgb(249, 115, 22)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Initiatives</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>{quickStats.initiativeCount}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(236, 72, 153, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ChevronRight size={20} style={{ color: 'rgb(236, 72, 153)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Line Items</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>{quickStats.totalLineItems}</div>
                </div>
              </div>
            </div>
          )}

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

          {/* Initiative Chips - Collapsible */}
          {initiatives.length > 0 && (
            <div style={{
              marginBottom: '24px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
              {/* Collapsible Header */}
              <button
                onClick={() => setInitiativesCollapsed(!initiativesCollapsed)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-surface-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: initiativesCollapsed ? 'rotate(-90deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                      color: 'var(--color-text-muted)',
                    }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>
                    Initiatives
                  </span>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    {initiatives.filter(i => i.isActive).length}/{initiatives.length} active
                  </span>
                </div>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                }}>
                  {initiativesCollapsed ? 'Click to expand' : 'Click to collapse'}
                </span>
              </button>

              {/* Collapsible Content */}
              {!initiativesCollapsed && (
                <div style={{ padding: '16px' }}>
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--color-text-muted)',
                    marginBottom: '12px',
                    marginTop: 0,
                  }}>
                    Toggle initiatives to include/exclude from analysis
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {initiatives.map((init) => (
                      <button
                        key={init.name}
                        onClick={() => toggleInitiative(init.name)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: init.isActive
                            ? '2px solid var(--color-primary)'
                            : '2px solid var(--color-border)',
                          backgroundColor: init.isActive
                            ? 'var(--color-primary)'
                            : 'var(--color-surface)',
                          color: init.isActive
                            ? 'white'
                            : 'var(--color-text-secondary)',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: init.isActive ? 1 : 0.6,
                        }}
                      >
                        {init.isActive && <Check size={16} />}
                        {init.name}
                        <span style={{
                          backgroundColor: init.isActive
                            ? 'rgba(255,255,255,0.2)'
                            : 'var(--color-surface-secondary)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}>
                          {init.lineItemCount}
                        </span>
                      </button>
                    ))}
                  </div>
                  {initiatives.some(i => !i.isActive) && (
                    <p style={{
                      marginTop: '12px',
                      marginBottom: 0,
                      fontSize: '13px',
                      color: 'var(--color-warning)',
                      fontStyle: 'italic',
                    }}>
                      ⚠️ {initiatives.filter(i => !i.isActive).length} initiative(s) excluded from analysis
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Budget Summary by Product */}
          {tacticGroups.length > 0 && quickStats.totalBudget > 0 && (
            <div style={{
              marginBottom: '24px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'var(--color-surface-secondary)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>Budget Breakdown by Product</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)' }}>
                  {formatCurrency(quickStats.totalBudget)}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                        Product
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                        Line Items
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                        Total Budget
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                        Monthly
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                        % of Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tacticGroups
                      .slice()
                      .sort((a, b) => b.totalBudget - a.totalBudget)
                      .map((group, idx) => {
                        const percentage = quickStats.totalBudget > 0
                          ? ((group.totalBudget / quickStats.totalBudget) * 100).toFixed(1)
                          : '0'
                        return (
                          <tr
                            key={group.platform}
                            style={{
                              backgroundColor: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-secondary)',
                            }}
                          >
                            <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--color-text)' }}>
                              {group.platform}
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                              {group.lineItems.length}
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--color-text)' }}>
                              {formatCurrency(group.totalBudget)}
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                              {formatCurrency(group.monthlyBudget)}
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                <div style={{
                                  width: '60px',
                                  height: '6px',
                                  backgroundColor: 'var(--color-border)',
                                  borderRadius: '3px',
                                  overflow: 'hidden',
                                }}>
                                  <div style={{
                                    width: `${percentage}%`,
                                    height: '100%',
                                    backgroundColor: 'var(--color-primary)',
                                    borderRadius: '3px',
                                    transition: 'width 0.3s ease',
                                  }} />
                                </div>
                                <span style={{ color: 'var(--color-text-secondary)', minWidth: '45px' }}>
                                  {percentage}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Line Items Header */}
          <h4 style={{ marginBottom: '8px' }}>
            Discovered Tactics: <span style={{ color: 'var(--color-primary)' }}>{tacticGroups.length}</span>
            {tacticGroups.length > 0 && (
              <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '14px', marginLeft: '8px' }}>
                ({tacticGroups.reduce((sum, g) => sum + g.lineItems.length, 0)} line items)
              </span>
            )}
          </h4>
          <p className="form-description" style={{ marginBottom: '16px' }}>
            Remove unneeded tactics with the X on each chip.
          </p>

          {/* Tactic Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
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
                  minHeight: '180px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                className="tactic-card-hover"
              >
                {/* Header with platform and status */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <h5 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {group.platform}
                  </h5>
                  <span className={`tactic-badge ${getStatusClass(group.status)}`}>
                    {group.status}
                  </span>
                </div>

                {/* Sub-products list */}
                {group.subProducts.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {group.subProducts.slice(0, 3).map((sp) => (
                        <span
                          key={sp}
                          style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            backgroundColor: 'var(--color-surface-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          {sp}
                        </span>
                      ))}
                      {group.subProducts.length > 3 && (
                        <span
                          style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            backgroundColor: 'var(--color-primary)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'white',
                          }}
                        >
                          +{group.subProducts.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Tactic types */}
                {group.tacticTypes.length > 0 && (
                  <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    <span style={{ fontStyle: 'italic' }}>
                      {group.tacticTypes.join(' • ')}
                    </span>
                  </div>
                )}

                {/* Budget and Date info */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  padding: '10px',
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '8px',
                  flex: 1,
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Budget
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {formatCurrency(group.totalBudget)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Monthly
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {formatCurrency(group.monthlyBudget)}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Flight Dates
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {group.earliestStart && group.latestEnd
                        ? `${formatShortDate(group.earliestStart)} → ${formatShortDate(group.latestEnd)}`
                        : '--'}
                    </div>
                  </div>
                </div>

                {/* Footer: Line Items Count */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--color-border)',
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {group.lineItems.length} Line Item{group.lineItems.length !== 1 ? 's' : ''}
                  </span>
                  <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => handleRemoveTactic(group.platform, e)}
                  style={{
                    position: 'absolute',
                    top: '8px',
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
                    transition: 'all 0.2s',
                    opacity: 0,
                  }}
                  className="tactic-remove-btn"
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

            {/* Modal Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              padding: '16px',
              backgroundColor: 'var(--color-surface-secondary)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Budget
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {formatCurrency(selectedTactic.totalBudget)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Monthly
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
                  {formatCurrency(selectedTactic.monthlyBudget)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Flight Dates
                </div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                  {selectedTactic.earliestStart && selectedTactic.latestEnd
                    ? `${formatShortDate(selectedTactic.earliestStart)} → ${formatShortDate(selectedTactic.latestEnd)}`
                    : '--'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Status
                </div>
                <span className={`tactic-badge ${getStatusClass(selectedTactic.status)}`}>
                  {selectedTactic.status}
                </span>
              </div>
            </div>

            {/* Sub-products and Tactic Types */}
            {(selectedTactic.subProducts.length > 0 || selectedTactic.tacticTypes.length > 0) && (
              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedTactic.subProducts.length > 0 && (
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '8px' }}>Sub-Products:</span>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {selectedTactic.subProducts.join(', ')}
                    </span>
                  </div>
                )}
                {selectedTactic.tacticTypes.length > 0 && (
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '8px' }}>Tactic Types:</span>
                    <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                      {selectedTactic.tacticTypes.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{item.subProduct || item.product}</div>
                      {item.tacticTypeSpecial && (
                        <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                          {Array.isArray(item.tacticTypeSpecial) ? item.tacticTypeSpecial.join(', ') : item.tacticTypeSpecial}
                        </div>
                      )}
                    </div>
                    <span className={`tactic-badge ${getStatusClass(item.workflowStepName || item.status)}`}>
                      {item.workflowStepName || item.status}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Budget</span>
                      <span style={{ fontWeight: 500 }}>{formatCurrency(item.totalBudget || 0)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Monthly</span>
                      <span>{formatCurrency(item.monthlyBudget || 0)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Dates</span>
                      <span>
                        {item.startDate && item.endDate
                          ? `${formatShortDate(item.startDate)} → ${formatShortDate(item.endDate)}`
                          : '--'}
                      </span>
                    </div>
                  </div>
                  {/* View Line Link */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {item.woOrderNumber && (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        WO# {item.woOrderNumber}
                      </span>
                    )}
                    <a
                      href={`https://townsquarelumina.com/lumina/view/lineItem/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        marginLeft: 'auto',
                      }}
                    >
                      <ExternalLink size={14} />
                      View in Lumina
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
