import { scoreColor, formatScore } from '../lib/format'
import styles from './SepaScoreRing.module.css'

interface Props {
  score: number
  size?: number
}

export function SepaScoreRing({ score, size = 80 }: Props) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(score / 100, 1)
  const offset = circumference * (1 - pct)
  const color = scoreColor(score)

  return (
    <div className={styles.ring} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={styles.fill}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
      <span className={styles.value} style={{ color }}>
        {formatScore(score)}
      </span>
      <span className={styles.label}>SEPA</span>
    </div>
  )
}
