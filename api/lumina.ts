import type { VercelRequest, VercelResponse } from '@vercel/node'

const LUMINA_API_URL = 'https://api.edwinlovett.com/order'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { orderId } = req.body

    if (!orderId || !/^[a-f0-9]{24}$/i.test(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID. Must be a 24-character hex string.',
      })
    }

    // Fetch from Lumina API
    const luminaResponse = await fetch(`${LUMINA_API_URL}?query=${orderId}`)

    if (!luminaResponse.ok) {
      throw new Error(`Lumina API returned ${luminaResponse.status}`)
    }

    const luminaData = await luminaResponse.json()

    // Process campaign data
    const campaign = processCampaignData(luminaData, orderId)
    const tactics = detectTactics(campaign.lineItems)

    return res.status(200).json({
      success: true,
      data: { campaign, tactics },
    })
  } catch (error) {
    console.error('Lumina API error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch campaign data',
    })
  }
}

function processCampaignData(data: any, orderId: string) {
  const now = new Date()
  const startDate = data.startDate ? new Date(data.startDate) : now
  const endDate = data.endDate ? new Date(data.endDate) : now

  const daysElapsed = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  let status: 'not_started' | 'ongoing' | 'completed' = 'ongoing'
  if (now < startDate) status = 'not_started'
  else if (now > endDate) status = 'completed'

  return {
    id: data._id || orderId,
    orderId,
    companyName: data.company?.name || data.companyName || 'Unknown Company',
    orderName: data.orderName || data.name || 'Campaign',
    status,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    daysElapsed,
    daysRemaining,
    lineItems: (data.lineItems || []).map((item: any) => ({
      id: item._id || item.id || Math.random().toString(36).substring(7),
      product: item.product || 'Unknown Product',
      subProduct: item.subProduct || '',
      tacticTypeSpecial: item.tacticTypeSpecial || '',
      status: item.status || 'pending',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      wideOrbitOrderNumber: item.wideOrbitOrderNumber || '',
      platform: item.platform || '',
    })),
  }
}

function detectTactics(lineItems: any[]) {
  const tacticMap = new Map<string, any>()

  for (const item of lineItems) {
    const tacticName = item.product || 'Unknown'

    if (!tacticMap.has(tacticName)) {
      tacticMap.set(tacticName, {
        name: tacticName,
        product: item.product,
        subProduct: item.subProduct,
        platform: item.platform || '',
        lineItemIds: [],
        status: 'pending',
      })
    }

    tacticMap.get(tacticName).lineItemIds.push(item.id)
  }

  return Array.from(tacticMap.values())
}
