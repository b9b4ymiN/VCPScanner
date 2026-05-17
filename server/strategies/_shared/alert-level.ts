// Alert level classification — BLUEPRINT Section 1.4
// ⚠️ IMMUTABLE — ห้ามเปลี่ยน logic

import type { AlertLevel } from '../../core/types'

export function classifyAlert(input: {
  vcpQualityScore: number
  sepaScore: number
  pivotDistancePct: number
}): AlertLevel {
  const { vcpQualityScore: q, sepaScore: s, pivotDistancePct: pd } = input
  if (q >= 8 && s >= 75 && pd < 0.03) return 'HIGH'
  if (q >= 5 && s >= 65 && pd < 0.05) return 'MEDIUM'
  return 'WATCH'
}
