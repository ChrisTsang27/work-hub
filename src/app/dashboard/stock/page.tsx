"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, RefreshCw, Loader2, AlertTriangle, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
} from "@/lib/stock-types"

const SORT_OPTIONS = [
  { value: "pe_ttm", label: "PE(TTM)" },
  { value: "pb", label: "PB" },
  { value: "roe_latest", label: "ROE" },
  { value: "revenue_yoy_latest", label: "营收增速" },
  { value: "profit_yoy_latest", label: "利润增速" },
  { value: "market_cap_yi", label: "市值" },
  { value: "change_pct", label: "涨跌幅" },
]

function pct(v?: number | null) {
  if (v == null) return "—"
  return (v > 0 ? "+" : "") + Number(v).toFixed(2) + "%"
}
function num(v?: number | null, d = 2) {
  return v == null || isNaN(v) ? "—" : Number(v).toFixed(d)
}
function sign(v?: number | null) {
  return v == null ? "text-muted-foreground" : v > 0 ? "text-red-500" : v < 0 ? "text-emerald-600" : "text-muted-foreground"
}
function peText(v?: number | null) {
  if (v == null) return "—"
  if (v < 0) return <span className="text-emerald-600">亏损</span>
  return num(v, 1)
}
function sentimentBadge(s?: { bias?: string; counts?: { 利好: number; 利空: number; 中性: number }; total?: number }) {
  if (!s || !s.total) return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">暂无</span>
  const cls = s.bias === "偏多" ? "bg-red-100 text-red-700" : s.bias === "偏空" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs whitespace-nowrap", cls)}>
      {s.bias} {s.counts!.利好}/{s.counts!.利空}/{s.counts!.中性}
    </span>
  )
}
function sentiBadge(s?: string | null) {
  if (!s) return null
  const cls = s === "利好" ? "bg-red-100 text-red-700" : s === "利空" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
  return <span className={cn("rounded-full px-2 py-0.5 text-xs whitespace-nowrap", cls)}>{s}</span>
}

export default function StockPage() {
  const [rows, setRows] = useState<DashboardRow[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [sortBy, setSortBy] = useState("pe_ttm")
  const [ascending, setAscending] = useState(true)
  const [detail, setDetail] = useState<StockDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
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
            <div key={i} className={cn("flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs", a.impact === "利空" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800")}>
              <AlertTriangle className="h-3.5 w-3.5" />
              <strong>{a.name}</strong>
              <span className="text-muted-foreground">{a.kind}{a.category ? `/${a.category}` : ""}</span>
              <span>{a.detail || ""}</span>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">股票池（{rows.length}）</CardTitle>
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
                  {sorted.map((s) => (
                    <tr key={s.code} onClick={() => openDetail(s.code)} className="cursor-pointer border-b transition-colors hover:bg-accent/50">
                      <td className="py-2 pr-3">
                        <span className="font-medium">{s.name || s.code}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{s.code}</span>
                      </td>
                      <td className="py-2 pr-3 text-right">{num(s.close)}</td>
                      <td className={cn("py-2 pr-3 text-right", sign(s.change_pct))}>{pct(s.change_pct)}</td>
                      <td className="py-2 pr-3 text-right">{peText(s.pe_ttm)}</td>
                      <td className="py-2 pr-3 text-right">{num(s.pb)}</td>
                      <td className="py-2 pr-3 text-right">{num(s.market_cap_yi, 1)}</td>
                      <td className={cn("py-2 pr-3 text-right", sign(s.roe_latest))}>{pct(s.roe_latest)}</td>
                      <td className={cn("py-2 pr-3 text-right", sign(s.revenue_yoy_latest))}>{pct(s.revenue_yoy_latest)}</td>
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
          <p className="mt-2 text-xs text-muted-foreground">点击某行查看详情（人话解读 + 事件时间线）。右上「抓取」= 拉东财数据，「提炼」= DeepSeek 翻译成人话，均手动触发。</p>
        </CardContent>
      </Card>

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[90vh] w-[94vw] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.name}（{detail?.fundamentals.code}）
              <span className="ml-2 text-xs font-normal text-muted-foreground">行情日期 {detail?.fundamentals.quote_date || "—"}</span>
            </DialogTitle>
          </DialogHeader>
          {loadingDetail && <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> 加载中…</div>}
          {detail && !loadingDetail && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-6">
                <div><div className="text-xs text-muted-foreground">收盘</div><div className={cn("text-lg font-semibold", sign(detail.fundamentals.change_pct))}>{num(detail.fundamentals.close)}</div></div>
                <div><div className="text-xs text-muted-foreground">涨跌幅</div><div className={cn("text-lg font-semibold", sign(detail.fundamentals.change_pct))}>{pct(detail.fundamentals.change_pct)}</div></div>
                <div><div className="text-xs text-muted-foreground">PE(TTM)</div><div className="text-lg font-semibold">{peText(detail.fundamentals.pe_ttm)}</div></div>
                <div><div className="text-xs text-muted-foreground">PB</div><div className="text-lg font-semibold">{num(detail.fundamentals.pb)}</div></div>
                <div><div className="text-xs text-muted-foreground">市值(亿)</div><div className="text-lg font-semibold">{num(detail.fundamentals.market_cap_yi, 1)}</div></div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold">事件时间线（近 {detail.recent_events.length} 条）</h4>
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
