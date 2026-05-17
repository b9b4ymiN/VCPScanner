import { Hono } from 'hono'
import { db } from '../db/client'
import { alerts } from '../db/schema'
import { gte, desc, sql } from 'drizzle-orm'

const app = new Hono()

app.get('/', async (c) => {
  const days = Math.min(Number(c.req.query('days') ?? 30), 90)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const startDate = cutoff.toISOString().slice(0, 10)

  const history = await db.select({
    date: alerts.date,
    totalAlerts: sql<number>`count(*)`,
    highCount: sql<number>`sum(case when ${alerts.alertLevel} = 'HIGH' then 1 else 0 end)`,
    mediumCount: sql<number>`sum(case when ${alerts.alertLevel} = 'MEDIUM' then 1 else 0 end)`,
    watchCount: sql<number>`sum(case when ${alerts.alertLevel} = 'WATCH' then 1 else 0 end)`,
    avgScore: sql<number>`round(avg(${alerts.sepaScore}), 1)`,
  }).from(alerts)
    .where(gte(alerts.date, startDate))
    .groupBy(alerts.date)
    .orderBy(desc(alerts.date))

  return c.json({ days, history })
})

export default app
