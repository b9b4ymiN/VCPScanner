import { useMemo } from 'react'
import type { Alert, OhlvBar } from '../api/types'
import { formatPrice, formatPct, formatScore, formatIndicator, breakoutColor, breakoutLabel } from '../lib/format'
import { CaretLeft } from '@phosphor-icons/react'
import { SepaScoreRing } from './SepaScoreRing'
import { CriteriaBar } from './CriteriaBar'
import { CandlestickChart } from './CandlestickChart'
import { VcpBadge } from './VcpBadge'
import { VcpContractionChart } from './VcpContractionChart'
import { TagBadge } from './TagBadge'
import styles from './AlertDetailView.module.css'

interface Details {
  tags?: { turnaround?: boolean; blueSky?: boolean; analystBuy?: boolean; highDividend?: boolean }
  setup?: { vcpPatternLabel?: string; proximity52wPct?: number | null; breakoutStatus?: string }
  profile?: { sector?: string | null; industry?: string | null; dividendYield?: number | null; recommendationKey?: string | null }
  technicals?: { rsi14?: number | null; adx14?: number | null; bbWidth?: number | null; atr14?: number | null; high52w?: number | null; distance52w?: number | null }
  tradePlan?: { entryPrice?: number; stopPrice?: number; targetPrice?: number; riskPct?: number; rewardRiskRatio?: number } | null
  vcp?: { swingHighs?: [number, number][]; swingLows?: [number, number][]; pivotPrice?: number }
  trendTemplate?: { score: number; conditions: boolean[]; labels: string[]; rsPercentile: number | null }
}

interface Props {
  alert: Alert
  onClose: () => void
}

export function AlertDetailView({ alert, onClose }: Props) {
  const d = (alert.details ?? {}) as Details
  const tags = d.tags
  const setup = d.setup
  const profile = d.profile
  const technicals = d.technicals
  const tradePlan = d.tradePlan

  const hasChart = alert.prices60d && alert.prices60d.length > 1 && typeof alert.prices60d[0] === 'object'
  const chartData = hasChart ? (alert.prices60d as OhlvBar[]) : []

  const vcpData = useMemo(() => {
    if (!d.vcp) return null
    const vcp = d.vcp
    if (!vcp.swingHighs || !vcp.swingLows || vcp.pivotPrice === undefined) return null
    return { swingHighs: vcp.swingHighs, swingLows: vcp.swingLows, pivotPrice: vcp.pivotPrice }
  }, [d.vcp])

  const hasTags = tags && (tags.turnaround || tags.blueSky || tags.analystBuy || tags.highDividend)

  const contractionCount = alert.vcpContractions
    ? JSON.parse(alert.vcpContractions).length
    : null

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close detail panel"><CaretLeft size={16} /></button>
        <div className={styles.titleCol}>
          <span className={styles.symbol}>{alert.symbol}</span>
          {alert.name && <span className={styles.name}>{alert.name}</span>}
          {profile?.sector && <span className={styles.sector}>{profile.sector}{profile.industry ? ` · ${profile.industry}` : ''}</span>}
        </div>
        <VcpBadge quality={alert.vcpQuality} contractions={contractionCount} />
        <div className={styles.priceCol}>
          <span className={styles.price}>{formatPrice(alert.price)}</span>
          {alert.priceChangePct !== null && (
            <span className={styles.change} style={{ color: alert.priceChangePct >= 0 ? 'var(--green-400)' : 'var(--red-400)' }}>
              {formatPct(alert.priceChangePct)}
            </span>
          )}
        </div>
      </div>

      {/* Tags row */}
      {hasTags && (
        <div className={styles.tagsRow}>
          <TagBadge label="TURNAROUND" active={!!tags.turnaround} variant="green" />
          <TagBadge label="BLUE SKY" active={!!tags.blueSky} variant="purple" />
          <TagBadge label="ANALYST BUY" active={!!tags.analystBuy} variant="blue" />
          <TagBadge label="HIGH DIVIDEND" active={!!tags.highDividend} variant="yellow" />
        </div>
      )}

      {/* Body */}
      <div className={styles.body}>
        {/* Chart + Score */}
        <div className={styles.chartSection}>
          {hasChart ? (
            <CandlestickChart
              data={chartData}
              swingHighs={vcpData?.swingHighs}
              swingLows={vcpData?.swingLows}
              pivotPrice={vcpData?.pivotPrice}
            />
          ) : (
            <div className={styles.noChart}>No chart data</div>
          )}
          <div className={styles.scoreRow}>
            <SepaScoreRing score={alert.sepaScore} />
          </div>
        </div>

        {/* VCP Analysis */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>VCP Analysis</h4>
          <div className={styles.vcpChartWrap}>
            {vcpData ? (
              <VcpContractionChart
                swingHighs={vcpData.swingHighs}
                swingLows={vcpData.swingLows}
                pivotPrice={vcpData.pivotPrice}
                height={80}
              />
            ) : (
              <div className={styles.noChart}>VCP chart unavailable</div>
            )}
          </div>
          <div className={styles.vcpGrid}>
            <span className={styles.vcpLabel}>Pattern</span>
            <span className={styles.vcpValue}>{setup?.vcpPatternLabel ?? alert.vcpContractions ?? '—'}</span>
            <span className={styles.vcpLabel}>Vol Drying</span>
            <span className={styles.vcpValue}>{alert.vcpVolDrying ? 'Yes' : alert.vcpVolDrying === null ? '—' : 'No'}</span>
            <span className={styles.vcpLabel}>Quality</span>
            <span className={styles.vcpValue}>{alert.vcpQualityScore !== null ? `${alert.vcpQualityScore}/10` : '—'}</span>
            <span className={styles.vcpLabel}>Pivot</span>
            <span className={styles.vcpValue}>{alert.pivotPrice !== null ? formatPrice(alert.pivotPrice) : '—'}</span>
            <span className={styles.vcpLabel}>Distance</span>
            <span className={styles.vcpValue}>{alert.pivotDistancePct !== null ? formatPct(alert.pivotDistancePct) : '—'}</span>
          </div>
        </div>

        {/* SEPA Criteria */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>SEPA Criteria</h4>
          <div className={styles.criteria}>
            <CriteriaBar label="Super Perf" score={alert.scoreC1 ?? 0} max={15} />
            <CriteriaBar label="Earnings" score={alert.scoreC2 ?? 0} max={20} />
            <CriteriaBar label="Catalyst" score={alert.scoreC3 ?? 0} max={10} />
            <CriteriaBar label="Supply/Demand" score={alert.scoreC4 ?? 0} max={20} />
            <CriteriaBar label="Leadership" score={alert.scoreC5 ?? 0} max={10} />
            <CriteriaBar label="Sponsorship" score={alert.scoreC6 ?? 0} max={10} />
            <CriteriaBar label="Market Dir" score={alert.scoreC7 ?? 0} max={15} />
          </div>
          <div className={styles.totalScore}>
            Total: <strong>{formatScore(alert.sepaScore)}</strong>/100
          </div>
        </div>

        {/* Trend Template */}
        {d.trendTemplate && (() => {
          const tt = d.trendTemplate
          return (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Trend Template — {tt.score}/8</h4>
              <div className={styles.ttChecklist}>
                {tt.labels.map((label, i) => (
                  <div key={i} className={styles.ttItem}>
                    <span className={tt.conditions[i] ? styles.ttPass : styles.ttFail}>
                      {tt.conditions[i] ? '✓' : '✗'}
                    </span>
                    <span className={styles.ttLabel}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Fundamentals */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Fundamentals</h4>
          <div className={styles.dataGrid}>
            <span className={styles.dataLabel}>EPS Growth YoY</span>
            <span className={styles.dataValue} style={{ color: growthColor(alert.epsGrowthYoy) }}>
              {alert.epsGrowthYoy !== null ? formatPct(alert.epsGrowthYoy * 100) : '—'}
            </span>
            <span className={styles.dataLabel}>Revenue Growth</span>
            <span className={styles.dataValue} style={{ color: growthColor(alert.revenueGrowthYoy) }}>
              {alert.revenueGrowthYoy !== null ? formatPct(alert.revenueGrowthYoy * 100) : '—'}
            </span>
            <span className={styles.dataLabel}>Dividend Yield</span>
            <span className={styles.dataValue}>
              {profile?.dividendYield != null ? formatPct(profile.dividendYield * 100) : '—'}
            </span>
            <span className={styles.dataLabel}>Analyst Rating</span>
            <span className={styles.dataValue}>
              {profile?.recommendationKey ? ratingLabel(profile.recommendationKey) : '—'}
            </span>
          </div>
        </div>

        {/* Technicals */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Technicals</h4>
          <div className={styles.dataGrid}>
            <span className={styles.dataLabel}>RSI (14)</span>
            <span className={styles.dataValue} style={{ color: rsiColor(alert.rsi14) }}>
              {formatIndicator(alert.rsi14)}
            </span>
            <span className={styles.dataLabel}>ADX (14)</span>
            <span className={styles.dataValue} style={{ color: adxColor(alert.adx14) }}>
              {formatIndicator(alert.adx14)}
            </span>
            <span className={styles.dataLabel}>BB Width</span>
            <span className={styles.dataValue}>
              {alert.bbWidthPct !== null ? `${alert.bbWidthPct.toFixed(1)}%` : '—'}
            </span>
            <span className={styles.dataLabel}>52W High</span>
            <span className={styles.dataValue}>
              {technicals?.high52w != null ? formatPrice(technicals.high52w) : '—'}
            </span>
            <span className={styles.dataLabel}>Distance to 52W</span>
            <span className={styles.dataValue}>
              {technicals?.distance52w != null ? formatPct(technicals.distance52w) : '—'}
            </span>
          </div>
        </div>

        {/* Setup */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Setup</h4>
          <div className={styles.dataGrid}>
            <span className={styles.dataLabel}>Breakout</span>
            <span className={styles.dataValue} style={{ color: breakoutColor(alert.breakoutStatus) }}>
              {breakoutLabel(alert.breakoutStatus)}
            </span>
            <span className={styles.dataLabel}>52W Proximity</span>
            <span className={styles.dataValue}>
              {setup?.proximity52wPct != null ? formatPct(setup.proximity52wPct) : '—'}
            </span>
            <span className={styles.dataLabel}>Vol Ratio</span>
            <span className={styles.dataValue}>
              {alert.volumeRatio !== null ? `${alert.volumeRatio.toFixed(1)}x` : '—'}
            </span>
          </div>
        </div>

        {/* Trade Plan */}
        {tradePlan && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Trade Plan</h4>
            <div className={styles.tradeGrid}>
              <div className={styles.tradeCard}>
                <span className={styles.tradeLabel}>Entry</span>
                <span className={styles.tradeValue}>{tradePlan.entryPrice != null ? formatPrice(tradePlan.entryPrice) : '—'}</span>
              </div>
              <div className={`${styles.tradeCard} ${styles.stopCard}`}>
                <span className={styles.tradeLabel}>Stop</span>
                <span className={styles.tradeValue}>{tradePlan.stopPrice != null ? formatPrice(tradePlan.stopPrice) : '—'}</span>
              </div>
              <div className={`${styles.tradeCard} ${styles.targetCard}`}>
                <span className={styles.tradeLabel}>Target</span>
                <span className={styles.tradeValue}>{tradePlan.targetPrice != null ? formatPrice(tradePlan.targetPrice) : '—'}</span>
              </div>
            </div>
            <div className={styles.tradeMeta}>
              <span>R:R <strong>{tradePlan.rewardRiskRatio != null ? `${tradePlan.rewardRiskRatio.toFixed(1)}` : '—'}</strong></span>
              <span>Risk <strong>{tradePlan.riskPct != null ? `${tradePlan.riskPct.toFixed(1)}%` : '—'}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function growthColor(val: number | null): string {
  if (val === null) return 'var(--text-secondary)'
  return val >= 0 ? 'var(--green-400)' : 'var(--red-400)'
}

function rsiColor(val: number | null): string {
  if (val === null) return 'var(--text-secondary)'
  if (val > 70) return 'var(--red-400)'
  if (val < 30) return 'var(--green-400)'
  return 'var(--text-primary)'
}

function adxColor(val: number | null): string {
  if (val === null) return 'var(--text-secondary)'
  if (val > 25) return 'var(--green-400)'
  return 'var(--text-secondary)'
}

function ratingLabel(key: string): string {
  const map: Record<string, string> = {
    strong_buy: 'Strong Buy',
    buy: 'Buy',
    hold: 'Hold',
    sell: 'Sell',
    strong_sell: 'Strong Sell',
  }
  return map[key] ?? key
}
