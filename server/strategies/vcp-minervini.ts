// VCP Minervini Strategy — THE strategy
// Port of sepa_scanner.py — orchestrates pre-filter → SEPA 7 → VCP → alert
// ⚠️ IMMUTABLE — scoring logic comes from _shared/ modules (BLUEPRINT)

import type { Strategy, StrategyResult } from '../core/types'
import { mean } from '../indicators/stats'
import { detectVcp } from './_shared/vcp-detector'
import { scoreAllCriteria } from './_shared/sepa-criteria'
import { classifyAlert } from './_shared/alert-level'
import { evaluateTrendTemplate, type TrendTemplateResult } from './_shared/trend-template'

function reject(symbol: string, date: string): StrategyResult {
  return {
    symbol,
    date,
    passes: false,
    score: 0,
    alertLevel: null,
    details: {
      sepaBreakdown: {
        c1SuperPerf: 0, c2Earnings: 0, c3Catalyst: 0,
        c4Supply: 0, c5Leadership: 0, c6Sponsorship: 0, c7Market: 0,
      },
      vcp: {
        isVcp: false, qualityScore: 0, qualityLabel: 'LOOSE',
        contractions: [], contractionRatios: [], volDrying: false,
        pivotPrice: 0, pivotDistancePct: 0, swingHighs: [], swingLows: [],
      },
      price: 0,
      avgVol20d: 0,
      trendTemplate: null as TrendTemplateResult | null,
    },
  }
}

export const VcpMinerviniStrategy: Strategy = {
  id: 'vcp-minervini',
  name: 'Minervini VCP + SEPA',
  description: 'ตาม sepa_scanner.py — Mark Minervini SEPA 7 criteria + VCP detection',
  version: 'v1.0',

  scan({ symbol, market, prices, fundamentals, marketIndex }): StrategyResult {
    const lastBar = prices[prices.length - 1]
    const date = lastBar?.date ?? ''
    if (prices.length === 0 || !lastBar) return reject(symbol, date)

    // ── Pre-filter (BLUEPRINT Section 1.1) ──
    const currentPrice = lastBar.close
    const avgVol20d = mean(prices.slice(-20).map(p => p.volume))

    if (currentPrice < market.preFilter.minPrice) return reject(symbol, date)
    if (avgVol20d < market.preFilter.minAvgVol) return reject(symbol, date)
    if (prices.length < market.preFilter.minHistory) return reject(symbol, date)

    // ── VCP Detection (BLUEPRINT Section 1.3) ──
    const recentPrices = prices.slice(-60)
    const vcp = detectVcp(
      recentPrices.map(p => p.close),
      recentPrices.map(p => p.volume),
    )

    // ── SEPA 7 Criteria (BLUEPRINT Section 1.2) ──
    const sepaBreakdown = scoreAllCriteria({
      prices,
      fundamentals,
      marketIndex,
      vcp,
    })

    const sepaScore =
      sepaBreakdown.c1SuperPerf +
      sepaBreakdown.c2Earnings +
      sepaBreakdown.c3Catalyst +
      sepaBreakdown.c4Supply +
      sepaBreakdown.c5Leadership +
      sepaBreakdown.c6Sponsorship +
      sepaBreakdown.c7Market

    // ── Trend Template (Mark Minervini 8-point checklist) ──
    const trendTemplate = evaluateTrendTemplate(prices, fundamentals, marketIndex)

    // ── Alert Trigger (BLUEPRINT Section 1.4) ──
    const passes = sepaScore >= 60 && vcp.isVcp
    if (!passes) {
      return {
        symbol,
        date,
        passes: false,
        score: sepaScore,
        alertLevel: null,
        details: { sepaBreakdown, vcp, price: currentPrice, avgVol20d, trendTemplate },
      }
    }

    const alertLevel = classifyAlert({
      vcpQualityScore: vcp.qualityScore,
      sepaScore,
      pivotDistancePct: vcp.pivotDistancePct,
    })

    return {
      symbol,
      date,
      passes: true,
      score: sepaScore,
      alertLevel,
      details: { sepaBreakdown, vcp, price: currentPrice, avgVol20d, trendTemplate },
    }
  },
}
