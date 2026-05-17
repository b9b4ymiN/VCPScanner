export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const squareDiffs = values.map(v => (v - avg) ** 2)
  return Math.sqrt(squareDiffs.reduce((s, v) => s + v, 0) / values.length)
}
