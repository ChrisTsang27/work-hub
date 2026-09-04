"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { TrendingUp, RefreshCw, Loader2, AlertTriangle, Sparkles, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  getDashboard,
  getStockDetail,
  getAlerts,
  collectStocks,
  enrichStocks,
  type CollectResult,
  type EnrichResult,
} from "@/lib/stock-actions"
import type {
  DashboardRow,
  StockDetail,
  AlertItem,
  SentimentSummary,
} from "@/lib/stock-types"
import StockChart from "@/components/stock-chart"
import AnimatedNumber from "@/components/stock-animated-number"
import Sparkline from "@/components/stock-sparkline"

const SORT_OPTIONS = [
  { value: "pe_ttm", label: "PE(TTM)" },
  { value: "pb", label: "PB" },
  { value: "roe_latest", label: "ROE" },
  { value: "revenue_yoy_latest", label: "营收增速" },
  { value: "profit_yoy_latest", label: "利润增速" },
  { value: "market_cap_yi", label: "市值" },
  { value: "change_pct", label: "涨跌幅" },
]

// A股配色：红涨绿跌
const COL = { up: "#ef4444", down: "#10b981", flat: "#9ca3af", line: "#f59e0b", blue: "#3b82f6" }

const RANGES = [
  { label: "近1月", days: 21 },
  { label: "近3月", days: 66 },
  { label: "全部", days: 0 }, // 0 = 不过滤
] as const
type RangeDays = (typeof RANGES)[number]["days"]

function pct(v?: number | null) {
  if (v == null) return "—"
  return (v > 0 ? "+" : "") + Number(v).toFixed(2) + "%"
}
function num(v?: number | null, d = 2) {
  return v == null || isNaN(v) ? "—" : Number(v).toFixed(d)
}
function signCls(v?: number | null) {
  return v == null ? "text-muted-foreground" : v > 0 ? "text-red-500" : v < 0 ? "text-emerald-600" : "text-muted-foreground"
}
function peText(v?: number | null) {
  if (v == null) return "—"
  if (v < 0) return <span className="text-emerald-600">亏损</span>
  return num(v, 1)
}

function sentiChip(s: string, n: number) {
  const cls = s === "利好" ? "bg-red-100 text-red-700" : s === "利空" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs whitespace-nowrap", cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s === "利好" ? "bg-red-500" : s === "利空" ? "bg-emerald-500" : "bg-muted-foreground")} />
      {s} {n}
    </span>
  )
}
function sentimentBadge(s?: SentimentSummary) {
  if (!s || s.total === 0) return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">暂无</span>
  return (
    <span className="inline-flex items-center gap-1" title={s.recent_summary ?? undefined}>
      {sentiChip("利好", s.counts.利好)}
      {sentiChip("利空", s.counts.利空)}
      {sentiChip("中性", s.counts.中性)}
    </span>
  )
}
function sentiBadge(s?: string | null) {
  if (!s) return null
  const cls = s === "利好" ? "bg-red-100 text-red-700" : s === "利空" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
  return <span className={cn("rounded-full px-2 py-0.5 text-xs whitespace-nowrap", cls)}>{s}</span>
}

// ---------- 主题感知的 ECharts option ----------
function baseTheme(isDark: boolean) {
  return {
    axisLabel: { color: isDark ? "#a1a1aa" : "#71717a", fontSize: 10 },
    splitLine: { lineStyle: { color: isDark ? "#27272a" : "#f1f1f3", width: 1 } },
    axisLine: { lineStyle: { color: isDark ? "#3f3f46" : "#e4e4e7" } },
    tooltip: {
      backgroundColor: isDark ? "#18181b" : "#ffffff",
      borderColor: isDark ? "#3f3f46" : "#e4e4e7",
      textStyle: { color: isDark ? "#e4e4e7" : "#18181b", fontSize: 11 },
    },
    legendText: { color: isDark ? "#d4d4d8" : "#52525b", fontSize: 11 },
  }
}

function pieOption(counts: { 利好: number; 利空: number; 中性: number }, isDark: boolean) {
  const t = baseTheme(isDark)
  const data = [
    { name: "利好", value: counts.利好, itemStyle: { color: COL.up } },
    { name: "利空", value: counts.利空, itemStyle: { color: COL.down } },
    { name: "中性", value: counts.中性, itemStyle: { color: COL.flat } },
  ].filter((d) => d.value > 0)
  return {
    tooltip: { ...t.tooltip, trigger: "item", formatter: "{b}：{c} 条（{d}%）" },
    legend: { bottom: 0, icon: "circle", itemWidth: 8, itemHeight: 8, textStyle: t.legendText },
    animationDuration: 800,
    animationEasing: "cubicOut" as const,
    series: [
      {
        type: "pie",
        radius: ["44%", "72%"],
        center: ["50%", "44%"],
        itemStyle: { borderRadius: 5, borderColor: isDark ? "#18181b" : "#fff", borderWidth: 2 },
        label: { show: true, formatter: "{b}\n{c}", fontSize: 10, color: isDark ? "#d4d4d8" : "#52525b" },
        data,
      },
    ],
  }
}

function priceOption(t?: StockDetail["trend"], isDark = false) {
  const b = baseTheme(isDark)
  return {
    tooltip: { ...b.tooltip, trigger: "axis" },
    grid: { left: 8, right: 8, top: 26, bottom: 4, containLabel: true },
    xAxis: { type: "category", data: t?.dates ?? [], boundaryGap: false, axisLabel: b.axisLabel, axisLine: b.axisLine },
    yAxis: { type: "value", scale: true, axisLabel: b.axisLabel, splitLine: b.splitLine },
    animationDuration: 900,
    animationEasing: "cubicOut" as const,
    series: [
      {
        name: "收盘价",
        type: "line",
        data: t?.closes ?? [],
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: COL.line },
        itemStyle: { color: COL.line },
        areaStyle: { opacity: 0.12, color: COL.line },
      },
    ],
  }
}

function valOption(t?: StockDetail["trend"], isDark = false) {
  const b = baseTheme(isDark)
  return {
    tooltip: { ...b.tooltip, trigger: "axis" },
    legend: { top: 0, icon: "circle", itemWidth: 8, itemHeight: 8, textStyle: b.legendText },
    grid: { left: 8, right: 8, top: 30, bottom: 4, containLabel: true },
    xAxis: { type: "category", data: t?.dates ?? [], boundaryGap: false, axisLabel: b.axisLabel, axisLine: b.axisLine },
    yAxis: [
      { type: "value", name: "PE", scale: true, axisLabel: b.axisLabel, splitLine: b.splitLine, nameTextStyle: { color: isDark ? "#a1a1aa" : "#71717a", fontSize: 10 } },
      { type: "value", name: "PB", scale: true, axisLabel: b.axisLabel, splitLine: { show: false }, nameTextStyle: { color: isDark ? "#a1a1aa" : "#71717a", fontSize: 10 } },
    ],
    animationDuration: 900,
    animationEasing: "cubicOut" as const,
    series: [
      { name: "PE(TTM)", type: "line", data: t?.pes ?? [], yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { width: 2, color: COL.up }, itemStyle: { color: COL.up } },
      { name: "PB", type: "line", data: t?.pbs ?? [], yAxisIndex: 1, smooth: true, showSymbol: false, lineStyle: { width: 2, color: COL.blue }, itemStyle: { color: COL.blue } },
    ],
  }
}

function finOption(f?: StockDetail["fin_trend"], isDark = false) {
  const b = baseTheme(isDark)
  return {
    tooltip: { ...b.tooltip, trigger: "axis", valueFormatter: (v: any) => (v == null ? "—" : Number(v).toFixed(1) + "%") },
    legend: { top: 0, icon: "circle", itemWidth: 8, itemHeight: 8, textStyle: b.legendText },
    grid: { left: 8, right: 8, top: 30, bottom: 4, containLabel: true },
    xAxis: { type: "category", data: f?.periods ?? [], axisLabel: b.axisLabel, axisLine: b.axisLine },
    yAxis: [
      { type: "value", axisLabel: { ...b.axisLabel, formatter: "{value}%" }, splitLine: b.splitLine },
      { type: "value", scale: true, axisLabel: { ...b.axisLabel, formatter: "{value}%" }, splitLine: { show: false } },
    ],
    animationDuration: 900,
    animationEasing: "cubicOut" as const,
    series: [
      { name: "营收同比", type: "bar", data: f?.revenue_yoy ?? [], barMaxWidth: 16, itemStyle: { color: COL.line, borderRadius: [3, 3, 0, 0] } },
      { name: "利润同比", type: "bar", data: f?.profit_yoy ?? [], barMaxWidth: 16, itemStyle: { color: COL.blue, borderRadius: [3, 3, 0, 0] } },
      { name: "ROE", type: "line", data: f?.roe ?? [], yAxisIndex: 1, smooth: true, showSymbol: true, symbolSize: 5, lineStyle: { width: 2, color: COL.up }, itemStyle: { color: COL.up } },
    ],
  }
}

// ---------- 详情弹窗小组件 ----------
function SentimentGroup({ title, items, accent }: { title: string; items: StockDetail["recent_events"]; accent: string }) {
  if (items.length === 0) return null
  return (
    <details className="group rounded-md border px-3 py-2" open={title === "利空"}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium">
        <span className={cn("h-2 w-2 rounded-full", accent)} />
        {title} · {items.length} 条
        <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-2 space-y-2">
        {items.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 shrink-0 text-muted-foreground">{e.ts?.slice(0, 10)}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{e.title}</div>
              {e.summary && <div className="mt-0.5 text-muted-foreground">💬 {e.summary}</div>}
            </div>
          </li>
        ))}
      </ul>
    </details>
  )
}

const containerV = { show: { transition: { staggerChildren: 0.07 } } }
const itemV = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
}

export default function StockPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const [rows, setRows] = useState<DashboardRow[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [sortBy, setSortBy] = useState("pe_ttm")
  const [ascending, setAscending] = useState(true)
  const [detail, setDetail] = useState<StockDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [tab, setTab] = useState("overview")
  const [range, setRange] = useState<RangeDays>(66)
  const [loading, setLoading] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [collectCode, setCollectCode] = useState<string | null>(null)
  const [enrichCode, setEnrichCode] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 5000)
  }

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await getDashboard())
    } catch (e) {
      showToast(`加载失败: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAlerts = useCallback(async () => {
    try {
      setAlerts(await getAlerts())
    } catch {
      /* 静默 */
    }
  }, [])

  useEffect(() => {
    loadRows()
    loadAlerts()
  }, [loadRows, loadAlerts])

  const openDetail = async (code: string) => {
    setLoadingDetail(true)
    setDetail(null)
    setTab("overview")
    setRange(66)
    try {
      setDetail(await getStockDetail(code))
    } catch (e) {
      showToast(`详情加载失败: ${(e as Error).message}`)
    } finally {
      setLoadingDetail(false)
    }
  }

  const fmtCounts = (r: CollectResult | EnrichResult) => {
    const c = r as CollectResult
    if ("valuations" in c) {
      return `估值${c.valuations}条 · 财务${c.financials}条 · 新闻${c.news}条 · 公告${c.announcements}条`
    }
    const e = r as EnrichResult
    return `新闻${e.news}条 · 公告${e.announcements}条 · 财报${e.financial}条`
  }

  const collectAll = async () => {
    setCollecting(true)
    setLastResult(null)
    try {
      const results = await collectStocks()
      setLastResult("抓取完成：" + results.map((r) => `${r.name}(${fmtCounts(r)})`).join("；"))
      showToast("抓取完成，列表已刷新")
    } catch (e) {
      showToast(`抓取失败: ${(e as Error).message}`)
    }
    await loadRows()
    setCollecting(false)
  }

  const collectOne = async (code: string) => {
    setCollectCode(code)
    try {
      const results = await collectStocks([code])
      showToast(`已抓取 ${results[0]?.name ?? code}（${fmtCounts(results[0])}）`)
    } catch (e) {
      showToast(`抓取失败: ${(e as Error).message}`)
    }
    await loadRows()
    setCollectCode(null)
  }

  const enrichAll = async () => {
    setEnriching(true)
    setLastResult(null)
    try {
      const results = await enrichStocks()
      setLastResult("提炼完成：" + results.map((r) => `${r.name}(${fmtCounts(r)})`).join("；"))
      showToast("提炼完成，人话解读已更新")
    } catch (e) {
      showToast(`提炼失败: ${(e as Error).message}`)
    }
    await loadRows()
    await loadAlerts()
    setEnriching(false)
  }

  const enrichOne = async (code: string) => {
    setEnrichCode(code)
    try {
      const results = await enrichStocks([code])
      showToast(`已提炼 ${results[0]?.name ?? code}（${fmtCounts(results[0])}）`)
    } catch (e) {
      showToast(`提炼失败: ${(e as Error).message}`)
    }
    await loadRows()
    await loadAlerts()
    setEnrichCode(null)
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortBy as keyof DashboardRow]
    const bv = b[sortBy as keyof DashboardRow]
    const an = typeof av === "number" ? av : null
    const bn = typeof bv === "number" ? bv : null
    if (an == null && bn == null) return 0
    if (an == null) return 1
    if (bn == null) return -1
    return ascending ? an - bn : bn - an
  })

  const busy = collecting || enriching

  // 时间范围切片
  const slicedTrend = useMemo(() => {
    const t = detail?.trend
    if (!t || range === 0) return t
    const n = Math.min(range, t.dates.length)
    return {
      dates: t.dates.slice(-n),
      closes: t.closes.slice(-n),
      pes: t.pes.slice(-n),
      pbs: t.pbs.slice(-n),
    }
  }, [detail?.trend, range])

  // 情绪分组与统计
  const groupedEvents = useMemo(() => {
    if (!detail) return { 利好: [], 利空: [], 中性: [] } as Record<string, StockDetail["recent_events"]>
    const g: Record<string, StockDetail["recent_events"]> = { 利好: [], 利空: [], 中性: [] }
    for (const e of detail.recent_events) {
      const s = e.sentiment
      if (s && s in g) g[s].push(e)
    }
    return g
  }, [detail])
  const detailCounts = useMemo(
    () => ({ 利好: groupedEvents.利好.length, 利空: groupedEvents.利空.length, 中性: groupedEvents.中性.length }),
    [groupedEvents]
  )
  const hasEvents = detailCounts.利好 + detailCounts.利空 + detailCounts.中性 > 0
  const hasTrend = (detail?.trend?.dates.length ?? 0) > 1
  const hasFin = (detail?.fin_trend?.periods.length ?? 0) > 0
  const fundUp = (detail?.fundamentals.change_pct ?? 0) >= 0

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <TrendingUp className="h-6 w-6" /> 股票
          </h2>
          <p className="mt-1 text-muted-foreground">自选股票池 · 行情估值 + 人话解读（仅供个人研究，不构成投资建议）</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={enrichAll} disabled={busy}>
            {enriching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            提炼
          </Button>
          <Button size="sm" onClick={collectAll} disabled={busy}>
            {collecting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            抓取
          </Button>
        </div>
      </div>

      {toast && <div className="rounded-md border bg-background px-4 py-2 text-sm">{toast}</div>}
      {lastResult && <div className="rounded-md border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">{lastResult}</div>}

      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className={cn("flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs", a.impact === "利空" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10")}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <strong>{a.name}</strong>
              <span className="text-muted-foreground">{a.kind}{a.category ? `/${a.category}` : ""}</span>
              <span>{a.detail || ""}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* 迷你仪表卡 */}
      {rows.length > 0 && (
        <motion.div variants={containerV} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => {
            const up = (s.change_pct ?? 0) >= 0
            const bias = s.sentiment?.bias
            return (
              <motion.button
                key={s.code}
                variants={itemV}
                onClick={() => openDetail(s.code)}
                className="group relative overflow-hidden rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* 顶部光带 */}
                <span className={cn("absolute inset-x-0 top-0 h-0.5 transition-colors", up ? "bg-red-400" : "bg-emerald-400")} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{s.name || s.code}</span>
                      <span className="text-xs text-muted-foreground">{s.code}</span>
                    </div>
                    <AnimatedNumber
                      value={s.close}
                      decimals={2}
                      prefix="¥"
                      className={cn("text-2xl font-bold tabular-nums", signCls(s.change_pct))}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <AnimatedNumber
                      value={s.change_pct}
                      decimals={2}
                      suffix="%"
                      duration={600}
                      className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", up ? "bg-red-100 text-red-700 dark:bg-red-500/15" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15")}
                    />
                    {bias && (
                      <span className={cn("text-[10px]", bias === "偏多" ? "text-red-500" : bias === "偏空" ? "text-emerald-500" : "text-muted-foreground")}>
                        {bias === "偏多" ? "▲ 情绪偏多" : bias === "偏空" ? "▼ 情绪偏空" : "— 情绪中性"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <Sparkline data={s.recent_prices ?? []} up={up} width={120} height={34} />
                  <span className="pb-0.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">查看详情 →</span>
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">股票池明细（{rows.length}）</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>按 {o.label}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={() => setAscending(!ascending)}>
              {ascending ? "升序 ↑" : "降序 ↓"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无数据，点右上角「抓取」采集（首抓会先写入默认股票池）</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">股票</th>
                    <th className="py-2 pr-3 text-right font-medium">收盘</th>
                    <th className="py-2 pr-3 text-right font-medium">涨跌幅</th>
                    <th className="py-2 pr-3 text-right font-medium">PE(TTM)</th>
                    <th className="py-2 pr-3 text-right font-medium">PB</th>
                    <th className="py-2 pr-3 text-right font-medium">市值(亿)</th>
                    <th className="py-2 pr-3 text-right font-medium">ROE</th>
                    <th className="py-2 pr-3 text-right font-medium">营收增速</th>
                    <th className="py-2 pr-3 text-right font-medium">情绪</th>
                    <th className="py-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s, i) => (
                    <tr key={s.code} onClick={() => openDetail(s.code)} className="cursor-pointer border-b transition-colors hover:bg-accent/50">
                      <td className="py-2 pr-3">
                        <span className="font-medium">{s.name || s.code}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{s.code}</span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{num(s.close)}</td>
                      <td className={cn("py-2 pr-3 text-right tabular-nums", signCls(s.change_pct))}>{pct(s.change_pct)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{peText(s.pe_ttm)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{num(s.pb)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{num(s.market_cap_yi, 1)}</td>
                      <td className={cn("py-2 pr-3 text-right tabular-nums", signCls(s.roe_latest))}>{pct(s.roe_latest)}</td>
                      <td className={cn("py-2 pr-3 text-right tabular-nums", signCls(s.revenue_yoy_latest))}>{pct(s.revenue_yoy_latest)}</td>
                      <td className="py-2 text-right">{sentimentBadge(s.sentiment)}</td>
                      <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy || enrichCode === s.code} onClick={() => enrichOne(s.code)} title="提炼这一只">
                            {enrichCode === s.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            提炼
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy || collectCode === s.code} onClick={() => collectOne(s.code)} title="只抓这一只">
                            {collectCode === s.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            抓取
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">顶部卡片或表格行均可点开详情（概览/走势/财务/事件）。情绪徽章悬停看最近一条解读。</p>
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[92vh] w-[94vw] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.name}（{detail?.fundamentals.code}）
              <span className="ml-2 text-xs font-normal text-muted-foreground">行情 {detail?.fundamentals.quote_date || "—"}</span>
            </DialogTitle>
          </DialogHeader>
          {loadingDetail && <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> 加载中…</div>}
          {detail && !loadingDetail && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="space-y-4"
            >
              {/* 指标卡 */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { label: "收盘", node: <AnimatedNumber value={detail.fundamentals.close} className={cn("text-lg font-bold tabular-nums", signCls(detail.fundamentals.change_pct))} /> },
                  { label: "涨跌幅", node: <AnimatedNumber value={detail.fundamentals.change_pct} suffix="%" className={cn("text-lg font-bold tabular-nums", signCls(detail.fundamentals.change_pct))} /> },
                  { label: "PE(TTM)", node: <div className="text-lg font-bold tabular-nums">{peText(detail.fundamentals.pe_ttm)}</div> },
                  { label: "PB", node: <div className="text-lg font-bold tabular-nums">{num(detail.fundamentals.pb)}</div> },
                  { label: "市值(亿)", node: <AnimatedNumber value={detail.fundamentals.market_cap_yi} decimals={1} className="text-lg font-bold tabular-nums" /> },
                ].map((it) => (
                  <div key={it.label} className="rounded-lg border bg-muted/30 px-3 py-2 dark:bg-muted/10">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{it.label}</div>
                    {it.node}
                  </div>
                ))}
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">概览</TabsTrigger>
                  <TabsTrigger value="charts" className="flex-1" disabled={!hasTrend}>走势</TabsTrigger>
                  <TabsTrigger value="financial" className="flex-1" disabled={!hasFin}>财务</TabsTrigger>
                  <TabsTrigger value="events" className="flex-1">事件</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="pt-3">
                  <div className="space-y-3">
                    {hasEvents ? (
                      <div className="grid gap-3 sm:grid-cols-[240px_1fr]">
                        <div className="rounded-lg border p-1">
                          <StockChart option={pieOption(detailCounts, isDark)} height={180} />
                        </div>
                        <div className="space-y-2">
                          <SentimentGroup title="利好" items={groupedEvents.利好} accent="bg-red-500" />
                          <SentimentGroup title="利空" items={groupedEvents.利空} accent="bg-emerald-500" />
                          <SentimentGroup title="中性" items={groupedEvents.中性} accent="bg-muted-foreground" />
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                        暂无已提炼的情绪，切到「事件」或点右上角「提炼」生成人话解读
                      </p>
                    )}
                    {!hasFin && (
                      <p className="text-xs text-muted-foreground">（财务数据未采集时可忽略「财务」页签）</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="charts" className="pt-3">
                  <div className="space-y-4">
                    <div className="flex items-center justify-end gap-1">
                      {RANGES.map((r) => (
                        <Button
                          key={r.days}
                          size="sm"
                          variant={range === r.days ? "default" : "outline"}
                          className="h-7 px-3 text-xs"
                          onClick={() => setRange(r.days)}
                        >
                          {r.label}
                        </Button>
                      ))}
                    </div>
                    <div>
                      <h4 className="mb-1 text-sm font-semibold">股价走势（近 {slicedTrend?.dates.length ?? 0} 日）</h4>
                      <StockChart option={priceOption(slicedTrend, isDark)} height={240} />
                    </div>
                    <div>
                      <h4 className="mb-1 text-sm font-semibold">估值趋势（PE / PB）</h4>
                      <StockChart option={valOption(slicedTrend, isDark)} height={240} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="pt-3">
                  <h4 className="mb-1 text-sm font-semibold">财务趋势（营收/利润同比 · ROE）</h4>
                  <StockChart option={finOption(detail.fin_trend, isDark)} height={280} />
                  <p className="mt-2 text-xs text-muted-foreground">柱状为同比增速（%），红线为 ROE（右轴）。数据来自各报告期财务指标。</p>
                </TabsContent>

                <TabsContent value="events" className="pt-3">
                  {detail.recent_events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无事件，点「抓取」后再「提炼」生成人话解读</p>
                  ) : (
                    <ul className="space-y-2">
                      {detail.recent_events.map((e, i) => (
                        <li key={i} className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
                          <span className="shrink-0 text-xs text-muted-foreground">{e.ts?.slice(0, 10)}</span>
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{e.kind}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{e.title}</div>
                            {e.summary && <div className="mt-0.5 text-xs text-muted-foreground">💬 {e.summary}</div>}
                          </div>
                          {sentiBadge(e.sentiment)}
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
