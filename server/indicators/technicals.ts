import type { PriceData } from '../core/types'

// RSI — Wilder's smoothing
export function calcRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) return null

  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    const diff = closes[i]! - closes[i - 1]!
    if (diff > 0) avgGain += diff
    else avgLoss += Math.abs(diff)
  }

  avgGain /= period
  avgLoss /= period

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i]! - closes[i - 1]!
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

// ATR — Average True Range
export function calcATR(prices: PriceData[], period: number = 14): number | null {
  if (prices.length < period + 1) return null

  const trs: number[] = []
  for (let i = 1; i < prices.length; i++) {
    const high = prices[i]!.high
    const low = prices[i]!.low
    const prevClose = prices[i - 1]!.close
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
    trs.push(tr)
  }

  let atr = trs.slice(0, period).reduce((s, v) => s + v, 0) / period
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]!) / period
  }

  return atr
}

// ADX — Average Directional Index
export function calcADX(prices: PriceData[], period: number = 14): number | null {
  if (prices.length < period * 2 + 1) return null

  const plusDMs: number[] = []
  const minusDMs: number[] = []
  const trs: number[] = []

  for (let i = 1; i < prices.length; i++) {
    const high = prices[i]!.high
    const low = prices[i]!.low
    const prevHigh = prices[i - 1]!.high
    const prevLow = prices[i - 1]!.low
    const prevClose = prices[i - 1]!.close

    const upMove = high - prevHigh
    const downMove = prevLow - low

    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0)
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)))
  }

  let smoothPlusDM = plusDMs.slice(0, period).reduce((s, v) => s + v, 0)
  let smoothMinusDM = minusDMs.slice(0, period).reduce((s, v) => s + v, 0)
  let smoothTR = trs.slice(0, period).reduce((s, v) => s + v, 0)

  const dxValues: number[] = []

  for (let i = period; i < trs.length; i++) {
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDMs[i]!
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDMs[i]!
    smoothTR = smoothTR - smoothTR / period + trs[i]!

    const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0
    const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0
    const diSum = plusDI + minusDI

    if (diSum > 0) {
      dxValues.push((Math.abs(plusDI - minusDI) / diSum) * 100)
    }
  }

  if (dxValues.length < period) return null

  let adx = dxValues.slice(0, period).reduce((s, v) => s + v, 0) / period
  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]!) / period
  }

  return adx
}

// Bollinger Band Width
export function calcBollingerWidth(
  closes: number[],
  period: number = 20,
  mult: number = 2,
): { upper: number; middle: number; lower: number; bandwidth: number; percentB: number } | null {
  if (closes.length < period) return null

  const slice = closes.slice(-period)
  const middle = slice.reduce((s, v) => s + v, 0) / period
  const variance = slice.reduce((s, v) => s + (v - middle) ** 2, 0) / period
  const stdDev = Math.sqrt(variance)

  const upper = middle + mult * stdDev
  const lower = middle - mult * stdDev
  const bandwidth = middle > 0 ? ((upper - lower) / middle) * 100 : 0

  const currentPrice = closes[closes.length - 1]!
  const percentB = upper !== lower ? (currentPrice - lower) / (upper - lower) : 0.5

  return { upper, middle, lower, bandwidth, percentB }
}

// 52-Week High + distance from current price
export function calc52WeekHigh(prices: PriceData[]): { high52w: number; distance: number } | null {
  if (prices.length === 0) return null

  const highs = prices.map(p => p.high)
  const high52w = Math.max(...highs)
  const currentPrice = prices[prices.length - 1]!.close
  const distance = ((currentPrice - high52w) / high52w) * 100

  return { high52w, distance }
}

// Breakout status based on price position vs 52W high
export type BreakoutStatus = 'BLUE_SKY' | 'READY' | 'PENDING' | 'FAR'

export function calcBreakoutStatus(prices: PriceData[]): { status: BreakoutStatus; price52wHigh: number; positionPct: number } | null {
  const result = calc52WeekHigh(prices)
  if (!result) return null

  const positionPct = ((prices[prices.length - 1]!.close - result.high52w) / result.high52w) * 100

  let status: BreakoutStatus
  if (positionPct >= -0.5) status = 'BLUE_SKY'     // within 0.5% of or above 52W high
  else if (positionPct >= -5) status = 'READY'      // within 5%
  else if (positionPct >= -10) status = 'PENDING'   // within 10%
  else status = 'FAR'                                // more than 10% away

  return { status, price52wHigh: result.high52w, positionPct }
}

// Pivot breakout date: most recent date where close crossed above pivotPrice
export function calcPivotBreakoutDate(prices: PriceData[], pivotPrice: number): string | null {
  for (let i = prices.length - 1; i >= 1; i--) {
    if (prices[i]!.close > pivotPrice && prices[i - 1]!.close <= pivotPrice) {
      return prices[i]!.date
    }
  }
  return null
}

// Volume ratio: recent 5-day avg vs 20-day avg
export function calcVolumeRatio(volumes: number[]): number | null {
  if (volumes.length < 20) return null
  const recent5 = volumes.slice(-5).reduce((s, v) => s + v, 0) / 5
  const avg20 = volumes.slice(-20).reduce((s, v) => s + v, 0) / 20
  return avg20 > 0 ? recent5 / avg20 : null
}
