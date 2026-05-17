import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAlerts, fetchHistory, fetchStatus, fetchStockDetail, triggerScan } from './client'

export function useAlerts(params: {
  date?: string
  level?: string
  minScore?: number
  ttMin?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => fetchAlerts({ ...params, limit: 100 }),
  })
}

export function useHistory(days: number = 30) {
  return useQuery({
    queryKey: ['history', days],
    queryFn: () => fetchHistory(days),
  })
}

export function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
    refetchInterval: 30_000,
  })
}

export function useStockDetail(symbol: string | null, date?: string) {
  return useQuery({
    queryKey: ['stock', symbol, date],
    queryFn: () => fetchStockDetail(symbol!, date),
    enabled: !!symbol,
  })
}

export function useTriggerScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: triggerScan,
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['alerts'] })
        qc.invalidateQueries({ queryKey: ['status'] })
      }, 2000)
    },
  })
}
