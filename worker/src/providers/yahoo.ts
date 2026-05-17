import type { DataProvider, Market, PriceData, PricePeriod, Fundamentals } from '../../../server/core/types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'

// ─── Cookie/Crumb auth for Yahoo v10 APIs ───

let cachedCookies = ''
let cachedCrumb = ''
let authExpiry = 0

async function getAuth(): Promise<{ cookies: string; crumb: string }> {
  if (cachedCrumb && Date.now() < authExpiry) {
    return { cookies: cachedCookies, crumb: cachedCrumb }
  }

  // Step 1: GET finance.yahoo.com page to capture Set-Cookie headers
  const pageRes = await fetch('https://finance.yahoo.com/', {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'manual',
  })

  const headers = pageRes.headers as Headers & { getSetCookie?: () => string[] }
  const setCookies = headers.getSetCookie?.() ?? []
  const cookies = setCookies
    .map((c: string) => c.split(';')[0])
    .filter((c: string) => c.includes('='))
    .join('; ')

  if (!cookies) {
    throw new Error('No cookies from Yahoo')
  }

  // Step 2: GET crumb with the captured cookies
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': UA,
      Cookie: cookies,
      Origin: 'https://finance.yahoo.com',
      Referer: 'https://finance.yahoo.com/',
    },
  })

  if (!crumbRes.ok) {
    throw new Error(`Crumb request failed: ${crumbRes.status}`)
  }

  const crumb = await crumbRes.text()
  if (!crumb || crumb.length < 3) {
    throw new Error('Invalid crumb received')
  }

  // Cache for 1 hour
  cachedCookies = cookies
  cachedCrumb = crumb
  authExpiry = Date.now() + 3600_000

  return { cookies, crumb }
}

// ─── Throttle ───

let lastRequest = 0
const MIN_INTERVAL = 250

async function throttle(): Promise<void> {
  const now = Date.now()
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequest))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastRequest = Date.now()
}

// ─── Provider ───

export class YahooFetchProvider implements DataProvider {
  name = 'yahoo-fetch'

  private parseChartResponse(data: unknown): PriceData[] {
    const result = (data as any)?.chart?.result?.[0]
    if (!result) return []
    const timestamps = result.timestamp as number[] | undefined
    const quote = result.indicators?.quote?.[0]
    if (!timestamps || !quote) return []
    return timestamps
      .map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        open: quote.open?.[i] ?? 0,
        high: quote.high?.[i] ?? 0,
        low: quote.low?.[i] ?? 0,
        close: quote.close?.[i] ?? 0,
        volume: quote.volume?.[i] ?? 0,
      }))
      .filter((p: PriceData) => p.close > 0)
  }

  async fetchPrices(symbol: string, market: Market, period: PricePeriod): Promise<PriceData[]> {
    const ysymbol = `${symbol}${market.yahooSuffix}`
    const range = period === '1y' ? '1y' : period === '6mo' ? '6mo' : '3mo'
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ysymbol)}?range=${range}&interval=1d`
    try {
      await throttle()
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) return []
      return this.parseChartResponse(await res.json())
    } catch {
      return []
    }
  }

  async fetchFundamentals(symbol: string, market: Market): Promise<Fundamentals> {
    const ysymbol = `${symbol}${market.yahooSuffix}`
    const empty: Fundamentals = {
      epsGrowthYoY: null, revenueGrowthYoY: null, profitMargin: null, roe: null,
      institutionalHold: null, insiderHold: null, sector: null, longName: null,
      industry: null, dividendYield: null, recommendationKey: null,
      fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null,
    }

    try {
      const { cookies, crumb } = await getAuth()
      await throttle()

      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ysymbol)}?modules=financialData,defaultKeyStatistics,summaryProfile,summaryDetail&crumb=${encodeURIComponent(crumb)}`
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Cookie: cookies,
          Origin: 'https://finance.yahoo.com',
          Referer: 'https://finance.yahoo.com/',
        },
      })

      if (!res.ok) {
        // Auth might have expired — clear cache for next attempt
        cachedCrumb = ''
        return empty
      }

      const json = await res.json() as any
      const result = json?.quoteSummary?.result?.[0]
      if (!result) return empty

      const fd = (result.financialData ?? {}) as Record<string, unknown>
      const ks = (result.defaultKeyStatistics ?? {}) as Record<string, unknown>
      const sp = (result.summaryProfile ?? {}) as Record<string, unknown>
      const sd = (result.summaryDetail ?? {}) as Record<string, unknown>

      const num = (v: unknown): number | null =>
        v != null && typeof v === 'object' && 'raw' in (v as object)
          ? Number((v as { raw: number }).raw)
          : v != null ? Number(v) : null
      const str = (v: unknown): string | null =>
        v != null ? String(v) : null

      return {
        epsGrowthYoY: num(ks.earningsQuarterlyGrowth),
        revenueGrowthYoY: num(fd.revenueGrowth),
        profitMargin: num(fd.profitMargins),
        roe: num(fd.returnOnEquity),
        institutionalHold: num(ks.heldPercentInstitutions),
        insiderHold: num(ks.heldPercentInsiders),
        sector: str(sp.sector),
        longName: str(sp.longName),
        industry: str(sp.industry),
        dividendYield: num(sd.dividendYield),
        recommendationKey: str(fd.recommendationKey),
        fiftyTwoWeekHigh: num(sd.fiftyTwoWeekHigh),
        fiftyTwoWeekLow: num(sd.fiftyTwoWeekLow),
      }
    } catch {
      return empty
    }
  }

  async fetchMarketIndex(market: Market): Promise<PriceData[]> {
    const indexMap: Record<string, string> = {
      SET: '%5ESET.BK', NASDAQ: '%5EIXIC', NYSE: '%5ENYA', HKEX: '%5EHSI', TSE: '%5EN225',
    }
    const indexSymbol = indexMap[market.id]
    if (!indexSymbol) return []
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${indexSymbol}?range=1y&interval=1d`
    try {
      await throttle()
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) return []
      return this.parseChartResponse(await res.json())
    } catch {
      return []
    }
  }
}
