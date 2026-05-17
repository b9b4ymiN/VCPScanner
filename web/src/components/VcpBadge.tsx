import type { VcpQuality } from '../api/types'
import styles from './VcpBadge.module.css'

interface Props {
  quality: VcpQuality | null
  contractions?: number | null
}

export function VcpBadge({ quality, contractions }: Props) {
  if (!quality) return null
  const cls = quality.toLowerCase()
  const label = contractions ? `${contractions}C ${quality}` : quality
  return <span className={`${styles.badge} ${styles[cls]}`}>{label}</span>
}
