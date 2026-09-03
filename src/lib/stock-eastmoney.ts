// A股看板 · 东财采集层（Node fetch 直调，已用 curl 验证 4 个接口）
// 估值: datacenter-web.eastmoney.com/api/data/v1/get (RPT_VALUEANALYSIS_DET)
// 财务: datacenter.eastmoney.com/securities/api/data/get (RPT_F10_FINANCE_MAINFINADATA)
// 新闻: search-api-web.eastmoney.com/search/jsonp (JSONP)
// 公告: np-anotice-stock.eastmoney.com/api/security/ann
import type { Valuation, Financial, NewsItem, Announcement } from "./stock-types"
import { toSecucode } from "./stock-types"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"

async function getJson(url: string, referer?: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "*/*",
      ...(referer ? { Referer: referer } : {}),
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url.slice(0, 80)}`)
  return res.json()
}

const num = (v: any): number | null =>
  v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v)
const str = (v: any): string => (v === null || v === undefined ? "" : String(v))
const date10 = (v: any): string => str(v).slice(0, 10)

// ---------- 1. 估值（每日收盘/PE/PB/市值） ----------
export async function fetchValuations(code: string): Promise<Valuation[]> {
  const params = new URLSearchParams({
    sortColumns: "TRADE_DATE",
    sortTypes: "-1",
    pageSize: "250", // 约一年交易日，够看趋势
    pageNumber: "1",
    reportName: "RPT_VALUEANALYSIS_DET",
    columns: "ALL",
    quoteColumns: "",
    source: "WEB",
    client: "WEB",
    filter: `(SECURITY_CODE="${code}")`,
  })
  const data = await getJson(
    `https://datacenter-web.eastmoney.com/api/data/v1/get?${params}`
  )
  const rows = data?.result?.data ?? []
  return rows.map((r: any) => ({
    code,
    date: date10(r.TRADE_DATE),
    close: num(r.CLOSE_PRICE),
    change_pct: num(r.CHANGE_RATE),
    market_cap: num(r.TOTAL_MARKET_CAP),
    float_cap: num(r.NOTLIMITED_MARKETCAP_A),
    pe_ttm: num(r.PE_TTM),
    pe_static: num(r.PE_LAR),
    pb: num(r.PB_MRQ),
    peg: num(r.PEG_CAR),
    ps: num(r.PS_TTM),
  }))
}

// ---------- 2. 财务指标（每报告期） ----------
export async function fetchFinancials(code: string): Promise<Financial[]> {
  const secucode = toSecucode(code)
  const params = new URLSearchParams({
    type: "RPT_F10_FINANCE_MAINFINADATA",
    sty: "APP_F10_MAINFINADATA",
    quoteColumns: "",
    filter: `(SECUCODE="${secucode}")`,
    p: "1",
    ps: "100",
    sr: "-1",
    st: "REPORT_DATE",
    source: "HSF10",
    client: "PC",
  })
  const data = await getJson(
    `https://datacenter.eastmoney.com/securities/api/data/get?${params}`
  )
  const rows = data?.result?.data ?? []
  return rows.map((r: any) => ({
    code,
    report_period: date10(r.REPORT_DATE),
    eps: num(r.EPSJB),
    roe: num(r.ROEJQ),
    gross_margin: num(r.XSMLL),
    revenue_yoy: num(r.TOTALOPERATEREVETZ),
    profit_yoy: num(r.PARENTNETPROFITTZ),
  }))
}

// ---------- 3. 个股新闻（JSONP，含全文） ----------
export async function fetchNews(code: string): Promise<NewsItem[]> {
  const innerParam = {
    uid: "",
    keyword: code,
    type: ["cmsArticleWebOld"],
    client: "web",
    clientType: "web",
    clientVersion: "curr",
    param: {
      cmsArticleWebOld: {
        searchScope: "default",
        sort: "default",
        pageIndex: 1,
        pageSize: 10,
        preTag: "<em>",
        postTag: "</em>",
      },
    },
  }
  const params = new URLSearchParams({
    cb: "cb",
    param: JSON.stringify(innerParam),
    _: String(Date.now()),
  })
  const url = `https://search-api-web.eastmoney.com/search/jsonp?${params}`
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Referer: `https://so.eastmoney.com/news/s?keyword=${code}`,
      Host: "search-api-web.eastmoney.com",
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`新闻接口 HTTP ${res.status}`)
  const text = await res.text()
  // 剥 JSONP 回调: cb({...})
  const jsonText = text.replace(/^cb\(/, "").replace(/\)\s*;?\s*$/, "")
  const data = JSON.parse(jsonText)
  const rows = data?.result?.cmsArticleWebOld ?? []

  const clean = (s: string) =>
    s
      .replace(/\(<em>/g, "(")
      .replace(/<\/em>\)/g, ")")
      .replace(/<em>/g, "")
      .replace(/<\/em>/g, "")
      .trim()

  return rows.map((r: any) => ({
    code,
    title: clean(str(r.title)),
    content: clean(str(r.content)),
    pub_time: str(r.date),
    source: str(r.mediaName),
    url: `http://finance.eastmoney.com/a/${str(r.code)}.html`,
    sha256: "",
  }))
}

// ---------- 4. 公告（东财公告大全，分页） ----------
export async function fetchAnnouncements(
  code: string,
  beginDate?: string
): Promise<Announcement[]> {
  const out: Announcement[] = []
  const pageSize = 50
  const totalPages = 2 // 只看最近两页（约 100 条），看板够用
  for (let page = 1; page <= totalPages; page++) {
    const params = new URLSearchParams({
      sr: "-1",
      page_size: String(pageSize),
      page_index: String(page),
      ann_type: "A",
      client_source: "web",
      f_node: "0",
      s_node: "0",
      stock_list: code,
    })
    if (beginDate) {
      params.set("begin_time", beginDate)
      params.set("end_time", new Date().toISOString().slice(0, 10))
    }
    const data = await getJson(
      `https://np-anotice-stock.eastmoney.com/api/security/ann?${params}`
    )
    const list = data?.data?.list ?? []
    if (list.length === 0) break
    for (const item of list) {
      const stockCode =
        item?.codes?.find((c: any) => c.ann_type?.startsWith("A"))?.stock_code ?? code
      const category = item?.columns?.[0]?.column_name ?? null
      out.push({
        code,
        title: str(item.title),
        category,
        pub_date: date10(item.notice_date),
        url: `https://data.eastmoney.com/notices/detail/${stockCode}/${str(item.art_code)}.html`,
      })
    }
    if (list.length < pageSize) break
  }
  return out
}
