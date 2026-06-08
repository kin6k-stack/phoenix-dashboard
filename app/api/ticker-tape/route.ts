// ============================================================
// /api/ticker (GET)
// Pass D — Live Price Ticker
//
// Fetches real-time quotes from Yahoo Finance (no API key).
// 60-second in-memory cache to avoid rate limits.
// Mock fallback if Yahoo Finance is unavailable.
//
// Symbols: Gold, NQ100, BTC, ETH, EUR/USD, GBP/USD,
//          USD/JPY, WTI Oil, DXY, US 10Y Yield
// ============================================================

import { NextResponse } from "next/server"

// ── 60-second cache ───────────────────────────────────────────────────────
const CACHE_TTL = 60_000
let _cache: { data: TickerItem[]; expiresAt: number } | null = null

// ── Types ─────────────────────────────────────────────────────────────────
export interface TickerItem {
  symbol:    string   // Yahoo symbol, e.g. "GC=F"
  label:     string   // Display label, e.g. "GOLD"
  price:     number
  change:    number
  changePct: number
  isPos:     boolean
}

// ── Symbol map ────────────────────────────────────────────────────────────
const SYMBOLS: { yahoo: string; label: string }[] = [
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

// ── Mock (realistic at time of writing) ─────────────────────────────────
const MOCK: TickerItem[] = [
  { symbol:"GC=F",     label:"GOLD",    price:3142.50, change:12.30,  changePct: 0.39,  isPos:true  },
  { symbol:"NQ=F",     label:"NQ100",   price:19823,   change:-24.00, changePct:-0.12,  isPos:false },
  { symbol:"BTC-USD",  label:"BTC",     price:67842,   change:831.00, changePct: 1.24,  isPos:true  },
  { symbol:"EURUSD=X", label:"EUR/USD", price:1.0892,  change:0.0023, changePct: 0.21,  isPos:true  },
  { symbol:"GBPUSD=X", label:"GBP/USD", price:1.2734,  change:-0.003, changePct:-0.24,  isPos:false },
  { symbol:"USDJPY=X", label:"USD/JPY", price:149.52,  change:0.34,   changePct: 0.23,  isPos:true  },
  { symbol:"CL=F",     label:"WTI",     price:78.14,   change:-0.98,  changePct:-1.24,  isPos:false },
  { symbol:"DX-Y.NYB", label:"DXY",     price:104.23,  change:-0.18,  changePct:-0.17,  isPos:false },
  { symbol:"^TNX",     label:"US10Y",   price:4.31,    change:-0.04,  changePct:-0.92,  isPos:false },
  { symbol:"ETH-USD",  label:"ETH",     price:3341,    change:45.00,  changePct: 1.37,  isPos:true  },
]

// ── Fetch from Yahoo Finance ──────────────────────────────────────────────
async function fetchYahoo(): Promise<TickerItem[]> {
  const syms = SYMBOLS.map(s => encodeURIComponent(s.yahoo)).join(",")
  const url  = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${syms}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent&formatted=false`

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Phoenix-Dashboard/1.0)",
      "Accept":     "application/json",
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`)

  const json   = await res.json()
  const quotes = json?.quoteResponse?.result ?? []
  if (!quotes.length) throw new Error("Empty Yahoo Finance response")

  return quotes.map((q: any) => {
    const meta = SYMBOLS.find(s => s.yahoo === q.symbol)
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
    // Return cache if still fresh
    if (_cache && Date.now() < _cache.expiresAt) {
      return NextResponse.json({ items: _cache.data, cached: true, source: "cache" })
    }

    try {
      const items = await fetchYahoo()
      _cache = { data: items, expiresAt: Date.now() + CACHE_TTL }
      return NextResponse.json({ items, cached: false, source: "yahoo" })
    } catch (yahooErr) {
      console.warn("[ticker] Yahoo Finance failed, using mock:", yahooErr)
      // Use stale cache if available, else mock
      const items = _cache?.data ?? MOCK
      return NextResponse.json({ items, cached: false, source: "mock" })
    }
  } catch (err) {
    console.error("[ticker] Unhandled:", err)
    return NextResponse.json({ items: MOCK, cached: false, source: "mock" })
  }
}