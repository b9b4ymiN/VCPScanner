import { List } from '@phosphor-icons/react'
import { useUiStore } from '../stores/ui'
import styles from './TopBar.module.css'

export function TopBar() {
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <button className={styles.hamburger} onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <List size={22} />
        </button>
        <img className={styles.mark} src="/icon.svg" alt="" aria-hidden="true" />
        <span className={styles.logo}>VCP Scanner</span>
      </div>
      <div className={styles.right}>
        <span className={styles.version}>v0.2.0</span>
      </div>
    </header>
  )
}
