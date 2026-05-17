import { useMemo } from 'react'

interface Props {
  prices: number[]
  volumes: number[]
  width?: number
  height?: number
}

export function Sparkline({ prices, volumes, width = 120, height = 32 }: Props) {
  const svg = useMemo(() => {
    if (prices.length < 2) return null
    const VH = 8
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min || 1
    const norm = (v: number, lo: number, hi: number) => (v - lo) / (hi - lo || 1)

    const pts = prices
      .map((p, i) => {
        const x = (i / (prices.length - 1)) * width
        const y = height - norm(p, min, max) * (height - VH - 4)
        return `${x},${y}`
      })
      .join(' ')

    const maxVol = Math.max(...volumes)
    const volBars = volumes
      .map((v, i) => {
        const x = (i / volumes.length) * width
        const bh = norm(v, 0, maxVol) * VH
        const opacity = 0.3 + norm(v, 0, maxVol) * 0.5
        return `<rect x="${x}" y="${height - bh}" width="${width / volumes.length - 0.5}" height="${bh}" fill="var(--orange-500)" opacity="${opacity}"/>`
      })
      .join('')

    return { pts, volBars }
  }, [prices, volumes, width, height])

  if (!svg) return null

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g dangerouslySetInnerHTML={{ __html: svg.volBars }} />
      <polyline
        points={svg.pts}
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
