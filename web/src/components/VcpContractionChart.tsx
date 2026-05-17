import { useMemo, useRef, useState, useEffect } from 'react'
import styles from './VcpContractionChart.module.css'

interface Props {
  swingHighs: [number, number][]
  swingLows: [number, number][]
  pivotPrice: number
  width?: number
  height?: number
}

function useDebouncedResize(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(320)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(Math.round(entry.contentRect.width))
      }
    })
    observer.observe(el)
    setWidth(Math.round(el.getBoundingClientRect().width))

    return () => observer.disconnect()
  }, [ref])

  return width
}

export function VcpContractionChart({
  swingHighs,
  swingLows,
  pivotPrice,
  height = 80,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartWidth = useDebouncedResize(containerRef)

  const svg = useMemo(() => {
    if (swingHighs.length < 2) return null

    const w = chartWidth
    const allPrices = [...swingHighs.map(h => h[1]), ...swingLows.map(l => l[1]), pivotPrice]
    const min = Math.min(...allPrices)
    const max = Math.max(...allPrices)
    const range = max - min || 1
    const pad = 4

    const y = (price: number) => height - pad - ((price - min) / range) * (height - pad * 2)

    const maxIdx = Math.max(...swingHighs.map(h => h[0]), ...swingLows.map(l => l[0]))
    const x = (idx: number) => pad + (idx / maxIdx) * (w - pad * 2 - w * 0.2)

    const points: [number, number][] = []
    const totalPoints = Math.max(swingHighs.length, swingLows.length)
    for (let i = 0; i < totalPoints; i++) {
      if (i < swingHighs.length) points.push([x(swingHighs[i]![0]), y(swingHighs[i]![1])])
      if (i < swingLows.length) points.push([x(swingLows[i]![0]), y(swingLows[i]![1])])
    }

    const pivotX = w - w * 0.1
    const pivotY = y(pivotPrice)

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`)
      .join(' ')

    const highDots = swingHighs.map(([idx, price]) => ({
      cx: x(idx),
      cy: y(price),
    }))

    const lowDots = swingLows.map(([idx, price]) => ({
      cx: x(idx),
      cy: y(price),
    }))

    return { pathD, highDots, lowDots, pivotX, pivotY }
  }, [swingHighs, swingLows, pivotPrice, chartWidth, height])

  if (!svg) return <div className={styles.noData}>Insufficient VCP data</div>

  return (
    <div ref={containerRef} className={styles.container}>
      <svg width={chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        <rect
          x={chartWidth * 0.8}
          y={0}
          width={chartWidth * 0.2}
          height={height}
          fill="rgba(245,105,0,0.06)"
        />
        <line
          x1={chartWidth * 0.8}
          y1={0}
          x2={chartWidth * 0.8}
          y2={height}
          stroke="rgba(245,105,0,0.3)"
          strokeDasharray="4,3"
        />

        <path
          d={svg.pathD}
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {svg.highDots.map((d, i) => (
          <circle key={`h${i}`} cx={d.cx} cy={d.cy} r={2.5} fill="var(--red-400)" />
        ))}

        {svg.lowDots.map((d, i) => (
          <circle key={`l${i}`} cx={d.cx} cy={d.cy} r={2.5} fill="var(--green-400)" />
        ))}

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
    </div>
  )
}
