import styles from './TagBadge.module.css'

interface Props {
  label: string
  active: boolean
  variant?: 'green' | 'purple' | 'blue' | 'yellow'
}

export function TagBadge({ label, active, variant = 'green' }: Props) {
  if (!active) return null
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {label}
    </span>
  )
}
