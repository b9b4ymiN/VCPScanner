import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { StatBar } from './components/StatBar'
import { FilterBar } from './components/FilterBar'
import { AlertTable } from './components/AlertTable'
import { DetailPanel } from './components/DetailPanel'
import { HistoryView } from './components/HistoryView'
import { ConfigView } from './components/ConfigView'
import { ToastContainer } from './components/Toast'
import { useAlerts, useStatus } from './api/hooks'
import { useUiStore } from './stores/ui'
import styles from './App.module.css'

export function App() {
  const {
    selectedSymbol,
    levelFilter,
    minScore,
    searchQuery,
    sidebarTab,
    setSelectedSymbol,
    setLevelFilter,
    setMinScore,
    setSearchQuery,
    setSidebarTab,
  } = useUiStore()

  const { data: alertsData, isLoading } = useAlerts({
    level: levelFilter ?? undefined,
    minScore,
  })

  const { data: status } = useStatus()

  const selectedAlert = alertsData?.alerts.find(a => a.symbol === selectedSymbol) ?? null

  const filteredAlerts = (alertsData?.alerts ?? []).filter(a => {
    if (!searchQuery) return true
    const q = searchQuery.toUpperCase()
    return a.symbol.toUpperCase().includes(q) || (a.name?.toUpperCase().includes(q) ?? false)
  })

  const lastScan = status?.lastScan?.finishedAt
    ? new Date(status.lastScan.finishedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      <TopBar />
      <div className={styles.body}>
        <Sidebar
          active={sidebarTab}
          onTabChange={setSidebarTab}
          lastScan={lastScan}
          isRunning={status?.scheduler.isRunning}
        />
        <main className={styles.main}>
          {sidebarTab === 'alerts' && (
            <>
              <StatBar alerts={filteredAlerts} />
              <FilterBar
                levelFilter={levelFilter}
                onLevelChange={setLevelFilter}
                minScore={minScore}
                onMinScoreChange={setMinScore}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
              <div className={styles.content}>
                {isLoading ? (
                  <div className={styles.loading}>
                    <div className="skeleton" style={{ width: '100%', height: 48 }} />
                    <div className="skeleton" style={{ width: '100%', height: 48 }} />
                    <div className="skeleton" style={{ width: '100%', height: 48 }} />
                  </div>
                ) : (
                  <AlertTable
                    alerts={filteredAlerts}
                    selectedSymbol={selectedSymbol}
                    onSelect={setSelectedSymbol}
                  />
                )}
              </div>
            </>
          )}
          {sidebarTab === 'history' && <HistoryView />}
          {sidebarTab === 'config' && <ConfigView />}
        </main>
        {selectedAlert && sidebarTab === 'alerts' && (
          <DetailPanel alert={selectedAlert} onClose={() => setSelectedSymbol(null)} />
        )}
      </div>
      <ToastContainer />
    </>
  )
}
