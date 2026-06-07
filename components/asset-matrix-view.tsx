"use client"

// Pass B (updated) — removed pairs: Oil/USDCAD, SPX/VIX, SPX/NDX, Gold/US10Y
// Kept: Gold/DXY, DXY/EURUSD, BTC/NDX, Gold/BTC (4 pairs relevant to Gold+NQ traders)
// Removed: Engine Performance section (Gold/NQ stats tiles)

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Radio, Activity, Zap, ArrowUpDown } from "lucide-react"
import type { CorrelationResult, MacroCard, CorrelationPair } from "@/app/api/agents/correlations/route"

// ── Helpers ───────────────────────────────────────────────────────────────────
function coeffColor(c: number) {
  if (c <= -0.7) return "text-rose-400"
  if (c <= -0.3) return "text-orange-400"
  if (c >= 0.7)  return "text-emerald-400"
  if (c >= 0.3)  return "text-teal-400"
  return "text-muted-foreground"
}
function coeffBg(c: number) {
  if (c <= -0.7) return "bg-rose-500/10 border-rose-500/25"
  if (c <= -0.3) return "bg-orange-500/10 border-orange-500/25"
  if (c >= 0.7)  return "bg-emerald-500/10 border-emerald-500/25"
  if (c >= 0.3)  return "bg-teal-500/10 border-teal-500/25"
  return "bg-muted/20 border-border/40"
}
function sentimentDot(s: string) {
  switch(s) {
    case "bullish":   return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
    case "bearish":   return "bg-rose-400 shadow-[0_0_6px_rgba(248,113,133,0.6)]"
    case "elevated":  return "bg-rose-400 shadow-[0_0_6px_rgba(248,113,133,0.6)]"
    case "declining": return "bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.6)]"
    case "moderate":  return "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]"
    default:          return "bg-muted"
  }
}
function sentimentColor(s: string) {
  switch(s) {
    case "bullish":   return "text-emerald-400"
    case "bearish":   return "text-rose-400"
    case "elevated":  return "text-rose-400"
    case "declining": return "text-teal-400"
    case "moderate":  return "text-amber-400"
    default:          return "text-muted-foreground"
  }
}

// ── Macro Regime Bar ──────────────────────────────────────────────────────────
function MacroRegimeBar({ cards }: { cards: MacroCard[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {cards.map(card => (
        <div key={card.key} className="rounded-xl border border-border/40 bg-card/60 px-3 py-3 flex flex-col gap-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{card.label}</p>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sentimentDot(card.sentiment)}`} />
            <p className={`text-[11px] font-black leading-tight ${sentimentColor(card.sentiment)}`}>{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Pair Card ─────────────────────────────────────────────────────────────────
function PairCard({ pair }: { pair: CorrelationPair }) {
  const sign  = pair.coeff >= 0 ? "+" : ""
  const width = Math.round(Math.abs(pair.coeff) * 100)
  const isPos = pair.coeff >= 0

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${coeffBg(pair.coeff)}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-foreground">{pair.assetA}</span>
            <ArrowUpDown size={10} className="text-muted-foreground/50 flex-shrink-0" />
            <span className="text-xs font-black text-foreground">{pair.assetB}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{pair.description}</p>
        </div>
        <span className={`text-xl font-black tabular-nums flex-shrink-0 ${coeffColor(pair.coeff)}`}>
          {sign}{pair.coeff.toFixed(2)}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/50 font-mono">
          <span>−1.0</span><span>0</span><span>+1.0</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-background/60 overflow-hidden">
          <div className={`absolute top-0 h-full rounded-full transition-all duration-700 ${isPos ? "bg-emerald-500" : "bg-rose-500"}`}
            style={{ width:`${width/2}%`, left:isPos?"50%":undefined, right:!isPos?"50%":undefined }} />
          <div className="absolute top-0 left-1/2 w-px h-full bg-muted-foreground/30" />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{pair.explanation}</p>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Array.from({length:5}).map((_,i)=>(
          <div key={i} className="h-16 rounded-xl bg-card/40 border border-border/30" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({length:4}).map((_,i)=>(
          <div key={i} className="h-28 rounded-xl bg-card/40 border border-border/30" />
        ))}
      </div>
    </div>
  )
}

function CorrelationSection() {
  const [data,    setData]    = useState<CorrelationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/agents/correlations", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ forceRefresh }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const json = await res.json()

      // Filter pairs — only Gold/DXY, DXY/EURUSD, BTC/NDX, Gold/BTC
      const KEEP = [
        ["Gold","DXY"], ["DXY","EUR/USD"], ["BTC","NDX"], ["Gold","BTC"]
      ]
      json.pairs = (json.pairs ?? []).filter((p: CorrelationPair) =>
        KEEP.some(([a,b]) =>
          (p.assetA === a && p.assetB === b) ||
          (p.assetA === b && p.assetB === a)
        )
      )
      setData(json)
    } catch(e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(false)
    const t = setInterval(() => fetchData(false), 30 * 60_000)
    return () => clearInterval(t)
  }, [fetchData])

  const usingMock = data?._debug?.mode === "mock"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Macro Intelligence</h2>
          {data && (
            usingMock
              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/25"><Radio size={9}/> DEMO</span>
              : data.cached
                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/25"><Radio size={9}/> CACHED</span>
                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span> LIVE
                  </span>
          )}
        </div>
        <button onClick={() => fetchData(true)} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          REFRESH
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-bold">Error: {error}</div>}
      {loading && !data ? <Skeleton /> : data ? (
        <>
          <MacroRegimeBar cards={data.macroRegime} />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={12} className="text-muted-foreground" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Correlation Matrix</p>
              <span className="text-[9px] text-muted-foreground/40 font-mono ml-1">{data.pairs.length} key pairs</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.pairs.map((pair, i) => <PairCard key={`${pair.assetA}-${pair.assetB}-${i}`} pair={pair} />)}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function AssetMatrix({ trades: _trades = [] }: { trades?: any[] }) {
  return (
    <div className="space-y-6">
      <CorrelationSection />
    </div>
  )
}
