import type { Alert } from '../api/types'
import { formatPrice, formatPct, formatScore, scoreColor, changeColor, pivotColor, breakoutColor, breakoutLabel, formatIndicator } from '../lib/format'
import { Fire, Lightning, MapPin, CaretRight } from '@phosphor-icons/react'
import { VcpBadge } from './VcpBadge'
import styles from './AlertRow.module.css'

interface Props {
  alert: Alert
  isSelected: boolean
  onClick: () => void
}

export function AlertRow({ alert, isSelected, onClick }: Props) {
  const alertIcon =
    alert.alertLevel === 'HIGH' ? <Fire size={16} weight="fill" color="var(--orange-500)" /> :
    alert.alertLevel === 'MEDIUM' ? <Lightning size={16} weight="fill" color="var(--orange-400)" /> :
    <MapPin size={16} weight="fill" color="var(--text-tertiary)" />

  const contractionCount = alert.vcpContractions
    ? JSON.parse(alert.vcpContractions).length
    : null

  return (
    <tr
      className={`${styles.row} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`${alert.symbol} ${alert.name ?? ''} score ${formatScore(alert.sepaScore)} price ${formatPrice(alert.price)}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <td className={styles.cellCenter}>{alertIcon}</td>
      <td className={styles.cellLeft}>
        <div className={styles.symbolCol}>
          <span className={styles.symbol}>{alert.symbol}</span>
          {alert.name && <span className={styles.name}>{alert.name}</span>}
        </div>
      </td>
      <td className={styles.cellNum}>{formatPrice(alert.price)}</td>
      <td className={styles.cellNum} style={{ color: changeColor(alert.priceChangePct) }}>
        {alert.priceChangePct !== null ? formatPct(alert.priceChangePct) : '—'}
      </td>
      <td className={styles.cellNum} style={{ color: scoreColor(alert.sepaScore) }}>
        {formatScore(alert.sepaScore)}
      </td>
      <td className={`${styles.cellCenter} ${styles.colVcp}`}>
        <VcpBadge quality={alert.vcpQuality} contractions={contractionCount} />
      </td>
      <td className={`${styles.cellCenter} ${styles.colBreakout}`}>
        <span
          className={styles.breakoutBadge}
          style={{ color: breakoutColor(alert.breakoutStatus) }}
        >
          {breakoutLabel(alert.breakoutStatus)}
        </span>
      </td>
      <td className={`${styles.cellNum} ${styles.colGrowth}`}>
        <div className={styles.growthCol}>
          {alert.epsGrowthYoy !== null && (
            <span style={{ color: alert.epsGrowthYoy >= 0 ? 'var(--green-400)' : 'var(--red-400)' }}>
              EPS {formatPct(alert.epsGrowthYoy * 100)}
            </span>
          )}
          {alert.revenueGrowthYoy !== null && (
            <span style={{ color: alert.revenueGrowthYoy >= 0 ? 'var(--green-400)' : 'var(--red-400)' }}>
              Rev {formatPct(alert.revenueGrowthYoy * 100)}
            </span>
          )}
          {alert.epsGrowthYoy === null && alert.revenueGrowthYoy === null && '—'}
        </div>
      </td>
      <td className={styles.cellNum}>
        {alert.volumeRatio !== null ? formatIndicator(alert.volumeRatio) + 'x' : '—'}
      </td>
      <td className={`${styles.cellNum} ${styles.colPivot}`} style={{ color: pivotColor(alert.pivotDistancePct) }}>
        {alert.pivotDistancePct !== null ? formatPct(alert.pivotDistancePct) : '—'}
      </td>
      <td className={styles.cellCenter}>
        <span className={styles.arrow}><CaretRight size={14} color="var(--text-tertiary)" /></span>
      </td>
    </tr>
  )
}
