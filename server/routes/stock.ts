import { Hono } from 'hono'
import { db } from '../db/client'
import { alerts } from '../db/schema'
import { eq, and } from 'drizzle-orm'

const app = new Hono()

app.get('/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase()
  const date = c.req.query('date') ?? new Date().toISOString().slice(0, 10)

  const row = await db.select().from(alerts)
    .where(and(eq(alerts.symbol, symbol), eq(alerts.date, date)))
    .limit(1)

  if (row.length === 0) {
    return c.json({ error: `No data for ${symbol} on ${date}` }, 404)
  }

  const alert = row[0]!

  // Parse JSON fields
  return c.json({
    ...alert,
    prices60d: alert.prices60d ? JSON.parse(alert.prices60d) : [],
    volumes60d: alert.volumes60d ? JSON.parse(alert.volumes60d) : [],
    details: alert.details ? JSON.parse(alert.details) : null,
  })
})

export default app
