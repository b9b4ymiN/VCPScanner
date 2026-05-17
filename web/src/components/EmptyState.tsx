import styles from './EmptyState.module.css'

interface Props {
  title: string
  subtitle?: string
  yesterdayLink?: boolean
  onYesterdayClick?: () => void
}

export function EmptyState({ title, subtitle, yesterdayLink, onYesterdayClick }: Props) {
  return (
    <div className={styles.empty}>
      <div className={styles.icon}>0</div>
      <h3 className={styles.title}>{title}</h3>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      {yesterdayLink && onYesterdayClick && (
        <button className={styles.yesterdayBtn} onClick={onYesterdayClick}>
          View Yesterday's Alerts →
        </button>
      )}
    </div>
  )
}
