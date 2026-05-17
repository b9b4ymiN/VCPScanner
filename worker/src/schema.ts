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
  vcpVolDrying: integer('vol_drying', { mode: 'boolean' }),
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

  // Enriched data — Layer 1
  breakoutStatus: text('breakout_status'),
  breakoutDate: text('breakout_date'),
  price52wHigh: real('price_52w_high'),
  revenueGrowthYoy: real('revenue_growth_yoy'),
  epsGrowthYoy: real('eps_growth_yoy'),
  volumeRatio: real('volume_ratio'),

  // Enriched data — Layer 2
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

// ─── Page Views ───

export const pageViews = sqliteTable('page_views', {
  date: text('date').notNull(),
  count: integer('count').notNull().default(0),
}, t => ({
  pk: primaryKey({ columns: [t.date] }),
}))

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

// ─── Portfolio Simulation ───

export const portfolios = sqliteTable('portfolios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().default('VCP Sim'),
  initialCap: real('initial_cap').notNull().default(100000),
  cashBalance: real('cash_balance').notNull(),
  totalValue: real('total_value').notNull(),
  totalPnL: real('total_pnl').notNull().default(0),
  totalPnLPct: real('total_pnl_pct').notNull().default(0),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, t => ({
  idxStatus: index('idx_portfolios_status').on(t.status),
}))

export const positions = sqliteTable('positions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  portfolioId: integer('portfolio_id').notNull().references(() => portfolios.id),
  symbol: text('symbol').notNull(),
  entryDate: text('entry_date').notNull(),
  entryPrice: real('entry_price').notNull(),
  stopPrice: real('stop_price').notNull(),
  targetPrice: real('target_price').notNull(),
  pivotPrice: real('pivot_price').notNull(),
  quantity: integer('quantity').notNull(),
  costBasis: real('cost_basis').notNull(),
  exitDate: text('exit_date'),
  exitPrice: real('exit_price'),
  exitReason: text('exit_reason'),
  pnl: real('pnl'),
  pnlPct: real('pnl_pct'),
  status: text('status').notNull().default('open'),
  sepaScore: integer('sepa_score'),
  vcpQuality: text('vcp_quality'),
  createdAt: text('created_at').notNull(),
}, t => ({
  idxPortfolioStatus: index('idx_positions_portfolio_status').on(t.portfolioId, t.status),
  idxPortfolioSymbolStatus: index('idx_positions_portfolio_symbol_status').on(t.portfolioId, t.symbol, t.status),
}))

export const dailySnapshots = sqliteTable('daily_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  portfolioId: integer('portfolio_id').notNull().references(() => portfolios.id),
  date: text('date').notNull(),
  cashBalance: real('cash_balance').notNull(),
  positionsValue: real('positions_value').notNull(),
  totalValue: real('total_value').notNull(),
  dailyPnL: real('daily_pnl').notNull(),
  dailyPnLPct: real('daily_pnl_pct').notNull(),
  openCount: integer('open_count').notNull(),
  closedCount: integer('closed_count').notNull().default(0),
}, t => ({
  uniqPortfolioDate: uniqueIndex('idx_daily_snapshots_portfolio_date').on(t.portfolioId, t.date),
}))
