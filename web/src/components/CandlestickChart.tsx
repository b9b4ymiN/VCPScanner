import { useEffect, useRef } from 'react'
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
  type SeriesMarker,
  ColorType,
  LineStyle,
} from 'lightweight-charts'
import type { OhlvBar } from '../api/types'
import styles from './CandlestickChart.module.css'

interface Props {
  data: OhlvBar[]
  swingHighs?: [number, number][]
  swingLows?: [number, number][]
  pivotPrice?: number
}

export function CandlestickChart({ data, swingHighs, swingLows, pivotPrice }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const container = containerRef.current

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#18181C' },
        textColor: '#8B8A96',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(32,32,40,0.5)' },
        horzLines: { color: 'rgba(32,32,40,0.5)' },
      },
      crosshair: {
        vertLine: { color: '#FF7A1A', width: 1, style: LineStyle.Dashed },
        horzLine: { color: '#FF7A1A', width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: '#202028',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: '#202028',
        timeVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: { vertTouchDrag: false },
    })

    chartRef.current = chart

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderUpColor: '#22C55E',
      borderDownColor: '#EF4444',
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    })

    const candleData: CandlestickData<Time>[] = data.map(d => ({
      time: d.date as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))
    candleSeries.setData(candleData)

    // Volume histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    const volumeData: HistogramData<Time>[] = data.map(d => ({
      time: d.date as Time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
    }))
    volumeSeries.setData(volumeData)

    // Pivot price line
    if (pivotPrice) {
      candleSeries.createPriceLine({
        price: pivotPrice,
        color: '#F56900',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Pivot',
      })
    }

    // Swing markers
    const markers: SeriesMarker<Time>[] = []

    if (swingHighs) {
      for (const [idx] of swingHighs) {
        if (idx >= 0 && idx < data.length) {
          markers.push({
            time: data[idx]!.date as Time,
            position: 'aboveBar',
            color: '#EF4444',
            shape: 'arrowDown',
            text: 'H',
          })
        }
      }
    }

    if (swingLows) {
      for (const [idx] of swingLows) {
        if (idx >= 0 && idx < data.length) {
          markers.push({
            time: data[idx]!.date as Time,
            position: 'belowBar',
            color: '#22C55E',
            shape: 'arrowUp',
            text: 'L',
          })
        }
      }
    }

    if (markers.length > 0) {
      markers.sort((a, b) => (a.time as string).localeCompare(b.time as string))
      createSeriesMarkers(candleSeries, markers)
    }

    chart.timeScale().fitContent()

    // Responsive resize
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          chart.resize(width, height)
        }
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [data, swingHighs, swingLows, pivotPrice])

  return <div ref={containerRef} className={styles.container} />
}
