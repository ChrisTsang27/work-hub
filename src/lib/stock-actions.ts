"use server"

// A股看板 · server actions
// 采集：东财 4 接口 → Supabase（手动触发，无定时）
// 提炼：DeepSeek 翻译成人话 → llm_items
// 查询：看板/详情/异动
import { createHash } from "crypto"
import { supabase } from "@/lib/supabase"
import {
  fetchValuations,
  fetchFinancials,
  fetchNews,
  fetchAnnouncements,
} from "@/lib/stock-eastmoney"
import {
  DEFAULT_STOCKS,
  toSecucode,
  type DashboardRow,
  type StockDetail,
  type AlertItem,
  type SentimentSummary,
} from "@/lib/stock-types"


// ---------- LLM（OpenAI 兼容 → DeepSeek） ----------
const LLM_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"
const LLM_API_KEY = process.env.DEEPSEEK_API_KEY ?? process.env.LLM_API_KEY ?? ""
const LLM_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash"

const SYSTEM_PROMPT =
  "你是 A 股信息翻译助手，把专业财经信息翻译成「普通人能看懂」的人话。\n" +
  "要求：\n" +
  "1. 忠实原文，绝不编造数字或事实；\n" +
  "2. 避免堆砌术语，专业词翻成大白话（如把「归母净利润」说成「赚到手的钱」）；\n" +
  "3. 情绪/影响判断必须基于原文事实，不臆测、不喊单；\n" +
  "4. 只输出 JSON，不要多余文字。"

async function chatJson(schemaHint: string, payload: Record<string, unknown>) {
  if (!LLM_API_KEY) throw new Error("未配置 DEEPSEEK_API_KEY（Vercel 环境变量）")
  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: schemaHint + "\n\n原始数据：\n" + JSON.stringify(payload),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`)
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

// ---------- 股票池 ----------
async function ensureStocks() {
  const { data, error } = await supabase.from("stocks").select("code").limit(1)
  if (error) throw new Error(`读股票池失败: ${error.message}`)
  if (!data || data.length === 0) {
    const { error: insErr } = await supabase.from("stocks").insert(DEFAULT_STOCKS)
    if (insErr) throw new Error(`初始化股票池失败: ${insErr.message}`)
  }
}

async function listCodes(codes?: string[]): Promise<string[]> {
  if (codes && codes.length > 0) return codes
  await ensureStocks()
  const { data, error } = await supabase
    .from("stocks")
    .select("code")
    .eq("active", true)
    .order("code")
  if (error) throw new Error(`读股票池失败: ${error.message}`)
  return (data ?? []).map((s) => s.code)
}

// ---------- M1 采集 ----------
export interface CollectResult {
  code: string
  name?: string
  valuations: number
  financials: number
  news: number
  announcements: number
}

export async function collectStocks(codes?: string[]): Promise<CollectResult[]> {
  const pool = await listCodes(codes)
  const results: CollectResult[] = []
  for (const code of pool) {
    const name =
      DEFAULT_STOCKS.find((s) => s.code === code)?.name ??
      (await stockName(code)) ??
      code
    try {
      const [valuations, financials, news, announcements] = await Promise.all([
        fetchValuations(code),
        fetchFinancials(code),
        fetchNews(code),
        fetchAnnouncements(code, daysAgo(90)),
      ])
      // 新闻 sha256 去重键（表结构要求）
      for (const n of news) n.sha256 = sha256(n.title + (n.content ?? ""))

      const ups = async (
        table: string,
        rows: any[],
        onConflict: string
      ) => {
        if (rows.length === 0) return 0
        const { error } = await supabase
          .from(table)
          .upsert(rows, { onConflict, ignoreDuplicates: false })
        if (error) throw new Error(`${table}: ${error.message}`)
        return rows.length
      }

      const [v, f, n, a] = await Promise.all([
        ups("valuations", valuations, "code,date"),
        ups("financials", financials, "code,report_period"),
        ups("news", news, "url"),
        ups("announcements", announcements, "url"),
      ])
      results.push({ code, name, valuations: v, financials: f, news: n, announcements: a })
    } catch (e) {
      results.push({
        code,
        name,
        valuations: -1,
        financials: -1,
        news: -1,
        announcements: -1,
      })
      throw new Error(`[${code}] ${name} 采集失败: ${(e as Error).message}`)
    }
  }
  return results
}

async function stockName(code: string): Promise<string | null> {
  const { data } = await supabase.from("stocks").select("name").eq("code", code).maybeSingle()
  return data?.name ?? null
}

function daysAgo(d: number): string {
  const t = new Date(Date.now() - d * 86400000)
  return t.toISOString().slice(0, 10)
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex")
}

// ---------- M2 提炼 ----------
export interface EnrichResult {
  code: string
  name?: string
  news: number
  announcements: number
  financial: number
}

export async function enrichStocks(codes?: string[]): Promise<EnrichResult[]> {
  const pool = await listCodes(codes)
  const results: EnrichResult[] = []
  for (const code of pool) {
    const name =
      DEFAULT_STOCKS.find((s) => s.code === code)?.name ??
      (await stockName(code)) ??
      code
    const secucode = toSecucode(code)
    let newsDone = 0
    let annDone = 0
    let finDone = 0
    try {
      // 1) 新闻 → 情绪 + 人话（最多 5 条未提炼的，并发调用 LLM）
      const { data: newsRows } = await supabase
        .from("news")
        .select("url,title,content,source,pub_time")
        .eq("code", code)
        .order("pub_time", { ascending: false })
        .limit(10)
      const newsTodo: NonNullable<typeof newsRows> = []
      for (const n of newsRows ?? []) {
        if (newsTodo.length >= 5) break
        const done = await llmDone(code, "news", n.url)
        if (!done) newsTodo.push(n)
      }
      const newsResults = await mapLimit(newsTodo, 3, async (n) => {
        const r = await chatJson(
          "输出 JSON 必须包含：sentiment（这只股票的消息是利好/利空/中性，三选一）, summary（一句话人话，≤40 字，说明发生了什么）, importance（对股价影响的重要程度：高/中/低）",
          {
            title: n.title,
            content: (n.content ?? "").slice(0, 3000),
            source: n.source,
            time: n.pub_time,
          }
        )
        await writeLlm({
          code,
          type: "news",
          ref_url: n.url,
          sentiment: r.sentiment ?? "中性",
          summary: r.summary ?? "",
          importance: r.importance ?? "低",
        })
        return 1
      })
      newsDone = newsResults.reduce((s, v) => s + v, 0)

      // 2) 公告 → 类型 + 人话 + 影响（最多 5 条未提炼的，并发调用 LLM）
      const { data: annRows } = await supabase
        .from("announcements")
        .select("url,title,category,pub_date")
        .eq("code", code)
        .order("pub_date", { ascending: false })
        .limit(15)
      const annTodo: NonNullable<typeof annRows> = []
      for (const a of annRows ?? []) {
        if (annTodo.length >= 5) break
        const done = await llmDone(code, "announcement", a.url)
        if (!done) annTodo.push(a)
      }
      const annResults = await mapLimit(annTodo, 3, async (a) => {
        const r = await chatJson(
          "输出 JSON 必须包含：category（公告类型：业绩预告/减持/回购/定增/分红/资产减值/人事变动/其他，选一个）, plain（一句话人话摘要，≤60 字，说清楚这公告对股民意味着什么）, impact（利好/利空/中性，三选一）",
          {
            title: a.title,
            category: a.category,
            date: a.pub_date,
          }
        )
        await writeLlm({
          code,
          type: "announcement",
          ref_url: a.url,
          category: r.category ?? "其他",
          summary: r.plain ?? "",
          impact: r.impact ?? "中性",
        })
        return 1
      })
      annDone = annResults.reduce((s, v) => s + v, 0)

      // 3) 财务 → 趋势 + 亮点 + 风险（每股一次，按最新报告期）
      const { data: finRows } = await supabase
        .from("financials")
        .select("report_period,eps,roe,gross_margin,revenue_yoy,profit_yoy")
        .eq("code", code)
        .order("report_period", { ascending: false })
        .limit(8)
      if ((finRows ?? []).length > 0) {
        const latestPeriod = finRows![0].report_period
        const done = await llmDone(code, "financial", latestPeriod)
        if (!done) {
          const r = await chatJson(
            "输出 JSON 必须包含：trend（用大白话总结这家公司最近的业绩趋势，≤80 字，如「营收连降、利润由亏转盈」）, highlights（亮点，字符串数组，无则空数组）, risks（风险点，字符串数组，无则空数组）",
            {
              "股票": `${code} ${name}（${secucode}）`,
              "财务指标（按报告期）": finRows,
            }
          )
          await writeLlm({
            code,
            type: "financial",
            ref_url: latestPeriod,
            summary: r.trend ?? "",
            extra: { highlights: r.highlights ?? [], risks: r.risks ?? [] },
          })
          finDone++
        }
      }

      results.push({ code, name, news: newsDone, announcements: annDone, financial: finDone })
    } catch (e) {
      results.push({ code, name, news: newsDone, announcements: annDone, financial: finDone })
      throw new Error(`[${code}] ${name} 提炼失败: ${(e as Error).message}`)
    }
  }
  return results
}

// 并发执行（最多 limit 个同时跑），保留顺序
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let idx = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = idx++
      if (i >= items.length) return
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

async function llmDone(code: string, type: string, refUrl: string): Promise<boolean> {
  const { data } = await supabase
    .from("llm_items")
    .select("id")
    .eq("code", code)
    .eq("type", type)
    .eq("ref_url", refUrl)
    .maybeSingle()
  return !!data
}

async function writeLlm(item: {
  code: string
  type: "news" | "announcement" | "financial"
  ref_url: string
  sentiment?: string
  impact?: string
  importance?: string
  category?: string
  summary?: string
  extra?: Record<string, unknown>
}) {
  const { error } = await supabase
    .from("llm_items")
    .upsert(item, { onConflict: "type,ref_url" })
  if (error) throw new Error(`写 llm_items 失败: ${error.message}`)
}

// ---------- 查询 ----------
export async function getDashboard(): Promise<DashboardRow[]> {
  await ensureStocks()
  const { data: stocks, error } = await supabase
    .from("stocks")
    .select("code,name")
    .eq("active", true)
    .order("code")
  if (error) throw new Error(`读股票池失败: ${error.message}`)
  const codes = (stocks ?? []).map((s) => s.code)

  const { data: valuations } = await supabase
    .from("valuations")
    .select("code,date,close,change_pct,pe_ttm,pb,market_cap")
    .in("code", codes)
  const { data: financials } = await supabase
    .from("financials")
    .select("code,report_period,roe,revenue_yoy,profit_yoy")
    .in("code", codes)
  const { data: llm } = await supabase
    .from("llm_items")
    .select("code,type,sentiment,summary")
    .in("code", codes)
    .order("created_at", { ascending: false })

  const latest = <T extends { code: string }, K extends keyof T>(
    rows: T[] | null,
    key: K
  ): Map<string, T> => {
    const m = new Map<string, T>()
    for (const r of rows ?? []) {
      const code = r.code
      const cur = m.get(code)
      if (!cur || String(r[key]) > String(cur[key])) m.set(code, r)
    }
    return m
  }
  const vMap = latest(valuations ?? [], "date")
  const fMap = latest(financials ?? [], "report_period")

  // 每只股票近 30 交易日收盘（升序，迷你走势线）
  const byCode = new Map<string, { d: string; c: number | null }[]>()
  for (const r of valuations ?? []) {
    if (r.date == null) continue
    const arr = byCode.get(r.code) ?? []
    arr.push({ d: String(r.date), c: r.close })
    byCode.set(r.code, arr)
  }
  const priceMap = new Map<string, (number | null)[]>()
  for (const [code, arr] of byCode) {
    arr.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
    priceMap.set(code, arr.slice(-30).map((x) => x.c ?? null))
  }

  // 情绪汇总
  const sentiMap = new Map<string, SentimentSummary>()
  const recentMap = new Map<string, string>()
  for (const row of llm ?? []) {
    if (!row.sentiment || !["利好", "利空", "中性"].includes(row.sentiment)) continue
    const s = sentiMap.get(row.code) ?? { counts: { 利好: 0, 利空: 0, 中性: 0 }, total: 0, bias: "中性" }
    s.counts[row.sentiment as keyof typeof s.counts]++
    s.total++
    sentiMap.set(row.code, s)
    if (row.summary && !recentMap.has(row.code)) recentMap.set(row.code, row.summary) // 倒序第一跳即最新
  }
  for (const s of sentiMap.values()) {
    if (s.total === 0) continue
    const { 利好, 利空 } = s.counts
    s.bias = 利好 > 利空 ? "偏多" : 利空 > 利好 ? "偏空" : "中性"
  }
  for (const [code, s] of sentiMap) s.recent_summary = recentMap.get(code) ?? null

  return (stocks ?? []).map((s) => {
    const v = vMap.get(s.code)
    const f = fMap.get(s.code)
    return {
      code: s.code,
      name: s.name ?? s.code,
      close: v?.close ?? null,
      change_pct: v?.change_pct ?? null,
      pe_ttm: v?.pe_ttm ?? null,
      pb: v?.pb ?? null,
      market_cap_yi: v?.market_cap != null ? v.market_cap / 1e8 : null,
      roe_latest: f?.roe ?? null,
      revenue_yoy_latest: f?.revenue_yoy ?? null,
      profit_yoy_latest: f?.profit_yoy ?? null,
      sentiment: sentiMap.get(s.code),
      recent_prices: priceMap.get(s.code),
    }
  })
}

export async function getStockDetail(code: string): Promise<StockDetail> {
  const { data: stock } = await supabase
    .from("stocks")
    .select("name")
    .eq("code", code)
    .maybeSingle()
  const { data: valuations } = await supabase
    .from("valuations")
    .select("date,close,change_pct,pe_ttm,pb,market_cap")
    .eq("code", code)
    .order("date", { ascending: false })
    .limit(1)
  const v = valuations?.[0]

  // 估值历史序列（近 120 条，图表用，转升序）
  const { data: valHist } = await supabase
    .from("valuations")
    .select("date,close,pe_ttm,pb")
    .eq("code", code)
    .order("date", { ascending: false })
    .limit(120)
  const valAsc = [...(valHist ?? [])].reverse()
  const trend: StockDetail["trend"] = {
    dates: valAsc.map((r) => String(r.date).slice(0, 10)),
    closes: valAsc.map((r) => (r.close == null ? null : Number(r.close))),
    pes: valAsc.map((r) => (r.pe_ttm == null ? null : Number(r.pe_ttm))),
    pbs: valAsc.map((r) => (r.pb == null ? null : Number(r.pb))),
  }

  // 财务序列（最近 12 期，图表用，转升序）
  const { data: finHist } = await supabase
    .from("financials")
    .select("report_period,revenue_yoy,profit_yoy,roe")
    .eq("code", code)
    .order("report_period", { ascending: false })
    .limit(12)
  const finAsc = [...(finHist ?? [])].reverse()
  const fin_trend: StockDetail["fin_trend"] = {
    periods: finAsc.map((r) => String(r.report_period).slice(0, 7)),
    revenue_yoy: finAsc.map((r) => (r.revenue_yoy == null ? null : Number(r.revenue_yoy))),
    profit_yoy: finAsc.map((r) => (r.profit_yoy == null ? null : Number(r.profit_yoy))),
    roe: finAsc.map((r) => (r.roe == null ? null : Number(r.roe))),
  }

  const { data: news } = await supabase
    .from("news")
    .select("title,url,pub_time")
    .eq("code", code)
    .order("pub_time", { ascending: false })
    .limit(10)
  const { data: anns } = await supabase
    .from("announcements")
    .select("title,url,pub_date")
    .eq("code", code)
    .order("pub_date", { ascending: false })
    .limit(10)
  const { data: llm } = await supabase
    .from("llm_items")
    .select("type,ref_url,sentiment,impact,summary")
    .eq("code", code)

  const llmByRef = new Map<string, NonNullable<typeof llm>[number]>()
  for (const row of llm ?? []) llmByRef.set(`${row.type}:${row.ref_url}`, row)

  const events: StockDetail["recent_events"] = []
  for (const n of news ?? []) {
    const l = llmByRef.get(`news:${n.url}`)
    events.push({
      kind: "新闻",
      ts: n.pub_time ?? "",
      title: n.title ?? "",
      url: n.url,
      sentiment: l?.sentiment ?? null,
      summary: l?.summary ?? null,
    })
  }
  for (const a of anns ?? []) {
    const l = llmByRef.get(`announcement:${a.url}`)
    events.push({
      kind: "公告",
      ts: a.pub_date ?? "",
      title: a.title ?? "",
      url: a.url,
      sentiment: l?.impact ?? null,
      summary: l?.summary ?? null,
    })
  }
  events.sort((x, y) => (y.ts < x.ts ? -1 : y.ts > x.ts ? 1 : 0))

  return {
    name: stock?.name ?? code,
    fundamentals: {
      code,
      quote_date: v?.date ?? null,
      close: v?.close ?? null,
      change_pct: v?.change_pct ?? null,
      pe_ttm: v?.pe_ttm ?? null,
      pb: v?.pb ?? null,
      market_cap_yi: v?.market_cap != null ? v.market_cap / 1e8 : null,
    },
    recent_events: events.slice(0, 20),
    trend,
    fin_trend,
  }
}

export async function getAlerts(): Promise<AlertItem[]> {
  const { data, error } = await supabase
    .from("llm_items")
    .select("code,type,impact,importance,category,summary")
    .or("impact.eq.利空,importance.eq.高")
    .order("created_at", { ascending: false })
    .limit(20)
  if (error) throw new Error(`读异动失败: ${error.message}`)
  const codes = [...new Set((data ?? []).map((d) => d.code))]
  const { data: stocks } = await supabase
    .from("stocks")
    .select("code,name")
    .in("code", codes.length ? codes : ["__none__"])
  const nameMap = new Map((stocks ?? []).map((s) => [s.code, s.name]))

  return (data ?? []).map((d) => ({
    kind: d.type === "news" ? "新闻" : d.type === "announcement" ? "公告" : "财报",
    category: d.category ?? null,
    impact: d.impact ?? null,
    detail: d.summary ?? null,
    name: nameMap.get(d.code) ?? d.code,
    code: d.code,
  }))
}
