// ============================================================
// /api/market/levels  (GET)
// Fetches structural levels from TwelveData for a given symbol.
//
// Query params:
//   ?symbol=XAUUSD (one of: XAUUSD, USTEC, EURUSD, GBPUSD, BTCUSD)
//
// Returns:
//   {
//     symbol: "XAUUSD",
//     currentPrice: 3325.50,
//     prevDay:  { high, low, close },
//     prevWeek: { high, low },
//     timestamp: "2026-05-30T...",
//     cached: false,
//     _debug: { mode, error? }
//   }
//
// Auth: requires TWELVEDATA_API_KEY env var (free tier: 8 req/min, 800/day)
// Cache: 5 minutes per symbol — keeps us well under rate limits
// ============================================================

import { NextRequest, NextResponse } from "next/server"

// TwelveData symbol mappings — they use their own naming convention
// Free tier supports: forex, indices, crypto. Gold via XAU/USD works.
const SYMBOL_MAP: Record<string, string> = {
  XAUUSD: "XAU/USD",
  USTEC:  "NDX",          // NASDAQ-100 index
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  BTCUSD: "BTC/USD",
}

// In-memory cache: symbol -> { data, expiresAt }
const cache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 min

// ── Helper: fetch with timeout ──────────────────────────────
async function fetchJSON(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = (searchParams.get("symbol") ?? "XAUUSD").toUpperCase()
    const forceRefresh = searchParams.get("forceRefresh") === "true"

    if (!SYMBOL_MAP[symbol]) {
      return NextResponse.json(
        { error: `Unsupported symbol: ${symbol}. Use one of: ${Object.keys(SYMBOL_MAP).join(", ")}` },
        { status: 400 }
      )
    }

    // ── Cache check ──────────────────────────────────────────
    const cacheKey = symbol
    if (!forceRefresh) {
      const cached = cache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json({ ...cached.data, cached: true })
      }
    }

    const apiKey = process.env.TWELVEDATA_API_KEY
    if (!apiKey) {
      // Mock data fallback — useful for local dev without the key set
      return NextResponse.json({
        symbol,
        currentPrice: 0,
        prevDay:  { high: 0, low: 0, close: 0 },
        prevWeek: { high: 0, low: 0 },
        timestamp: new Date().toISOString(),
        cached: false,
        _debug: { mode: "mock", error: "TWELVEDATA_API_KEY env var not set" },
      })
    }

    const tdSymbol = SYMBOL_MAP[symbol]
    const encodedSymbol = encodeURIComponent(tdSymbol)

    // TwelveData time_series endpoint:
    //   /time_series?symbol=XAU/USD&interval=1day&outputsize=2  → prev day H/L/C
    //   /time_series?symbol=XAU/USD&interval=1week&outputsize=2 → prev week H/L
    //   /price?symbol=XAU/USD                                    → current price
    // 3 calls = 3/8 of rate limit, well within budget.

    const [daily, weekly, priceRes] = await Promise.all([
      fetchJSON(`https://api.twelvedata.com/time_series?symbol=${encodedSymbol}&interval=1day&outputsize=2&apikey=${apiKey}`),
      fetchJSON(`https://api.twelvedata.com/time_series?symbol=${encodedSymbol}&interval=1week&outputsize=2&apikey=${apiKey}`),
      fetchJSON(`https://api.twelvedata.com/price?symbol=${encodedSymbol}&apikey=${apiKey}`),
    ])

    // TwelveData wraps errors in `status: "error"` instead of HTTP 4xx
    if (daily?.status === "error")  throw new Error(`Daily: ${daily.message}`)
    if (weekly?.status === "error") throw new Error(`Weekly: ${weekly.message}`)
    if (priceRes?.status === "error") throw new Error(`Price: ${priceRes.message}`)

    // ── Extract Prev Day H/L/C ──────────────────────────────
    // values[0] is the most recent bar (today/incomplete); values[1] is prev day
    const dailyValues = daily?.values ?? []
    const prevDayBar = dailyValues[1] ?? dailyValues[0]
    if (!prevDayBar) throw new Error("No daily data returned")
    const prevDay = {
      high:  Number(prevDayBar.high),
      low:   Number(prevDayBar.low),
      close: Number(prevDayBar.close),
    }

    // ── Extract Prev Week H/L ───────────────────────────────
    const weeklyValues = weekly?.values ?? []
    const prevWeekBar = weeklyValues[1] ?? weeklyValues[0]
    if (!prevWeekBar) throw new Error("No weekly data returned")
    const prevWeek = {
      high: Number(prevWeekBar.high),
      low:  Number(prevWeekBar.low),
    }

    // ── Current price ───────────────────────────────────────
    const currentPrice = Number(priceRes?.price ?? 0)

    const data = {
      symbol,
      currentPrice,
      prevDay,
      prevWeek,
      timestamp: new Date().toISOString(),
      cached: false,
      _debug: { mode: "live", source: "twelvedata" },
    }

    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS })
    return NextResponse.json(data)

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[market/levels GET]", msg)
    return NextResponse.json(
      {
        error: "Failed to fetch levels",
        details: msg,
        _debug: { mode: "error" },
      },
      { status: 500 }
    )
  }
}
