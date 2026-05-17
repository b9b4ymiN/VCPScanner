export type AlertLevel = 'HIGH' | 'MEDIUM' | 'WATCH'
export type VcpQuality = 'TIGHT' | 'STANDARD' | 'WIDE' | 'LOOSE'
export type BreakoutStatus = 'BLUE_SKY' | 'READY' | 'PENDING' | 'FAR'

export interface OhlvBar {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

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
  trendTemplateScore: number | null

  // Enriched — Layer 1
  breakoutStatus: BreakoutStatus | null
  breakoutDate: string | null
  price52wHigh: number | null
  revenueGrowthYoy: number | null
  epsGrowthYoy: number | null
  volumeRatio: number | null

  // Enriched — Layer 2
  rsi14: number | null
  adx14: number | null
  bbWidthPct: number | null
  entryPrice: number | null
  stopPrice: number | null
  targetPrice: number | null
  riskRewardRatio: number | null
  riskPct: number | null

  prices60d: OhlvBar[] | null
  volumes60d: number[] | null
  details: Record<string, unknown> | null
  createdAt: string | null
}

export interface AlertsResponse {
  date: string
  total: number
  alerts: Alert[]
  marketSummary: {
    totalScanned: number
    totalPassed: number
    marketScoreC7: number | null
  }
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

export interface ViewsResponse {
  total: number
  today: number
  todayDate: string
}

export interface StockDetail extends Alert {}
