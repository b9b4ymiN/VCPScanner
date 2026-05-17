// Seed SET symbols into the database
// Usage: bun run scripts/seed-symbols.ts

import { db } from '../server/db/client'
import { symbols, markets } from '../server/db/schema'

const SET_SYMBOLS = [
  'PTT', 'AOT', 'CPALL', 'BANPU', 'DELTA', 'SCC', 'KBANK', 'SCB',
  'ADVANC', 'TRUE', 'BDMS', 'BH', 'CPF', 'CPN', 'DTAC', 'EGCO',
  'GLOBAL', 'HMPRO', 'INTUCH', 'IRPC', 'IVL', 'KCE', 'KRUNGTHAI',
  'LH', 'MINT', 'PLANB', 'PSL', 'PTTGC', 'PTTEP', 'RATCH',
  'ROBINS', 'SIRI', 'SPRC', 'TISCO', 'TOA', 'TOP', 'TPIPP',
  'TU', 'VGI', 'WHA', 'BBL', 'BCP', 'BEM', 'BJC', 'CK',
  'CKP', 'COM7', 'DOHOME', 'EA', 'GPSC', 'GULF', 'HAH', 'JMT',
  'KTB', 'LHHOTEL', 'MAJOR', 'MEGA', 'MTC', 'ORI', 'PRM',
  'SAMART', 'SAPPE', 'SF', 'SPALI', 'STEC', 'SYNTEC', 'TCAP',
  'THANI', 'TMB', 'TTW', 'UMG', 'VIBHA', 'AP', 'A5', 'AAV',
  'AMANAH', 'ANC', 'ASP', 'BAM', 'BIS', 'BPP', 'BTS', 'CENTEL',
  'CHG', 'CMO', 'COCO', 'CPAXT', 'DIF', 'ERW', 'FORTH', 'GFJ',
  'GOLD', 'HHH', 'HYDRO', 'ICHI', 'JAS', 'KAMART', 'KGI',
  'KWC', 'M', 'MACO', 'MATCH', 'MBK', 'MEGA', 'MONO', 'MUSIC',
  'NEX', 'ONEE', 'OXY', 'PHG', 'PM', 'POSH', 'PR9', 'QH',
  'RML', 'RS', 'S', 'SAK', 'SAM', 'SBC', 'SGP', 'SJWD',
  'SMIT', 'SNNP', 'SPG', 'SPR', 'SSC', 'SSP', 'STA', 'STARK',
  'SUTHA', 'SYMC', 'TAS', 'THCOM', 'TKN', 'TNITY', 'TSE',
  'TVH', 'TVI', 'TW', 'UPF', 'VK', 'W', 'WICE', 'WLK',
  'WPI', 'XPG', 'ZEN',
]

async function seed(): Promise<void> {
  console.log(`[seed] Seeding ${SET_SYMBOLS.length} SET symbols...`)

  await db.insert(markets).values({
    id: 'SET',
    name: 'Stock Exchange of Thailand',
    currency: 'THB',
    timezone: 'Asia/Bangkok',
  }).onConflictDoNothing()

  let inserted = 0
  for (const symbol of SET_SYMBOLS) {
    await db.insert(symbols).values({
      symbol,
      marketId: 'SET',
      active: true,
    }).onConflictDoUpdate({
      target: [symbols.symbol, symbols.marketId],
      set: { active: true },
    })
    inserted++
  }

  console.log(`[seed] Done: ${inserted} symbols upserted`)
}

seed().catch((err: unknown) => {
  console.error('[seed] Failed:', err)
  process.exit(1)
})
