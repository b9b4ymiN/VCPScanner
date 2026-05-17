import YahooFinance from 'yahoo-finance2'
import type { DataProvider, Market, PriceData, PricePeriod, Fundamentals } from '../core/types'
import { yahooBucket } from '../core/rate-limiter'

const yf = new YahooFinance()

interface YahooHistoricalRow {
  date: Date | undefined
  open: number | undefined
  high: number | undefined
  low: number | undefined
  close: number | undefined
  volume: number | undefined
}

export class YahooProvider implements DataProvider {
  name = 'yahoo'

  async fetchPrices(symbol: string, market: Market, period: PricePeriod): Promise<PriceData[]> {
    const ysymbol = `${symbol}${market.yahooSuffix}`
    await yahooBucket.acquire()

    const result = await yf.historical(ysymbol, {
      period1: periodToDays(period),
      period2: new Date(),
    }) as YahooHistoricalRow[]

    return result
      .filter((r): r is YahooHistoricalRow & { date: Date; close: number } =>
        r.date != null && r.close != null,
      )
      .map(r => ({
        date: formatDate(r.date),
        open: r.open ?? 0,
        high: r.high ?? 0,
        low: r.low ?? 0,
        close: r.close,
        volume: r.volume ?? 0,
      }))
  }

  async fetchFundamentals(symbol: string, market: Market): Promise<Fundamentals> {
    const ysymbol = `${symbol}${market.yahooSuffix}`
    await yahooBucket.acquire()

    try {
      const info = await yf.quoteSummary(ysymbol, {
        modules: ['financialData', 'defaultKeyStatistics', 'summaryProfile', 'summaryDetail'],
      }) as Record<string, Record<string, unknown>>

      const fd = (info.financialData ?? {}) as Record<string, unknown>
      const ks = (info.defaultKeyStatistics ?? {}) as Record<string, unknown>
      const sp = (info.summaryProfile ?? {}) as Record<string, unknown>
      const sd = (info.summaryDetail ?? {}) as Record<string, unknown>

      return {
        epsGrowthYoY: ks.earningsQuarterlyGrowth != null
          ? Number(ks.earningsQuarterlyGrowth)
          : null,
        revenueGrowthYoY: fd.revenueGrowth != null
          ? Number(fd.revenueGrowth)
          : null,
        profitMargin: fd.profitMargins != null
          ? Number(fd.profitMargins)
          : null,
        roe: fd.returnOnEquity != null
          ? Number(fd.returnOnEquity)
          : null,
        institutionalHold: ks.heldPercentInstitutions != null
          ? Number(ks.heldPercentInstitutions)
          : null,
        insiderHold: ks.heldPercentInsiders != null
          ? Number(ks.heldPercentInsiders)
          : null,
        sector: sp.sector != null ? String(sp.sector) : null,
        longName: sp.longName != null ? String(sp.longName) : null,
        industry: sp.industry != null ? String(sp.industry) : null,
        dividendYield: sd.dividendYield != null
          ? Number(sd.dividendYield)
          : null,
        recommendationKey: fd.recommendationKey != null
          ? String(fd.recommendationKey)
          : null,
        fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh != null
          ? Number(sd.fiftyTwoWeekHigh)
          : null,
        fiftyTwoWeekLow: sd.fiftyTwoWeekLow != null
          ? Number(sd.fiftyTwoWeekLow)
          : null,
      }
    } catch {
      return {
        epsGrowthYoY: null,
        revenueGrowthYoY: null,
        profitMargin: null,
        roe: null,
        institutionalHold: null,
        insiderHold: null,
        sector: null,
        longName: null,
        industry: null,
        dividendYield: null,
        recommendationKey: null,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
      }
    }
  }

  async fetchMarketIndex(market: Market): Promise<PriceData[]> {
    const indexMap: Record<string, string> = {
      SET: '^SET.BK',
      NASDAQ: '^IXIC',
      NYSE: '^NYA',
      HKEX: '^HSI',
      TSE: '^N225',
    }
    const indexSymbol = indexMap[market.id]
    if (!indexSymbol) return []

    await yahooBucket.acquire()

    const result = await yf.historical(indexSymbol, {
      period1: periodToDays('1y'),
      period2: new Date(),
    }) as YahooHistoricalRow[]

    return result
      .filter((r): r is YahooHistoricalRow & { date: Date; close: number } =>
        r.date != null && r.close != null,
      )
      .map(r => ({
        date: formatDate(r.date),
        open: r.open ?? 0,
        high: r.high ?? 0,
        low: r.low ?? 0,
        close: r.close,
        volume: r.volume ?? 0,
      }))
  }
}

function periodToDays(period: PricePeriod): Date {
  const days = { '1y': 365, '6mo': 182, '3mo': 91 }
  const d = new Date()
  d.setDate(d.getDate() - (days[period] ?? 365))
  return d
}

function formatDate(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10)
  return d.toISOString().slice(0, 10)
}
