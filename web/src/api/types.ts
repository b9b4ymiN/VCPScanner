export type AlertLevel = 'HIGH' | 'MEDIUM' | 'WATCH'
export type VcpQuality = 'TIGHT' | 'STANDARD' | 'WIDE' | 'LOOSE'

export interface Alert {
  id: number
  date: string
  symbol: string
  name: string | null
  sector: string | null
  marketId: string
  strategyId: string
  sepaScore: number
  alertLevel: AlertLevel
  price: number
  priceChangePct: number | null
  vcpQuality: VcpQuality | null
  vcpQualityScore: number | null
  vcpContractions: string | null
  vcpVolDrying: number | null
  pivotPrice: number | null
  pivotDistancePct: number | null
  scoreC1: number | null
  scoreC2: number | null
  scoreC3: number | null
  scoreC4: number | null
  scoreC5: number | null
  scoreC6: number | null
  scoreC7: number | null
  prices60d: number[] | null
  volumes60d: number[] | null
  details: Record<string, unknown> | null
  createdAt: string | null
}

export interface AlertsResponse {
  date: string
  total: number
  alerts: Alert[]
}

export interface HistoryEntry {
  date: string
  totalAlerts: number
  highCount: number
  mediumCount: number
  watchCount: number
  avgScore: number
}

export interface HistoryResponse {
  days: number
  history: HistoryEntry[]
}

export interface ScanRun {
  id: number
  date: string
  marketId: string
  strategyId: string
  startedAt: string
  finishedAt: string | null
  totalScanned: number | null
  totalPassed: number | null
  status: string | null
  errorMsg: string | null
}

export interface StatusResponse {
  status: string
  version: string
  scheduler: { isRunning: boolean }
  lastScan: ScanRun | null
  timestamp: string
}

export interface StockDetail {
  id: number
  date: string
  symbol: string
  name: string | null
  sector: string | null
  sepaScore: number
  alertLevel: AlertLevel
  price: number
  priceChangePct: number | null
  vcpQuality: VcpQuality | null
  vcpQualityScore: number | null
  vcpContractions: string | null
  vcpVolDrying: number | null
  pivotPrice: number | null
  pivotDistancePct: number | null
  scoreC1: number | null
  scoreC2: number | null
  scoreC3: number | null
  scoreC4: number | null
  scoreC5: number | null
  scoreC6: number | null
  scoreC7: number | null
  prices60d: number[] | null
  volumes60d: number[] | null
  details: Record<string, unknown> | null
}
