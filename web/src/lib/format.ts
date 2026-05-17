export function formatPrice(n: number): string {
  return `฿${n.toFixed(2)}`
}

export function formatVol(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(n)
}

export function formatScore(n: number): string {
  return n.toFixed(1)
}

export function formatPct(n: number): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

export function scoreColor(score: number): string {
  if (score >= 75) return 'var(--purple-400)'
  if (score >= 65) return 'var(--orange-500)'
  return 'var(--yellow-400)'
}

export function changeColor(val: number | null): string {
  if (val === null) return 'var(--text-secondary)'
  return val >= 0 ? 'var(--green-400)' : 'var(--red-400)'
}

export function pivotColor(pct: number | null): string {
  if (pct === null) return 'var(--text-secondary)'
  if (pct < 0.03) return 'var(--green-400)'
  if (pct < 0.05) return 'var(--yellow-400)'
  return 'var(--text-secondary)'
}
