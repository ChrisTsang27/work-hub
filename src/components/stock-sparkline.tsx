"use client"

// 迷你走势线（SVG 手绘，零依赖）：涨色/跌色 + 末端圆点 + 渐变填充
import { useId } from "react"

export default function Sparkline({
  data,
  width = 96,
  height = 30,
  up,
  className,
}: {
  data: (number | null)[]
  width?: number
  height?: number
  up: boolean
  className?: string
}) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "")
  const vals = data.filter((v): v is number => v != null)
  if (vals.length < 2) return <div className={className} style={{ width, height }} />

  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const pad = 2
  const stepX = (width - pad * 2) / (vals.length - 1)
  const pts = vals.map((v, i) => ({
    x: pad + i * stepX,
    y: pad + (height - pad * 2) * (1 - (v - min) / span),
  }))
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${height} L${pts[0].x.toFixed(1)},${height} Z`
  const last = pts[pts.length - 1]
  const color = up ? "#ef4444" : "#10b981"

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={`sg-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="2.2" fill={color} />
    </svg>
  )
}
