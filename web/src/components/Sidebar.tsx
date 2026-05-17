import { Bell, ChartLineUp, ClockCounterClockwise, Gear, X } from '@phosphor-icons/react'
import styles from './Sidebar.module.css'

type Tab = 'alerts' | 'history' | 'config' | 'portfolio'

interface Props {
  active: Tab
  onTabChange: (tab: Tab) => void
  lastScan?: string | null
  isRunning?: boolean
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ active, onTabChange, lastScan, isRunning, open, onClose }: Props) {
  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <div className={styles.mobileHeader}>
          <span className={styles.mobileTitle}>Menu</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className={styles.nav}>
          <button
            className={`${styles.tab} ${active === 'alerts' ? styles.active : ''}`}
            onClick={() => onTabChange('alerts')}
          >
            <Bell size={18} />
            <span className={styles.navLabel}>Alerts</span>
          </button>
          <button
            className={`${styles.tab} ${active === 'history' ? styles.active : ''}`}
            onClick={() => onTabChange('history')}
          >
            <ClockCounterClockwise size={18} />
            <span className={styles.navLabel}>History</span>
          </button>
          <button
            className={`${styles.tab} ${active === 'portfolio' ? styles.active : ''}`}
            onClick={() => onTabChange('portfolio')}
          >
            <ChartLineUp size={18} />
            <span className={styles.navLabel}>Portfolio</span>
          </button>
          <button
            className={`${styles.tab} ${active === 'config' ? styles.active : ''}`}
            onClick={() => onTabChange('config')}
          >
            <Gear size={18} />
            <span className={styles.navLabel}>Config</span>
          </button>
        </nav>
        <div className={styles.meta}>
          <div className={styles.metaLabel}>Last scan</div>
          <div className={styles.metaValue}>
            {isRunning ? 'Running...' : lastScan ?? '—'}
          </div>
        </div>
      </aside>
    </>
  )
}
