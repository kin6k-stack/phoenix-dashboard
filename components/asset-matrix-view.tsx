"use client"

// ─────────────────────────────────────────────────────────────────────────────
// Pass B — Asset Matrix View: Correlation Matrix + Macro Regime
//
// NEW (Pass B):
//   1. Macro Regime bar — 5 live status indicators (AI-powered)
//   2. Correlation Matrix — 8 cross-asset pairs with coefficients (AI-powered)
//
// KEPT from original:
//   3. Gold / NQ performance comparison (trade stats from props)
//
// API: POST /api/agents/correlations
//      30-minute cache, mock fallback if no API key
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw, Radio, TrendingUp, TrendingDown, Minus,
  Shield, BarChart3, Activity, ArrowUpDown, Zap,
} from "lucide-react"
import type { CorrelationResult, MacroCard, CorrelationPair } from "@/app/api/agents/correlations/route"

// ─── Shared types (from original component) ──────────────────────────────────
interface Trade {
  id:        string
  date:      string
  symbol:    string
  setup:     string
  rMultiple: number
}
interface AssetMatrixViewProps { trades?: Trade[] }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function coeffColor(c: number): string {
  if (c <= -0.7) return "text-rose-400"
  if (c <= -0.3) return "text-orange-400"
  if (c >= 0.7)  return "text-emerald-400"
  if (c >= 0.3)  return "text-teal-400"
  return "text-muted-foreground"
}

function coeffBg(c: number): string {
  if (c <= -0.7) return "bg-rose-500/10 border-rose-500/25"
  if (c <= -0.3) return "bg-orange-500/10 border-orange-500/25"
  if (c >= 0.7)  return "bg-emerald-500/10 border-emerald-500/25"
  if (c >= 0.3)  return "bg-teal-500/10 border-teal-500/25"
  return "bg-muted/20 border-border/40"
}

function coeffBarWidth(c: number): number {
  return Math.round(Math.abs(c) * 100)
}

function sentimentColor(s: string): string {
  switch (s) {
    case "bullish":   return "text-emerald-400"
    case "bearish":   return "text-rose-400"
    case "elevated":  return "text-rose-400"
    case "declining": return "text-teal-400"
    case "moderate":  return "text-amber-400"
    case "low":       return "text-emerald-400"
    default:          return "text-muted-foreground"
  }
}

function sentimentDot(s: string): string {
  switch (s) {
    case "bullish":   return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
    case "bearish":   return "bg-rose-400 shadow-[0_0_6px_rgba(248,113,133,0.6)]"
    case "elevated":  return "bg-rose-400 shadow-[0_0_6px_rgba(248,113,133,0.6)]"
    case "declining": return "bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.6)]"
    case "moderate":  return "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]"
    case "low":       return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
    default:          return "bg-muted"
  }
}

// ─── Macro Regime Bar ─────────────────────────────────────────────────────────
function MacroRegimeBar({ cards }: { cards: MacroCard[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {cards.map(card => (
        <div key={card.key}
          className="rounded-xl border border-border/40 bg-card/60 px-3 py-3 flex flex-col gap-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            {card.label}
          </p>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sentimentDot(card.sentiment)}`} />
            <p className={`text-[11px] font-black leading-tight ${sentimentColor(card.sentiment)}`}>
              {card.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Correlation Pair Card ────────────────────────────────────────────────────
function PairCard({ pair }: { pair: CorrelationPair }) {
  const sign   = pair.coeff >= 0 ? "+" : ""
  const width  = coeffBarWidth(pair.coeff)
  const isPos  = pair.coeff >= 0

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${coeffBg(pair.coeff)}`}>
      {/* Assets + coefficient */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-foreground">{pair.assetA}</span>
            <ArrowUpDown size={10} className="text-muted-foreground/50 flex-shrink-0" />
            <span className="text-xs font-black text-foreground">{pair.assetB}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
            {pair.description}
          </p>
        </div>
        <span className={`text-xl font-black tabular-nums flex-shrink-0 ${coeffColor(pair.coeff)}`}>
          {sign}{pair.coeff.toFixed(2)}
        </span>
      </div>

      {/* Correlation bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/50 font-mono">
          <span>−1.0</span>
          <span>0</span>
          <span>+1.0</span>
        </div>
        {/* Track */}
        <div className="relative h-1.5 rounded-full bg-background/60 overflow-hidden">
          {/* Filled bar — starts from center for positive, right-of-center going left for negative */}
          <div
            className={`absolute top-0 h-full rounded-full transition-all duration-700 ${
              isPos ? "bg-emerald-500" : "bg-rose-500"
            }`}
            style={{
              width:  `${width / 2}%`,
              left:   isPos ? "50%" : undefined,
              right:  !isPos ? "50%" : undefined,
            }}
          />
          {/* Center line */}
          <div className="absolute top-0 left-1/2 w-px h-full bg-muted-foreground/30" />
        </div>
      </div>

      {/* Explanation */}
      <p className="text-[10px] text-muted-foreground leading-relaxed">{pair.explanation}</p>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-card/40 border border-border/30" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-card/40 border border-border/30" />
        ))}
      </div>
    </div>
  )
}

// ─── Correlation section ──────────────────────────────────────────────────────
function CorrelationSection() {
  const [data,    setData]    = useState<CorrelationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/agents/correlations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ forceRefresh }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch on mount, re-fetch every 30 min
  useEffect(() => {
    fetchData(false)
    const t = setInterval(() => fetchData(false), 30 * 60_000)
    return () => clearInterval(t)
  }, [fetchData])

  const usingMock = data?._debug?.mode === "mock"

  return (
    <div className="space-y-4">

      {/* ── Section header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Macro Intelligence
          </h2>
          {data && (
            usingMock ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/25">
                <Radio size={9} /> DEMO
              </span>
            ) : data.cached ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/25">
                <Radio size={9} /> CACHED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                LIVE
              </span>
            )
          )}
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          REFRESH
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-bold">
          Error: {error}
        </div>
      )}

      {loading && !data ? <Skeleton /> : data ? (
        <>
          {/* ── Macro Regime ─────────────────────────────────────────── */}
          <MacroRegimeBar cards={data.macroRegime} />

          {/* ── Correlation Matrix ────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={12} className="text-muted-foreground" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Correlation Matrix
              </p>
              <span className="text-[9px] text-muted-foreground/40 font-mono ml-1">
                20-day rolling · {data.pairs.length} pairs
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.pairs.map((pair, i) => (
                <PairCard key={`${pair.assetA}-${pair.assetB}-${i}`} pair={pair} />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

// ─── Asset stats helper ───────────────────────────────────────────────────────
function getAssetStats(assetTrades: Trade[]) {
  const total    = assetTrades.length
  const wins     = assetTrades.filter(t => t.rMultiple > 0)
  const losses   = assetTrades.filter(t => t.rMultiple < 0)
  const winRate  = total > 0 ? Math.round((wins.length / total) * 100) : 0
  const gross    = wins.reduce((s, t) => s + Number(t.rMultiple), 0)
  const grossLoss= Math.abs(losses.reduce((s, t) => s + Number(t.rMultiple), 0))
  const pf       = grossLoss > 0 ? (gross / grossLoss).toFixed(2) : gross > 0 ? "MAX" : "0.00"
  const netPnL   = assetTrades.reduce((s, t) => s + Number(t.rMultiple), 0)
  return { total, wins: wins.length, losses: losses.length, winRate, pf, netPnL }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function AssetMatrix({ trades = [] }: AssetMatrixViewProps) {
  const [filter, setFilter] = useState<"ALL" | "BOT" | "MANUAL">("ALL")

  const filtered = trades.filter(t => {
    const isBot = t.setup !== "Manual Entry"
    if (filter === "BOT")    return isBot
    if (filter === "MANUAL") return !isBot
    return true
  })

  const goldStats = getAssetStats(filtered.filter(t => t.symbol === "XAUUSD"))
  const nasStats  = getAssetStats(filtered.filter(t => t.symbol === "USTEC"))

  return (
    <div className="space-y-6">

      {/* ── AI-powered correlation section ─────────────────────────────── */}
      <CorrelationSection />

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/30" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold">
            Engine Performance
          </span>
        </div>
      </div>

      {/* ── Filter toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-3 bg-card/60 rounded-xl border border-border/40">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data Source</p>
          <p className="text-[10px] text-foreground/50 mt-0.5 italic">Isolating bots from manual journals</p>
        </div>
        <div className="flex gap-1 bg-background/60 p-1 rounded-lg border border-border/40">
          {(["ALL", "BOT", "MANUAL"] as const).map(mode => (
            <button key={mode} onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all
                ${filter === mode
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
              {mode === "ALL" ? "Combined" : mode === "BOT" ? "Bots" : "Manual"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Gold + NQ side-by-side ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Gold */}
        <div className="relative rounded-xl border border-border bg-card overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/80" />
          <div className="px-4 pt-4 pb-3 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-amber-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-foreground">
                Gold Sentinel Engine
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">XAUUSD</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
              {goldStats.total} trades
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/40 border border-border/50 p-3 rounded-lg">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Net P&L</p>
                <p className={`text-xl font-black tabular-nums ${goldStats.netPnL >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                  {goldStats.netPnL >= 0 ? "+" : ""}${goldStats.netPnL.toFixed(2)}
                </p>
              </div>
              <div className="bg-background/40 border border-border/50 p-3 rounded-lg">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Profit Factor</p>
                <p className="text-xl font-black tabular-nums text-foreground">{goldStats.pf}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground uppercase tracking-wide">Win Rate</span>
                <span className="text-foreground font-bold font-mono">{goldStats.winRate}%</span>
              </div>
              <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${goldStats.winRate}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="flex justify-between p-2 bg-background/30 rounded border border-border/40">
                  <span className="text-muted-foreground font-mono">Wins</span>
                  <span className="text-emerald-400 font-bold font-mono">{goldStats.wins}</span>
                </div>
                <div className="flex justify-between p-2 bg-background/30 rounded border border-border/40">
                  <span className="text-muted-foreground font-mono">Losses</span>
                  <span className="text-rose-400 font-bold font-mono">{goldStats.losses}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NQ */}
        <div className="relative rounded-xl border border-border bg-card overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/80" />
          <div className="px-4 pt-4 pb-3 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-cyan-400" />
              <span className="text-[11px] font-black uppercase tracking-wider text-foreground">
                Phoenix NQ Engine
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">USTEC</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20">
              {nasStats.total} trades
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/40 border border-border/50 p-3 rounded-lg">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Net P&L</p>
                <p className={`text-xl font-black tabular-nums ${nasStats.netPnL >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                  {nasStats.netPnL >= 0 ? "+" : ""}${nasStats.netPnL.toFixed(2)}
                </p>
              </div>
              <div className="bg-background/40 border border-border/50 p-3 rounded-lg">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Profit Factor</p>
                <p className="text-xl font-black tabular-nums text-foreground">{nasStats.pf}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground uppercase tracking-wide">Win Rate</span>
                <span className="text-foreground font-bold font-mono">{nasStats.winRate}%</span>
              </div>
              <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${nasStats.winRate}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="flex justify-between p-2 bg-background/30 rounded border border-border/40">
                  <span className="text-muted-foreground font-mono">Wins</span>
                  <span className="text-emerald-400 font-bold font-mono">{nasStats.wins}</span>
                </div>
                <div className="flex justify-between p-2 bg-background/30 rounded border border-border/40">
                  <span className="text-muted-foreground font-mono">Losses</span>
                  <span className="text-rose-400 font-bold font-mono">{nasStats.losses}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
