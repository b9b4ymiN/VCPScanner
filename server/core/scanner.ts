import { db } from '../db/client'
import { alerts, scanRuns } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { Market, Strategy, DataProvider, PriceData, StrategyResult, Fundamentals, TechnicalIndicators, AlertTags, AlertSetup, StockProfile, TradePlan } from './types'
import { calcRSI, calcADX, calcATR, calcBollingerWidth, calc52WeekHigh, calcBreakoutStatus, calcVolumeRatio } from '../indicators/technicals'

export interface ScanOptions {
  market: Market
  strategy: Strategy
  provider: DataProvider
}

export interface ScanResult {
  scanId: number
  totalScanned: number
  totalPassed: number
}

export async function runScan(options: ScanOptions): Promise<ScanResult> {
  const { market, strategy, provider } = options
  const today = new Date().toISOString().slice(0, 10)

  // Log scan start
  const inserted = await db.insert(scanRuns).values({
    date: today,
    marketId: market.id,
    strategyId: strategy.id,
    startedAt: new Date().toISOString(),
    status: 'running',
  }).returning({ id: scanRuns.id })

  const scanId = inserted[0]!.id

  try {
    const symbolList = await market.symbols()
    console.log(`[scanner] Starting: ${symbolList.length} symbols, market=${market.id}`)

    const marketIndex = await provider.fetchMarketIndex(market)

    let totalScanned = 0
    let totalPassed = 0

    // Process in batches of 5 (rate limit safe)
    const BATCH_SIZE = 5
    for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
      const batch = symbolList.slice(i, i + BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map(sym => scanSymbol(sym, market, strategy, provider, marketIndex)),
      )

      for (const r of results) {
        totalScanned++
        if (r.status === 'fulfilled' && r.value) totalPassed++
      }

      // Inter-batch delay
      if (i + BATCH_SIZE < symbolList.length) {
        await sleep(500)
      }
    }

    await db.update(scanRuns).set({
      finishedAt: new Date().toISOString(),
      totalScanned,
      totalPassed,
      status: 'success',
    }).where(eq(scanRuns.id, scanId))

    console.log(`[scanner] Done: ${totalScanned} scanned, ${totalPassed} alerts`)
    return { scanId, totalScanned, totalPassed }
  } catch (err) {
    await db.update(scanRuns).set({
      finishedAt: new Date().toISOString(),
      status: 'failed',
      errorMsg: String(err),
    }).where(eq(scanRuns.id, scanId))
    console.error('[scanner] Failed:', err)
    throw err
  }
}

async function scanSymbol(
  symbol: string,
  market: Market,
  strategy: Strategy,
  provider: DataProvider,
  marketIndex: PriceData[],
): Promise<boolean> {
  try {
    const [prices, fundamentals] = await Promise.all([
      provider.fetchPrices(symbol, market, '1y'),
      provider.fetchFundamentals(symbol, market),
    ])

    if (prices.length === 0) return false

    const result = strategy.scan({ symbol, market, prices, fundamentals, marketIndex })

    if (!result.passes || !result.alertLevel) return false

    const priceChangePct = prices.length >= 2
      ? ((prices[prices.length - 1]!.close - prices[prices.length - 2]!.close)
          / prices[prices.length - 2]!.close) * 100
      : null

    await saveAlert(result, market.id, strategy.id, prices, fundamentals, priceChangePct)
    return true
  } catch (err) {
    console.error(`[scanner] ${symbol}: ${err}`)
    return false
  }
}

async function saveAlert(
  result: StrategyResult,
  marketId: string,
  strategyId: string,
  prices: PriceData[],
  fundamentals: Fundamentals,
  priceChangePct: number | null,
): Promise<void> {
  const vcp = result.details.vcp
  const sb = result.details.sepaBreakdown
  const recent = prices.slice(-60)
  const closes = prices.map(p => p.close)

  // Compute technical indicators
  const rsi14 = calcRSI(closes)
  const adx14 = calcADX(prices)
  const atr14 = calcATR(prices)
  const bb = calcBollingerWidth(closes)
  const w52 = calc52WeekHigh(prices)
  const breakout = calcBreakoutStatus(prices)
  const volumeRatio = calcVolumeRatio(recent.map(p => p.volume))

  const technicals: TechnicalIndicators = {
    rsi14,
    adx14,
    bbWidth: bb?.bandwidth ?? null,
    bbPercentB: bb?.percentB ?? null,
    atr14,
    high52w: w52?.high52w ?? null,
    distance52w: w52?.distance ?? null,
  }

  // Compute trade plan
  const currentPrice = result.details.price
  let tradePlan: TradePlan | null = null
  if (atr14 && atr14 > 0) {
    const stopPrice = currentPrice - 2 * atr14
    const targetPrice = currentPrice + 3 * atr14
    const riskPct = ((currentPrice - stopPrice) / currentPrice) * 100
    const rewardRiskRatio = (targetPrice - currentPrice) / (currentPrice - stopPrice)
    tradePlan = { entryPrice: currentPrice, stopPrice, targetPrice, riskPct, rewardRiskRatio }
  }

  // Derive tags
  const tags: AlertTags = {
    turnaround: fundamentals.epsGrowthYoY != null && fundamentals.epsGrowthYoY > 0.5,
    blueSky: breakout?.status === 'BLUE_SKY',
    analystBuy: fundamentals.recommendationKey != null
      && ['buy', 'strong_buy'].includes(fundamentals.recommendationKey),
    highDividend: fundamentals.dividendYield != null && fundamentals.dividendYield > 0.03,
  }

  // Derive setup
  const setup: AlertSetup = {
    vcpPatternLabel: `${vcp.contractions.length}C ${vcp.qualityLabel}`,
    proximity52wPct: w52?.distance ?? null,
    breakoutStatus: breakout?.status ?? 'FAR',
  }

  // Profile
  const profile: StockProfile = {
    longName: fundamentals.longName,
    sector: fundamentals.sector,
    industry: fundamentals.industry,
    dividendYield: fundamentals.dividendYield,
    recommendationKey: fundamentals.recommendationKey,
  }

  // Enriched details (spread original + new fields)
  const enrichedDetails = {
    ...result.details,
    technicals,
    tradePlan,
    tags,
    setup,
    profile,
    volumeRatio,
  }

  const values = {
    date: result.date,
    symbol: result.symbol,
    marketId,
    strategyId,
    name: fundamentals.longName,
    sector: fundamentals.sector,
    sepaScore: result.score,
    alertLevel: result.alertLevel!,
    price: result.details.price,
    priceChangePct,
    vcpQuality: vcp.qualityLabel,
    vcpQualityScore: vcp.qualityScore,
    vcpContractions: JSON.stringify(vcp.contractions),
    vcpVolDrying: vcp.volDrying,
    pivotPrice: vcp.pivotPrice,
    pivotDistancePct: vcp.pivotDistancePct,
    scoreC1: sb.c1SuperPerf,
    scoreC2: sb.c2Earnings,
    scoreC3: sb.c3Catalyst,
    scoreC4: sb.c4Supply,
    scoreC5: sb.c5Leadership,
    scoreC6: sb.c6Sponsorship,
    scoreC7: sb.c7Market,

    // Enriched — Layer 1
    breakoutStatus: breakout?.status ?? null,
    price52wHigh: breakout?.price52wHigh ?? null,
    revenueGrowthYoy: fundamentals.revenueGrowthYoY,
    epsGrowthYoy: fundamentals.epsGrowthYoY,
    volumeRatio,

    // Enriched — Layer 2
    rsi14,
    adx14,
    bbWidthPct: bb?.bandwidth ?? null,
    entryPrice: tradePlan?.entryPrice ?? null,
    stopPrice: tradePlan?.stopPrice ?? null,
    targetPrice: tradePlan?.targetPrice ?? null,
    riskRewardRatio: tradePlan?.rewardRiskRatio ?? null,
    riskPct: tradePlan?.riskPct ?? null,

    prices60d: JSON.stringify(recent.map(p => ({
      date: p.date, open: p.open, high: p.high,
      low: p.low, close: p.close, volume: p.volume,
    }))),
    volumes60d: null,
    details: JSON.stringify(enrichedDetails),
  }

  await db.insert(alerts).values(values).onConflictDoUpdate({
    target: [alerts.date, alerts.symbol, alerts.strategyId, alerts.marketId],
    set: values,
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
