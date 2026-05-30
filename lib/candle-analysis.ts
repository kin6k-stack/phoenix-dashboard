// ============================================================
// lib/candle-analysis.ts
// Computational helpers for the CandleAnalysis component.
// Detects patterns, computes RSI, identifies trend context.
// ============================================================

export interface Candle {
  time: number   // unix seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ── Candle body analysis ────────────────────────────────────
export type BodyType = "Bullish Marubozu" | "Bearish Marubozu" | "Bullish" | "Bearish" | "Doji" | "Bullish Pin Bar" | "Bearish Pin Bar" | "Hammer" | "Shooting Star"

export function classifyCandle(c: Candle): { type: BodyType; bias: "bull" | "bear" | "neutral"; explanation: string } {
  const bodySize = Math.abs(c.close - c.open)
  const totalRange = c.high - c.low
  if (totalRange === 0) return { type: "Doji", bias: "neutral", explanation: "Zero range — opening and closing at the same price." }

  const bodyRatio = bodySize / totalRange
  const upperWick = c.high - Math.max(c.open, c.close)
  const lowerWick = Math.min(c.open, c.close) - c.low
  const isBullish = c.close > c.open

  // Doji: very small body
  if (bodyRatio < 0.1) {
    return {
      type: "Doji",
      bias: "neutral",
      explanation: "Indecision candle. Buyers and sellers cancelled each other out — often signals exhaustion or reversal at key levels.",
    }
  }

  // Marubozu: minimal wicks
  if (bodyRatio > 0.92) {
    if (isBullish) return { type: "Bullish Marubozu", bias: "bull", explanation: "Strong bullish conviction — closed at/near the high with almost no rejection. Continuation signal in uptrend." }
    return { type: "Bearish Marubozu", bias: "bear", explanation: "Strong bearish conviction — closed at/near the low with almost no rejection. Continuation signal in downtrend." }
  }

  // Pin bars / Hammer / Shooting Star: one wick > 2x body
  if (lowerWick > bodySize * 2 && upperWick < bodySize * 0.5) {
    if (isBullish) return { type: "Hammer", bias: "bull", explanation: "Long lower wick = aggressive buyers stepped in below. Bullish reversal signal at support." }
    return { type: "Bullish Pin Bar", bias: "bull", explanation: "Long lower wick rejecting lows. Reversal signal — bulls reclaimed control even though close < open." }
  }
  if (upperWick > bodySize * 2 && lowerWick < bodySize * 0.5) {
    if (!isBullish) return { type: "Shooting Star", bias: "bear", explanation: "Long upper wick = aggressive sellers stepped in above. Bearish reversal signal at resistance." }
    return { type: "Bearish Pin Bar", bias: "bear", explanation: "Long upper wick rejecting highs. Reversal signal — bears took control even though close > open." }
  }

  // Standard candle
  if (isBullish) return { type: "Bullish", bias: "bull", explanation: "Buyers in control — close above open. Standard continuation in upward momentum." }
  return { type: "Bearish", bias: "bear", explanation: "Sellers in control — close below open. Standard continuation in downward momentum." }
}

// ── RSI(14) using Wilder's smoothing ─────────────────────────
export function calculateRSI(candles: Candle[], period = 14): number[] {
  const rsi: number[] = []
  if (candles.length < period + 1) return rsi

  let gains = 0, losses = 0
  // First period — simple average
  for (let i = 1; i <= period; i++) {
    const delta = candles[i].close - candles[i - 1].close
    if (delta >= 0) gains += delta
    else            losses -= delta
  }
  let avgGain = gains / period
  let avgLoss = losses / period

  // Fill leading positions with null (we use 50 as neutral filler)
  for (let i = 0; i < period; i++) rsi.push(50)

  // First RSI value
  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss
  rsi.push(100 - 100 / (1 + rs0))

  // Subsequent values — Wilder's smoothing
  for (let i = period + 1; i < candles.length; i++) {
    const delta = candles[i].close - candles[i - 1].close
    const gain = delta > 0 ? delta : 0
    const loss = delta < 0 ? -delta : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi.push(100 - 100 / (1 + rs))
  }
  return rsi
}

export function rsiContext(rsi: number): { label: string; color: string } {
  if (!Number.isFinite(rsi)) return { label: "—", color: "text-slate-500" }
  if (rsi >= 70) return { label: "Overbought",  color: "text-rose-400" }
  if (rsi >= 60) return { label: "Bullish",     color: "text-emerald-400" }
  if (rsi >= 40) return { label: "Neutral",     color: "text-slate-400" }
  if (rsi >= 30) return { label: "Bearish",     color: "text-amber-400" }
  return { label: "Oversold", color: "text-emerald-400" }
}

// ── Trend context: continuation vs reversal ─────────────────
export function trendContext(candles: Candle[], idx: number): {
  trend: "uptrend" | "downtrend" | "range"
  position: "continuation" | "reversal" | "neutral"
  explanation: string
} {
  if (idx < 5) return { trend: "range", position: "neutral", explanation: "Not enough prior data to determine trend." }

  // Look at 5 candles before this one
  const prior = candles.slice(idx - 5, idx)
  const priorHighs = prior.map(c => c.high)
  const priorLows  = prior.map(c => c.low)
  const startClose = prior[0].close
  const endClose   = prior[prior.length - 1].close
  const move       = ((endClose - startClose) / startClose) * 100

  const current = candles[idx]
  const isBullCandle = current.close > current.open

  let trend: "uptrend" | "downtrend" | "range" = "range"
  if (move > 0.2)  trend = "uptrend"
  if (move < -0.2) trend = "downtrend"

  let position: "continuation" | "reversal" | "neutral" = "neutral"
  let explanation = ""

  if (trend === "uptrend") {
    if (isBullCandle) {
      position = "continuation"
      explanation = "Trend continuation — bullish candle inside ongoing uptrend (prior 5 bars trending up). Aligns with momentum."
    } else {
      position = "reversal"
      explanation = "Counter-trend bar — bearish candle pushing against an uptrend. Watch for follow-through to confirm reversal."
    }
  } else if (trend === "downtrend") {
    if (!isBullCandle) {
      position = "continuation"
      explanation = "Trend continuation — bearish candle inside ongoing downtrend (prior 5 bars trending down). Aligns with momentum."
    } else {
      position = "reversal"
      explanation = "Counter-trend bar — bullish candle pushing against a downtrend. Watch for follow-through to confirm reversal."
    }
  } else {
    position = "neutral"
    explanation = `Range-bound — prior 5 bars moved only ${move.toFixed(2)}%. Not a clear trend either way.`
  }

  return { trend, position, explanation }
}

// ── Macro regime: heuristic descriptor ──────────────────────
export function macroRegime(candles: Candle[], idx: number, avwap?: number): {
  regime: string
  detail: string
} {
  if (candles.length < 20) return { regime: "Insufficient Data", detail: "Need at least 20 bars to characterize regime." }

  const current = candles[idx] ?? candles[candles.length - 1]
  const lookback = candles.slice(Math.max(0, idx - 20), idx + 1)
  const highs = lookback.map(c => c.high)
  const lows  = lookback.map(c => c.low)
  const max = Math.max(...highs), min = Math.min(...lows)
  const range = max - min
  const lastClose = current.close
  const pctPos = range > 0 ? ((lastClose - min) / range) * 100 : 50

  // Volatility estimate — average true range %
  const trs: number[] = []
  for (let i = 1; i < lookback.length; i++) {
    const h = lookback[i].high, l = lookback[i].low, pc = lookback[i - 1].close
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)))
  }
  const atr = trs.reduce((s, v) => s + v, 0) / Math.max(1, trs.length)
  const atrPct = (atr / lastClose) * 100

  // Above or below AVWAP
  const aboveAVWAP = avwap != null && lastClose > avwap

  // Classification
  let regime: string
  let detail: string

  if (atrPct > 1.5) {
    regime = "Elevated Volatility"
    detail = `ATR ${atrPct.toFixed(2)}% of price — wider stops needed. ${aboveAVWAP ? "Trading above AVWAP — bullish bias." : avwap != null ? "Trading below AVWAP — bearish bias." : ""}`
  } else if (atrPct < 0.4) {
    regime = "Compression"
    detail = `Low volatility (ATR ${atrPct.toFixed(2)}%). Range-bound — expect breakout or fakeout. Reduce position size.`
  } else if (pctPos > 75) {
    regime = "Trending — Near Highs"
    detail = `Price in top 25% of 20-bar range. ${aboveAVWAP ? "Bullish continuation regime." : "Watch for rejection."}`
  } else if (pctPos < 25) {
    regime = "Trending — Near Lows"
    detail = `Price in bottom 25% of 20-bar range. ${!aboveAVWAP ? "Bearish continuation regime." : "Watch for support reclaim."}`
  } else {
    regime = "Mid-Range Equilibrium"
    detail = `Price in middle of 20-bar range. ${aboveAVWAP ? "Slight bullish lean (above AVWAP)." : avwap != null ? "Slight bearish lean (below AVWAP)." : ""}`
  }

  return { regime, detail }
}

// ── Session detection (matches session-intelligence.tsx) ────
export function getSessionAtTime(timeSec: number): { name: string; color: string } {
  const h = new Date(timeSec * 1000).getUTCHours()
  if (h >= 22 || h < 8)  return { name: "Asian",   color: "#a78bfa" }
  if (h >= 8  && h < 13) return { name: "London",  color: "#34d399" }
  if (h >= 13 && h < 16) return { name: "Overlap", color: "#fbbf24" }
  return { name: "New York", color: "#60a5fa" }
}

export function getKillZoneAtTime(timeSec: number): string | null {
  const h = new Date(timeSec * 1000).getUTCHours()
  if (h >= 20 || h < 2)  return "Asian Kill Zone"
  if (h >= 7  && h < 10) return "London Kill Zone"
  if (h >= 12 && h < 14) return "NY AM Kill Zone"
  if (h >= 18 && h < 21) return "NY PM Kill Zone"
  return null
}

// ── Distance to key level helpers ───────────────────────────
export function levelProximity(price: number, level: number): { distance: number; percent: number; relation: string } {
  if (!Number.isFinite(level) || level === 0) return { distance: 0, percent: 0, relation: "—" }
  const dist = price - level
  const pct = (dist / level) * 100
  const relation = Math.abs(pct) < 0.05 ? "AT" : dist > 0 ? "above" : "below"
  return { distance: Math.abs(dist), percent: pct, relation }
}
