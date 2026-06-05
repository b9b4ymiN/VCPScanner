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

// ─── Portfolio Simulation ───

export interface Portfolio {
  id: number
  name: string
  initialCap: number
  cashBalance: number
  totalValue: number
  totalPnL: number
  totalPnLPct: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface Position {
  id: number
  portfolioId: number
  symbol: string
  entryDate: string
  entryPrice: number
  stopPrice: number
  targetPrice: number
  pivotPrice: number
  quantity: number
  costBasis: number
  exitDate: string | null
  exitPrice: number | null
  exitReason: string | null
  pnl: number | null
  pnlPct: number | null
  status: 'open' | 'closed'
  sepaScore: number | null
  vcpQuality: string | null
  createdAt: string
  currentPrice?: number
  currentDate?: string | null
  marketValue?: number
  unrealizedPnL?: number
  unrealizedPnLPct?: number
  realizedPnL?: number
  realizedPnLPct?: number
  holdDays?: number
  priceSource?: 'latest-alert' | 'entry-fallback'
}

export interface DailySnapshot {
  id: number
  portfolioId: number
  date: string
  cashBalance: number
  positionsValue: number
  totalValue: number
  dailyPnL: number
  dailyPnLPct: number
  openCount: number
  closedCount: number
}

export interface PortfolioResponse {
  portfolio: Portfolio | null
  positions: Position[]
  snapshot: DailySnapshot | null
  summary: {
    initialCap: number
    cashBalance: number
    positionsValue: number
    totalValue: number
    totalPnL: number
    totalPnLPct: number
    openUnrealizedPnL: number
    costBasis: number
    openCount: number
  } | null
}

export interface SnapshotsResponse {
  snapshots: DailySnapshot[]
}

export interface TradesResponse {
  trades: Position[]
}
