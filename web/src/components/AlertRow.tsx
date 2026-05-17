import type { Alert } from '../api/types'
import { formatPrice, formatPct, formatScore, scoreColor, changeColor, pivotColor } from '../lib/format'
import { VcpBadge } from './VcpBadge'
import styles from './AlertRow.module.css'

interface Props {
  alert: Alert
  isSelected: boolean
  onClick: () => void
}

export function AlertRow({ alert, isSelected, onClick }: Props) {
  const alertIcon =
    alert.alertLevel === 'HIGH' ? '🔥' :
    alert.alertLevel === 'MEDIUM' ? '⚡' : '📌'

  return (
    <tr
      className={`${styles.row} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
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
      <td className={styles.cellCenter}>
        <VcpBadge quality={alert.vcpQuality} />
      </td>
      <td className={styles.cellNum} style={{ color: pivotColor(alert.pivotDistancePct) }}>
        {alert.pivotDistancePct !== null ? formatPct(alert.pivotDistancePct) : '—'}
      </td>
      <td className={styles.cellCenter}>
        <span className={styles.arrow}>▸</span>
      </td>
    </tr>
  )
}
