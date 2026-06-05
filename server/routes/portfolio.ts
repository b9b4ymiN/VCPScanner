import { Hono } from 'hono'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { alerts, dailySnapshots, portfolios, positions } from '../db/schema'

const app = new Hono()

type PositionRow = typeof positions.$inferSelect

async function latestPrice(symbol: string) {
  const rows = await db.select({
    price: alerts.price,
    date: alerts.date,
  }).from(alerts)
    .where(eq(alerts.symbol, symbol))
    .orderBy(desc(alerts.date))
    .limit(1)

  return rows[0] ?? null
}

function holdDays(entryDate: string, endDate?: string | null) {
  const end = endDate ? new Date(endDate) : new Date()
  return Math.max(0, Math.floor((end.getTime() - new Date(entryDate).getTime()) / 86400000))
}

async function enrichOpenPosition(pos: PositionRow) {
  const latest = await latestPrice(pos.symbol)
  const currentPrice = latest?.price ?? pos.entryPrice
  const marketValue = currentPrice * pos.quantity
  const unrealizedPnL = marketValue - pos.costBasis
  const unrealizedPnLPct = pos.costBasis > 0 ? (unrealizedPnL / pos.costBasis) * 100 : 0

  return {
    ...pos,
    currentPrice,
    currentDate: latest?.date ?? null,
    marketValue,
    unrealizedPnL,
    unrealizedPnLPct,
    holdDays: holdDays(pos.entryDate),
    priceSource: latest ? 'latest-alert' : 'entry-fallback',
  }
}

function enrichClosedPosition(pos: PositionRow) {
  const exitPrice = pos.exitPrice ?? pos.entryPrice
  const marketValue = exitPrice * pos.quantity
  const realizedPnL = pos.pnl ?? marketValue - pos.costBasis
  const realizedPnLPct = pos.pnlPct ?? (pos.costBasis > 0 ? (realizedPnL / pos.costBasis) * 100 : 0)

  return {
    ...pos,
    marketValue,
    realizedPnL,
    realizedPnLPct,
    holdDays: holdDays(pos.entryDate, pos.exitDate),
  }
}

async function getActivePortfolio() {
  const rows = await db.select().from(portfolios).where(eq(portfolios.status, 'active')).limit(1)
  return rows[0] ?? null
}

app.post('/init', async (c) => {
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

app.get('/', async (c) => {
  const portfolio = await getActivePortfolio()
  if (!portfolio) return c.json({ portfolio: null, positions: [], snapshot: null, summary: null })

  const [openPositions, latestSnap] = await Promise.all([
    db.select().from(positions)
      .where(and(eq(positions.portfolioId, portfolio.id), eq(positions.status, 'open'))),
    db.select().from(dailySnapshots)
      .where(eq(dailySnapshots.portfolioId, portfolio.id))
      .orderBy(desc(dailySnapshots.date))
      .limit(1),
  ])

  const enrichedPositions = await Promise.all(openPositions.map(enrichOpenPosition))
  const positionsValue = enrichedPositions.reduce((sum, pos) => sum + pos.marketValue, 0)
  const totalValue = portfolio.cashBalance + positionsValue
  const totalPnL = totalValue - portfolio.initialCap
  const totalPnLPct = portfolio.initialCap > 0 ? (totalPnL / portfolio.initialCap) * 100 : 0
  const openUnrealizedPnL = enrichedPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
  const costBasis = enrichedPositions.reduce((sum, pos) => sum + pos.costBasis, 0)

  const normalizedPortfolio = {
    ...portfolio,
    totalValue,
    totalPnL,
    totalPnLPct,
  }

  await db.update(portfolios).set({
    totalValue,
    totalPnL,
    totalPnLPct,
    updatedAt: new Date().toISOString(),
  }).where(eq(portfolios.id, portfolio.id))

  return c.json({
    portfolio: normalizedPortfolio,
    positions: enrichedPositions,
    snapshot: latestSnap[0] ?? null,
    summary: {
      initialCap: portfolio.initialCap,
      cashBalance: portfolio.cashBalance,
      positionsValue,
      totalValue,
      totalPnL,
      totalPnLPct,
      openUnrealizedPnL,
      costBasis,
      openCount: enrichedPositions.length,
    },
  })
})

app.get('/snapshots', async (c) => {
  const days = Math.min(Number(c.req.query('days') ?? 30), 365)
  const portfolio = await getActivePortfolio()
  if (!portfolio) return c.json({ snapshots: [] })

  const rows = await db.select().from(dailySnapshots)
    .where(eq(dailySnapshots.portfolioId, portfolio.id))
    .orderBy(desc(dailySnapshots.date))
    .limit(days)

  return c.json({ snapshots: rows })
})

app.get('/trades', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 500)
  const portfolio = await getActivePortfolio()
  if (!portfolio) return c.json({ trades: [] })

  const rows = await db.select().from(positions)
    .where(and(eq(positions.portfolioId, portfolio.id), eq(positions.status, 'closed')))
    .orderBy(desc(positions.exitDate))
    .limit(limit)

  return c.json({ trades: rows.map(enrichClosedPosition) })
})

app.post('/reset', async (c) => {
  const now = new Date().toISOString()
  const portfolio = await getActivePortfolio()
  if (portfolio) {
    await db.update(positions)
      .set({
        exitDate: now,
        exitPrice: sql`${positions.entryPrice}`,
        exitReason: 'RESET',
        pnl: 0,
        pnlPct: 0,
        status: 'closed',
      })
      .where(and(eq(positions.portfolioId, portfolio.id), eq(positions.status, 'open')))
    await db.update(portfolios).set({ status: 'closed', updatedAt: now }).where(eq(portfolios.id, portfolio.id))
  }

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

export default app
