import { useMemo } from 'react'

interface Props {
  swingHighs: [number, number][]
  swingLows: [number, number][]
  pivotPrice: number
  width?: number
  height?: number
}

export function VcpContractionChart({
  swingHighs,
  swingLows,
  pivotPrice,
  width = 320,
  height = 80,
}: Props) {
  const svg = useMemo(() => {
    if (swingHighs.length < 2) return null

    const allPrices = [...swingHighs.map(h => h[1]), ...swingLows.map(l => l[1]), pivotPrice]
    const min = Math.min(...allPrices)
    const max = Math.max(...allPrices)
    const range = max - min || 1
    const pad = 4

    const y = (price: number) => height - pad - ((price - min) / range) * (height - pad * 2)

    const maxIdx = Math.max(...swingHighs.map(h => h[0]), ...swingLows.map(l => l[0]))
    const x = (idx: number) => pad + (idx / maxIdx) * (width - pad * 2 - width * 0.2)

    // Build zigzag path through highs and lows
    const points: [number, number][] = []

    // Alternate: high[0], low[0], high[1], low[1], ...
    const totalPoints = Math.max(swingHighs.length, swingLows.length)
    for (let i = 0; i < totalPoints; i++) {
      if (i < swingHighs.length) points.push([x(swingHighs[i]![0]), y(swingHighs[i]![1])])
      if (i < swingLows.length) points.push([x(swingLows[i]![0]), y(swingLows[i]![1])])
    }

    // Add pivot point at the right
    const pivotX = width - width * 0.1
    const pivotY = y(pivotPrice)

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`)
      .join(' ')

    // High markers
    const highDots = swingHighs.map(([idx, price]) => ({
      cx: x(idx),
      cy: y(price),
    }))

    // Low markers
    const lowDots = swingLows.map(([idx, price]) => ({
      cx: x(idx),
      cy: y(price),
    }))

    return { pathD, highDots, lowDots, pivotX, pivotY }
  }, [swingHighs, swingLows, pivotPrice, width, height])

  if (!svg) return <div className="vcp-no-data" style={{ font: '400 12px var(--font-ui)', color: 'var(--text-tertiary)' }}>Insufficient VCP data</div>

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Pivot zone */}
      <rect
        x={width * 0.8}
        y={0}
        width={width * 0.2}
        height={height}
        fill="rgba(245,105,0,0.06)"
      />
      <line
        x1={width * 0.8}
        y1={0}
        x2={width * 0.8}
        y2={height}
        stroke="rgba(245,105,0,0.3)"
        strokeDasharray="4,3"
      />

      {/* Zigzag path */}
      <path
        d={svg.pathD}
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* High dots */}
      {svg.highDots.map((d, i) => (
        <circle key={`h${i}`} cx={d.cx} cy={d.cy} r={2.5} fill="var(--red-400)" />
      ))}

      {/* Low dots */}
      {svg.lowDots.map((d, i) => (
        <circle key={`l${i}`} cx={d.cx} cy={d.cy} r={2.5} fill="var(--green-400)" />
      ))}

      {/* Pivot marker */}
      <circle cx={svg.pivotX} cy={svg.pivotY} r={3} fill="var(--orange-500)" />
      <circle
        cx={svg.pivotX}
        cy={svg.pivotY}
        r={6}
        fill="none"
        stroke="var(--orange-500)"
        strokeWidth="0.8"
        strokeDasharray="2,2"
      />
    </svg>
  )
}
