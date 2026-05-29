"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw, Radio, Shield, Target, AlertTriangle,
  Zap, TrendingUp, TrendingDown, ChevronRight, Activity,
} from "lucide-react"

// ── Types matching /api/agents/run response ───────────────────────────────
interface AgentVerdict { verdict: "BULLISH" | "BEARISH" | "NEUTRAL"; pct: number; reasoning: string }
interface TradePlan {
  direction: "long" | "short"
  entry: number; stopLoss: number; tp1: number; tp2: number; rrRatio: number
}
interface RiskGate {
  grade: "A" | "B" | "C" | "D"
  status: "CLEAR" | "CAUTION" | "BLOCKED"
  maxRiskPercent: number
  reasoning?: string
}
interface AgentRunResult {
  id: string; timestamp: string
  symbol: string; timeframe: string
  finalBias: "bullish" | "bearish" | "no-trade"
  confidence: number
  consensusScore: number
  strategyMatch: string
  noTradeReason: string | null
  priceAtSignal: number
  tradePlan: TradePlan | null
  agents: { trend: AgentVerdict; priceAction: AgentVerdict; news: AgentVerdict; contrarian: AgentVerdict }
  riskGate: RiskGate
  marketPhase: string
  macroRegime: string
  supports: string[]
  invalidationConditions: string[]
  executionSummary: string
  cached?: boolean
  cachedAt?: string
  _debug?: { mode: string; model?: string; error?: string }
}

const INSTRUMENTS = [
  { symbol: "XAUUSD", label: "XAU/USD",  name: "Gold Spot"   },
  { symbol: "USTEC",  label: "USTEC",    name: "Nasdaq 100"  },
  { symbol: "EURUSD", label: "EUR/USD",  name: "DXY Proxy"   },
  { symbol: "GBPUSD", label: "GBP/USD",  name: "Cable"       },
  { symbol: "BTCUSD", label: "BTC/USD",  name: "Bitcoin"     },
]
const TIMEFRAMES = ["M15", "H1", "H4", "D1"] as const

// ── Sub-components ──────────────────────────────────────────────────────

function AgentRow({ name, weight, verdict, pct, reasoning }:
  { name: string; weight: string; verdict: string; pct: number; reasoning: string }) {
  const color =
    verdict === "BULLISH" ? "text-emerald-400" :
    verdict === "BEARISH" ? "text-rose-400"    :
    "text-muted-foreground"
  const barBg =
    verdict === "BULLISH" ? "bg-emerald-500" :
    verdict === "BEARISH" ? "bg-rose-500"    :
    "bg-muted"
  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-[10px] text-muted-foreground font-bold w-24 shrink-0 uppercase tracking-wider">{name}</span>
        <span className={`text-[10px] font-black tracking-widest w-14 shrink-0 ${color}`}>{verdict}</span>
        <div className="flex-1 h-1 bg-background/60 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${barBg}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right tabular-nums">{pct}%</span>
        <span className="text-[9px] text-muted-foreground/50 w-10 text-right tabular-nums">{weight}</span>
      </div>
      {reasoning && <p className="text-[10px] text-muted-foreground/70 ml-24 pl-3 leading-relaxed">{reasoning}</p>}
    </div>
  )
}

function ConvictionGauge({ value }: { value: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444"
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">%</span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">CONVICTION</span>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="bg-card/40 border border-border/40 rounded-xl p-5 animate-pulse space-y-3">
      <div className="h-3 bg-background/60 rounded w-1/3" />
      <div className="h-10 bg-background/60 rounded w-2/3" />
      <div className="h-3 bg-background/60 rounded w-full" />
      <div className="h-3 bg-background/60 rounded w-4/5" />
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────
export function MarketBiasView() {
  const [activeSymbol, setActiveSymbol] = useState("XAUUSD")
  const [timeframe,    setTimeframe]    = useState<typeof TIMEFRAMES[number]>("H1")
  const [data,         setData]         = useState<AgentRunResult | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // ── Fetch agent result ─────────────────────────────────────────────────
  const fetchAgent = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: activeSymbol, timeframe, forceRefresh }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const json: AgentRunResult = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [activeSymbol, timeframe])

  // Initial fetch + 5min auto-refresh
  useEffect(() => {
    fetchAgent(false)
    const t = setInterval(() => fetchAgent(false), 5 * 60_000)
    return () => clearInterval(t)
  }, [fetchAgent])

  // ── Derived display state ──────────────────────────────────────────────
  const bias        = data?.finalBias
  const isLong      = bias === "bullish"
  const isShort     = bias === "bearish"
  const isNoTrade   = bias === "no-trade"
  const barPos      = data ? Math.round(((data.consensusScore + 100) / 200) * 100) : 50
  const usingMock   = data?._debug?.mode === "mock"

  return (
    <div className="space-y-4">

      {/* ── Header: instrument tabs + status + refresh ─────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Instrument tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {INSTRUMENTS.map(inst => (
            <button
              key={inst.symbol}
              onClick={() => setActiveSymbol(inst.symbol)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all
                ${activeSymbol === inst.symbol
                  ? "bg-emerald-500/[0.08] border-emerald-500/30 text-foreground"
                  : "bg-card/40 border-border/40 text-muted-foreground hover:text-foreground"
                }`}>
              <div className="text-left">
                <div className="font-black">{inst.label}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5 font-normal">{inst.name}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Live / Cached / Mock badge */}
          {data && (
            usingMock ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Radio size={11} /> DEMO MODE
              </span>
            ) : data.cached ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/30">
                <Radio size={11} /> CACHED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                LIVE
              </span>
            )
          )}
          <button
            onClick={() => fetchAgent(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            REFRESH
          </button>
        </div>
      </div>

      {/* ── Timeframe row ─────────────────────────────────────────────── */}
      <div className="flex items-center bg-background/40 border border-border/40 rounded-lg p-0.5 w-fit">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all
              ${timeframe === tf ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {tf}
          </button>
        ))}
      </div>

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
          Agent error: {error}
        </div>
      )}

      {/* ── Master verdict card ───────────────────────────────────────── */}
      {loading && !data ? (
        <Skeleton />
      ) : data ? (
        <div className={`rounded-xl p-5 border shadow-lg
          ${isLong  ? "bg-emerald-500/[0.04] border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.08)]" :
            isShort ? "bg-rose-500/[0.04] border-rose-500/20 shadow-[0_0_30px_rgba(239,68,68,0.08)]" :
                      "bg-card/40 border-border/40"}`}>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-bold">
                MULTI-AGENT · {activeSymbol} · {timeframe} · Claude Sonnet 4.6
              </div>

              {/* Bias badge */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {isLong && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-sm font-black text-emerald-400">
                    <TrendingUp size={14} /> BULLISH
                  </span>
                )}
                {isShort && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-sm font-black text-rose-400">
                    <TrendingDown size={14} /> BEARISH
                  </span>
                )}
                {isNoTrade && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/20 border border-border/40 text-sm font-black text-muted-foreground">
                    <Activity size={14} /> NO TRADE
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{data.confidence}% confidence</span>
              </div>

              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">MASTER VERDICT</p>
              <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight leading-none mb-3">
                {isNoTrade ? "NO TRADE" : bias?.toUpperCase()}
              </h2>

              {data.noTradeReason && (
                <p className="text-xs text-amber-400 mb-2 leading-relaxed">{data.noTradeReason}</p>
              )}
              <p className="text-xs text-muted-foreground italic">{data.strategyMatch}</p>

              {/* Trade plan grid */}
              {data.tradePlan && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 grid grid-cols-3 gap-3">
                  {[
                    { label: "ENTRY", value: data.tradePlan.entry.toLocaleString(),     color: "text-foreground" },
                    { label: "SL",    value: data.tradePlan.stopLoss.toLocaleString(),  color: "text-rose-400" },
                    { label: "R:R",   value: `1:${data.tradePlan.rrRatio}`,             color: "text-emerald-400" },
                    { label: "TP1",   value: data.tradePlan.tp1.toLocaleString(),       color: "text-emerald-400" },
                    { label: "TP2",   value: data.tradePlan.tp2.toLocaleString(),       color: "text-emerald-400" },
                    { label: "DIR",   value: data.tradePlan.direction.toUpperCase(),    color: data.tradePlan.direction === "long" ? "text-emerald-400" : "text-rose-400" },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">{f.label}</p>
                      <p className={`text-sm font-black tabular-nums ${f.color}`}>{f.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Consensus bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5 font-bold uppercase tracking-wider">
                  <span className="text-rose-400/70">◀ BEARISH</span>
                  <span>
                    Consensus{" "}
                    <span className={data.consensusScore > 0 ? "text-emerald-400" : data.consensusScore < 0 ? "text-rose-400" : "text-muted-foreground"}>
                      {data.consensusScore > 0 ? "+" : ""}{Math.round(data.consensusScore)}
                    </span>
                  </span>
                  <span className="text-emerald-400/70">BULLISH ▶</span>
                </div>
                <div className="h-1.5 bg-background/60 rounded-full relative">
                  <div
                    className={`absolute h-full w-2.5 rounded-full transition-all duration-700 ${data.consensusScore > 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{ left: `${Math.max(2, Math.min(95, barPos))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <ConvictionGauge value={data.confidence} />
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Agent consensus ───────────────────────────────────────────── */}
      {data && (
        <div className="bg-card/40 border border-border/40 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-sky-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Agent Consensus</h3>
          </div>
          <div className="space-y-3">
            <AgentRow name="Trend"        weight="×0.25" verdict={data.agents.trend.verdict}        pct={data.agents.trend.pct}        reasoning={data.agents.trend.reasoning} />
            <AgentRow name="Price Action" weight="×0.30" verdict={data.agents.priceAction.verdict}  pct={data.agents.priceAction.pct}  reasoning={data.agents.priceAction.reasoning} />
            <AgentRow name="News"         weight="×0.15" verdict={data.agents.news.verdict}         pct={data.agents.news.pct}         reasoning={data.agents.news.reasoning} />
            <AgentRow name="Contrarian"   weight="×0.10" verdict={data.agents.contrarian.verdict}   pct={data.agents.contrarian.pct}   reasoning={data.agents.contrarian.reasoning} />
          </div>

          <div className="mt-4 pt-3 border-t border-border/30 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">MARKET PHASE</p>
              <p className="text-xs font-bold text-foreground">{data.marketPhase}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">MACRO REGIME</p>
              <p className="text-xs font-bold text-foreground">{data.macroRegime}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Risk Gate ─────────────────────────────────────────────────── */}
      {data && (
        <div className="bg-card/40 border border-border/40 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-sky-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Risk Gate</h3>
            <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-black tracking-widest
              ${data.riskGate.status === "CLEAR"   ? "bg-emerald-500/10 text-emerald-400" :
                data.riskGate.status === "CAUTION" ? "bg-amber-500/10 text-amber-400"     :
                                                     "bg-rose-500/10 text-rose-400"}`}>
              {data.riskGate.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-1.5">Grade</p>
              <span className={`inline-flex w-8 h-8 rounded items-center justify-center text-sm font-black border
                ${data.riskGate.grade === "A" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                  data.riskGate.grade === "B" ? "bg-sky-500/10 border-sky-500/30 text-sky-400"             :
                  data.riskGate.grade === "C" ? "bg-amber-500/10 border-amber-500/30 text-amber-400"       :
                                                "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                {data.riskGate.grade}
              </span>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-1.5">Max Risk</p>
              <p className="text-sm font-black font-mono text-foreground tabular-nums">{data.riskGate.maxRiskPercent}%</p>
            </div>
          </div>
          {data.riskGate.reasoning && (
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{data.riskGate.reasoning}</p>
          )}
        </div>
      )}

      {/* ── Supports / Invalidations ──────────────────────────────────── */}
      {data && (data.supports.length > 0 || data.invalidationConditions.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.supports.length > 0 && (
            <div className="bg-card/40 border border-border/40 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Supporting Factors</h3>
              </div>
              <ul className="space-y-2">
                {data.supports.map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                    <ChevronRight size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.invalidationConditions.length > 0 && (
            <div className="bg-card/40 border border-border/40 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Invalidation Conditions</h3>
              </div>
              <ul className="space-y-2">
                {data.invalidationConditions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                    <ChevronRight size={14} className="text-rose-500 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Execution summary ──────────────────────────────────────────── */}
      {data?.executionSummary && (
        <div className={`rounded-xl p-4 border shadow-lg
          ${data.tradePlan ? "bg-emerald-500/[0.04] border-emerald-500/20" : "bg-card/40 border-border/40"}`}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">EXECUTION SUMMARY</p>
          <p className="text-sm text-foreground leading-relaxed">{data.executionSummary}</p>
        </div>
      )}

      {/* ── Debug info (dev/QA) ────────────────────────────────────────── */}
      {data?._debug && (
        <div className="text-[10px] text-muted-foreground/40 font-mono text-right">
          {data._debug.mode} {data._debug.model && `· ${data._debug.model}`}{data._debug.error && ` · ${data._debug.error.slice(0,80)}`}
        </div>
      )}
    </div>
  )
}
