import { Hono } from 'hono'
import { db } from '../db/client'
import { alerts, scanRuns } from '../db/schema'
import { eq, gte, desc, and, count } from 'drizzle-orm'

const app = new Hono()

app.get('/', async (c) => {
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
    ? and(
        eq(alerts.date, date),
        gte(alerts.sepaScore, minScore),
        eq(alerts.alertLevel, level.toUpperCase()),
      )
    : and(eq(alerts.date, date), gte(alerts.sepaScore, minScore))

  if (ttMin) {
    conditions = and(conditions, gte(alerts.trendTemplateScore, Number(ttMin)))
  }

  const [rows, countResult, marketSummary] = await Promise.all([
    db.select().from(alerts)
      .where(conditions)
      .orderBy(desc(alerts.sepaScore))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(alerts).where(conditions),
    db.select({
      totalScanned: scanRuns.totalScanned,
      totalPassed: scanRuns.totalPassed,
    }).from(scanRuns)
      .where(eq(scanRuns.status, 'success'))
      .orderBy(desc(scanRuns.id))
      .limit(1),
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

export default app
