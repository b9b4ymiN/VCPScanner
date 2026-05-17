// Shared API response types (server ↔ web)

import type { AlertLevel } from '../server/core/types'

// ─── GET /api/alerts ───

export interface AlertRow {
  id: number
  date: string
  symbol: string
  name: string | null
  sector: string | null
  marketId: string
  sepaScore: number
  alertLevel: AlertLevel
  price: number
  priceChangePct: number | null
  vcpQuality: string | null
  vcpQualityScore: number | null
  vcpContractions: number | null
  vcpVolDrying: boolean | null
  pivotPrice: number | null
  pivotDistancePct: number | null
  scoreC1: number | null
  scoreC2: number | null
  scoreC3: number | null
  scoreC4: number | null
  scoreC5: number | null
  scoreC6: number | null
  scoreC7: number | null
  prices60d: number[]
  volumes60d: number[]
}

export interface AlertsResponse {
  date: string
  total: number
  alerts: AlertRow[]
}

// ─── GET /api/stock/:symbol ───

export interface StockDetail extends AlertRow {
  details: Record<string, unknown>
}

// ─── GET /api/history ───

export interface DailySummary {
  date: string
  totalAlerts: number
  highCount: number
  mediumCount: number
  watchCount: number
  avgScore: number | null
}

export interface HistoryResponse {
  days: number
  history: DailySummary[]
}

// ─── GET /api/status ───

export interface ScanStatus {
  lastScan: {
    date: string | null
    status: string | null
    totalScanned: number | null
    totalPassed: number | null
    finishedAt: string | null
  }
  nextScan: string | null
  dbSizeMb: number
}

// ─── POST /api/scan/trigger ───

export interface ScanTriggerResponse {
  status: 'queued'
  message: string
}
