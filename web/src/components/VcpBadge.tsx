import type { VcpQuality } from '../api/types'
import styles from './VcpBadge.module.css'

interface Props {
  quality: VcpQuality | null
}

export function VcpBadge({ quality }: Props) {
  if (!quality) return null
  const cls = quality.toLowerCase()
  return <span className={`${styles.badge} ${styles[cls]}`}>{quality}</span>
}
