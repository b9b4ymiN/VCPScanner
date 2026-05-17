import { useHistory } from '../api/hooks'
import { formatDate, formatScore } from '../lib/format'
import { EmptyState } from './EmptyState'
import styles from './HistoryView.module.css'

export function HistoryView() {
  const { data, isLoading } = useHistory(30)

  if (isLoading) {
    return (
      <div className={styles.loading}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ width: '100%', height: 48 }} />
        ))}
      </div>
    )
  }

  const entries = data?.history ?? []

  if (entries.length === 0) {
    return <EmptyState title="No history yet" subtitle="Alerts will appear here after the first scan" />
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>History — 30 days</h2>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thLeft}>Date</th>
              <th className={styles.thRight}>Alerts</th>
              <th className={styles.thRight}>HIGH</th>
              <th className={styles.thRight}>MED</th>
              <th className={styles.thRight}>WATCH</th>
              <th className={styles.thRight}>Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.date} className={styles.row}>
                <td className={styles.cellLeft}>{formatDate(e.date)}</td>
                <td className={styles.cellNum}>{e.totalAlerts}</td>
                <td className={styles.cellNum} style={{ color: 'var(--alert-high)' }}>{e.highCount}</td>
                <td className={styles.cellNum} style={{ color: 'var(--alert-medium)' }}>{e.mediumCount}</td>
                <td className={styles.cellNum} style={{ color: 'var(--alert-watch)' }}>{e.watchCount}</td>
                <td className={styles.cellNum}>{formatScore(e.avgScore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
