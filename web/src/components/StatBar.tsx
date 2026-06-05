import type { Alert } from '../api/types'
import { formatIndicator } from '../lib/format'
import { ChartBar, Crosshair, FunnelSimple, Pulse } from '@phosphor-icons/react'
import styles from './StatBar.module.css'

interface MarketSummary {
  totalScanned: number
  totalPassed: number
  marketScoreC7: number | null
}

interface Props {
  alerts: Alert[]
  marketSummary?: MarketSummary | null
}

export function StatBar({ alerts, marketSummary }: Props) {
  const high = alerts.filter(a => a.alertLevel === 'HIGH').length
  const medium = alerts.filter(a => a.alertLevel === 'MEDIUM').length
  const watch = alerts.filter(a => a.alertLevel === 'WATCH').length

  return (
    <div className={styles.bar}>
      <div className={styles.item}>
        <span className={styles.dotHigh} />
        <span className={styles.count}>{high}</span>
        <span className={styles.label}>HIGH</span>
      </div>
      <div className={styles.item}>
        <span className={styles.dotMedium} />
        <span className={styles.count}>{medium}</span>
        <span className={styles.label}>MED</span>
      </div>
      <div className={styles.item}>
        <span className={styles.dotWatch} />
        <span className={styles.count}>{watch}</span>
        <span className={styles.label}>WATCH</span>
      </div>
      <div className={styles.total}>
        <FunnelSimple size={13} />
        Total <strong>{alerts.length}</strong>
      </div>
      {marketSummary && (
        <div className={styles.scanInfo}>
          <ChartBar size={13} />
          <span className={styles.scanLabel}>Scanned</span>
          <span className={styles.scanValue}>{marketSummary.totalScanned}</span>
          <span className={styles.scanLabel}>Passed</span>
          <span className={styles.scanValue}>{marketSummary.totalPassed}</span>
        </div>
      )}
      <div className={styles.market}>
        <Pulse size={13} />
        SET <span className={styles.marketArrow}>▲</span>
        {marketSummary?.marketScoreC7 != null && (
          <span className={styles.marketScore}><Crosshair size={12} /> C7 {formatIndicator(marketSummary.marketScoreC7)}</span>
        )}
      </div>
    </div>
  )
}
