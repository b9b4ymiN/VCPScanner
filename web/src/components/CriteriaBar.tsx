import styles from './CriteriaBar.module.css'

interface Props {
  label: string
  score: number
  max: number
}

export function CriteriaBar({ label, score, max }: Props) {
  const pct = max > 0 ? (score / max) * 100 : 0
  const isMax = score >= max && max > 0

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${isMax ? styles.max : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={styles.score}>
        {score}/{max}
      </span>
    </div>
  )
}
