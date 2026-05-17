// Port of detect_vcp() from sepa_scanner.py — BLUEPRINT Section 1.3
// ⚠️ IMMUTABLE — ห้ามเปลี่ยน logic โดยไม่มี BLUEPRINT update

import type { VcpResult } from '../../core/types'
import { mean } from '../../indicators/stats'

const NOT_VCP: VcpResult = {
  isVcp: false,
  qualityScore: 0,
  qualityLabel: 'LOOSE',
  contractions: [],
  contractionRatios: [],
  volDrying: false,
  pivotPrice: 0,
  pivotDistancePct: 0,
  swingHighs: [],
  swingLows: [],
}

export function detectVcp(
  prices: number[],
  volumes: number[],
  window: number = 5,
): VcpResult {
  if (prices.length < window * 2 + 1) {
    return { ...NOT_VCP }
  }

  // ── Step 1: Find Swing Highs / Lows ──
  const swingHighs: [number, number][] = []
  const swingLows: [number, number][] = []

  for (let i = window; i < prices.length - window; i++) {
    let isHigh = true
    let isLow = true
    for (let j = i - window; j <= i + window; j++) {
      if (prices[j]! > prices[i]!) isHigh = false
      if (prices[j]! < prices[i]!) isLow = false
    }
    if (isHigh) swingHighs.push([i, prices[i]!])
    if (isLow) swingLows.push([i, prices[i]!])
  }

  // Minimum: swing_highs >= 2 AND swing_lows >= 1
  if (swingHighs.length < 2 || swingLows.length < 1) {
    return { ...NOT_VCP, swingHighs, swingLows }
  }

  // ── Step 2: Calculate Contractions ──
  const contractions: number[] = []
  for (let i = 0; i < swingHighs.length - 1; i++) {
    const hI = swingHighs[i]![1]
    const idxStart = swingHighs[i]![0]
    const idxEnd = swingHighs[i + 1]![0]
    let lowBetween = prices[idxStart]!
    for (let j = idxStart; j <= idxEnd; j++) {
      if (prices[j]! < lowBetween) lowBetween = prices[j]!
    }
    const depth = hI === 0 ? 0 : (hI - lowBetween) / hI
    contractions.push(depth)
  }

  if (contractions.length < 2) {
    return { ...NOT_VCP, swingHighs, swingLows }
  }

  // ── Step 3: Contraction Ratios ──
  const contractionRatios: number[] = []
  for (let i = 1; i < contractions.length; i++) {
    const prev = contractions[i - 1]!
    const ratio = prev === 0 ? 1 : contractions[i]! / prev
    contractionRatios.push(ratio)
  }

  // ── Step 4: Volume Drying (pass at least 1 of 2) ──
  const half = Math.floor(volumes.length / 2)
  const condA = mean(volumes.slice(half)) < mean(volumes.slice(0, half))
  const condB = mean(volumes.slice(-10)) < 0.70 * mean(volumes)
  const volDrying = condA || condB

  // ── Step 5: Quality Scoring ──
  let qualityScore = 0

  // Ratio quality
  if (contractionRatios.length > 0 && contractionRatios.every(r => r < 1.0)) {
    qualityScore += 3
  } else if (contractionRatios.length > 0 && contractionRatios[0]! < 1.0) {
    qualityScore += 1
  }

  // Contraction count (ideal = 2–4)
  const n = contractions.length
  if (n >= 2 && n <= 4) qualityScore += 3
  else if (n >= 2) qualityScore += 2

  // Pivot Distance
  const lastSwing = swingHighs[swingHighs.length - 1]!
  const pivot = lastSwing[1]
  const lastPrice = prices[prices.length - 1]!
  const pivotDist = pivot === 0 ? 0 : (pivot - lastPrice) / pivot
  if (pivotDist < 0.03) qualityScore += 2
  else if (pivotDist < 0.05) qualityScore += 1

  // Volume Drying
  if (volDrying) qualityScore += 2

  const isVcp = qualityScore >= 5

  // Quality Label
  let qualityLabel: VcpResult['qualityLabel']
  if (qualityScore >= 8) qualityLabel = 'TIGHT'
  else if (qualityScore >= 5) qualityLabel = 'STANDARD'
  else if (qualityScore >= 3) qualityLabel = 'WIDE'
  else qualityLabel = 'LOOSE'

  return {
    isVcp,
    qualityScore,
    qualityLabel,
    contractions,
    contractionRatios,
    volDrying,
    pivotPrice: pivot,
    pivotDistancePct: pivotDist,
    swingHighs,
    swingLows,
  }
}
