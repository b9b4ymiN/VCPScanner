import type { AlertsResponse, HistoryResponse, StatusResponse, StockDetail, PortfolioResponse, SnapshotsResponse, TradesResponse } from './types'

const API_ORIGIN = import.meta.env.VITE_API_URL ?? ''
const BASE = `${API_ORIGIN}/api`

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export function fetchAlerts(params: {
  date?: string
  level?: string
  minScore?: number
  ttMin?: number
  limit?: number
  offset?: number
}): Promise<AlertsResponse> {
  const sp = new URLSearchParams()
  if (params.date) sp.set('date', params.date)
  if (params.level) sp.set('level', params.level)
  if (params.minScore !== undefined) sp.set('min_score', String(params.minScore))
  if (params.ttMin !== undefined) sp.set('tt_min', String(params.ttMin))
  if (params.limit !== undefined) sp.set('limit', String(params.limit))
  if (params.offset !== undefined) sp.set('offset', String(params.offset))
  return fetchJson<AlertsResponse>(`${BASE}/alerts?${sp}`)
}

export function fetchStockDetail(symbol: string, date?: string): Promise<StockDetail> {
  const sp = new URLSearchParams()
  if (date) sp.set('date', date)
  const qs = sp.toString()
  return fetchJson<StockDetail>(`${BASE}/stock/${encodeURIComponent(symbol)}${qs ? `?${qs}` : ''}`)
}

export function fetchHistory(days?: number): Promise<HistoryResponse> {
  const sp = new URLSearchParams()
  if (days !== undefined) sp.set('days', String(days))
  return fetchJson<HistoryResponse>(`${BASE}/history?${sp}`)
}

export function fetchStatus(): Promise<StatusResponse> {
  return fetchJson<StatusResponse>(`${BASE}/status`)
}

export function triggerScan(): Promise<{ status: string; message: string }> {
  return fetch(`${BASE}/scan/trigger`, { method: 'POST' }).then(r => r.json())
}

export function fetchViews(): Promise<import('./types').ViewsResponse> {
  return fetchJson<import('./types').ViewsResponse>(`${BASE}/views`)
}

export function trackView(): Promise<import('./types').ViewsResponse> {
  return fetch(`${BASE}/views`, { method: 'POST' }).then(r => r.json())
}

// ─── Portfolio ───

export function fetchPortfolio(): Promise<PortfolioResponse> {
  return fetchJson<PortfolioResponse>(`${BASE}/portfolio`)
}

export function initPortfolio(): Promise<{ portfolio: { id: number } }> {
  return fetch(`${BASE}/portfolio/init`, { method: 'POST' }).then(r => r.json())
}

export function fetchSnapshots(days?: number): Promise<SnapshotsResponse> {
  const sp = new URLSearchParams()
  if (days !== undefined) sp.set('days', String(days))
  return fetchJson<SnapshotsResponse>(`${BASE}/portfolio/snapshots?${sp}`)
}

export function fetchTrades(limit?: number): Promise<TradesResponse> {
  const sp = new URLSearchParams()
  if (limit !== undefined) sp.set('limit', String(limit))
  return fetchJson<TradesResponse>(`${BASE}/portfolio/trades?${sp}`)
}

export function resetPortfolio(): Promise<{ portfolio: { id: number } }> {
  return fetch(`${BASE}/portfolio/reset`, { method: 'POST' }).then(r => r.json())
}
