# Lumina API Integration

## Overview

| | |
|---|---|
| **Service** | Lumina Order API |
| **Purpose** | Campaign data extraction from order management system |
| **Documentation** | Internal API |
| **Dashboard** | N/A (internal service) |

## Configuration

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| N/A | API is public (no auth required) | N/A |

### API Endpoint
- **Production**: `https://api.edwinlovett.com/order`
- **Dev Proxy**: Configured in `vite.config.ts` to proxy through `ignite.edwinlovett.com`

## Implementation

### Files
- `api/lumina.ts` - Vercel serverless function (API proxy)
- `src/components/steps/StepCampaign.tsx` - Client-side integration

### Initialization
```typescript
const LUMINA_API_URL = 'https://api.edwinlovett.com/order'

const luminaResponse = await fetch(`${LUMINA_API_URL}?query=${orderId}`)
const luminaData = await luminaResponse.json()
```

## Usage Examples

### Fetch Campaign Data
```typescript
// From api/lumina.ts
const { orderId } = req.body

// Validate order ID format (24-char hex string)
if (!orderId || !/^[a-f0-9]{24}$/i.test(orderId)) {
  return res.status(400).json({
    success: false,
    error: 'Invalid order ID. Must be a 24-character hex string.',
  })
}

const luminaResponse = await fetch(`${LUMINA_API_URL}?query=${orderId}`)
```

### Process Campaign Response
```typescript
// Extract and normalize campaign data
const campaign = {
  id: data._id || orderId,
  orderId,
  companyName: data.company?.name || data.companyName || 'Unknown Company',
  orderName: data.orderName || data.name || 'Campaign',
  status: determineStatus(data.startDate, data.endDate),
  startDate: formatDate(data.startDate),
  endDate: formatDate(data.endDate),
  lineItems: data.lineItems || [],
}
```

## API Response Structure

### Order Object
```typescript
interface LuminaOrder {
  _id: string
  company?: { name: string }
  companyName?: string
  orderName?: string
  name?: string
  startDate: string
  endDate: string
  lineItems: LineItem[]
}

interface LineItem {
  _id?: string
  id?: string
  product: string
  subProduct?: string
  tacticTypeSpecial?: string
  status: string
  startDate?: string
  endDate?: string
  wideOrbitOrderNumber?: string
  platform?: string
}
```

## Tactic Detection

The API proxy extracts tactics from line items:
```typescript
function detectTactics(lineItems: any[]) {
  const tacticMap = new Map<string, Tactic>()

  for (const item of lineItems) {
    const tacticName = item.product || 'Unknown'
    // Group line items by product type
  }

  return Array.from(tacticMap.values())
}
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 400 | Invalid order ID format | Validate 24-char hex string |
| 404 | Order not found | Check order ID exists in system |
| 500 | Lumina API error | Check API availability |

## Rate Limits & Quotas

| Operation | Limit |
|-----------|-------|
| API calls | No known limits |
| Response size | Varies by order |

## Monitoring

- **Logs**: Vercel function logs
- **Errors**: Console logging in `api/lumina.ts`

## Known Issues

- Development mode relies on proxy to legacy PHP backend
- No authentication means any valid order ID can be queried

## Changelog

- 2025-01-XX: Initial integration as Vercel serverless proxy
