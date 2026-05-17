import { Hono } from 'hono'
import { triggerScan } from '../core/scheduler'
import { SET } from '../markets/set'
import { YahooProvider } from '../providers/yahoo'
import { VcpMinerviniStrategy } from '../strategies/vcp-minervini'

const SCAN_OPTIONS = {
  market: SET,
  strategy: VcpMinerviniStrategy,
  provider: new YahooProvider(),
}

const app = new Hono()

app.post('/trigger', async (c) => {
  // Fire-and-forget scan
  triggerScan(SCAN_OPTIONS).catch(err => console.error('[scan-route]', err))
  return c.json({ status: 'queued', message: 'Scan started in background' })
})

export { SCAN_OPTIONS, app as scanRoutes }
