import { useMemo } from 'react'
import type { Alert } from '../api/types'
import { formatPrice, formatPct, formatScore } from '../lib/format'
import { SepaScoreRing } from './SepaScoreRing'
import { CriteriaBar } from './CriteriaBar'
import { Sparkline } from './Sparkline'
import { VcpBadge } from './VcpBadge'
import { VcpContractionChart } from './VcpContractionChart'
import styles from './DetailPanel.module.css'

interface Props {
  alert: Alert
  onClose: () => void
}

export function DetailPanel({ alert, onClose }: Props) {
  const hasChart =
    alert.prices60d && alert.prices60d.length > 1 &&
    alert.volumes60d && alert.volumes60d.length > 1

  const vcpData = useMemo(() => {
    const d = alert.details
    if (!d || !d.vcp) return null
    const vcp = d.vcp as {
      swingHighs?: [number, number][]
      swingLows?: [number, number][]
      pivotPrice?: number
    }
    if (!vcp.swingHighs || !vcp.swingLows || vcp.pivotPrice === undefined) return null
    return {
      swingHighs: vcp.swingHighs,
      swingLows: vcp.swingLows,
      pivotPrice: vcp.pivotPrice,
    }
  }, [alert.details])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <button className={styles.closeBtn} onClick={onClose}>← Back</button>
        <div className={styles.titleCol}>
          <span className={styles.symbol}>{alert.symbol}</span>
          {alert.name && <span className={styles.name}>{alert.name}</span>}
        </div>
        <VcpBadge quality={alert.vcpQuality} />
        <div className={styles.priceCol}>
          <span className={styles.price}>{formatPrice(alert.price)}</span>
          {alert.priceChangePct !== null && (
            <span
              className={styles.change}
              style={{ color: alert.priceChangePct >= 0 ? 'var(--green-400)' : 'var(--red-400)' }}
            >
              {formatPct(alert.priceChangePct)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.chartSection}>
          <div className={styles.chartArea}>
            {hasChart ? (
              <Sparkline prices={alert.prices60d!} volumes={alert.volumes60d!} width={360} height={64} />
            ) : (
              <div className={styles.noChart}>No chart data</div>
            )}
          </div>
          <SepaScoreRing score={alert.sepaScore} />
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>VCP Analysis</h4>
          <div className={styles.vcpChartWrap}>
            {vcpData ? (
              <VcpContractionChart
                swingHighs={vcpData.swingHighs}
                swingLows={vcpData.swingLows}
                pivotPrice={vcpData.pivotPrice}
                width={320}
                height={80}
              />
            ) : (
              <div className={styles.noChart}>VCP chart unavailable</div>
            )}
          </div>
          <div className={styles.vcpGrid}>
            <span className={styles.vcpLabel}>Contractions</span>
            <span className={styles.vcpValue}>{alert.vcpContractions ?? '—'}</span>
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
      </div>
    </div>
  )
}
