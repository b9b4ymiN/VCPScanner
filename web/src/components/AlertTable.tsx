import { useState, useMemo } from 'react'
import type { Alert } from '../api/types'
import { ArrowsDownUp, CaretUp, CaretDown } from '@phosphor-icons/react'
import { AlertRow } from './AlertRow'
import { EmptyState } from './EmptyState'
import styles from './AlertTable.module.css'

type SortKey = 'sepaScore' | 'price' | 'priceChangePct' | 'pivotDistancePct' | 'symbol' | 'volumeRatio'
type SortDir = 'asc' | 'desc'

interface Props {
  alerts: Alert[]
  selectedSymbol: string | null
  onSelect: (symbol: string) => void
}

function sortAlerts(alerts: Alert[], key: SortKey, dir: SortDir): Alert[] {
  return [...alerts].sort((a, b) => {
    let va: number | string = 0
    let vb: number | string = 0

    switch (key) {
      case 'sepaScore': va = a.sepaScore; vb = b.sepaScore; break
      case 'price': va = a.price; vb = b.price; break
      case 'priceChangePct': va = a.priceChangePct ?? 0; vb = b.priceChangePct ?? 0; break
      case 'pivotDistancePct': va = a.pivotDistancePct ?? 0; vb = b.pivotDistancePct ?? 0; break
      case 'volumeRatio': va = a.volumeRatio ?? 0; vb = b.volumeRatio ?? 0; break
      case 'symbol': va = a.symbol; vb = b.symbol; break
    }

    if (typeof va === 'string' && typeof vb === 'string') {
      return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    return dir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })
}

export function AlertTable({ alerts, selectedSymbol, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('sepaScore')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = useMemo(() => sortAlerts(alerts, sortKey, sortDir), [alerts, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (alerts.length === 0) {
    return <EmptyState title="No alerts today" subtitle="Run a scan or wait for EOD scan at 16:30" />
  }

  const SortIndicator = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className={styles.sortArrows}><ArrowsDownUp size={12} /></span>
    return <span className={styles.sortActive}>{sortDir === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />}</span>
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thCenter}>#</th>
            <th className={styles.thLeft} aria-sort={sortKey === 'symbol' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button className={styles.sortBtn} onClick={() => handleSort('symbol')} type="button">
                Symbol <SortIndicator col="symbol" />
              </button>
            </th>
            <th className={styles.thRight} aria-sort={sortKey === 'price' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button className={styles.sortBtn} onClick={() => handleSort('price')} type="button">
                Price <SortIndicator col="price" />
              </button>
            </th>
            <th className={styles.thRight} aria-sort={sortKey === 'priceChangePct' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button className={styles.sortBtn} onClick={() => handleSort('priceChangePct')} type="button">
                % Chg <SortIndicator col="priceChangePct" />
              </button>
            </th>
            <th className={styles.thRight} aria-sort={sortKey === 'sepaScore' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button className={styles.sortBtn} onClick={() => handleSort('sepaScore')} type="button">
                Score <SortIndicator col="sepaScore" />
              </button>
            </th>
            <th className={`${styles.thCenter} ${styles.colVcp}`}>VCP</th>
            <th className={`${styles.thCenter} ${styles.colBreakout}`}>Breakout</th>
            <th className={`${styles.thRight} ${styles.colGrowth}`}>Growth</th>
            <th className={styles.thRight} aria-sort={sortKey === 'volumeRatio' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button className={styles.sortBtn} onClick={() => handleSort('volumeRatio')} type="button">
                Vol <SortIndicator col="volumeRatio" />
              </button>
            </th>
            <th className={`${styles.thRight} ${styles.colPivot}`} aria-sort={sortKey === 'pivotDistancePct' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button className={styles.sortBtn} onClick={() => handleSort('pivotDistancePct')} type="button">
                Pivot <SortIndicator col="pivotDistancePct" />
              </button>
            </th>
            <th className={styles.thCenter}></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(a => (
            <AlertRow
              key={a.id}
              alert={a}
              isSelected={a.symbol === selectedSymbol}
              onClick={() => onSelect(a.symbol)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
