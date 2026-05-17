import type { AlertLevel } from '../api/types'
import styles from './FilterBar.module.css'

interface Props {
  levelFilter: AlertLevel | null
  onLevelChange: (level: AlertLevel | null) => void
  minScore: number
  onMinScoreChange: (score: number) => void
  searchQuery: string
  onSearchChange: (q: string) => void
}

export function FilterBar({
  levelFilter,
  onLevelChange,
  minScore,
  onMinScoreChange,
  searchQuery,
  onSearchChange,
}: Props) {
  const levels: { value: AlertLevel | null; label: string }[] = [
    { value: null, label: 'ALL' },
    { value: 'HIGH', label: 'HIGH' },
    { value: 'MEDIUM', label: 'MED' },
    { value: 'WATCH', label: 'WATCH' },
  ]

  return (
    <div className={styles.bar}>
      <div className={styles.chips}>
        {levels.map(l => (
          <button
            key={l.label}
            className={`${styles.chip} ${levelFilter === l.value ? styles.active : ''}`}
            onClick={() => onLevelChange(l.value)}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <label className={styles.scoreLabel}>
          Score:
          <select
            className={styles.select}
            value={minScore}
            onChange={e => onMinScoreChange(Number(e.target.value))}
          >
            <option value={50}>50+</option>
            <option value={60}>60+</option>
            <option value={65}>65+</option>
            <option value={70}>70+</option>
            <option value={75}>75+</option>
            <option value={80}>80+</option>
          </select>
        </label>
        <input
          className={styles.search}
          type="text"
          placeholder="Search symbol..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  )
}
