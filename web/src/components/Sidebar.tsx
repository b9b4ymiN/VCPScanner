import styles from './Sidebar.module.css'

type Tab = 'alerts' | 'history' | 'config'

interface Props {
  active: Tab
  onTabChange: (tab: Tab) => void
  lastScan?: string | null
  isRunning?: boolean
}

export function Sidebar({ active, onTabChange, lastScan, isRunning }: Props) {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <button
          className={`${styles.tab} ${active === 'alerts' ? styles.active : ''}`}
          onClick={() => onTabChange('alerts')}
        >
          Alerts
        </button>
        <button
          className={`${styles.tab} ${active === 'history' ? styles.active : ''}`}
          onClick={() => onTabChange('history')}
        >
          History
        </button>
        <button
          className={`${styles.tab} ${active === 'config' ? styles.active : ''}`}
          onClick={() => onTabChange('config')}
        >
          Config
        </button>
      </nav>
      <div className={styles.meta}>
        <div className={styles.metaLabel}>Last scan</div>
        <div className={styles.metaValue}>
          {isRunning ? 'Running...' : lastScan ?? '—'}
        </div>
      </div>
    </aside>
  )
}
