/**
 * R2 Storage Helpers
 * Utilities for storing and retrieving reports from Cloudflare R2
 */

import type { Env, StoredReport } from '../types/bindings'

// R2 Key Patterns
export const R2_KEYS = {
  report: (id: string) => `reports/${id}.json`,
  reportsByDate: (date: string) => `reports/by-date/${date}/`,
  reportsByCampaign: (campaignId: string) => `reports/by-campaign/${campaignId}/`,
}

/**
 * Store a report in R2
 */
export async function storeReport(
  env: Env,
  report: StoredReport
): Promise<{ key: string; etag: string }> {
  const key = R2_KEYS.report(report.id)

  const result = await env.REPORTS_R2.put(key, JSON.stringify(report), {
    httpMetadata: {
      contentType: 'application/json',
    },
    customMetadata: {
      reportId: report.id,
      campaignId: report.campaign_id || '',
      model: report.model_used,
      strategy: report.agent_strategy,
      createdAt: report.created_at,
    },
  })

  return {
    key,
    etag: result.etag,
  }
}

/**
 * Retrieve a report from R2
 */
export async function getReport(
  env: Env,
  reportId: string
): Promise<StoredReport | null> {
  const key = R2_KEYS.report(reportId)
  const object = await env.REPORTS_R2.get(key)

  if (!object) {
    return null
  }

  const content = await object.text()
  return JSON.parse(content) as StoredReport
}

/**
 * Check if a report exists
 */
export async function reportExists(
  env: Env,
  reportId: string
): Promise<boolean> {
  const key = R2_KEYS.report(reportId)
  const object = await env.REPORTS_R2.head(key)
  return object !== null
}

/**
 * Delete a report from R2
 */
export async function deleteReport(
  env: Env,
  reportId: string
): Promise<void> {
  const key = R2_KEYS.report(reportId)
  await env.REPORTS_R2.delete(key)
}

/**
 * List reports with optional prefix filter
 */
export async function listReports(
  env: Env,
  options?: {
    prefix?: string
    limit?: number
    cursor?: string
  }
): Promise<{
  reports: Array<{
    key: string
    metadata: Record<string, string>
    uploaded: Date
  }>
  cursor?: string
  truncated: boolean
}> {
  const result = await env.REPORTS_R2.list({
    prefix: options?.prefix || R2_KEYS.report(''),
    limit: options?.limit || 100,
    cursor: options?.cursor,
  })

  return {
    reports: result.objects.map(obj => ({
      key: obj.key,
      metadata: obj.customMetadata || {},
      uploaded: obj.uploaded,
    })),
    cursor: result.truncated ? result.cursor : undefined,
    truncated: result.truncated,
  }
}

/**
 * Get report metadata without downloading content
 */
export async function getReportMetadata(
  env: Env,
  reportId: string
): Promise<{
  reportId: string
  campaignId: string
  model: string
  strategy: string
  createdAt: string
  size: number
} | null> {
  const key = R2_KEYS.report(reportId)
  const head = await env.REPORTS_R2.head(key)

  if (!head) {
    return null
  }

  const metadata = head.customMetadata || {}

  return {
    reportId: metadata.reportId || reportId,
    campaignId: metadata.campaignId || '',
    model: metadata.model || 'unknown',
    strategy: metadata.strategy || 'single_call',
    createdAt: metadata.createdAt || '',
    size: head.size,
  }
}

/**
 * Create a presigned URL for direct report access
 * Note: R2 doesn't have native presigned URLs, so we return the public URL if configured
 */
export function getReportUrl(reportId: string, publicDomain?: string): string | null {
  if (!publicDomain) {
    return null
  }
  return `${publicDomain}/${R2_KEYS.report(reportId)}`
}
