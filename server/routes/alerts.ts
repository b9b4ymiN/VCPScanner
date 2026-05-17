import { Hono } from 'hono'
import { db } from '../db/client'
import { alerts } from '../db/schema'
import { eq, gte, desc, and, count, sql } from 'drizzle-orm'

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

  const conditions = level
    ? and(
        eq(alerts.date, date),
        gte(alerts.sepaScore, minScore),
        eq(alerts.alertLevel, level.toUpperCase()),
      )
    : and(eq(alerts.date, date), gte(alerts.sepaScore, minScore))

  const [rows, countResult] = await Promise.all([
    db.select().from(alerts)
      .where(conditions)
      .orderBy(desc(alerts.sepaScore))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(alerts).where(conditions),
  ])

  return c.json({ date, total: countResult[0]?.total ?? 0, alerts: rows })
})

export default app
