import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getDb } from './db'
import { alerts, scanRuns, symbols, pageViews, portfolios, positions, dailySnapshots } from './schema'
import { eq, gte, desc, and, count, sql } from 'drizzle-orm'
import { YahooFetchProvider } from './providers/yahoo'
import { simulateEOD } from './simulation'
import type { Market, PriceData, PricePeriod, Fundamentals } from '../../server/core/types'
import { VcpMinerviniStrategy } from '../../server/strategies/vcp-minervini'
import { evaluateTrendTemplate } from '../../server/strategies/_shared/trend-template'
import {
  calcRSI, calcADX, calcATR, calcBollingerWidth, calc52WeekHigh,
  calcBreakoutStatus, calcPivotBreakoutDate, calcVolumeRatio,
} from '../../server/indicators/technicals'

// ─── Market config (Workers-compatible, no DB import) ───

const SET_MARKET: Market = {
  id: 'SET',
  name: 'Stock Exchange of Thailand',
  currency: 'THB',
  yahooSuffix: '.BK',
  timezone: 'Asia/Bangkok',
  marketClose: '16:30',
  preFilter: { minPrice: 2.0, minAvgVol: 200_000, minHistory: 60 },
  symbols: async () => [], // Symbols fetched from D1 directly
}

// ─── Types ───

type Bindings = {
  DB: D1Database
  SCAN_QUEUE: Queue
}

const app = new Hono<{ Bindings: Bindings }>()

// ─── Middleware ───

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST'],
}))

// ─── Status ───

app.get('/api/status', async (c) => {
  const db = getDb(c.env.DB)
  const lastScan = await db.select().from(scanRuns)
    .orderBy(desc(scanRuns.id))
    .limit(1)

  return c.json({
    status: 'ok',
    version: '0.3.0-cloudflare',
    scheduler: { isRunning: false },
    lastScan: lastScan[0] ?? null,
    timestamp: new Date().toISOString(),
  })
})

// ─── Alerts ───

app.get('/api/alerts', async (c) => {
  const db = getDb(c.env.DB)
  let date = c.req.query('date')
  if (!date) {
    const latest = await db.select({ date: alerts.date }).from(alerts)
      .orderBy(desc(alerts.date))
      .limit(1)
    date = latest[0]?.date ?? new Date().toISOString().slice(0, 10)
  }
  const level = c.req.query('level')
  const minScore = Number(c.req.query('min_score') ?? 60)
  const limit = Math.min(Number(c.req.query('limit') ?? 100), 500)
  const offset = Number(c.req.query('offset') ?? 0)
  const ttMin = c.req.query('tt_min')

  let conditions = level
    ? and(eq(alerts.date, date), gte(alerts.sepaScore, minScore), eq(alerts.alertLevel, level.toUpperCase()))
    : and(eq(alerts.date, date), gte(alerts.sepaScore, minScore))

  if (ttMin) {
    conditions = and(conditions, sql`(coalesce(${alerts.trendTemplateScore}, 0) >= ${Number(ttMin)})`)
  }

  const [rows, countResult, marketSummary] = await Promise.all([
    db.select().from(alerts).where(conditions).orderBy(desc(alerts.sepaScore)).limit(limit).offset(offset),
    db.select({ total: count() }).from(alerts).where(conditions),
    db.select({ totalScanned: scanRuns.totalScanned, totalPassed: scanRuns.totalPassed })
      .from(scanRuns).where(eq(scanRuns.status, 'success')).orderBy(desc(scanRuns.id)).limit(1),
  ])

  const marketScoreC7 = rows.length > 0 ? rows[0]!.scoreC7 : null

  return c.json({
    date,
    total: countResult[0]?.total ?? 0,
    alerts: rows.map(r => ({
      ...r,
      prices60d: r.prices60d ? JSON.parse(r.prices60d as string) : null,
      volumes60d: r.volumes60d ? JSON.parse(r.volumes60d as string) : null,
      details: r.details ? JSON.parse(r.details as string) : null,
    })),
    marketSummary: {
      totalScanned: marketSummary[0]?.totalScanned ?? 0,
      totalPassed: marketSummary[0]?.totalPassed ?? 0,
      marketScoreC7,
    },
  })
})

// ─── Stock Detail ───

app.get('/api/stock/:symbol', async (c) => {
  const db = getDb(c.env.DB)
  const symbol = c.req.param('symbol')
  const row = await db.select().from(alerts)
    .where(eq(alerts.symbol, symbol))
    .orderBy(desc(alerts.date))
    .limit(1)

  if (!row.length) return c.json({ error: 'Not found' }, 404)

  const r = row[0]!
  return c.json({
    ...r,
    prices60d: r.prices60d ? JSON.parse(r.prices60d as string) : null,
    volumes60d: r.volumes60d ? JSON.parse(r.volumes60d as string) : null,
    details: r.details ? JSON.parse(r.details as string) : null,
  })
})

// ─── History ───

app.get('/api/history', async (c) => {
  const db = getDb(c.env.DB)
  const days = Number(c.req.query('days') ?? 30)

  const rows = await db
    .select({
      date: alerts.date,
      totalAlerts: count(),
      highCount: sql<number>`sum(case when ${alerts.alertLevel} = 'HIGH' then 1 else 0 end)`,
      mediumCount: sql<number>`sum(case when ${alerts.alertLevel} = 'MEDIUM' then 1 else 0 end)`,
      watchCount: sql<number>`sum(case when ${alerts.alertLevel} = 'WATCH' then 1 else 0 end)`,
      avgScore: sql<number>`round(avg(${alerts.sepaScore}), 1)`,
    })
    .from(alerts)
    .groupBy(alerts.date)
    .orderBy(desc(alerts.date))
    .limit(days)

  return c.json({ days, history: rows })
})

// ─── Page Views ───

app.get('/api/views', async (c) => {
  const db = getDb(c.env.DB)
  const today = new Date().toISOString().slice(0, 10)
  const [todayRow, totalRow] = await Promise.all([
    db.select({ count: pageViews.count }).from(pageViews).where(eq(pageViews.date, today)),
    db.select({ total: sql<number>`coalesce(sum(${pageViews.count}), 0)` }).from(pageViews),
  ])
  return c.json({ total: totalRow[0]?.total ?? 0, today: todayRow[0]?.count ?? 0, todayDate: today })
})

app.post('/api/views', async (c) => {
  const db = getDb(c.env.DB)
  const today = new Date().toISOString().slice(0, 10)
  await db.insert(pageViews).values({ date: today, count: 1 })
    .onConflictDoUpdate({ target: pageViews.date, set: { count: sql`${pageViews.count} + 1` } })
  const [totalRow] = await db.select({ total: sql<number>`coalesce(sum(${pageViews.count}), 0)` }).from(pageViews)
  return c.json({ total: totalRow?.total ?? 0, todayDate: today })
})

// ─── Portfolio ───

app.post('/api/portfolio/init', async (c) => {
  const db = getDb(c.env.DB)
  const now = new Date().toISOString()

  await db.update(portfolios).set({ status: 'closed', updatedAt: now }).where(eq(portfolios.status, 'active'))

  const inserted = await db.insert(portfolios).values({
    name: 'VCP Sim',
    initialCap: 100000,
    cashBalance: 100000,
    totalValue: 100000,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }).returning({ id: portfolios.id })

  return c.json({ portfolio: inserted[0] })
})

app.get('/api/portfolio', async (c) => {
  const db = getDb(c.env.DB)
  const port = await db.select().from(portfolios).where(eq(portfolios.status, 'active')).limit(1)
  if (!port.length) return c.json({ portfolio: null, positions: [], snapshot: null })

  const portId = port[0]!.id
  const [openPos, latestSnap] = await Promise.all([
    db.select().from(positions).where(and(eq(positions.portfolioId, portId), eq(positions.status, 'open'))),
    db.select().from(dailySnapshots).where(eq(dailySnapshots.portfolioId, portId)).orderBy(desc(dailySnapshots.date)).limit(1),
  ])

  return c.json({ portfolio: port[0], positions: openPos, snapshot: latestSnap[0] ?? null })
})

app.get('/api/portfolio/snapshots', async (c) => {
  const db = getDb(c.env.DB)
  const days = Math.min(Number(c.req.query('days') ?? 30), 365)
  const port = await db.select().from(portfolios).where(eq(portfolios.status, 'active')).limit(1)
  if (!port.length) return c.json({ snapshots: [] })

  const rows = await db.select().from(dailySnapshots)
    .where(eq(dailySnapshots.portfolioId, port[0]!.id))
    .orderBy(desc(dailySnapshots.date)).limit(days)
  return c.json({ snapshots: rows })
})

app.get('/api/portfolio/trades', async (c) => {
  const db = getDb(c.env.DB)
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 500)
  const port = await db.select().from(portfolios).where(eq(portfolios.status, 'active')).limit(1)
  if (!port.length) return c.json({ trades: [] })

  const rows = await db.select().from(positions)
    .where(and(eq(positions.portfolioId, port[0]!.id), eq(positions.status, 'closed')))
    .orderBy(desc(positions.exitDate)).limit(limit)
  return c.json({ trades: rows })
})

app.post('/api/portfolio/reset', async (c) => {
  const db = getDb(c.env.DB)
  const now = new Date().toISOString()
  const port = await db.select().from(portfolios).where(eq(portfolios.status, 'active')).limit(1)
  if (port.length) {
    await db.update(positions).set({ exitDate: now, exitPrice: sql`${positions.entryPrice}`, exitReason: 'RESET', pnl: 0, pnlPct: 0, status: 'closed' })
      .where(and(eq(positions.portfolioId, port[0]!.id), eq(positions.status, 'open')))
    await db.update(portfolios).set({ status: 'closed', updatedAt: now }).where(eq(portfolios.id, port[0]!.id))
  }

  const inserted = await db.insert(portfolios).values({
    name: 'VCP Sim', initialCap: 100000, cashBalance: 100000, totalValue: 100000,
    status: 'active', createdAt: now, updatedAt: now,
  }).returning({ id: portfolios.id })

  return c.json({ portfolio: inserted[0] })
})

// ─── Trigger Scan ───

app.post('/api/scan/trigger', async (c) => {
  const db = getDb(c.env.DB)
  const symbolRows = await db.select({ symbol: symbols.symbol }).from(symbols).where(eq(symbols.marketId, 'SET'))
  const symbolList = symbolRows.map(r => r.symbol)

  if (symbolList.length === 0) {
    return c.json({ status: 'error', message: 'No symbols found' }, 400)
  }

  const BATCH_SIZE = 5
  const inserted = await db.insert(scanRuns).values({
    date: new Date().toISOString().slice(0, 10),
    marketId: 'SET',
    strategyId: 'vcp-minervini',
    startedAt: new Date().toISOString(),
    status: 'running',
  }).returning({ id: scanRuns.id })

  const scanId = inserted[0]!.id

  for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
    const batch = symbolList.slice(i, i + BATCH_SIZE)
    await c.env.SCAN_QUEUE.send({
      batch,
      marketId: 'SET',
      strategyId: 'vcp-minervini',
      scanId,
      totalSymbols: symbolList.length,
    })
  }

  return c.json({ status: 'queued', message: `Scan started: ${symbolList.length} symbols in ${Math.ceil(symbolList.length / BATCH_SIZE)} batches` })
})

// ─── Queue Consumer ───

interface ScanMessage {
  batch: string[]
  marketId: string
  strategyId: string
  scanId: number
  totalSymbols: number
}

interface SimMessage {
  type: 'simulate'
  date: string
}

async function processBatch(env: Bindings, msg: ScanMessage): Promise<{ scanned: number; passed: number }> {
  const db = getDb(env.DB)
  const { batch, marketId, strategyId, scanId } = msg

  const provider = new YahooFetchProvider()
  const market = SET_MARKET
  const strategy = VcpMinerviniStrategy
  const marketIndex = await provider.fetchMarketIndex(market)

  let scanned = 0
  let passed = 0

  for (const symbol of batch) {
    try {
      const [prices, fundamentals] = await Promise.all([
        provider.fetchPrices(symbol, market, '1y'),
        provider.fetchFundamentals(symbol, market),
      ])

      scanned++

      if (prices.length === 0) continue

      const result = strategy.scan({ symbol, market, prices, fundamentals, marketIndex })

      // ── Trend Template Evaluation ──
      const trendTemplate = evaluateTrendTemplate(prices, fundamentals, marketIndex)

      if (!result.passes || !result.alertLevel) continue
      passed++

      const priceChangePct = prices.length >= 2
        ? ((prices[prices.length - 1]!.close - prices[prices.length - 2]!.close) / prices[prices.length - 2]!.close) * 100
        : null

      const vcp = result.details.vcp
      const sb = result.details.sepaBreakdown
      const recent = prices.slice(-60)
      const closes = prices.map(p => p.close)

      const rsi14 = calcRSI(closes)
      const adx14 = calcADX(prices)
      const atr14 = calcATR(prices)
      const bb = calcBollingerWidth(closes)
      const w52 = calc52WeekHigh(prices)
      const breakout = calcBreakoutStatus(prices)
      const volumeRatio = calcVolumeRatio(recent.map(p => p.volume))

      const pivot = vcp.pivotPrice
      let entryPrice: number | null = null
      let stopPrice: number | null = null
      let targetPrice: number | null = null
      let riskRewardRatio: number | null = null
      let riskPct: number | null = null

      if (pivot != null && pivot > 0 && Number.isFinite(pivot)) {
        const entryZoneHigh = pivot * 1.01
        stopPrice = pivot * 0.92
        const risk = entryZoneHigh - stopPrice
        targetPrice = entryZoneHigh + 3 * risk
        riskPct = ((pivot - stopPrice) / pivot) * 100
        riskRewardRatio = 3.0
        entryPrice = pivot
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
        scoreC1: sb.c1SuperPerf, scoreC2: sb.c2Earnings, scoreC3: sb.c3Catalyst,
        scoreC4: sb.c4Supply, scoreC5: sb.c5Leadership, scoreC6: sb.c6Sponsorship, scoreC7: sb.c7Market,
        breakoutStatus: breakout?.status ?? null,
        breakoutDate: vcp.pivotPrice != null ? calcPivotBreakoutDate(recent, vcp.pivotPrice) : null,
        price52wHigh: breakout?.price52wHigh ?? null,
        revenueGrowthYoy: fundamentals.revenueGrowthYoY,
        epsGrowthYoy: fundamentals.epsGrowthYoY,
        volumeRatio,
        rsi14, adx14,
        bbWidthPct: bb?.bandwidth ?? null,
        entryPrice, stopPrice, targetPrice, riskRewardRatio, riskPct,
        trendTemplateScore: trendTemplate.score,
        prices60d: JSON.stringify(recent.map(p => ({
          date: p.date, open: p.open, high: p.high, low: p.low, close: p.close, volume: p.volume,
        }))),
        volumes60d: null,
        details: JSON.stringify({
          ...result.details,
          trendTemplate,
          technicals: { rsi14, adx14, bbWidth: bb?.bandwidth ?? null, bbPercentB: bb?.percentB ?? null, atr14, high52w: w52?.high52w ?? null, distance52w: w52?.distance ?? null },
          tradePlan: pivot != null ? { entryPrice, entryZoneLow: pivot, entryZoneHigh: pivot * 1.01, stopPrice, targetPrice, riskPct, rewardRiskRatio: riskRewardRatio } : null,
          tags: {
            turnaround: fundamentals.epsGrowthYoY != null && fundamentals.epsGrowthYoY > 0.5,
            blueSky: breakout?.status === 'BLUE_SKY',
            analystBuy: fundamentals.recommendationKey != null && ['buy', 'strong_buy'].includes(fundamentals.recommendationKey),
            highDividend: fundamentals.dividendYield != null && fundamentals.dividendYield > 0.03,
          },
          setup: { vcpPatternLabel: `${vcp.contractions.length}C ${vcp.qualityLabel}`, proximity52wPct: w52?.distance ?? null, breakoutStatus: breakout?.status ?? 'FAR' },
          profile: { longName: fundamentals.longName, sector: fundamentals.sector, industry: fundamentals.industry, dividendYield: fundamentals.dividendYield, recommendationKey: fundamentals.recommendationKey },
          volumeRatio,
        }),
      }

      await db.insert(alerts).values(values).onConflictDoUpdate({
        target: [alerts.date, alerts.symbol, alerts.strategyId, alerts.marketId],
        set: values,
      })
    } catch (err) {
      console.error(`[scanner] ${symbol}: ${err}`)
    }
  }

  // Update scan run progress — atomic with completion check
  const now = new Date().toISOString()
  await db.run(sql`
    UPDATE scan_runs
    SET total_scanned = coalesce(total_scanned, 0) + ${scanned},
        total_passed = coalesce(total_passed, 0) + ${passed},
        status = CASE WHEN coalesce(total_scanned, 0) + ${scanned} >= ${msg.totalSymbols} THEN 'success' ELSE status END,
        finished_at = CASE WHEN coalesce(total_scanned, 0) + ${scanned} >= ${msg.totalSymbols} THEN ${now} ELSE finished_at END
    WHERE id = ${scanId}
  `)

  // Trigger simulation if scan just completed
  const completed = await db.select({ status: scanRuns.status }).from(scanRuns).where(eq(scanRuns.id, scanId)).limit(1)
  if (completed[0]?.status === 'success') {
    const today = new Date().toISOString().slice(0, 10)
    await env.SCAN_QUEUE.send({ type: 'simulate', date: today } as SimMessage)
  }

  return { scanned, passed }
}

// ─── Exports ───

export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Bindings, _ctx: ExecutionContext) {
    const db = getDb(env.DB)
    const symbolRows = await db.select({ symbol: symbols.symbol }).from(symbols).where(eq(symbols.marketId, 'SET'))
    const symbolList = symbolRows.map(r => r.symbol)
    if (symbolList.length === 0) return

    const inserted = await db.insert(scanRuns).values({
      date: new Date().toISOString().slice(0, 10),
      marketId: 'SET',
      strategyId: 'vcp-minervini',
      startedAt: new Date().toISOString(),
      status: 'running',
    }).returning({ id: scanRuns.id })

    const scanId = inserted[0]!.id
    const BATCH_SIZE = 5

    for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
      const batch = symbolList.slice(i, i + BATCH_SIZE)
      await env.SCAN_QUEUE.send({
        batch, marketId: 'SET', strategyId: 'vcp-minervini', scanId,
        totalSymbols: symbolList.length,
      })
    }
  },

  async queue(batch: MessageBatch, env: Bindings, _ctx: ExecutionContext) {
    for (const msg of batch.messages) {
      try {
        const body = msg.body as unknown
        if ((body as SimMessage).type === 'simulate') {
          await simulateEOD(env, (body as SimMessage).date)
        } else {
          await processBatch(env, body as ScanMessage)
        }
        msg.ack()
      } catch (err) {
        console.error('[queue] Batch failed:', err)
        msg.retry()
      }
    }
  },
}
