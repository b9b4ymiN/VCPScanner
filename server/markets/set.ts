import type { Market } from '../core/types'

export const SET: Market = {
  id: 'SET',
  name: 'Stock Exchange of Thailand',
  currency: 'THB',
  yahooSuffix: '.BK',
  timezone: 'Asia/Bangkok',
  marketClose: '16:30',
  preFilter: {
    minPrice: 2.0,
    minAvgVol: 200_000,
    minHistory: 60,
  },

  async symbols(): Promise<string[]> {
    const { db } = await import('../db/client')
    const { symbols } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    const rows = await db.select({ symbol: symbols.symbol }).from(symbols).where(eq(symbols.marketId, 'SET'))
    return rows.map(r => r.symbol)
  },
}
