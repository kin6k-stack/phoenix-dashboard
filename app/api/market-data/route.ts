import { NextRequest, NextResponse } from 'next/server'

// Yahoo Finance tickers for our instruments
const TICKERS: Record<string, string> = {
  XAUUSD: 'GC=F',   // Gold futures
  USTEC:  'NQ=F',   // Nasdaq 100 futures
}

type Candle = {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

async function fetchCandles(ticker: string, interval: string, range: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
    },
    next: { revalidate: 300 }, // 5-min server cache
  })
  if (!res.ok) throw new Error(`Yahoo Finance error for ${ticker}: HTTP ${res.status}`)

  const json = await res.json()
  const result = json.chart?.result?.[0]
  if (!result) throw new Error('No chart data returned')

  const timestamps: number[] = result.timestamp || []
  const q = result.indicators.quote[0]

  return timestamps
    .map((t, i) => ({
      timestamp: t,
      open:   q.open?.[i]   ?? null,
      high:   q.high?.[i]   ?? null,
      low:    q.low?.[i]    ?? null,
      close:  q.close?.[i]  ?? null,
      volume: q.volume?.[i] ?? 0,
    }))
    .filter(c => c.open !== null && c.high !== null && c.low !== null && c.close !== null) as Candle[]
}

// 14-period ATR
function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0
  const trs = candles.slice(1).map((c, i) =>
    Math.max(c.high - c.low, Math.abs(c.high - candles[i].close), Math.abs(c.low - candles[i].close))
  )
  const slice = trs.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

// Find Fair Value Gaps from last N candles
function findFVGs(candles: Candle[]) {
  const gaps: { direction: 'bull' | 'bear'; top: number; bottom: number; date: string }[] = []
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1]
    const next = candles[i + 1]
    const date = new Date(candles[i].timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    // Bullish FVG: gap between prev candle high and next candle low (price jumped up leaving gap)
    if (next.low > prev.high) {
      gaps.push({ direction: 'bull', top: next.low, bottom: prev.high, date })
    }
    // Bearish FVG: gap between next candle high and prev candle low
    if (next.high < prev.low) {
      gaps.push({ direction: 'bear', top: prev.low, bottom: next.high, date })
    }
  }
  // Return most recent 4 gaps
  return gaps.slice(-4)
}

// Find Equal Highs and Equal Lows (resting liquidity pools)
function findEqualLevels(candles: Candle[], refPrice: number) {
  const threshold = refPrice * 0.0018 // 0.18% tolerance
  const highs = candles.map(c => c.high)
  const lows  = candles.map(c => c.low)
  const eqhs: number[] = []
  const eqls: number[] = []

  for (let i = 0; i < highs.length - 1; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      if (Math.abs(highs[i] - highs[j]) < threshold) {
        const avg = (highs[i] + highs[j]) / 2
        if (!eqhs.some(x => Math.abs(x - avg) < threshold)) eqhs.push(avg)
      }
    }
  }
  for (let i = 0; i < lows.length - 1; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      if (Math.abs(lows[i] - lows[j]) < threshold) {
        const avg = (lows[i] + lows[j]) / 2
        if (!eqls.some(x => Math.abs(x - avg) < threshold)) eqls.push(avg)
      }
    }
  }
  return { eqhs: eqhs.slice(0, 3), eqls: eqls.slice(0, 3) }
}

// Volume Profile: approximate POC, VAH, VAL, AVWAP from OHLCV candles
function calcVolumeProfile(candles: Candle[]) {
  const totalVol = candles.reduce((s, c) => s + c.volume, 0)
  if (totalVol === 0) {
    const mid = candles[candles.length - 1]
    const poc = (mid.high + mid.low) / 2
    return { poc, vah: poc * 1.003, val: poc * 0.997, avwap: poc }
  }

  // AVWAP: volume-weighted typical price
  const avwap = candles.reduce((s, c) => s + ((c.high + c.low + c.close) / 3) * c.volume, 0) / totalVol

  // POC: midpoint of highest-volume candle
  const pocCandle = candles.reduce((best, c) => c.volume > best.volume ? c : best)
  const poc = (pocCandle.high + pocCandle.low) / 2

  // Value Area: 70% of range around POC (approximation using last session range)
  const sessionRange = candles[candles.length - 1].high - candles[candles.length - 1].low
  const vah = poc + sessionRange * 0.35
  const val = poc - sessionRange * 0.35

  return { poc, vah, val, avwap }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get('symbol') || 'XAUUSD').toUpperCase() as 'XAUUSD' | 'USTEC'
  const ticker = TICKERS[symbol] ?? 'GC=F'

  try {
    // Fetch 15 days of daily data for all level calculations
    const candles = await fetchCandles(ticker, '1d', '15d')
    if (candles.length < 3) throw new Error('Not enough candle data')

    const last = candles[candles.length - 1]  // today / most recent
    const prev = candles[candles.length - 2]  // previous trading day

    const atr = calcATR(candles)
    const fvgs = findFVGs(candles.slice(-12))
    const { eqhs, eqls } = findEqualLevels(candles.slice(-8), last.close)

    // Previous week levels (last 5 complete trading days excluding today)
    const weekSlice = candles.slice(-6, -1)
    const pwh = Math.max(...weekSlice.map(c => c.high))
    const pwl = Math.min(...weekSlice.map(c => c.low))

    // Volume profile from last 5 days
    const { poc, vah, val, avwap } = calcVolumeProfile(candles.slice(-5))

    return NextResponse.json({
      symbol,
      currentPrice: last.close,
      // Previous day levels
      pdh: prev.high,
      pdl: prev.low,
      pdc: prev.close,
      pdo: prev.open,
      // Previous week levels
      pwh,
      pwl,
      // Today's session range so far
      todayHigh: last.high,
      todayLow:  last.low,
      // Derived
      atr,
      fvgs,
      eqhs,
      eqls,
      // Volume profile
      poc,
      vah,
      val,
      avwap,
      // Meta
      fetchedAt: Date.now(),
    })
  } catch (err) {
    console.error('[market-data]', err)
    return NextResponse.json({ error: String(err), symbol }, { status: 500 })
  }
}