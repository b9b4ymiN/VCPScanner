// Trend Template Evaluator — Mark Minervini's 8-point checklist
// Port from trend_template() in sepa_scanner.py

import type { PriceData, Fundamentals } from '../../core/types'
import { lastSma, smaAligned, maSlope, calcReturn } from '../../indicators/ma'

export const TT_LABELS = [
  'Price > MA150 & MA200',
  'MA150 > MA200',
  'MA200 trending up',
  'MA50 > MA150 & MA200',
  'Price > MA50',
  'Price >= 30% above 52W Low',
  'Price within 25% of 52W High',
  'RS vs Index > 0',
] as const

export interface TrendTemplateResult {
  score: number // 0-8
  conditions: boolean[] // length 8
  labels: readonly string[] // TT_LABELS
}

export function evaluateTrendTemplate(
  prices: PriceData[],
  fundamentals: Fundamentals,
  marketIndex: PriceData[],
): TrendTemplateResult {
  const closes = prices.map(p => p.close)
  const currentPrice = closes[closes.length - 1] ?? 0

  // Calculate MAs
  const ma50 = lastSma(closes, 50)
  const ma150 = lastSma(closes, 150)
  const ma200 = lastSma(closes, 200)
  const ma200Aligned = smaAligned(closes, 200)

  // Condition 1: Price > MA150 & MA200
  const c1 = ma150 !== null && ma200 !== null && currentPrice > ma150 && currentPrice > ma200

  // Condition 2: MA150 > MA200
  const c2 = ma150 !== null && ma200 !== null && ma150 > ma200

  // Condition 3: MA200 slope > 0 (trending up over 20 days)
  const c3 = maSlope(ma200Aligned, 20) > 0

  // Condition 4: MA50 > MA150 & MA200
  const c4 = ma50 !== null && ma150 !== null && ma200 !== null && ma50 > ma150 && ma50 > ma200

  // Condition 5: Price > MA50
  const c5 = ma50 !== null && currentPrice > ma50

  // Condition 6: Price >= 30% above 52W Low
  const low52w = fundamentals.fiftyTwoWeekLow
  const c6 = low52w !== null && low52w > 0 && currentPrice >= low52w * 1.3

  // Condition 7: Price within 25% of 52W High (>= 75% of high)
  const high52w = fundamentals.fiftyTwoWeekHigh
  const c7 = high52w !== null && high52w > 0 && currentPrice >= high52w * 0.75

  // Condition 8: RS proxy — stock return > index return over 66 days
  const stockReturn = calcReturn(prices, 66)
  const indexReturn = calcReturn(marketIndex, 66)
  const c8 = stockReturn !== null && indexReturn !== null && stockReturn > indexReturn

  const conditions = [c1, c2, c3, c4, c5, c6, c7, c8]
  const score = conditions.filter(Boolean).length

  return {
    score,
    conditions,
    labels: TT_LABELS,
  }
}
