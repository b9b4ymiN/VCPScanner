import { create } from 'zustand'
import type { AlertLevel } from '../api/types'

interface UiState {
  selectedSymbol: string | null
  selectedDate: string | null
  levelFilter: AlertLevel | null
  minScore: number
  ttFilter: number | null
  searchQuery: string
  sidebarTab: 'alerts' | 'history' | 'config'
  sidebarOpen: boolean

  setSelectedSymbol: (symbol: string | null) => void
  setSelectedDate: (date: string | null) => void
  clearSelectedDate: () => void
  setLevelFilter: (level: AlertLevel | null) => void
  setMinScore: (score: number) => void
  setTtFilter: (filter: number | null) => void
  setSearchQuery: (q: string) => void
  setSidebarTab: (tab: UiState['sidebarTab']) => void
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedSymbol: null,
  selectedDate: null,
  levelFilter: null,
  minScore: 60,
  ttFilter: null,
  searchQuery: '',
  sidebarTab: 'alerts',
  sidebarOpen: false,

  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  clearSelectedDate: () => set({ selectedDate: null }),
  setLevelFilter: (level) => set({ levelFilter: level }),
  setMinScore: (score) => set({ minScore: score }),
  setTtFilter: (filter) => set({ ttFilter: filter }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSidebarTab: (tab) => set({ sidebarTab: tab, sidebarOpen: false }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
