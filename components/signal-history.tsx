"use client"

import { useState, useMemo } from "react"
import { ArrowUpRight, ArrowDownRight, Info, History, Bot, User, ClipboardCopy, Activity } from "lucide-react"

interface Trade {
  id:         string
  date:       string
  symbol:     string
  setup:      string
  rMultiple:  number
  direction?: string
  notes?:     string
  screenshot?: string
}

type PeriodFilter = "24h" | "7d" | "30d" | "all"
type SourceTab   = "bots" | "manual"

const PERIODS: { id: PeriodFilter; label: string; days: number | null }[] = [
  { id: "24h", label: "24h",      days: 1   },
  { id: "7d",  label: "7 days",   days: 7   },
  { id: "30d", label: "30 days",  days: 30  },
  { id: "all", label: "All time", days: null },
]

// ── Helpers ─────────────────────────────────────────────────────────────
function timeAgo(d: Date): string {
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days}d ago`
}

function getAssetTag(symbol: string): string {
  const u = symbol.toUpperCase()
  if (u.includes("XAU") || u.includes("GOLD")) return "Gold"
  if (u.includes("EUR")) return "EUR/USD"
  if (u.includes("GBP")) return "GBP/USD"
  if (u.includes("BTC")) return "BTC"
  if (u.includes("USTEC") || u.includes("NAS") || u.includes("NDX")) return "NASDAQ"
  return symbol
}

// ── Sub-components ──────────────────────────────────────────────────────
function StatCard({
  label, value, sub, valueColor = "text-foreground",
}: { label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <div className="bg-card/60 border border-border/40 rounded-xl p-4 shadow-lg">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-2xl md:text-3xl font-black mt-1 tabular-nums ${valueColor}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}

function SymbolBreakdownRow({
  symbol, signals, wins, totalSignals,
}: { symbol: string; signals: number; wins: number; totalSignals: number }) {
  const hitRate = totalSignals > 0 ? Math.round((wins / totalSignals) * 100 * 10) / 10 : 0
  const isStrong = hitRate >= 50
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{symbol}</p>
      <p className="text-base font-black tabular-nums mt-0.5">
        <span className={isStrong ? "text-emerald-400" : "text-foreground"}>{hitRate}%</span>
        <span className="text-muted-foreground text-xs font-bold ml-1.5">({wins}/{totalSignals})</span>
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{signals} signals</p>
    </div>
  )
}

// ── Signal card — now optionally renders "Copy to Journal" button ─────
function SignalCard({
  trade, source, onCopyToJournal,
}: {
  trade: Trade
  source: SourceTab
  onCopyToJournal?: (t: Trade) => void
}) {
  const isWin    = trade.rMultiple > 0
  const isLoss   = trade.rMultiple < 0
  const isBuy    = (trade.direction ?? "BUY").toUpperCase() === "BUY"
  const ago      = timeAgo(new Date(trade.date))
  const assetTag = getAssetTag(trade.symbol)
  const profitStr = `${trade.rMultiple >= 0 ? "+" : ""}$${trade.rMultiple.toFixed(2)}`

  const outcomeBadge =
    isWin  ? { label: `WIN · ${profitStr}`,  cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" } :
    isLoss ? { label: `LOSS · ${profitStr}`, cls: "bg-rose-500/10 text-rose-400 border-rose-500/30" } :
             { label: "BREAK-EVEN",          cls: "bg-muted/20 text-muted-foreground border-border/40" }

  return (
    <div className="p-3 rounded-xl bg-card/40 border border-border/40 hover:border-border/60 transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{ago}</span>
          <span className="text-sm font-black text-foreground">
            {assetTag} <span className="text-muted-foreground font-bold">({trade.symbol})</span>
          </span>
          <span className="text-[10px] text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded">H1</span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded
            ${isBuy ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
            {isBuy ? <ArrowUpRight size={11}/> : <ArrowDownRight size={11}/>}
            {isBuy ? "BUY" : "SELL"}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded border ${outcomeBadge.cls}`}>
          {outcomeBadge.label}
        </span>
      </div>

      <div className="mt-1.5 ml-[1px] flex items-end justify-between gap-3">
        <p className="text-[11px] text-muted-foreground italic flex-1 min-w-0">
          {trade.setup}
          {trade.notes && <span className="text-muted-foreground/80"> — {trade.notes}</span>}
        </p>

        {/* Copy-to-Journal — only shown on bot signals */}
        {source === "bots" && onCopyToJournal && (
          <button
            type="button"
            onClick={() => onCopyToJournal(trade)}
            title="Copy this signal into the Log Trade dialog"
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest
                       bg-primary/10 border border-primary/30 text-primary
                       hover:bg-primary/20 transition-colors whitespace-nowrap flex-shrink-0">
            <ClipboardCopy size={10} />
            Copy to Journal
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main view ───────────────────────────────────────────────────────────
interface ExecutionLedgerViewProps {
  trades?:         Trade[]   // user's manual entries
  botTrades?:      Trade[]   // shared bot demo feed
  onCopyToJournal?: (t: Trade) => void
}

export function SignalHistoryView({
  trades = [],
  botTrades = [],
  onCopyToJournal,
}: ExecutionLedgerViewProps) {
  const [tab,           setTab]           = useState<SourceTab>("bots")
  const [symbolFilter,  setSymbolFilter]  = useState<string>("All")
  const [periodFilter,  setPeriodFilter]  = useState<PeriodFilter>("30d")

  // The active dataset depends on which tab is selected
  const activeSet = tab === "bots" ? botTrades : trades

  // Available symbols are derived from the active dataset (avoids showing
  // bot-only symbols on the Manual tab and vice versa)
  const allSymbols = useMemo(() => {
    const s = new Set<string>()
    activeSet.forEach(t => s.add(getAssetTag(t.symbol)))
    return Array.from(s).slice(0, 5)
  }, [activeSet])

  // Reset symbol filter if it's not present in the new dataset after a tab switch
  useMemo(() => {
    if (symbolFilter !== "All" && !allSymbols.includes(symbolFilter)) {
      setSymbolFilter("All")
    }
  }, [allSymbols, symbolFilter])

  // Time-filter
  const periodFiltered = useMemo(() => {
    const period = PERIODS.find(p => p.id === periodFilter)
    if (!period?.days) return activeSet
    const cutoff = Date.now() - period.days * 86_400_000
    return activeSet.filter(t => new Date(t.date).getTime() > cutoff)
  }, [activeSet, periodFilter])

  // Symbol-filter
  const visibleTrades = useMemo(() => {
    if (symbolFilter === "All") return periodFiltered
    return periodFiltered.filter(t => getAssetTag(t.symbol) === symbolFilter)
  }, [periodFiltered, symbolFilter])

  // ── Aggregated stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const total      = visibleTrades.length
    const wins       = visibleTrades.filter(t => t.rMultiple > 0).length
    const losses     = visibleTrades.filter(t => t.rMultiple < 0).length
    const be         = visibleTrades.filter(t => t.rMultiple === 0).length
    const resolved   = wins + losses
    const hitRate    = resolved > 0 ? Math.round((wins / resolved) * 1000) / 10 : 0
    const totalR     = visibleTrades.reduce((s, t) => s + t.rMultiple, 0)
    const avgRR      = wins > 0 ? totalR / wins : 0

    return { total, wins, losses, be, hitRate, totalR, avgRR }
  }, [visibleTrades])

  // ── By symbol ──────────────────────────────────────────────────────
  const bySymbol = useMemo(() => {
    const m: Record<string, { signals: number; wins: number; total: number }> = {}
    for (const t of periodFiltered) {
      const tag = getAssetTag(t.symbol)
      if (!m[tag]) m[tag] = { signals: 0, wins: 0, total: 0 }
      m[tag].signals += 1
      m[tag].total += 1
      if (t.rMultiple > 0) m[tag].wins += 1
    }
    return Object.entries(m)
      .sort(([, a], [, b]) => b.signals - a.signals)
      .slice(0, 4)
  }, [periodFiltered])

  return (
    <div className="space-y-4">

      {/* ── Source tabs: Bots / Manual ───────────────────────────────── */}
      <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5 w-fit">
        {([
          { id: "bots",   label: "Bots",   icon: Bot,  count: botTrades.length },
          { id: "manual", label: "Manual", icon: User, count: trades.length    },
        ] as const).map(t => {
          const Icon = t.icon
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all min-h-[36px]
                ${isActive ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon size={13} />
              {t.label}
              <span className={`text-[9px] font-mono ${isActive ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                ({t.count})
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Filters row ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Symbol filter */}
        {allSymbols.length > 0 && (
          <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5 flex-wrap">
            {["All", ...allSymbols].map(s => (
              <button
                key={s}
                onClick={() => setSymbolFilter(s)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all
                  ${symbolFilter === s ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Period filter */}
        <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodFilter(p.id)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all
                ${periodFilter === p.id ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Top stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <StatCard
          label="Hit Rate"
          value={`${stats.hitRate}%`}
          sub={`${stats.wins}W · ${stats.losses}L · ${stats.be}BE`}
          valueColor={stats.hitRate >= 50 ? "text-emerald-400" : "text-foreground"}
        />
        <StatCard
          label="Total P&L"
          value={`${stats.totalR >= 0 ? "+" : ""}$${stats.totalR.toFixed(2)}`}
          sub={`${stats.total} executions`}
          valueColor={stats.totalR >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
        <StatCard
          label="Avg Win"
          value={stats.wins > 0 ? `$${stats.avgRR.toFixed(2)}` : "—"}
          sub="Per winning signal"
        />
        <StatCard
          label="Avg Time"
          value="—"
          sub="From signal to outcome"
          valueColor="text-sky-400"
        />
        <StatCard
          label="Source"
          value={tab === "bots" ? "BOT" : "USER"}
          sub={tab === "bots" ? "Engine telemetry feed" : "Your manual entries"}
          valueColor={tab === "bots" ? "text-primary" : "text-amber-400"}
        />
      </div>

      {/* ── By symbol breakdown ─────────────────────────────────────── */}
      {bySymbol.length > 0 && (
        <div className="bg-card/40 border border-border/40 rounded-xl p-4 shadow-lg">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3">By Symbol</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bySymbol.map(([sym, s]) => (
              <SymbolBreakdownRow
                key={sym}
                symbol={sym}
                signals={s.signals}
                wins={s.wins}
                totalSignals={s.total}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Recent executions list ──────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          {tab === "bots" ? <Bot className="h-3.5 w-3.5 text-muted-foreground" /> : <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {tab === "bots" ? "Bot Executions" : "Manual Entries"}
            {visibleTrades.length > 0 && <span className="text-muted-foreground/60"> · {visibleTrades.length} shown</span>}
          </p>
        </div>

        {visibleTrades.length === 0 ? (
          <div className="bg-card/40 border border-border/40 rounded-xl p-8 text-center">
            <Info className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No {tab === "bots" ? "bot executions" : "manual entries"} logged in this period
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {tab === "bots"
                ? "Bot trades will appear here as engines fire and close positions."
                : "Use Log Trade in the PnL Calendar to add manual entries."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTrades.slice(0, 30).map(t => (
              <SignalCard
                key={t.id}
                trade={t}
                source={tab}
                onCopyToJournal={onCopyToJournal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
