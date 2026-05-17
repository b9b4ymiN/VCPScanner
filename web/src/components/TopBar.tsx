import { useEffect } from 'react'
import { List, Eye } from '@phosphor-icons/react'
import { useUiStore } from '../stores/ui'
import { useViews, useTrackView } from '../api/hooks'
import styles from './TopBar.module.css'

export function TopBar() {
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const { data: views } = useViews()
  const trackView = useTrackView()

  useEffect(() => { trackView.mutate() }, [])

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
        {views && (
          <span className={styles.counter}>
            <Eye size={14} />
            <span>{views.today.toLocaleString()} / {views.total.toLocaleString()}</span>
          </span>
        )}
        <span className={styles.version}>v0.3.0</span>
      </div>
    </header>
  )
}
