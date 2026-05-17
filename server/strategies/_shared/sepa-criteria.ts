// SEPA 7 Criteria Scoring — BLUEPRINT Section 1.2
// ⚠️ IMMUTABLE — ห้ามเปลี่ยน scoring logic โดยไม่มี BLUEPRINT update

import type { Fundamentals, PriceData, SepaBreakdown, VcpResult } from '../../core/types'
import { calcReturn, lastSma, maSlope, smaAligned } from '../../indicators/ma'
import { mean } from '../../indicators/stats'

// ── C1: Super Performance (max 15 pts) ──

function scoreSuperPerf(prices: PriceData[], marketIndex: PriceData[]): number {
  let score = 0
  const lastBar = prices[prices.length - 1]
  if (!lastBar) return 0
  const currentPrice = lastBar.close

  // RS vs Index (4 time frames)
  const frames: { days: number }[] = [
    { days: 22 },   // ~1M
    { days: 66 },   // ~3M
    { days: 132 },  // ~6M
    { days: 252 },  // ~1Y
  ]

  for (const { days } of frames) {
    const stockReturn = calcReturn(prices, days)
    const indexReturn = calcReturn(marketIndex, days)
    if (stockReturn === null || indexReturn === null) continue
    const rsDiff = stockReturn - indexReturn
    if (rsDiff > 0.20) score += 1.5
    else if (rsDiff > 0.10) score += 1.0
    else if (rsDiff > 0.00) score += 0.5
  }

  // 52-Week High proximity
  const sliceStart = Math.max(0, prices.length - 252)
  const price52wHigh = Math.max(...prices.slice(sliceStart).map(p => p.high))
  const from52wHigh = price52wHigh === 0 ? 1 : (price52wHigh - currentPrice) / price52wHigh
  if (from52wHigh <= 0.05) score += 3
  else if (from52wHigh <= 0.10) score += 2
  else if (from52wHigh <= 0.20) score += 1

  // MA Alignment: price > MA50 > MA150 > MA200
  const closes = prices.map(p => p.close)
  const ma50 = lastSma(closes, 50)
  const ma150 = lastSma(closes, 150)
  const ma200 = lastSma(closes, 200)
  if (ma50 !== null && ma150 !== null && ma200 !== null) {
    if (currentPrice > ma50 && ma50 > ma150 && ma150 > ma200) {
      score += 3
    }
  }

  // MA200 Uptrend (slope > 0 over last 20 days)
  const ma200series = smaAligned(closes, 200)
  const slope = maSlope(ma200series, 20)
  if (slope > 0) score += 3

  return score
}

// ── C2: Earnings (max 20 pts) ──

function scoreEarnings(fundamentals: Fundamentals): number {
  let score = 0

  if (fundamentals.epsGrowthYoY !== null) {
    if (fundamentals.epsGrowthYoY > 0.50) score += 10
    else if (fundamentals.epsGrowthYoY > 0.20) score += 5
  }

  if (fundamentals.revenueGrowthYoY !== null) {
    if (fundamentals.revenueGrowthYoY > 0.20) score += 5
  }

  if (fundamentals.profitMargin !== null) {
    if (fundamentals.profitMargin > 0) score += 3
  }

  if (fundamentals.roe !== null) {
    if (fundamentals.roe > 0.15) score += 2
  }

  return score
}

// ── C3: Catalyst (max 10 pts) ──
// Placeholder — news-based scoring requires external data source

function scoreCatalyst(): number {
  return 0
}

// ── C4: Supply/Demand / VCP (max 20 pts) ──

function scoreSupplyDemand(prices: PriceData[], vcp: VcpResult): number {
  // Volume Pattern Base: 0–10 pts
  const volumeScore = analyzeVolumeBase(prices)

  // VCP Detection Bonus: +quality_score (0–10) if is_vcp
  if (vcp.isVcp) {
    return Math.min(volumeScore + vcp.qualityScore, 20)
  }
  return volumeScore
}

function analyzeVolumeBase(prices: PriceData[]): number {
  if (prices.length < 60) return 0
  const volumes = prices.map(p => p.volume)
  const recent20 = volumes.slice(-20)
  const older40 = volumes.slice(-60, -20)

  let score = 0

  const recentAvg = mean(recent20)
  const olderAvg = mean(older40)

  // Volume decreasing in recent period (drying = bullish base)
  if (olderAvg > 0) {
    const ratio = recentAvg / olderAvg
    if (ratio < 0.5) score += 4
    else if (ratio < 0.7) score += 3
    else if (ratio < 1.0) score += 2
    else if (ratio < 1.2) score += 1
  }

  // Up-day volume vs down-day volume in recent 20 days
  const recent20Prices = prices.slice(-20)
  let upVol = 0
  let downVol = 0
  for (const p of recent20Prices) {
    if (p.close > p.open) upVol += p.volume
    else if (p.close < p.open) downVol += p.volume
  }
  if (downVol > 0 && upVol > downVol * 1.5) score += 3
  else if (downVol > 0 && upVol > downVol) score += 1

  // Last 5 days volume vs 60-day average
  const last5Avg = mean(volumes.slice(-5))
  const avg60 = mean(volumes.slice(-60))
  if (avg60 > 0) {
    const ratio = last5Avg / avg60
    if (ratio < 0.5) score += 3
    else if (ratio < 0.7) score += 2
    else if (ratio < 1.0) score += 1
  }

  return Math.min(score, 10)
}

// ── C5: Leadership (max 10 pts) ──
// Placeholder — requires sector peer ranking

function scoreLeadership(): number {
  return 0
}

// ── C6: Sponsorship (max 10 pts) ──

function scoreSponsorship(fundamentals: Fundamentals): number {
  let score = 0

  if (fundamentals.institutionalHold !== null) {
    if (fundamentals.institutionalHold > 0.10) score += 5
  }

  if (fundamentals.insiderHold !== null) {
    if (fundamentals.insiderHold > 0.05) score += 5
  }

  return score
}

// ── C7: Market Direction (max 15 pts) ──

function scoreMarketDirection(marketIndex: PriceData[]): number {
  if (marketIndex.length < 200) return 0

  const closes = marketIndex.map(p => p.close)
  const ma50 = lastSma(closes, 50)
  const ma200 = lastSma(closes, 200)
  const currentPrice = closes[closes.length - 1]!

  if (ma50 === null || ma200 === null) return 0

  if (currentPrice > ma50 && ma50 > ma200) return 15  // Uptrend
  if (ma50 < ma200) return 0                            // Downtrend
  return 5                                               // Sideways
}

// ── Aggregate: all 7 criteria ──

export function scoreAllCriteria(input: {
  prices: PriceData[]
  fundamentals: Fundamentals
  marketIndex: PriceData[]
  vcp: VcpResult
}): SepaBreakdown {
  const { prices, fundamentals, marketIndex, vcp } = input

  const c1SuperPerf = scoreSuperPerf(prices, marketIndex)
  const c2Earnings = scoreEarnings(fundamentals)
  const c3Catalyst = scoreCatalyst()
  const c4Supply = scoreSupplyDemand(prices, vcp)
  const c5Leadership = scoreLeadership()
  const c6Sponsorship = scoreSponsorship(fundamentals)
  const c7Market = scoreMarketDirection(marketIndex)

  return {
    c1SuperPerf,
    c2Earnings,
    c3Catalyst,
    c4Supply,
    c5Leadership,
    c6Sponsorship,
    c7Market,
  }
}
