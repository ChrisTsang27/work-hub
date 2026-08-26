import { NextRequest, NextResponse } from "next/server"

const VPS_URL = process.env.VPS_SERVICE_URL ?? "http://127.0.0.1:18000"
const VPS_TOKEN = process.env.VPS_API_TOKEN ?? "dev-token-change-me"

type Ctx = { params: Promise<{ path: string[] }> }

async function proxy(req: NextRequest, ctx: Ctx, method: string) {
  const { path } = await ctx.params
  const body = method === "GET" ? undefined : await req.text()
  try {
    const res = await fetch(
      `${VPS_URL}/api/${path.join("/")}${req.nextUrl.search}`,
      {
        method,
        headers: {
          "x-api-token": VPS_TOKEN,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        body,
        cache: "no-store",
      }
    )
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    })
  } catch (err) {
    return NextResponse.json(
      { error: `VPS 服务不可达: ${(err as Error).message}` },
      { status: 502 }
    )
  }
}

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx, "GET")
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx, "POST")
}
