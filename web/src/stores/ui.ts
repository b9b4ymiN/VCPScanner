import { create } from 'zustand'
import type { AlertLevel } from '../api/types'

interface UiState {
  selectedSymbol: string | null
  levelFilter: AlertLevel | null
  minScore: number
  searchQuery: string
  sidebarTab: 'alerts' | 'history' | 'config'

  setSelectedSymbol: (symbol: string | null) => void
  setLevelFilter: (level: AlertLevel | null) => void
  setMinScore: (score: number) => void
  setSearchQuery: (q: string) => void
  setSidebarTab: (tab: UiState['sidebarTab']) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedSymbol: null,
  levelFilter: null,
  minScore: 60,
  searchQuery: '',
  sidebarTab: 'alerts',

  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setLevelFilter: (level) => set({ levelFilter: level }),
  setMinScore: (score) => set({ minScore: score }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
}))
