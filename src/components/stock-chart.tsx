"use client"

// ECharts 轻封装：按需引入 + client-only 初始化 + 自适应 resize
import { useEffect, useRef } from "react"
import * as echarts from "echarts/core"
import { LineChart, BarChart, PieChart } from "echarts/charts"
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import type { EChartsCoreOption } from "echarts/core"

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
])

export default function StockChart({
  option,
  height = 260,
  className,
}: {
  option: EChartsCoreOption
  height?: number
  className?: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const chart = echarts.init(el)
    chartRef.current = chart
    const onResize = () => chart.resize()
    window.addEventListener("resize", onResize)
    // Dialog 开启动画期间容器未定型，延时补一次 resize
    const t = setTimeout(() => chart.resize(), 150)
    return () => {
      window.removeEventListener("resize", onResize)
      clearTimeout(t)
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    if (chartRef.current) chartRef.current.setOption(option, true)
  }, [option])

  return <div ref={boxRef} className={className} style={{ height, width: "100%" }} />
}
