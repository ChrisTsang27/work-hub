"use client"

// 数字滚动动画：值变化时从旧值缓动到新值（挂载时从 0 滚入）
import { useEffect, useRef, useState } from "react"

export default function AnimatedNumber({
  value,
  decimals = 2,
  duration = 700,
  prefix = "",
  suffix = "",
  className,
}: {
  value?: number | null
  decimals?: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const fromRef = useRef(0)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value == null || isNaN(value)) return
    const from = fromRef.current
    const to = value
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setDisplay(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  if (value == null || isNaN(value)) return <span className={className}>—</span>

  return (
    <span className={className}>
      {prefix}
      {display.toLocaleString("zh-CN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  )
}
