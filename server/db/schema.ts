import { sqliteTable, text, real, integer, index, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Markets ───

export const markets = sqliteTable('markets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  currency: text('currency').notNull(),
  timezone: text('timezone').notNull(),
})

// ─── Symbols ───

export const symbols = sqliteTable('symbols', {
  symbol: text('symbol').notNull(),
  marketId: text('market_id')
    .notNull()
    .references(() => markets.id),
  name: text('name'),
  sector: text('sector'),
  active: integer('active', { mode: 'boolean' }).default(true),
}, t => ({
  pk: primaryKey({ columns: [t.symbol, t.marketId] }),
}))

// ─── Alerts ───

export const alerts = sqliteTable('alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  symbol: text('symbol').notNull(),
  name: text('name'),
  sector: text('sector'),
  marketId: text('market_id').notNull(),
  strategyId: text('strategy_id').notNull(),

  sepaScore: real('sepa_score').notNull(),
  alertLevel: text('alert_level').notNull(),
  price: real('price').notNull(),
  priceChangePct: real('price_change_pct'),

  vcpQuality: text('vcp_quality'),
  vcpQualityScore: integer('vcp_quality_score'),
  vcpContractions: text('vcp_contractions'),
  vcpVolDrying: integer('vcp_vol_drying', { mode: 'boolean' }),
  pivotPrice: real('pivot_price'),
  pivotDistancePct: real('pivot_distance_pct'),

  scoreC1: real('score_c1'),
  scoreC2: real('score_c2'),
  scoreC3: real('score_c3'),
  scoreC4: real('score_c4'),
  scoreC5: real('score_c5'),
  scoreC6: real('score_c6'),
  scoreC7: real('score_c7'),
  trendTemplateScore: integer('trend_template_score'),

  // Enriched data — Layer 1 (visible in table)
  breakoutStatus: text('breakout_status'),
  breakoutDate: text('breakout_date'),
  price52wHigh: real('price_52w_high'),
  revenueGrowthYoy: real('revenue_growth_yoy'),
  epsGrowthYoy: real('eps_growth_yoy'),
  volumeRatio: real('volume_ratio'),

  // Enriched data — Layer 2 (detail panel)
  rsi14: real('rsi_14'),
  adx14: real('adx_14'),
  bbWidthPct: real('bb_width_pct'),
  entryPrice: real('entry_price'),
  stopPrice: real('stop_price'),
  targetPrice: real('target_price'),
  riskRewardRatio: real('risk_reward_ratio'),
  riskPct: real('risk_pct'),

  prices60d: text('prices_60d'),
  volumes60d: text('volumes_60d'),
  details: text('details'),

  createdAt: text('created_at').default(sql`(datetime('now','localtime'))`),
}, t => ({
  uniqDateSymbolStrategy: uniqueIndex('uniq_date_sym_strat').on(
    t.date, t.symbol, t.strategyId, t.marketId,
  ),
  idxDate: index('idx_date').on(t.date),
  idxSymbol: index('idx_symbol').on(t.symbol),
  idxLevel: index('idx_level').on(t.alertLevel),
  idxScore: index('idx_score').on(t.sepaScore),
  idxTtScore: index('idx_tt_score').on(t.trendTemplateScore),
}))

// ─── Scan Runs ───

export const scanRuns = sqliteTable('scan_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  marketId: text('market_id').notNull(),
  strategyId: text('strategy_id').notNull(),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  totalScanned: integer('total_scanned'),
  totalPassed: integer('total_passed'),
  status: text('status'),
  errorMsg: text('error_msg'),
})

// ─── Price Cache ───

export const priceCache = sqliteTable('price_cache', {
  symbol: text('symbol').notNull(),
  marketId: text('market_id').notNull(),
  date: text('date').notNull(),
  open: real('open'),
  high: real('high'),
  low: real('low'),
  close: real('close'),
  volume: integer('volume'),
  fetchedAt: text('fetched_at').notNull(),
}, t => ({
  pk: primaryKey({ columns: [t.symbol, t.marketId, t.date] }),
}))
