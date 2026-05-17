// Core abstractions for the 3-axis architecture: Market × Strategy × Provider

// ─── Price Data ───

export interface PriceData {
  date: string // ISO date YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ─── Fundamentals ───

export interface Fundamentals {
  epsGrowthYoY: number | null
  revenueGrowthYoY: number | null
  profitMargin: number | null
  roe: number | null
  institutionalHold: number | null
  insiderHold: number | null
  sector: string | null
}

// ─── Market ───

export interface MarketPreFilter {
  minPrice: number
  minAvgVol: number
  minHistory: number // days, always 60
}

export interface Market {
  id: string // 'SET' | 'NYSE' | 'NASDAQ' | 'HKEX' | 'TSE'
  name: string
  currency: string
  yahooSuffix: string
  timezone: string
  marketClose: string // HH:MM in market timezone
  preFilter: MarketPreFilter
  symbols(): Promise<string[]>
}

// ─── Data Provider ───

export type PricePeriod = '1y' | '6mo' | '3mo'

export interface DataProvider {
  name: string

  fetchPrices(symbol: string, market: Market, period: PricePeriod): Promise<PriceData[]>
  fetchFundamentals(symbol: string, market: Market): Promise<Fundamentals>
  fetchMarketIndex(market: Market): Promise<PriceData[]>
}

// ─── Strategy ───

export type AlertLevel = 'HIGH' | 'MEDIUM' | 'WATCH'

export interface VcpResult {
  isVcp: boolean
  qualityScore: number // 0-10
  qualityLabel: 'TIGHT' | 'STANDARD' | 'WIDE' | 'LOOSE'
  contractions: number[]
  contractionRatios: number[]
  volDrying: boolean
  pivotPrice: number
  pivotDistancePct: number
  swingHighs: [number, number][]
  swingLows: [number, number][]
}

export interface SepaBreakdown {
  c1SuperPerf: number
  c2Earnings: number
  c3Catalyst: number
  c4Supply: number
  c5Leadership: number
  c6Sponsorship: number
  c7Market: number
}

export interface StrategyResult {
  symbol: string
  date: string
  passes: boolean
  score: number // 0-100
  alertLevel: AlertLevel | null
  details: {
    sepaBreakdown: SepaBreakdown
    vcp: VcpResult
    price: number
    avgVol20d: number
    [key: string]: unknown
  }
}

export interface Strategy {
  id: string
  name: string
  description: string
  version: string

  scan(input: {
    symbol: string
    market: Market
    prices: PriceData[]
    fundamentals: Fundamentals
    marketIndex: PriceData[]
    sectorPeers?: Map<string, PriceData[]>
  }): StrategyResult
}

// ─── Result type (no throw in business logic) ───

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }
