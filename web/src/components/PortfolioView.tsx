import { useState } from 'react'
import { usePortfolio, useInitPortfolio, useResetPortfolio, useSnapshots, useTrades } from '../api/hooks'
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

  const { portfolio, positions } = portData ?? { portfolio: null, positions: [] }
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

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Portfolio Simulation</h2>
        <div className={styles.headerActions}>
          <button
            className={styles.actionBtn}
            onClick={() => resetMut.mutate()}
            disabled={resetMut.isPending}
          >
            {resetMut.isPending ? 'Resetting...' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Initial Capital</div>
          <div className={styles.statValue}>{formatPrice(portfolio.initialCap)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Value</div>
          <div className={styles.statValue}>{formatPrice(portfolio.totalValue)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total P&L</div>
          <div className={styles.statValue} style={{ color: pnlColor }}>
            {formatPrice(portfolio.totalPnL)}
          </div>
          <div className={styles.statSub} style={{ color: pnlColor }}>
            {formatPct(portfolio.totalPnLPct)}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Cash Balance</div>
          <div className={styles.statValue}>{formatPrice(portfolio.cashBalance)}</div>
        </div>
      </div>

      {/* Equity Curve */}
      <div className={styles.equitySection}>
        <div className={styles.equityTitle}>Equity Curve — {snapshots.length} days</div>
        {snapshots.length < 2 ? (
          <div className={styles.noData}>Need at least 2 days of data to show curve</div>
        ) : (
          <EquityCurve snapshots={snapshots} initialCap={portfolio.initialCap} />
        )}
      </div>

      {/* Tabs: Open Positions / Trade History */}
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
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thLeft}>Symbol</th>
                <th>Entry</th>
                <th>Pivot</th>
                <th>Stop</th>
                <th>Target</th>
                <th>Qty</th>
                <th>Cost</th>
                <th>SEPA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <tr key={pos.id} className={styles.row}>
                  <td className={styles.cellLeft}>
                    <div className={styles.symbolCell}>
                      <span className={styles.symbolName}>{pos.symbol}</span>
                      <span className={styles.symbolMeta}>{formatDate(pos.entryDate)}</span>
                    </div>
                  </td>
                  <td className={styles.cellNum}>{formatPrice(pos.entryPrice)}</td>
                  <td className={styles.cellNum}>{formatPrice(pos.pivotPrice)}</td>
                  <td className={styles.cellNum} style={{ color: 'var(--red-400)' }}>{formatPrice(pos.stopPrice)}</td>
                  <td className={styles.cellNum} style={{ color: 'var(--green-400)' }}>{formatPrice(pos.targetPrice)}</td>
                  <td className={styles.cellNum}>{pos.quantity.toLocaleString()}</td>
                  <td className={styles.cellNum}>{formatPrice(pos.costBasis)}</td>
                  <td className={styles.cellNum}>{pos.sepaScore ?? '—'}</td>
                  <td className={styles.cellNum}><span className={`${styles.badge} ${styles.badgeOpen}`}>{pos.vcpQuality ?? '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {subTab === 'trades' && (
        trades.length === 0 ? (
          <div className={styles.emptyMsg}>No closed trades yet</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thLeft}>Symbol</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Qty</th>
                <th>P&L</th>
                <th>P&L %</th>
                <th>Hold</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const holdDays = t.entryDate && t.exitDate
                  ? Math.floor((new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime()) / 86400000)
                  : null
                return (
                  <tr key={t.id} className={styles.row}>
                    <td className={styles.cellLeft}>
                      <div className={styles.symbolCell}>
                        <span className={styles.symbolName}>{t.symbol}</span>
                        <span className={styles.symbolMeta}>{formatDate(t.entryDate)} → {t.exitDate ? formatDate(t.exitDate) : '—'}</span>
                      </div>
                    </td>
                    <td className={styles.cellNum}>{formatPrice(t.entryPrice)}</td>
                    <td className={styles.cellNum}>{t.exitPrice != null ? formatPrice(t.exitPrice) : '—'}</td>
                    <td className={styles.cellNum}>{t.quantity.toLocaleString()}</td>
                    <td className={styles.cellNum} style={{ color: changeColor(t.pnlPct ?? 0) }}>
                      {t.pnl != null ? formatPrice(t.pnl) : '—'}
                    </td>
                    <td className={styles.cellNum} style={{ color: changeColor(t.pnlPct ?? 0) }}>
                      {t.pnlPct != null ? formatPct(t.pnlPct) : '—'}
                    </td>
                    <td className={styles.cellNum}>{holdDays != null ? `${holdDays}d` : '—'}</td>
                    <td className={styles.cellNum}>
                      <ExitBadge reason={t.exitReason} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )
      )}
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
    return { y, label: formatPrice(val), key: i }
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
