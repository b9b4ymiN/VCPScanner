import { useStatus, useTriggerScan } from '../api/hooks'
import styles from './ConfigView.module.css'

export function ConfigView() {
  const { data: status, isLoading } = useStatus()
  const triggerScan = useTriggerScan()

  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <div className="skeleton" style={{ width: '100%', height: 200 }} />
      </div>
    )
  }

  const lastScan = status?.lastScan

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Config</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Scanner</h3>
        <div className={styles.grid}>
          <span className={styles.label}>Status</span>
          <span className={styles.value}>
            {status?.scheduler.isRunning ? (
              <span className={styles.running}>
                <span className={styles.dot} />
                Running
              </span>
            ) : (
              'Idle'
            )}
          </span>

          <span className={styles.label}>Last scan</span>
          <span className={styles.value}>
            {lastScan?.finishedAt
              ? new Date(lastScan.finishedAt).toLocaleString('th-TH')
              : 'Never'}
          </span>

          <span className={styles.label}>Scanned</span>
          <span className={styles.value}>{lastScan?.totalScanned ?? '—'}</span>

          <span className={styles.label}>Passed</span>
          <span className={styles.value}>{lastScan?.totalPassed ?? '—'}</span>

          <span className={styles.label}>Status</span>
          <span className={styles.value}>{lastScan?.status ?? '—'}</span>
        </div>

        {lastScan?.errorMsg && (
          <div className={styles.error}>{lastScan.errorMsg}</div>
        )}

        <button
          className={styles.scanBtn}
          onClick={() => triggerScan.mutate()}
          disabled={triggerScan.isPending || status?.scheduler.isRunning}
        >
          {triggerScan.isPending ? 'Triggering...' : 'Run Scan Now'}
        </button>
        {triggerScan.isSuccess && (
          <div className={styles.success}>Scan queued successfully</div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Server</h3>
        <div className={styles.grid}>
          <span className={styles.label}>Version</span>
          <span className={styles.value}>{status?.version ?? '—'}</span>
          <span className={styles.label}>Market</span>
          <span className={styles.value}>SET</span>
          <span className={styles.label}>Strategy</span>
          <span className={styles.value}>VCP Minervini</span>
          <span className={styles.label}>Schedule</span>
          <span className={styles.value}>16:30 Mon-Fri (Bangkok)</span>
        </div>
      </section>
    </div>
  )
}
