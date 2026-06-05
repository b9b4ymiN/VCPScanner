import { runScan, type ScanOptions } from './scanner'
import { simulateEOD } from '../simulation'

let isRunning = false

export function startScheduler(options: ScanOptions): void {
  console.log('[scheduler] Started — EOD scan at 16:30 Mon-Fri (Bangkok)')

  // Check every 60s if it's time to run
  setInterval(() => {
    if (isRunning) return

    const now = new Date()
    const bangkok = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
    const h = bangkok.getHours()
    const m = bangkok.getMinutes()
    const dow = bangkok.getDay()

    // EOD scan: 16:30 Mon–Fri
    if (h === 16 && m === 30 && dow >= 1 && dow <= 5) {
      triggerScan(options)
    }

    // Cleanup: 04:00 daily
    if (h === 4 && m === 0) {
      cleanupOldAlerts()
    }
  }, 60_000)
}

export async function triggerScan(options: ScanOptions): Promise<void> {
  if (isRunning) {
    console.log('[scheduler] Scan already running, skipping')
    return
  }
  isRunning = true
  try {
    await runScan(options)
    await simulateEOD(new Date().toISOString().slice(0, 10))
  } catch {
    // already logged in scanner
  } finally {
    isRunning = false
  }
}

export function getSchedulerStatus(): { isRunning: boolean } {
  return { isRunning }
}

async function cleanupOldAlerts(): Promise<void> {
  const { db } = await import('../db/client')
  const { alerts } = await import('../db/schema')
  const { sql } = await import('drizzle-orm')

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  await db.delete(alerts).where(sql`${alerts.date} < ${cutoffStr}`)
  console.log(`[scheduler] Cleaned up alerts before ${cutoffStr}`)
}
