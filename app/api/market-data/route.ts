// ============================================================
// /api/market-data  (GET)
//
// Returns rich market data for the SessionIntelligence component.
// Now supports 5 symbols: XAUUSD, USTEC, EURUSD, GBPUSD, BTCUSD
//
// Data sources:
//   1. TwelveData (primary) → PDH/PDL/PDC/PWH/PWL/currentPrice
//   2. Yahoo Finance       → Intraday OHLCV for ATR/FVG/EQH/EQL/POC/VAH/VAL/AVWAP
//
// Cache: 10 minutes server-side
// If TwelveData fails, falls back to deriving levels from Yahoo candles.
// ============================================================

import { NextRequest, NextResponse } from "next/server"

interface MarketDataResponse {
  symbol: string; currentPrice: number
  pdh: number; pdl: number; pdc: number; pdo: number
  pwh: number; pwl: number
  todayHigh: number; todayLow: number
  atr: number
  fvgs: { direction: "bull" | "bear"; top: number; bottom: number; date: string }[]
  eqhs: number[]; eqls: number[]
  poc: number; vah: number; val: number; avwap: number
  fetchedAt: number
  cached?: boolean
  error?: string
  _debug?: { sources: string[]; warnings?: string[] }
}

const TD_SYMBOL: Record<string, string> = {
  XAUUSD: "XAU/USD",
  USTEC:  "NDX",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  BTCUSD: "BTC/USD",
}

const YH_SYMBOL: Record<string, string> = {
  XAUUSD: "GC=F",        // Gold futures
  USTEC:  "NQ=F",        // Nasdaq 100 futures
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  BTCUSD: "BTC-USD",
}

const cache = new Map<string, { data: MarketDataResponse; expiresAt: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000  // 10 min per user request

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

// ───── TwelveData: PDH/PDL/PDC/PWH/PWL + current ─────
async function fetchTwelveData(symbol: string): Promise<Partial<MarketDataResponse>> {
  const apiKey = process.env.TWELVEDATA_API_KEY
  if (!apiKey) throw new Error("TWELVEDATA_API_KEY not set")
  const td = TD_SYMBOL[symbol]
  if (!td) throw new Error(`Unsupported TD symbol: ${symbol}`)

  const enc = encodeURIComponent(td)
  const [daily, weekly, priceRes] = await Promise.all([
    fetchJSON(`https://api.twelvedata.com/time_series?symbol=${enc}&interval=1day&outputsize=2&apikey=${apiKey}`),
    fetchJSON(`https://api.twelvedata.com/time_series?symbol=${enc}&interval=1week&outputsize=2&apikey=${apiKey}`),
    fetchJSON(`https://api.twelvedata.com/price?symbol=${enc}&apikey=${apiKey}`),
  ])

  if (daily?.status === "error")    throw new Error(`Daily: ${daily.message}`)
  if (weekly?.status === "error")   throw new Error(`Weekly: ${weekly.message}`)
  if (priceRes?.status === "error") throw new Error(`Price: ${priceRes.message}`)

  const dailyVals = daily?.values ?? []
  const prevDay = dailyVals[1] ?? dailyVals[0]
  if (!prevDay) throw new Error("No daily data")
  const weeklyVals = weekly?.values ?? []
  const prevWeek = weeklyVals[1] ?? weeklyVals[0]
  if (!prevWeek) throw new Error("No weekly data")

  return {
    currentPrice: Number(priceRes?.price ?? 0),
    pdh: Number(prevDay.high),
    pdl: Number(prevDay.low),
    pdc: Number(prevDay.close),
    pdo: Number(prevDay.open),
    pwh: Number(prevWeek.high),
    pwl: Number(prevWeek.low),
  }
}

// ───── Yahoo Finance: intraday candles for ICT calculations ─────
interface YahooCandle { o: number; h: number; l: number; c: number; v: number; t: number }

async function fetchYahooCandles(symbol: string, range = "30d", interval = "1h"): Promise<YahooCandle[]> {
  const yh = YH_SYMBOL[symbol]
  if (!yh) return []
  try {
    const data = await fetchJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yh)}?range=${range}&interval=${interval}`)
    const result = data?.chart?.result?.[0]
    if (!result) return []
    const timestamps = result.timestamp ?? []
    const quote = result.indicators?.quote?.[0]
    if (!quote) return []
    const candles: YahooCandle[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const o = quote.open?.[i], h = quote.high?.[i], l = quote.low?.[i], c = quote.close?.[i], v = quote.volume?.[i] ?? 0
      if (o == null || h == null || l == null || c == null) continue
      candles.push({ o, h, l, c, v, t: timestamps[i] * 1000 })
    }
    return candles
  } catch { return [] }
}

// ───── ICT field computations ─────
function computeATR(candles: YahooCandle[], period = 14): number {
  if (candles.length < period + 1) return 0
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].h, l = candles[i].l, pc = candles[i - 1].c
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)))
  }
  const recent = trs.slice(-period)
  return recent.reduce((s, v) => s + v, 0) / recent.length
}

function detectFVGs(candles: YahooCandle[], lookback = 80) {
  if (candles.length < 3) return []
  const fvgs: { direction: "bull" | "bear"; top: number; bottom: number; date: string }[] = []
  const start = Math.max(2, candles.length - lookback)
  for (let i = start; i < candles.length - 1; i++) {
    const c0 = candles[i - 2], c2 = candles[i]
    if (c0.h < c2.l) fvgs.push({ direction: "bull", top: c2.l, bottom: c0.h, date: new Date(candles[i].t).toISOString().slice(0, 10) })
    if (c0.l > c2.h) fvgs.push({ direction: "bear", top: c0.l, bottom: c2.h, date: new Date(candles[i].t).toISOString().slice(0, 10) })
  }
  return fvgs.slice(-4)
}

function detectEqualLevels(candles: YahooCandle[], tolerance = 0.001) {
  if (candles.length < 10) return { eqhs: [], eqls: [] }
  const recent = candles.slice(-60)
  const highs = recent.map(c => c.h).sort((a, b) => b - a).slice(0, 8)
  const lows  = recent.map(c => c.l).sort((a, b) => a - b).slice(0, 8)
  const groupNearby = (arr: number[]) => {
    const result: number[] = []
    for (const v of arr) {
      const hit = result.find(r => Math.abs((v - r) / r) < tolerance)
      if (!hit) result.push(v)
    }
    return result.slice(0, 3)
  }
  return { eqhs: groupNearby(highs), eqls: groupNearby(lows) }
}

function computeVolumeProfile(candles: YahooCandle[]) {
  if (candles.length === 0) return { poc: 0, vah: 0, val: 0, avwap: 0 }
  const recent = candles.slice(-120)
  let cumPV = 0, cumV = 0
  for (const c of recent) {
    const tp = (c.h + c.l + c.c) / 3
    cumPV += tp * c.v; cumV += c.v
  }
  const avwap = cumV > 0 ? cumPV / cumV : recent[recent.length - 1].c
  const max = Math.max(...recent.map(c => c.h)), min = Math.min(...recent.map(c => c.l))
  if (max === min) return { poc: max, vah: max, val: max, avwap }
  const bins = 50, binSize = (max - min) / bins
  const volume: number[] = new Array(bins).fill(0)
  for (const c of recent) {
    const tp = (c.h + c.l + c.c) / 3
    const bin = Math.min(bins - 1, Math.max(0, Math.floor((tp - min) / binSize)))
    volume[bin] += c.v
  }
  let pocIdx = 0
  for (let i = 0; i < bins; i++) if (volume[i] > volume[pocIdx]) pocIdx = i
  const poc = min + (pocIdx + 0.5) * binSize
  const total = volume.reduce((s, v) => s + v, 0)
  const target = total * 0.7
  let acc = volume[pocIdx], lo = pocIdx, hi = pocIdx
  while (acc < target && (lo > 0 || hi < bins - 1)) {
    const lv = lo > 0 ? volume[lo - 1] : -1
    const hv = hi < bins - 1 ? volume[hi + 1] : -1
    if (lv >= hv) { lo--; if (lo >= 0) acc += volume[lo] }
    else          { hi++; if (hi < bins) acc += volume[hi] }
  }
  return { poc, vah: min + (hi + 1) * binSize, val: min + lo * binSize, avwap }
}

function getTodayRange(candles: YahooCandle[]) {
  if (candles.length === 0) return { high: 0, low: 0 }
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0)
  const todays = candles.filter(c => c.t >= todayStart.getTime())
  if (todays.length === 0) {
    const last = candles[candles.length - 1]
    return { high: last.h, low: last.l }
  }
  return { high: Math.max(...todays.map(c => c.h)), low: Math.min(...todays.map(c => c.l)) }
}

// ───── Handler ─────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get("symbol") ?? "XAUUSD").toUpperCase()
  const forceRefresh = searchParams.get("forceRefresh") === "true"

  if (!TD_SYMBOL[symbol]) {
    return NextResponse.json(
      { error: `Unsupported symbol: ${symbol}. Use: ${Object.keys(TD_SYMBOL).join(", ")}` },
      { status: 400 }
    )
  }

  if (!forceRefresh) {
    const cached = cache.get(symbol)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ ...cached.data, cached: true })
    }
  }

  const warnings: string[] = []
  const sources: string[] = []

  const [tdResult, yhResult] = await Promise.allSettled([
    fetchTwelveData(symbol),
    fetchYahooCandles(symbol, "30d", "1h"),
  ])

  let levels: Partial<MarketDataResponse> = {}
  let candles: YahooCandle[] = []

  if (tdResult.status === "fulfilled") { levels = tdResult.value; sources.push("twelvedata") }
  else warnings.push(`TwelveData: ${tdResult.reason}`)

  if (yhResult.status === "fulfilled" && yhResult.value.length > 0) {
    candles = yhResult.value; sources.push("yahoo")
  } else warnings.push("Yahoo candles unavailable")

  // Yahoo fallback for levels if TwelveData failed
  if (Object.keys(levels).length === 0 && candles.length > 0) {
    const byDay: Record<string, YahooCandle[]> = {}
    for (const c of candles) {
      const k = new Date(c.t).toISOString().slice(0, 10)
      if (!byDay[k]) byDay[k] = []
      byDay[k].push(c)
    }
    const dayKeys = Object.keys(byDay).sort()
    if (dayKeys.length >= 2) {
      const prevCandles = byDay[dayKeys[dayKeys.length - 2]]
      levels.pdh = Math.max(...prevCandles.map(c => c.h))
      levels.pdl = Math.min(...prevCandles.map(c => c.l))
      levels.pdc = prevCandles[prevCandles.length - 1].c
      levels.pdo = prevCandles[0].o
      levels.currentPrice = candles[candles.length - 1].c
    }
    const now = new Date()
    const thisWeekStart = new Date(now)
    thisWeekStart.setUTCDate(now.getUTCDate() - now.getUTCDay())
    thisWeekStart.setUTCHours(0, 0, 0, 0)
    const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7)
    const lastWeek = candles.filter(c => c.t >= lastWeekStart.getTime() && c.t < thisWeekStart.getTime())
    if (lastWeek.length > 0) {
      levels.pwh = Math.max(...lastWeek.map(c => c.h))
      levels.pwl = Math.min(...lastWeek.map(c => c.l))
    }
    sources.push("yahoo-fallback")
  }

  const atr   = candles.length > 0 ? computeATR(candles) : 0
  const fvgs  = candles.length > 0 ? detectFVGs(candles)  : []
  const equal = candles.length > 0 ? detectEqualLevels(candles) : { eqhs: [], eqls: [] }
  const vp    = candles.length > 0 ? computeVolumeProfile(candles) : { poc: 0, vah: 0, val: 0, avwap: 0 }
  const today = candles.length > 0 ? getTodayRange(candles) : { high: 0, low: 0 }

  if (!levels.currentPrice && candles.length === 0) {
    return NextResponse.json(
      { symbol, error: "All data sources unavailable", _debug: { sources, warnings } },
      { status: 502 }
    )
  }

  const data: MarketDataResponse = {
    symbol,
    currentPrice: levels.currentPrice ?? candles[candles.length - 1]?.c ?? 0,
    pdh: levels.pdh ?? 0, pdl: levels.pdl ?? 0, pdc: levels.pdc ?? 0, pdo: levels.pdo ?? 0,
    pwh: levels.pwh ?? 0, pwl: levels.pwl ?? 0,
    todayHigh: today.high, todayLow: today.low,
    atr, fvgs,
    eqhs: equal.eqhs, eqls: equal.eqls,
    poc: vp.poc, vah: vp.vah, val: vp.val, avwap: vp.avwap,
    fetchedAt: Date.now(),
    cached: false,
    _debug: { sources, warnings: warnings.length > 0 ? warnings : undefined },
  }

  cache.set(symbol, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  return NextResponse.json(data)
}
