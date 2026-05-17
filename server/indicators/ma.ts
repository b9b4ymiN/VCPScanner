import type { PriceData } from '../core/types'

export function sma(data: number[], period: number): number[] {
  const result: number[] = []
  if (data.length < period) return result
  let sum = 0
  for (let i = 0; i < period; i++) sum += data[i]!
  result.push(sum / period)
  for (let i = period; i < data.length; i++) {
    sum += data[i]! - data[i - period]!
    result.push(sum / period)
  }
  return result
}

export function smaAligned(closes: number[], period: number): (number | null)[] {
  const result = sma(closes, period)
  const padding = closes.length - result.length
  return [...new Array<(number | null)>(padding).fill(null), ...result]
}

export function lastSma(closes: number[], period: number): number | null {
  const values = sma(closes, period)
  if (values.length === 0) return null
  return values[values.length - 1]!
}

export function maSlope(maValues: (number | null)[], lookback: number = 20): number {
  const valid = maValues.filter((v): v is number => v !== null)
  if (valid.length < 2) return 0
  const end = valid.length - 1
  const start = Math.max(0, end - lookback + 1)
  const startVal = valid[start]!
  if (startVal === 0) return 0
  return (valid[end]! - startVal) / startVal
}

export function calcReturn(prices: PriceData[], days: number): number | null {
  if (prices.length < days + 1) return null
  const end = prices[prices.length - 1]!.close
  const start = prices[prices.length - 1 - days]!.close
  if (start === 0) return null
  return (end - start) / start
}
