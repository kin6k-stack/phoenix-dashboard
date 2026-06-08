// ============================================================
// /api/ticker (GET) — v2.0
// Primary: TwelveData (uses TWELVEDATA_API_KEY — already in Vercel env)
// Fallback: Yahoo Finance v7 (blocked by Vercel IPs → mock if fails)
// Cache: 45 min in-memory
// ============================================================
import { NextResponse } from "next/server"

const CACHE_TTL = 45 * 60 * 1000
let _cache: { data: TickerItem[]; expiresAt: number } | null = null

export interface TickerItem {
  symbol: string; label: string; price: number
  change: number; changePct: number; isPos: boolean
}

// ── TwelveData symbol map ────────────────────────────────────────────────
const TD_SYMBOLS: { td: string; label: string }[] = [
  { td: "XAU/USD",  label: "GOLD"    },
  { td: "NDX",      label: "NQ100"   },
  { td: "BTC/USD",  label: "BTC"     },
  { td: "EUR/USD",  label: "EUR/USD" },
  { td: "GBP/USD",  label: "GBP/USD" },
  { td: "USD/JPY",  label: "USD/JPY" },
  { td: "WTI/USD",  label: "WTI"     },
  { td: "DXY",      label: "DXY"     },
  { td: "ETH/USD",  label: "ETH"     },
  { td: "US10Y",    label: "US10Y"   },
]

// ── Yahoo fallback symbol map ─────────────────────────────────────────────
const YH_SYMBOLS: { yahoo: string; label: string }[] = [
  { yahoo: "GC=F",      label: "GOLD"    },
  { yahoo: "NQ=F",      label: "NQ100"   },
  { yahoo: "BTC-USD",   label: "BTC"     },
  { yahoo: "EURUSD=X",  label: "EUR/USD" },
  { yahoo: "GBPUSD=X",  label: "GBP/USD" },
  { yahoo: "USDJPY=X",  label: "USD/JPY" },
  { yahoo: "CL=F",      label: "WTI"     },
  { yahoo: "DX-Y.NYB",  label: "DXY"     },
  { yahoo: "^TNX",      label: "US10Y"   },
  { yahoo: "ETH-USD",   label: "ETH"     },
]

// ── Mock fallback ─────────────────────────────────────────────────────────
const MOCK: TickerItem[] = [
  { symbol:"XAU/USD",  label:"GOLD",    price:3142.50, change:12.30,   changePct: 0.39, isPos:true  },
  { symbol:"NDX",      label:"NQ100",   price:19823,   change:-24.00,  changePct:-0.12, isPos:false },
  { symbol:"BTC/USD",  label:"BTC",     price:67842,   change:831.00,  changePct: 1.24, isPos:true  },
  { symbol:"EUR/USD",  label:"EUR/USD", price:1.0892,  change:0.0023,  changePct: 0.21, isPos:true  },
  { symbol:"GBP/USD",  label:"GBP/USD", price:1.2734,  change:-0.003,  changePct:-0.24, isPos:false },
  { symbol:"USD/JPY",  label:"USD/JPY", price:149.52,  change:0.34,    changePct: 0.23, isPos:true  },
  { symbol:"WTI/USD",  label:"WTI",     price:78.14,   change:-0.98,   changePct:-1.24, isPos:false },
  { symbol:"DXY",      label:"DXY",     price:104.23,  change:-0.18,   changePct:-0.17, isPos:false },
  { symbol:"US10Y",    label:"US10Y",   price:4.31,    change:-0.04,   changePct:-0.92, isPos:false },
  { symbol:"ETH/USD",  label:"ETH",     price:3341,    change:45.00,   changePct: 1.37, isPos:true  },
]

// ── TwelveData fetch ──────────────────────────────────────────────────────
async function fetchTwelveData(): Promise<TickerItem[]> {
  const apiKey = process.env.TWELVEDATA_API_KEY
  if (!apiKey) throw new Error("TWELVEDATA_API_KEY not set")

  const syms = TD_SYMBOLS.map(s => s.td).join(",")
  const url  = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms)}&apikey=${apiKey}&dp=4`

  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`TwelveData ${res.status}`)

  const json = await res.json()
  // TwelveData returns an error object for the whole batch if all fail
  if (json.status === "error") throw new Error(`TwelveData error: ${json.message}`)

  return TD_SYMBOLS.map(({ td, label }) => {
    const q = json[td]
    if (!q || q.status === "error") {
      // Return mock for this symbol if not available on free tier
      return MOCK.find(m => m.label === label) ?? {
        symbol: td, label, price: 0, change: 0, changePct: 0, isPos: true
      }
    }
    const change = parseFloat(q.change ?? "0")
    return {
      symbol:    td,
      label,
      price:     parseFloat(q.close ?? q.price ?? "0"),
      change,
      changePct: parseFloat(q.percent_change ?? "0"),
      isPos:     change >= 0,
    }
  })
}

// ── Yahoo fallback ────────────────────────────────────────────────────────
async function fetchYahoo(): Promise<TickerItem[]> {
  const syms = YH_SYMBOLS.map(s => encodeURIComponent(s.yahoo)).join(",")
  const url  = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${syms}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent&formatted=false`
  const res  = await fetch(url, {
    headers: { "User-Agent":"Mozilla/5.0 (compatible; Phoenix-Dashboard/2.0)" },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Yahoo ${res.status}`)
  const json = await res.json()
  const quotes = json?.quoteResponse?.result ?? []
  if (!quotes.length) throw new Error("Empty Yahoo response")
  return quotes.map((q: any) => {
    const meta = YH_SYMBOLS.find(s => s.yahoo === q.symbol)
    const chg  = q.regularMarketChange ?? 0
    return {
      symbol:    q.symbol,
      label:     meta?.label ?? q.symbol,
      price:     q.regularMarketPrice ?? 0,
      change:    chg,
      changePct: q.regularMarketChangePercent ?? 0,
      isPos:     chg >= 0,
    }
  })
}

// ── Handler ───────────────────────────────────────────────────────────────
export async function GET() {
  try {
    if (_cache && Date.now() < _cache.expiresAt)
      return NextResponse.json({ items: _cache.data, cached: true, source: "cache" })

    // 1. Try TwelveData first
    try {
      const items = await fetchTwelveData()
      _cache = { data: items, expiresAt: Date.now() + CACHE_TTL }
      return NextResponse.json({ items, cached: false, source: "twelvedata" })
    } catch (tdErr) {
      console.warn("[ticker] TwelveData failed, trying Yahoo:", tdErr)
    }

    // 2. Yahoo fallback
    try {
      const items = await fetchYahoo()
      _cache = { data: items, expiresAt: Date.now() + CACHE_TTL }
      return NextResponse.json({ items, cached: false, source: "yahoo" })
    } catch (yhErr) {
      console.warn("[ticker] Yahoo Finance failed, using mock:", yhErr)
    }

    // 3. Stale cache or mock
    const items = _cache?.data ?? MOCK
    return NextResponse.json({ items, cached: false, source: "mock" })

  } catch (err) {
    console.error("[ticker] Unhandled:", err)
    return NextResponse.json({ items: MOCK, cached: false, source: "mock" })
  }
}