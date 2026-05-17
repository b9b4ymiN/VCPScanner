import type { Alert } from '../api/types'
import styles from './StatBar.module.css'

interface Props {
  alerts: Alert[]
}

export function StatBar({ alerts }: Props) {
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
        Total: <strong>{alerts.length}</strong>
      </div>
      <div className={styles.market}>
        SET <span className={styles.marketArrow}>▲</span>
      </div>
    </div>
  )
}
