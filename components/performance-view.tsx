"use client"

// ─────────────────────────────────────────────────────────────────────────────
// Performance View — reworked from engine tiles to per-account tiles
//
// REMOVED: Combined / Core Engines / Manual Logs filter bar
// ADDED:   One tile per registered account — groups trades by accountId
//          Account name, broker, and color all come from the accounts prop
//
// Each account tile shows:
//   • 4 stat cards: Net P&L, Profit Factor, Win Rate, Expectancy
//   • Chronological equity curve
//   • Peak-to-trough drawdown chart
//   • Click trade count to open a scrollable trade ledger dialog
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react"
import {
  TrendingUp, ShieldAlert, ArrowUpRight, ArrowDownRight,
  Building2, BarChart2,
} from "lucide-react"
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Trade {
  id:         string
  date:       string
  symbol:     string
  setup:      string
  rMultiple:  number
  direction?: string
  notes?:     string
  accountId?: string   // ← key field for per-account grouping
}

interface Account {
  id:          string
  accountName: string
  color:       string
  broker:      string
}

interface PerformanceViewProps {
  userTrades?: Trade[]
  botTrades?:  Trade[]   // kept for API compatibility — not shown here (see Bot Hub)
  accounts?:   Account[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildChartData(trades: Trade[]) {
  let pnl = 0, peak = 0
  const data: { index: number; pnl: number; drawdown: number }[] = [{ index: 0, pnl: 0, drawdown: 0 }]
  ;[...trades]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach((t, i) => {
      pnl  += Number(t.rMultiple || 0)
      if (pnl > peak) peak = pnl
      data.push({ index: i + 1, pnl: Number(pnl.toFixed(2)), drawdown: Number(Math.max(0, peak - pnl).toFixed(2)) })
    })
  return data
}

function calcStats(trades: Trade[]) {
  const wins   = trades.filter(t => t.rMultiple > 0)
  const losses = trades.filter(t => t.rMultiple < 0)
  const gp     = wins.reduce((s, t)   => s + Number(t.rMultiple), 0)
  const gl     = Math.abs(losses.reduce((s, t) => s + Number(t.rMultiple), 0))
  const netPnl = gp - gl
  const winRate      = trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(1) : "0.0"
  const profitFactor = gl > 0 ? (gp / gl).toFixed(2) : gp > 0 ? "∞" : "0.00"
  const expectancy   = trades.length > 0
    ? ((wins.length / trades.length) * (gp / (wins.length || 1)) - (losses.length / trades.length) * (gl / (losses.length || 1))).toFixed(2)
    : "0.00"
  return { netPnl, profitFactor, winRate, expectancy, wins: wins.length, losses: losses.length }
}

// ── Trade dialog ──────────────────────────────────────────────────────────────
function TradeLedgerDialog({ trades, account, onClose }: {
  trades:  Trade[]
  account: Account | null
  onClose: () => void
}) {
  if (!account) return null
  const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border"
          style={{ borderLeft: `4px solid ${account.color}` }}>
          <div>
            <h3 className="text-sm font-black text-foreground">{account.accountName}</h3>
            <p className="text-[10px] text-muted-foreground">{account.broker} · {sorted.length} trades</p>
          </div>
          <button onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none transition-colors px-2">
            ×
          </button>
        </div>
        {/* Trade list */}
        <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
          {sorted.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10 italic">No trades found.</p>
          ) : sorted.map(t => {
            const isBuy = (t.direction ?? "BUY").toUpperCase() === "BUY"
            const isWin = t.rMultiple > 0
            return (
              <div key={t.id}
                className="flex items-center justify-between px-5 py-3 border-b border-border/30 hover:bg-white/[0.02] transition-colors">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-foreground">{t.symbol}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isBuy ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                      {isBuy ? "BUY" : "SELL"}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(t.date).toLocaleString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
                  </span>
                </div>
                <span className={`text-sm font-black tabular-nums ${isWin ? "text-emerald-400" : t.rMultiple === 0 ? "text-muted-foreground" : "text-rose-400"}`}>
                  {t.rMultiple >= 0 ? "+" : ""}${Number(t.rMultiple).toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Account tile ──────────────────────────────────────────────────────────────
function AccountTile({ account, trades, onOpenLedger }: {
  account:     Account
  trades:      Trade[]
  onOpenLedger:() => void
}) {
  const stats     = useMemo(() => calcStats(trades), [trades])
  const chartData = useMemo(() => buildChartData(trades), [trades])
  const lastPnl   = chartData[chartData.length - 1]?.pnl ?? 0

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 shadow-lg relative overflow-hidden">
      {/* Colored left bar */}
      <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-xl" style={{ background: account.color }} />

      {/* Header */}
      <div className="pl-4 pr-4 pt-4 pb-3 border-b border-border/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: `${account.color}20`, border: `1px solid ${account.color}40` }}>
            <Building2 size={14} style={{ color: account.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-foreground truncate">{account.accountName}</p>
            <p className="text-[10px] text-muted-foreground">{account.broker}</p>
          </div>
        </div>
        <button onClick={onOpenLedger}
          className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg flex-shrink-0 hover:opacity-80 transition-opacity"
          style={{ background: `${account.color}18`, color: account.color, border: `1px solid ${account.color}35` }}>
          {trades.length} trades
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats — 2×2 on mobile, 4 cols on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label:"Net P&L",      value:`${stats.netPnl >= 0 ? "+" : ""}$${stats.netPnl.toFixed(2)}`,   color: stats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400" },
            { label:"P. Factor",    value:stats.profitFactor,                                               color: parseFloat(stats.profitFactor) >= 1.5 ? "text-emerald-400" : parseFloat(stats.profitFactor) >= 1 ? "text-amber-400" : "text-rose-400" },
            { label:"Win Rate",     value:`${stats.winRate}%`,                                              color: parseFloat(stats.winRate) >= 50 ? "text-blue-400" : "text-amber-400" },
            { label:"Expectancy",   value:`$${stats.expectancy}`,                                           color: parseFloat(stats.expectancy) >= 0 ? "text-amber-400" : "text-rose-400" },
          ].map(s => (
            <div key={s.label} className="p-2.5 bg-background/50 rounded-lg">
              <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">{s.label}</span>
              <p className={`text-sm font-black tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* W/L bar */}
        {trades.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
              <span style={{ color: account.color }}>Wins {stats.wins}</span>
              <span className="text-rose-400">Losses {stats.losses}</span>
            </div>
            <div className="h-1 rounded-full bg-rose-500/20 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${stats.winRate}%`, background: account.color }} />
            </div>
          </div>
        )}

        {trades.length > 0 ? (
          <div className="space-y-3">
            {/* Equity curve */}
            <div className="rounded-xl border border-border/30 bg-background/20 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/20 bg-background/30">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" style={{ color: account.color }} />
                  <span className="text-[9px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
                    Equity Curve
                  </span>
                </div>
                <span className={`text-[9px] font-black font-mono ${lastPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {lastPnl >= 0 ? "+" : ""}${lastPnl.toFixed(2)}
                </span>
              </div>
              <div className="h-36 px-2 pt-2 pb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="index" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} width={44}
                      tickFormatter={v => `$${v >= 0 ? "" : ""}${v.toFixed(0)}`}
                      domain={["dataMin - 5", "dataMax + 5"]} />
                    <Tooltip
                      formatter={(v: number) => [`$${v >= 0 ? "+" : ""}${v.toFixed(2)}`, "P&L"]}
                      contentStyle={{ backgroundColor:"#0f172a", borderColor:"#1e293b", color:"#f8fafc", fontSize:11, borderRadius:8 }}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" strokeWidth={1} />
                    <Line type="monotone" dataKey="pnl" stroke={account.color} strokeWidth={2}
                      dot={false} activeDot={{ r:4, fill:account.color }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Drawdown */}
            <div className="rounded-xl border border-border/30 bg-background/20 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-background/30">
                <ShieldAlert className="w-3 h-3 text-rose-500 flex-shrink-0" />
                <span className="text-[9px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
                  Drawdown
                </span>
              </div>
              <div className="h-28 px-2 pt-2 pb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="index" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} inverted width={40}
                      tickFormatter={v => `-$${v.toFixed(0)}`} />
                    <Tooltip
                      formatter={(v: number) => [`-$${v.toFixed(2)}`, "Drawdown"]}
                      contentStyle={{ backgroundColor:"#0f172a", borderColor:"#1e293b", color:"#f8fafc", fontSize:11, borderRadius:8 }}
                    />
                    <Area type="monotone" dataKey="drawdown" stroke="#ef4444"
                      fill="rgba(239,68,68,0.08)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-20 flex items-center justify-center">
            <p className="text-[11px] text-muted-foreground italic font-mono text-center">
              No trades synced yet for this account.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function PerformanceView({ userTrades = [], accounts = [] }: PerformanceViewProps) {
  const [dialogAccount, setDialogAccount] = useState<Account | null>(null)

  // Group user trades by accountId
  const byAccount = useMemo(() => {
    const map: Record<string, Trade[]> = {}
    for (const t of userTrades) {
      const id = (t as any).accountId || "unassigned"
      if (!map[id]) map[id] = []
      map[id].push(t)
    }
    return map
  }, [userTrades])

  // Accounts to render — registered accounts first, then "unassigned" if any
  const accountsToShow = useMemo(() => {
    const result: Account[] = [...accounts]
    if (byAccount["unassigned"]?.length > 0 && !accounts.find(a => a.id === "unassigned")) {
      result.push({ id:"unassigned", accountName:"Unassigned Trades", color:"#888", broker:"Unknown" })
    }
    return result
  }, [accounts, byAccount])

  const dialogTrades = dialogAccount ? (byAccount[dialogAccount.id] ?? []) : []

  if (accounts.length === 0 && userTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <BarChart2 size={32} className="text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground/60">No accounts or trades yet.</p>
        <p className="text-[11px] text-muted-foreground/40">Register accounts in Lifetime Ledger and sync trades to see performance here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Summary strip ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-card/40 rounded-xl border border-border/40">
        <BarChart2 size={14} className="text-primary" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Account Performance</p>
          <p className="text-[10px] text-foreground/50 mt-0.5">
            {accountsToShow.length} account{accountsToShow.length !== 1 ? "s" : ""} · {userTrades.length} total trades
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Combined P&L</p>
          <p className={`text-sm font-black font-mono ${userTrades.reduce((s,t)=>s+t.rMultiple,0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {userTrades.reduce((s,t)=>s+t.rMultiple,0) >= 0 ? "+" : ""}
            ${userTrades.reduce((s,t)=>s+t.rMultiple,0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* ── Per-account tiles ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {accountsToShow.map(acc => (
          <AccountTile
            key={acc.id}
            account={acc}
            trades={byAccount[acc.id] ?? []}
            onOpenLedger={() => setDialogAccount(acc)}
          />
        ))}
      </div>

      {/* Trade ledger dialog */}
      {dialogAccount && (
        <TradeLedgerDialog
          trades={dialogTrades}
          account={dialogAccount}
          onClose={() => setDialogAccount(null)}
        />
      )}
    </div>
  )
}
