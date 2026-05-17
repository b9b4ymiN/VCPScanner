import styles from './TopBar.module.css'

export function TopBar() {
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.logo}>VCP Scanner</span>
      </div>
      <div className={styles.right}>
        <span className={styles.version}>v0.2.0</span>
      </div>
    </header>
  )
}
