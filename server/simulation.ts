import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from './db/client'
import { alerts, dailySnapshots, portfolios, positions } from './db/schema'
import { getBoardLot } from './board-lot'

export async function simulateEOD(today: string): Promise<void> {
  const portfolio = await db.select().from(portfolios)
    .where(eq(portfolios.status, 'active')).limit(1)
  if (!portfolio.length) return
  const port = portfolio[0]!

  const existing = await db.select().from(dailySnapshots)
    .where(and(eq(dailySnapshots.portfolioId, port.id), eq(dailySnapshots.date, today))).limit(1)
  if (existing.length) return

  const openPositions = await db.select().from(positions)
    .where(and(eq(positions.portfolioId, port.id), eq(positions.status, 'open')))

  let cashBalance = port.cashBalance
  let closedToday = 0

  for (const pos of openPositions) {
    const calendarDays = Math.floor(
      (new Date(today).getTime() - new Date(pos.entryDate).getTime()) / 86400000,
    )

    const alertRow = await db.select({ price: alerts.price }).from(alerts)
      .where(and(eq(alerts.symbol, pos.symbol), eq(alerts.date, today))).limit(1)
    const currentPrice = alertRow[0]?.price ?? null

    let shouldExit = false
    let exitPrice = pos.entryPrice
    let exitReason = 'TIME'

    if (currentPrice !== null) {
      if (currentPrice <= pos.stopPrice) {
        shouldExit = true
        exitPrice = currentPrice
        exitReason = 'SL'
      } else if (currentPrice >= pos.targetPrice) {
        shouldExit = true
        exitPrice = currentPrice
        exitReason = 'TP'
      }
    }

    if (!shouldExit && calendarDays >= 14) {
      if (currentPrice !== null) {
        shouldExit = true
        exitPrice = currentPrice
      } else {
        const lastAlert = await db.select({ price: alerts.price }).from(alerts)
          .where(eq(alerts.symbol, pos.symbol)).orderBy(desc(alerts.date)).limit(1)
        shouldExit = true
        exitPrice = lastAlert[0]?.price ?? pos.entryPrice
      }
      exitReason = 'TIME'
    }

    if (shouldExit) {
      const pnl = (exitPrice - pos.entryPrice) * pos.quantity
      const pnlPct = ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100
      await db.update(positions).set({
        exitDate: today,
        exitPrice,
        exitReason,
        pnl,
        pnlPct,
        status: 'closed',
      }).where(eq(positions.id, pos.id))
      cashBalance += exitPrice * pos.quantity
      closedToday++
    }
  }

  const remainingOpen = await db.select().from(positions)
    .where(and(eq(positions.portfolioId, port.id), eq(positions.status, 'open')))
  const heldSymbols = new Set(remainingOpen.map(p => p.symbol))
  const slotsAvailable = 5 - remainingOpen.length

  if (slotsAvailable > 0) {
    const excludeConditions = Array.from(heldSymbols).map(s => sql`${alerts.symbol} != ${s}`)
    const candidates = await db.select().from(alerts)
      .where(and(
        eq(alerts.date, today),
        gte(alerts.sepaScore, 60),
        sql`${alerts.pivotPrice} IS NOT NULL`,
        ...excludeConditions,
      ))
      .orderBy(desc(alerts.sepaScore))
      .limit(slotsAvailable)

    for (const c of candidates) {
      if (c.pivotPrice == null) continue

      const allocation = cashBalance / slotsAvailable
      const lotSize = getBoardLot(c.price)
      const quantity = Math.floor(allocation / c.price / lotSize) * lotSize
      if (quantity <= 0) continue

      const cost = c.price * quantity
      if (cost > cashBalance) continue

      const pivot = c.pivotPrice
      const fallbackStop = pivot * 0.92
      const fallbackTarget = pivot * 1.01 + 3 * (pivot * 1.01 - pivot * 0.92)
      await db.insert(positions).values({
        portfolioId: port.id,
        symbol: c.symbol,
        entryDate: today,
        entryPrice: c.price,
        stopPrice: c.stopPrice ?? fallbackStop,
        targetPrice: c.targetPrice ?? fallbackTarget,
        pivotPrice: pivot,
        quantity,
        costBasis: cost,
        status: 'open',
        sepaScore: c.sepaScore ?? null,
        vcpQuality: c.vcpQuality ?? null,
        createdAt: new Date().toISOString(),
      })
      cashBalance -= cost
    }
  }

  const allOpen = await db.select({
    symbol: positions.symbol,
    quantity: positions.quantity,
    entryPrice: positions.entryPrice,
  }).from(positions)
    .where(and(eq(positions.portfolioId, port.id), eq(positions.status, 'open')))

  let positionsValue = 0
  for (const pos of allOpen) {
    const todayAlert = await db.select({ price: alerts.price }).from(alerts)
      .where(and(eq(alerts.symbol, pos.symbol), eq(alerts.date, today))).limit(1)
    const price = todayAlert[0]?.price ?? pos.entryPrice
    positionsValue += price * pos.quantity
  }

  const totalValue = cashBalance + positionsValue
  const yesterday = await db.select().from(dailySnapshots)
    .where(eq(dailySnapshots.portfolioId, port.id))
    .orderBy(desc(dailySnapshots.date)).limit(1)
  const yesterdayTotal = yesterday[0]?.totalValue ?? port.initialCap
  const dailyPnL = totalValue - yesterdayTotal
  const dailyPnLPct = yesterdayTotal > 0 ? (dailyPnL / yesterdayTotal) * 100 : 0

  await db.insert(dailySnapshots).values({
    portfolioId: port.id,
    date: today,
    cashBalance,
    positionsValue,
    totalValue,
    dailyPnL,
    dailyPnLPct,
    openCount: allOpen.length,
    closedCount: closedToday,
  }).onConflictDoNothing()

  const totalPnL = totalValue - port.initialCap
  const totalPnLPct = port.initialCap > 0 ? (totalPnL / port.initialCap) * 100 : 0
  await db.update(portfolios).set({
    cashBalance,
    totalValue,
    totalPnL,
    totalPnLPct,
    updatedAt: new Date().toISOString(),
  }).where(eq(portfolios.id, port.id))
}
