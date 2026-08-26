"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, RefreshCw, Rocket, Loader2, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Job {
  id: number
  scope: string
  mode: string
  status: string
  result: string | null
  error: string | null
  created_at: string
  finished_at: string | null
}

interface KbItem {
  id: number
  slug: string
  title_zh: string | null
  title_en: string | null
  price: string | null
  currency: string | null
  category: string | null
  updated_at: string | null
}

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: "排队中", cls: "bg-yellow-100 text-yellow-800" },
  running: { label: "运行中", cls: "bg-blue-100 text-blue-800" },
  done: { label: "已完成", cls: "bg-green-100 text-green-800" },
  failed: { label: "失败", cls: "bg-red-100 text-red-800" },
}

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, { ...opts, cache: "no-store" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? data?.detail ?? `请求失败 (${res.status})`)
  return data
}

export default function KnowledgePage() {
  const [url, setUrl] = useState("")
  const [mode, setMode] = useState<"incremental" | "full">("incremental")
  const [triggering, setTriggering] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [items, setItems] = useState<KbItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
interface BilingualSection {
  key: string
  name_zh: string
  name_en: string
  zh: string
  en: string
}

interface BilingualDetail {
  title_en: string
  title_zh: string
  price: string
  sections: BilingualSection[]
}

  const [detail, setDetail] = useState<BilingualDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const loadJobs = useCallback(async () => {
    try {
      setJobs(await api("/api/knowledge/jobs?limit=5"))
    } catch (e) {
      /* 静默 */
    }
  }, [])

  const loadItems = useCallback(async () => {
    setLoadingItems(true)
    try {
      setItems(await api("/api/knowledge/items"))
    } catch (e) {
      showToast(`加载失败: ${(e as Error).message}`)
    } finally {
      setLoadingItems(false)
    }
  }, [])

  // 有运行中的任务时每 5 秒轮询
  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === "pending" || j.status === "running")
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(() => {
        loadJobs()
        loadItems()
      }, 5000)
    } else if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [jobs, loadJobs, loadItems])

  useEffect(() => {
    loadJobs()
    loadItems()
  }, [loadJobs, loadItems])

  const openDetail = async (item: KbItem) => {
    setLoadingDetail(true)
    setDetail({
      title_en: item.title_en || item.slug,
      title_zh: item.title_zh || item.slug,
      price: item.price ? `${item.price} ${item.currency ?? ""}` : "",
      sections: [],
    })
    try {
      const d = await api(`/api/knowledge/items/${item.slug}`)
      const b = d.bilingual
      if (b) {
        setDetail({
          title_en: b.title_en || item.title_en || item.slug,
          title_zh: b.title_zh || item.title_zh || item.slug,
          price: b.price || "",
          sections: b.sections ?? [],
        })
      } else {
        setDetail({
          title_en: d.title_en || item.title_en || item.slug,
          title_zh: d.title_zh || item.title_zh || item.slug,
          price: "",
          sections: [],
        })
      }
    } catch (e) {
      setDetail({
        title_en: item.title_en || item.slug,
        title_zh: item.title_zh || item.slug,
        price: "",
        sections: [],
      })
    } finally {
      setLoadingDetail(false)
    }
  }

  const triggerCrawl = async () => {
    setTriggering(true)
    try {
      const scope = url.trim() ? `url:${url.trim()}` : "all"
      await api("/api/knowledge/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, mode }),
      })
      showToast("任务已创建，正在抓取…")
      setUrl("")
      await loadJobs()
    } catch (e) {
      showToast(`创建任务失败: ${(e as Error).message}`)
    } finally {
      setTriggering(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> 知识库
          </h2>
          <p className="text-muted-foreground mt-1">
            手动抓取公司网站/任意网页，自动整理成双语知识条目
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadItems} disabled={loadingItems}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loadingItems && "animate-spin")} />
          刷新
        </Button>
      </div>

      {toast && (
        <div className="rounded-md border bg-background px-4 py-2 text-sm">{toast}</div>
      )}

      {/* 手动抓取控制台 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4" /> 手动抓取
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="输入网址（留空 = 抓取全部已配置源）"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="max-w-md"
            />
            <div className="flex rounded-md border overflow-hidden">
              <button
                type="button"
                onClick={() => setMode("incremental")}
                className={cn(
                  "px-3 py-2 text-sm transition-colors",
                  mode === "incremental" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
              >
                增量
              </button>
              <button
                type="button"
                onClick={() => setMode("full")}
                className={cn(
                  "px-3 py-2 text-sm transition-colors",
                  mode === "full" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
              >
                全量
              </button>
            </div>
            <Button onClick={triggerCrawl} disabled={triggering}>
              {triggering ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              立即抓取
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            增量 = 只处理有变化的内容（推荐）｜全量 = 重新抓取所有内容
          </p>
        </CardContent>
      </Card>

      {/* 最近任务 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近任务</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无任务记录</p>
          ) : (
            jobs.map((j) => {
              const st = statusMap[j.status] ?? { label: j.status, cls: "" }
              const scopeLabel = j.scope.startsWith("url:")
                ? `URL: ${j.scope.slice(4).slice(0, 50)}`
                : j.scope === "all" ? "全部源" : j.scope
              return (
                <div key={j.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">#{j.id}</span>{" "}
                    <span className="text-muted-foreground">{scopeLabel}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {j.mode === "full" ? "全量" : "增量"} · {j.created_at}
                    </span>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", st.cls)}>
                    {st.label}
                  </span>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* 知识库条目 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> 知识条目（{items.length}）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              还没有条目。点击"立即抓取"开始建库。
            </p>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                onClick={() => openDetail(it)}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{it.title_zh || it.title_en}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {it.title_en}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {it.price && (
                    <span className="text-sm font-semibold">
                      {it.price} {it.currency}
                    </span>
                  )}
                  {it.category && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs">
                      {it.category}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {it.updated_at?.slice(0, 16)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 条目详情：左右分栏（左中右英） */}
      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 shrink-0" />
                <span className="truncate">{detail?.title_zh || "详情"}</span>
              </span>
              {detail?.price && (
                <span className="shrink-0 text-lg font-bold text-primary">
                  {detail.price}
                </span>
              )}
              {loadingDetail && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
            </DialogTitle>
            {detail?.title_en && (
              <p className="text-sm text-muted-foreground truncate">{detail.title_en}</p>
            )}
          </DialogHeader>
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
            {/* 中文栏 */}
            <div className="rounded-md border bg-muted/30 p-4">
              <h3 className="mb-2 text-sm font-bold text-muted-foreground">中文</h3>
              <div className="space-y-4">
                {detail?.sections.map((s) => (
                  <div key={s.key}>
                    <h4 className="mb-1 text-sm font-semibold">{s.name_zh}</h4>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {s.zh || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {/* 英文栏 */}
            <div className="rounded-md border bg-muted/30 p-4">
              <h3 className="mb-2 text-sm font-bold text-muted-foreground">English</h3>
              <div className="space-y-4">
                {detail?.sections.map((s) => (
                  <div key={s.key}>
                    <h4 className="mb-1 text-sm font-semibold">{s.name_en}</h4>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {s.en || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="self-end" onClick={() => setDetail(null)}>
            关闭
          </Button>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
