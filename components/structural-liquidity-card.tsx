"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Anchor } from "lucide-react"
import { classifyAsset, isMarketOpen } from "@/lib/market-hours"

interface MarketLevels {
  symbol: string
  currentPrice: number
  prevDay:  { high: number; low: number; close: number }
  prevWeek: { high: number; low: number }
  timestamp: string
  cached?: boolean
  _debug?: { mode: string; error?: string; source?: string }
  error?: string
  details?: string
}

const SYMBOLS = [
  { id: "XAUUSD", label: "XAU/USD", name: "Gold Spot",   decimals: 2 },
  { id: "USTEC",  label: "USTEC",   name: "Nasdaq 100",  decimals: 2 },
  { id: "EURUSD", label: "EUR/USD", name: "Fiber",       decimals: 5 },
  { id: "GBPUSD", label: "GBP/USD", name: "Cable",       decimals: 5 },
  { id: "BTCUSD", label: "BTC/USD", name: "Bitcoin",     decimals: 2 },
] as const

// ── Helpers ──────────────────────────────────────────────────
function fmtPrice(n: number, decimals: number): string {
  if (!Number.isFinite(n) || n === 0) return "—"
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function calcDistance(price: number, level: number, decimals: number): { abs: number; pct: number; above: boolean } {
  const abs = price - level
  const pct = level !== 0 ? (abs / level) * 100 : 0
  return { abs, pct, above: abs > 0 }
}

// ── Sub-component: one level row ─────────────────────────────
function LevelRow({
  label, price, current, decimals, accent = "text-foreground",
}: {
  label: string
  price: number
  current: number
  decimals: number
  accent?: string
}) {
  const hasData = Number.isFinite(price) && price > 0
  const dist = hasData ? calcDistance(current, price, decimals) : null

  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded bg-background/40 border border-border/20">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className={`text-[10px] font-black uppercase tracking-widest ${accent} flex-shrink-0`}>{label}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-xs font-bold tabular-nums ${hasData ? "text-foreground" : "text-muted-foreground/40"}`}>
          {hasData ? fmtPrice(price, decimals) : "—"}
        </span>
        {dist && Number.isFinite(dist.pct) && (
          <span className={`text-[10px] font-mono tabular-nums w-16 text-right ${dist.above ? "text-emerald-400/80" : "text-rose-400/80"}`}>
            {dist.above ? "+" : ""}{dist.pct.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────
export function StructuralLiquidityCard({ defaultSymbol = "XAUUSD" }: { defaultSymbol?: string }) {
  const [activeSymbol, setActiveSymbol] = useState<string>(defaultSymbol)
  const [data, setData]                 = useState<MarketLevels | null>(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const fetchLevels = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/market/levels?symbol=${activeSymbol}${forceRefresh ? "&forceRefresh=true" : ""}`
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.details ?? err?.error ?? `HTTP ${res.status}`)
      }
      const json: MarketLevels = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [activeSymbol])

  useEffect(() => {
    fetchLevels(false)
    // Auto-refresh every 5 minutes (matches server cache)
    const t = setInterval(() => fetchLevels(false), 5 * 60_000)
    return () => clearInterval(t)
  }, [fetchLevels])

  const symbolMeta = SYMBOLS.find(s => s.id === activeSymbol) ?? SYMBOLS[0]
  const decimals = symbolMeta.decimals
  const marketOpen = isMarketOpen(activeSymbol)
  const assetClass = classifyAsset(activeSymbol)
  const usingMock = data?._debug?.mode === "mock"

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 shadow-lg overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-background/30">
        <div className="flex items-center gap-2 min-w-0">
          <Anchor className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground truncate">
            Structural & Liquidity
          </h3>
        </div>

        {/* Live / Cached / Mock badge */}
        <div className="flex items-center gap-1.5">
          {data && (
            usingMock ? (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                DEMO
              </span>
            ) : data.cached ? (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                CACHED
              </span>
            ) : (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                LIVE
              </span>
            )
          )}
          <button
            onClick={() => fetchLevels(true)}
            disabled={loading}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors disabled:opacity-50"
            aria-label="Refresh">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Symbol tabs */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-border/30 overflow-x-auto">
        {SYMBOLS.map(s => {
          const isActive = activeSymbol === s.id
          const isClosed = !isMarketOpen(s.id)
          return (
            <button
              key={s.id}
              onClick={() => setActiveSymbol(s.id)}
              className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all flex-shrink-0
                ${isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground border border-transparent"}
                ${isClosed && !isActive ? "opacity-50" : ""}`}>
              {s.label}
              {isClosed && classifyAsset(s.id) !== "crypto" && (
                <span className="ml-1 text-amber-400/70">●</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="p-3 space-y-2">

        {/* Current price + market status */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-background/40 border border-border/20">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Current Price</p>
            <p className="text-base font-black tabular-nums text-foreground mt-0.5">
              {data?.currentPrice ? fmtPrice(data.currentPrice, decimals) : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{symbolMeta.name}</p>
            {marketOpen ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                MARKET OPEN
              </span>
            ) : assetClass === "crypto" ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                24/7
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                WEEKEND
              </span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
            <AlertCircle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-rose-400">Failed to fetch</p>
              <p className="text-[10px] text-rose-400/70 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-7 bg-background/40 rounded animate-pulse" />
            ))}
          </div>
        )}

        {/* Levels */}
        {data && !error && (
          <>
            <div className="space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 px-1 mt-1">Previous Day</p>
              <LevelRow label="PDH" price={data.prevDay.high}  current={data.currentPrice} decimals={decimals} accent="text-emerald-400/70" />
              <LevelRow label="PDL" price={data.prevDay.low}   current={data.currentPrice} decimals={decimals} accent="text-rose-400/70" />
              <LevelRow label="PDC" price={data.prevDay.close} current={data.currentPrice} decimals={decimals} accent="text-sky-400/70" />
            </div>

            <div className="space-y-1.5 pt-2 mt-1 border-t border-border/30">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 px-1">Previous Week</p>
              <LevelRow label="PWH" price={data.prevWeek.high} current={data.currentPrice} decimals={decimals} accent="text-emerald-400/70" />
              <LevelRow label="PWL" price={data.prevWeek.low}  current={data.currentPrice} decimals={decimals} accent="text-rose-400/70" />
            </div>

            {/* Debug line — small, removable later */}
            {data._debug && (
              <p className="text-[9px] text-muted-foreground/40 font-mono text-right pt-1">
                {data._debug.mode}
                {data._debug.source && ` · ${data._debug.source}`}
                {data.cached && " · cached"}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
