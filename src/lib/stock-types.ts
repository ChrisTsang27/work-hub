// A股看板 · 类型定义（对应 supabase-schema.sql 的 8 张表）

export interface Stock {
  code: string
  name: string
  market?: string
  active?: boolean
  added_at?: string
}

export interface Valuation {
  code: string
  date: string
  close?: number | null
  change_pct?: number | null
  market_cap?: number | null
  float_cap?: number | null
  pe_ttm?: number | null
  pe_static?: number | null
  pb?: number | null
  peg?: number | null
  ps?: number | null
}

export interface Financial {
  code: string
  report_period: string
  eps?: number | null
  roe?: number | null
  gross_margin?: number | null
  revenue_yoy?: number | null
  profit_yoy?: number | null
}

export interface NewsItem {
  code: string
  title: string
  content?: string | null
  pub_time?: string | null
  source?: string | null
  url: string
  sha256?: string | null
}

export interface Announcement {
  code: string
  title: string
  category?: string | null
  pub_date?: string | null
  url: string
}

export interface LlmItem {
  id?: number
  code: string
  type: "news" | "announcement" | "financial"
  ref_url: string
  sentiment?: string | null
  impact?: string | null
  importance?: string | null
  category?: string | null
  summary?: string | null
  extra?: Record<string, unknown> | null
}

// 前端看板行
export interface SentimentSummary {
  counts: { 利好: number; 利空: number; 中性: number }
  total: number
  bias: string
  /** 最近一条人话摘要（悬停 tooltip 用） */
  recent_summary?: string | null
}

export interface DashboardRow {
  code: string
  name?: string
  close?: number | null
  change_pct?: number | null
  pe_ttm?: number | null
  pb?: number | null
  market_cap_yi?: number | null
  roe_latest?: number | null
  revenue_yoy_latest?: number | null
  profit_yoy_latest?: number | null
  sentiment?: SentimentSummary
  /** 近 30 交易日收盘（升序，迷你走势线用） */
  recent_prices?: (number | null)[]
}

export interface EventItem {
  kind: string
  ts: string
  title: string
  url?: string
  sentiment?: string | null
  summary?: string | null
}

export interface StockDetail {
  name: string
  fundamentals: {
    code: string
    quote_date?: string | null
    close?: number | null
    change_pct?: number | null
    pe_ttm?: number | null
    pb?: number | null
    market_cap_yi?: number | null
  }
  recent_events: EventItem[]
  /** 估值历史序列（近 ~120 天，画走势/估值趋势图） */
  trend?: {
    dates: string[]
    closes: (number | null)[]
    pes: (number | null)[]
    pbs: (number | null)[]
  }
  /** 财务序列（各报告期，画财务趋势图） */
  fin_trend?: {
    periods: string[]
    revenue_yoy: (number | null)[]
    profit_yoy: (number | null)[]
    roe: (number | null)[]
  }
}

export interface AlertItem {
  kind: string
  category?: string | null
  impact?: string | null
  detail?: string | null
  summary?: string | null
  name: string
  code: string
}

// 默认股票池（stocks 表为空时种入）
export const DEFAULT_STOCKS = [
  { code: "300142", name: "沃森生物", market: "创业板" },
  { code: "300122", name: "智飞生物", market: "创业板" },
  { code: "603392", name: "万泰生物", market: "沪市主板" },
]

// 代码 → 东财 SECUCODE 市场后缀（财务接口需要）
export function toSecucode(code: string): string {
  if (code.startsWith("6") || code.startsWith("9")) return `${code}.SH`
  if (code.startsWith("4") || code.startsWith("8")) return `${code}.BJ`
  return `${code}.SZ`
}
