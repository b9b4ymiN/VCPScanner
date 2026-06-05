import { type ReactNode, useState } from 'react'
import {
  ArrowCounterClockwise,
  ChartLineUp,
  ShieldCheck,
  TrendUp,
} from '@phosphor-icons/react'
import { usePortfolio, useInitPortfolio, useResetPortfolio, useSnapshots, useTrades } from '../api/hooks'
import type { Position } from '../api/types'
import { formatPrice, formatPct, changeColor, formatDate } from '../lib/format'
import { EmptyState } from './EmptyState'
import styles from './PortfolioView.module.css'

type SubTab = 'positions' | 'trades'

export function PortfolioView() {
  const [subTab, setSubTab] = useState<SubTab>('positions')
  const { data: portData, isLoading } = usePortfolio()
  const initMut = useInitPortfolio()
  const resetMut = useResetPortfolio()
  const { data: snapData } = useSnapshots(60)
  const { data: tradesData } = useTrades(100)

  if (isLoading) {
    return (
      <div className={styles.loading}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ width: '100%', height: 48 }} />
        ))}
      </div>
    )
  }

  const { portfolio, positions, summary } = portData ?? { portfolio: null, positions: [], summary: null }
  const snapshots = snapData?.snapshots ?? []
  const trades = tradesData?.trades ?? []

  if (!portfolio) {
    return (
      <div className={styles.wrapper}>
        <EmptyState
          title="No active portfolio"
          subtitle="Initialize a simulated portfolio with ฿100,000 starting capital"
        />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={() => initMut.mutate()}
            disabled={initMut.isPending}
          >
            {initMut.isPending ? 'Creating...' : 'Initialize Portfolio'}
          </button>
        </div>
      </div>
    )
  }

  const pnlColor = changeColor(portfolio.totalPnLPct)
  const isProfit = portfolio.totalPnL >= 0
  const investedCapital = summary?.costBasis ?? positions.reduce((sum, pos) => sum + pos.costBasis, 0)
  const exposurePct = portfolio.totalValue > 0 ? (investedCapital / portfolio.totalValue) * 100 : 0
  const cashPct = portfolio.totalValue > 0 ? (portfolio.cashBalance / portfolio.totalValue) * 100 : 0
  const openRisk = positions.reduce((sum, pos) => {
    const riskPerShare = Math.max(pos.entryPrice - pos.stopPrice, 0)
    return sum + riskPerShare * pos.quantity
  }, 0)
  const openRiskPct = portfolio.totalValue > 0 ? (openRisk / portfolio.totalValue) * 100 : 0
  const closedTrades = trades.filter(t => t.exitReason)
  const winners = closedTrades.filter(t => (t.pnl ?? 0) > 0).length
  const winRate = closedTrades.length > 0 ? (winners / closedTrades.length) * 100 : null
  const riskTone = openRiskPct <= 3 ? 'Controlled'
    : openRiskPct <= 6 ? 'Elevated'
    : 'Defensive'
  const hasEnrichedPrices = positions.some(pos => pos.currentPrice != null)
  const holdingsValue = summary?.positionsValue ?? portfolio.totalValue - portfolio.cashBalance
  const derivedOpenPnL = portfolio.totalValue - portfolio.cashBalance - investedCapital
  const openUnrealizedPnL = summary?.openUnrealizedPnL
    ?? (hasEnrichedPrices ? positions.reduce((sum, pos) => sum + (getPositionPnL(pos) ?? 0), 0) : derivedOpenPnL)
  const pricedDate = getLatestPricedDate(positions, snapshots[0]?.date ?? null)

  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>Minervini Portfolio Simulation</div>
          <h2 className={styles.title}>Protect capital. Compound only from strength.</h2>
          <p className={styles.subtitle}>
            Started with {formatMoney(portfolio.initialCap)}. Current value is {formatMoney(portfolio.totalValue)}
            {' '}with total P&L {formatMoney(portfolio.totalPnL)} ({formatPct(portfolio.totalPnLPct)}).
            {pricedDate ? ` Prices as of ${formatDate(pricedDate)}.` : ''}
          </p>
        </div>
        <div className={styles.heroValue}>
          <span className={styles.heroLabel}>Total Equity</span>
          <strong>{formatMoney(portfolio.totalValue)}</strong>
          <span className={isProfit ? styles.heroGain : styles.heroLoss}>
            {formatMoney(portfolio.totalPnL)} {formatPct(portfolio.totalPnLPct)}
          </span>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.actionBtn}
            onClick={() => resetMut.mutate()}
            disabled={resetMut.isPending}
            title="Reset portfolio simulation"
          >
            <ArrowCounterClockwise size={15} weight="bold" />
            <span>{resetMut.isPending ? 'Resetting' : 'Reset'}</span>
          </button>
        </div>
      </section>

      <div className={styles.statsGrid}>
        <MetricCard
          icon={<ChartLineUp size={18} weight="duotone" />}
          label="Portfolio Value"
          value={formatMoney(portfolio.totalValue)}
          subValue={`Start ${formatMoney(portfolio.initialCap)}`}
        />
        <MetricCard
          icon={<ChartLineUp size={18} weight="duotone" />}
          label="Total Gain / Loss"
          value={formatMoney(portfolio.totalPnL)}
          subValue={`${formatPct(portfolio.totalPnLPct)} since start`}
          tone={pnlColor}
        />
        <MetricCard
          icon={<TrendUp size={18} weight="duotone" />}
          label="Stock Holdings Value"
          value={formatMoney(holdingsValue)}
          subValue={`${exposurePct.toFixed(1)}% of portfolio`}
        />
        <MetricCard
          icon={<TrendUp size={18} weight="duotone" />}
          label="Open Position P&L"
          value={formatMoney(openUnrealizedPnL)}
          subValue={`${positions.length} open positions`}
          tone={changeColor(openUnrealizedPnL)}
        />
        <MetricCard
          icon={<ShieldCheck size={18} weight="duotone" />}
          label="Open Risk"
          value={formatMoney(openRisk)}
          subValue={`${openRiskPct.toFixed(2)}% of equity - ${riskTone}`}
          tone={openRiskPct <= 3 ? 'var(--green-400)' : openRiskPct <= 6 ? 'var(--yellow-400)' : 'var(--red-400)'}
        />
      </div>

      <section className={styles.dashboardGrid}>
        <div className={styles.equitySection}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionKicker}>Equity Curve</div>
              <h3 className={styles.sectionTitle}>{snapshots.length} day performance path</h3>
            </div>
            <span className={isProfit ? styles.statusPillPositive : styles.statusPillNegative}>
              {isProfit ? 'Above start' : 'Below start'}
            </span>
          </div>
          {snapshots.length < 2 ? (
            <div className={styles.noData}>Need at least 2 days of data to show curve</div>
          ) : (
            <EquityCurve snapshots={snapshots} initialCap={portfolio.initialCap} />
          )}
        </div>

        <aside className={styles.disciplinePanel}>
          <div className={styles.sectionKicker}>Execution Readiness</div>
          <h3 className={styles.sectionTitle}>Capital rules</h3>
          <div className={styles.ruleList}>
            <RuleItem label="Initial capital" value={formatMoney(portfolio.initialCap)} />
            <RuleItem label="Closed trade win rate" value={winRate == null ? '-' : `${winRate.toFixed(0)}%`} />
            <RuleItem label="Market exposure" value={`${exposurePct.toFixed(1)}%`} />
            <RuleItem label="Cash balance" value={`${formatMoney(portfolio.cashBalance)} (${cashPct.toFixed(1)}%)`} />
            <RuleItem label="Risk status" value={riskTone} />
          </div>
        </aside>
      </section>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${subTab === 'positions' ? styles.tabActive : ''}`}
          onClick={() => setSubTab('positions')}
        >
          Open Positions ({positions.length})
        </button>
        <button
          className={`${styles.tab} ${subTab === 'trades' ? styles.tabActive : ''}`}
          onClick={() => setSubTab('trades')}
        >
          Trade History ({trades.length})
        </button>
      </div>

      {subTab === 'positions' && (
        positions.length === 0 ? (
          <div className={styles.emptyMsg}>No open positions — slots available for next scan</div>
        ) : (
          <>
            <table className={`${styles.table} ${styles.desktopTable}`}>
              <thead>
                <tr>
                  <th className={styles.thLeft}>Symbol</th>
                  <th>Current</th>
                  <th>Entry</th>
                  <th>P&L</th>
                  <th>P&L %</th>
                  <th>Hold</th>
                  <th>Stop</th>
                  <th>Target</th>
                  <th>Qty</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => {
                  const pnl = getPositionPnL(pos)
                  const pnlPct = getPositionPnLPct(pos)
                  const currentPrice = getCurrentPrice(pos)
                  const marketValue = getMarketValue(pos)
                  return (
                    <tr key={pos.id} className={styles.row}>
                      <td className={styles.cellLeft}>
                        <div className={styles.symbolCell}>
                          <span className={styles.symbolName}>{pos.symbol}</span>
                          <span className={styles.symbolMeta}>Entry {formatDate(pos.entryDate)} · Price {formatPriceDate(pos)}</span>
                        </div>
                      </td>
                      <td className={styles.cellNum}>{currentPrice == null ? '-' : formatPrice(currentPrice)}</td>
                      <td className={styles.cellNum}>{formatPrice(pos.entryPrice)}</td>
                      <td className={styles.cellNum} style={{ color: changeColor(pnl) }}>{pnl == null ? '-' : formatMoney(pnl)}</td>
                      <td className={styles.cellNum} style={{ color: changeColor(pnlPct) }}>{pnlPct == null ? '-' : formatPct(pnlPct)}</td>
                      <td className={styles.cellNum}>{getDisplayHoldDays(pos)}d</td>
                      <td className={styles.cellNum} style={{ color: 'var(--red-400)' }}>{formatPrice(pos.stopPrice)}</td>
                      <td className={styles.cellNum} style={{ color: 'var(--green-400)' }}>{formatPrice(pos.targetPrice)}</td>
                      <td className={styles.cellNum}>{pos.quantity.toLocaleString()}</td>
                      <td className={styles.cellNum}>{marketValue == null ? '-' : formatMoney(marketValue)}</td>
                      <td className={styles.cellNum}><span className={`${styles.badge} ${styles.badgeOpen}`}>{pos.vcpQuality ?? '-'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className={styles.mobileList}>
              {positions.map(pos => <PositionCard key={pos.id} position={pos} />)}
            </div>
          </>
        )
      )}

      {subTab === 'trades' && (
        trades.length === 0 ? (
          <div className={styles.emptyMsg}>No closed trades yet</div>
        ) : (
          <>
            <table className={`${styles.table} ${styles.desktopTable}`}>
              <thead>
                <tr>
                  <th className={styles.thLeft}>Symbol</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>P&L</th>
                  <th>P&L %</th>
                  <th>Hold</th>
                  <th>Qty</th>
                  <th>Value</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => {
                  const holdDays = getHoldDays(t)
                  const realizedPnL = getTradePnL(t)
                  const realizedPct = getTradePnLPct(t)
                  return (
                    <tr key={t.id} className={styles.row}>
                      <td className={styles.cellLeft}>
                        <div className={styles.symbolCell}>
                          <span className={styles.symbolName}>{t.symbol}</span>
                          <span className={styles.symbolMeta}>{formatDate(t.entryDate)} to {t.exitDate ? formatDate(t.exitDate) : '-'}</span>
                        </div>
                      </td>
                      <td className={styles.cellNum}>{formatPrice(t.entryPrice)}</td>
                      <td className={styles.cellNum}>{t.exitPrice != null ? formatPrice(t.exitPrice) : '-'}</td>
                      <td className={styles.cellNum} style={{ color: changeColor(realizedPnL) }}>
                        {formatMoney(realizedPnL)}
                      </td>
                      <td className={styles.cellNum} style={{ color: changeColor(realizedPct) }}>
                        {formatPct(realizedPct)}
                      </td>
                      <td className={styles.cellNum}>{holdDays != null ? `${holdDays}d` : '-'}</td>
                      <td className={styles.cellNum}>{t.quantity.toLocaleString()}</td>
                      <td className={styles.cellNum}>{formatMoney((t.exitPrice ?? t.entryPrice) * t.quantity)}</td>
                      <td className={styles.cellNum}>
                        <ExitBadge reason={t.exitReason} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className={styles.mobileList}>
              {trades.map(trade => <TradeCard key={trade.id} trade={trade} />)}
            </div>
          </>
        )
      )}
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  subValue,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  subValue: string
  tone?: string
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statTop}>
        <span className={styles.statIcon}>{icon}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
      <div className={styles.statValue} style={tone ? { color: tone } : undefined}>{value}</div>
      <div className={styles.statSub} style={tone ? { color: tone } : undefined}>{subValue}</div>
    </div>
  )
}

function RuleItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.ruleItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PositionCard({ position }: { position: Position }) {
  const pnl = getPositionPnL(position)
  const pnlPct = getPositionPnLPct(position)
  const currentPrice = getCurrentPrice(position)
  const marketValue = getMarketValue(position)
  return (
    <article className={styles.mobileCard}>
      <div className={styles.mobileCardHeader}>
        <div className={styles.symbolCell}>
          <span className={styles.symbolName}>{position.symbol}</span>
          <span className={styles.symbolMeta}>Entry {formatDate(position.entryDate)} · Price {formatPriceDate(position)}</span>
        </div>
        <span className={`${styles.badge} ${styles.badgeOpen}`}>{position.vcpQuality ?? '-'}</span>
      </div>
      <div className={styles.mobileMetricGrid}>
        <MobileMetric label="Current" value={currentPrice == null ? '-' : formatPrice(currentPrice)} />
        <MobileMetric label="Entry" value={formatPrice(position.entryPrice)} />
        <MobileMetric label="P&L" value={pnl == null ? '-' : formatMoney(pnl)} tone={changeColor(pnl)} />
        <MobileMetric label="P&L %" value={pnlPct == null ? '-' : formatPct(pnlPct)} tone={changeColor(pnlPct)} />
        <MobileMetric label="Hold" value={`${getDisplayHoldDays(position)}d`} />
        <MobileMetric label="Value" value={marketValue == null ? '-' : formatMoney(marketValue)} />
        <MobileMetric label="Stop" value={formatPrice(position.stopPrice)} tone="var(--red-400)" />
        <MobileMetric label="Target" value={formatPrice(position.targetPrice)} tone="var(--green-400)" />
      </div>
    </article>
  )
}

function TradeCard({ trade }: { trade: Position }) {
  const holdDays = getHoldDays(trade)
  const realizedPnL = getTradePnL(trade)
  const realizedPct = getTradePnLPct(trade)
  return (
    <article className={styles.mobileCard}>
      <div className={styles.mobileCardHeader}>
        <div className={styles.symbolCell}>
          <span className={styles.symbolName}>{trade.symbol}</span>
          <span className={styles.symbolMeta}>{formatDate(trade.entryDate)} to {trade.exitDate ? formatDate(trade.exitDate) : '-'}</span>
        </div>
        <ExitBadge reason={trade.exitReason} />
      </div>
      <div className={styles.mobileMetricGrid}>
        <MobileMetric label="Entry" value={formatPrice(trade.entryPrice)} />
        <MobileMetric label="Exit" value={trade.exitPrice != null ? formatPrice(trade.exitPrice) : '-'} />
        <MobileMetric label="P&L" value={formatMoney(realizedPnL)} tone={changeColor(realizedPnL)} />
        <MobileMetric label="P&L %" value={formatPct(realizedPct)} tone={changeColor(realizedPct)} />
        <MobileMetric label="Qty" value={trade.quantity.toLocaleString()} />
        <MobileMetric label="Hold" value={holdDays != null ? `${holdDays}d` : '-'} />
        <MobileMetric label="Value" value={formatMoney((trade.exitPrice ?? trade.entryPrice) * trade.quantity)} />
      </div>
    </article>
  )
}

function MobileMetric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={styles.mobileMetric}>
      <span>{label}</span>
      <strong style={tone ? { color: tone } : undefined}>{value}</strong>
    </div>
  )
}

function ExitBadge({ reason }: { reason: string | null }) {
  if (!reason) return <span className={`${styles.badge} ${styles.badgeOpen}`}>OPEN</span>
  const cls = reason === 'SL' ? styles.badgeSL
    : reason === 'TP' ? styles.badgeTP
    : reason === 'TIME' ? styles.badgeTIME
    : styles.badgeRESET
  return <span className={`${styles.badge} ${cls}`}>{reason}</span>
}

function getHoldDays(position: Position) {
  if (position.holdDays != null) return position.holdDays
  return position.entryDate && position.exitDate
    ? Math.floor((new Date(position.exitDate).getTime() - new Date(position.entryDate).getTime()) / 86400000)
    : null
}

function getDisplayHoldDays(position: Position) {
  return position.holdDays ?? Math.max(0, Math.floor((Date.now() - new Date(position.entryDate).getTime()) / 86400000))
}

function getCurrentPrice(position: Position) {
  if (position.currentPrice != null) return position.currentPrice
  if (position.status === 'closed') return position.exitPrice ?? position.entryPrice
  return null
}

function getMarketValue(position: Position) {
  if (position.marketValue != null) return position.marketValue
  const currentPrice = getCurrentPrice(position)
  return currentPrice == null ? null : currentPrice * position.quantity
}

function getPositionPnL(position: Position) {
  if (position.unrealizedPnL != null) return position.unrealizedPnL
  const marketValue = getMarketValue(position)
  return marketValue == null ? null : marketValue - position.costBasis
}

function getPositionPnLPct(position: Position) {
  if (position.unrealizedPnLPct != null) return position.unrealizedPnLPct
  const pnl = getPositionPnL(position)
  return pnl == null ? null : position.costBasis > 0 ? (pnl / position.costBasis) * 100 : 0
}

function getTradePnL(position: Position) {
  return position.realizedPnL ?? position.pnl ?? ((position.exitPrice ?? position.entryPrice) - position.entryPrice) * position.quantity
}

function getTradePnLPct(position: Position) {
  if (position.realizedPnLPct != null) return position.realizedPnLPct
  if (position.pnlPct != null) return position.pnlPct
  return position.costBasis > 0 ? (getTradePnL(position) / position.costBasis) * 100 : 0
}

function formatPriceDate(position: Position) {
  if (position.status === 'open' && position.currentPrice == null) return 'API pending'
  return position.currentDate ? formatDate(position.currentDate) : 'entry'
}

function getLatestPricedDate(positions: Position[], fallback: string | null) {
  const dates = positions
    .map(pos => pos.currentDate)
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  return dates[0] ?? fallback
}

function formatMoney(n: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n)
}

function EquityCurve({ snapshots, initialCap }: { snapshots: { date: string; totalValue: number }[]; initialCap: number }) {
  const sorted = [...snapshots].reverse()
  const values = [initialCap, ...sorted.map(s => s.totalValue)]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 800
  const H = 120
  const PAD = 2

  const points = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2)
    return `${x},${y}`
  })

  const gridLines = 4
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => {
    const y = PAD + (i / gridLines) * (H - PAD * 2)
    const val = max - (i / gridLines) * range
    return { y, label: formatMoney(val), key: i }
  })

  return (
    <svg className={styles.equitySvg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--orange-500)" />
          <stop offset="100%" stopColor="var(--orange-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridYs.map(g => (
        <g key={g.key}>
          <line x1={PAD} y1={g.y} x2={W - PAD} y2={g.y} className={styles.equityGrid} />
          <text x={W - PAD} y={g.y - 3} textAnchor="end" className={styles.equityLabel}>{g.label}</text>
        </g>
      ))}
      <polyline points={points.join(' ')} className={styles.equityLine} />
      <polygon
        points={`${PAD},${H - PAD} ${points.join(' ')} ${W - PAD},${H - PAD}`}
        className={styles.equityArea}
      />
    </svg>
  )
}
