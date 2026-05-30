// ============================================================
// /api/candles  (GET)
//
// Lightweight OHLCV endpoint for the CandleAnalysis chart.
// Separate from /api/market-data so we can request different
// timeframes (1H, 4H, 1D) without invalidating the heavier
// market-data cache.
//
// Query params:
//   ?symbol=XAUUSD (XAUUSD | USTEC | EURUSD | GBPUSD | BTCUSD)
//   ?timeframe=1h  (1h | 4h | 1d)
//
// Returns: { symbol, timeframe, candles: [{time, open, high, low, close, volume}], cached }
// Cache: 10 min per symbol+timeframe
// ============================================================

import { NextRequest, NextResponse } from "next/server"

const YH_SYMBOL: Record<string, string> = {
  XAUUSD: "GC=F",
  USTEC:  "NQ=F",
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  BTCUSD: "BTC-USD",
}

// Yahoo Finance interval mappings + range to keep payload reasonable
const YH_CONFIG: Record<string, { interval: string; range: string; maxBars: number }> = {
  "1h": { interval: "1h",  range: "30d", maxBars: 500 },
  "4h": { interval: "1h",  range: "60d", maxBars: 400 },   // we aggregate 4×1h client-side
  "1d": { interval: "1d",  range: "1y",  maxBars: 365 },
}

const cache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000

async function fetchJSON(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (Phoenix)" },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number }

// Aggregate N 1H bars into a single bar (used for 4H timeframe)
function aggregateBars(bars: Candle[], factor: number): Candle[] {
  if (factor <= 1) return bars
  const out: Candle[] = []
  for (let i = 0; i < bars.length; i += factor) {
    const slice = bars.slice(i, i + factor)
    if (slice.length === 0) continue
    out.push({
      time:   slice[0].time,
      open:   slice[0].open,
      high:   Math.max(...slice.map(b => b.high)),
      low:    Math.min(...slice.map(b => b.low)),
      close:  slice[slice.length - 1].close,
      volume: slice.reduce((s, b) => s + b.volume, 0),
    })
  }
  return out
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol    = (searchParams.get("symbol") ?? "XAUUSD").toUpperCase()
  const timeframe = (searchParams.get("timeframe") ?? "1h").toLowerCase()
  const forceRefresh = searchParams.get("forceRefresh") === "true"

  if (!YH_SYMBOL[symbol]) {
    return NextResponse.json(
      { error: `Unsupported symbol. Use: ${Object.keys(YH_SYMBOL).join(", ")}` },
      { status: 400 }
    )
  }
  if (!YH_CONFIG[timeframe]) {
    return NextResponse.json(
      { error: `Unsupported timeframe. Use: 1h, 4h, 1d` },
      { status: 400 }
    )
  }

  const cacheKey = `${symbol}:${timeframe}`
  if (!forceRefresh) {
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ ...cached.data, cached: true })
    }
  }

  const cfg = YH_CONFIG[timeframe]
  const yhTicker = YH_SYMBOL[symbol]

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yhTicker)}?range=${cfg.range}&interval=${cfg.interval}`
    const data = await fetchJSON(url)
    const result = data?.chart?.result?.[0]
    if (!result) throw new Error("No chart data")

    const timestamps = result.timestamp ?? []
    const quote = result.indicators?.quote?.[0]
    if (!quote) throw new Error("No quote data")

    const rawCandles: Candle[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const o = quote.open?.[i], h = quote.high?.[i], l = quote.low?.[i], c = quote.close?.[i], v = quote.volume?.[i] ?? 0
      if (o == null || h == null || l == null || c == null) continue
      rawCandles.push({ time: timestamps[i], open: o, high: h, low: l, close: c, volume: v })
    }

    let candles = rawCandles
    if (timeframe === "4h") candles = aggregateBars(rawCandles, 4)
    if (candles.length > cfg.maxBars) candles = candles.slice(-cfg.maxBars)

    const data2 = {
      symbol,
      timeframe,
      candles,
      fetchedAt: Date.now(),
      cached: false,
      _debug: { source: "yahoo", interval: cfg.interval, count: candles.length },
    }
    cache.set(cacheKey, { data: data2, expiresAt: Date.now() + CACHE_TTL_MS })
    return NextResponse.json(data2)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: "Failed to fetch candles", details: msg }, { status: 502 })
  }
}
