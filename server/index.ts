import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { startScheduler, getSchedulerStatus } from './core/scheduler'
import { SCAN_OPTIONS } from './routes/scan'
import alertsRoutes from './routes/alerts'
import stockRoutes from './routes/stock'
import historyRoutes from './routes/history'
import { scanRoutes } from './routes/scan'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST'],
}))

// ─── API Routes ───

app.route('/api/alerts', alertsRoutes)
app.route('/api/stock', stockRoutes)
app.route('/api/history', historyRoutes)
app.route('/api/scan', scanRoutes)

app.get('/api/status', async (c) => {
  const { db } = await import('./db/client')
  const { scanRuns } = await import('./db/schema')
  const { desc } = await import('drizzle-orm')

  const lastScan = await db.select().from(scanRuns)
    .orderBy(desc(scanRuns.id))
    .limit(1)

  return c.json({
    status: 'ok',
    version: '0.2.0',
    scheduler: getSchedulerStatus(),
    lastScan: lastScan[0] ?? null,
    timestamp: new Date().toISOString(),
  })
})

// ─── Static files (frontend build) ───

app.use('/*', serveStatic({ root: './web/dist' }))

// ─── Start server + scheduler ───

const port = Number(process.env.PORT ?? 8765)

startScheduler(SCAN_OPTIONS)

console.log(`[server] VCP Scanner starting on port ${port}`)

export default {
  port,
  fetch: app.fetch,
}
