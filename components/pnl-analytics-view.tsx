"use client"

import { useState, useMemo } from "react"
import { useTheme } from "@/lib/use-theme"
import {
  DollarSign, Trophy, TrendingUp, TrendingDown, Target, RefreshCw as Refresh,
  Activity, BarChart3, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, Hash,
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts"


// ── Pass U: Per-theme chart + distribution config ─────────────────────────────
function getThemeChartConfig(theme: string) {
  switch (theme) {
    case "violet":
      return {
        stroke:     "#a855f7",
        fillStop1:  { color: "#a855f7", opacity: 0.35 },
        fillStop2:  { color: "#a855f7", opacity: 0 },
        gridColor:  "rgba(168,85,247,0.1)",
        tickColor:  "#9d7ab8",
        glowFilter: "drop-shadow(0 0 4px rgba(168,85,247,0.55))",
        dotGrid:    false,
        winColor:   "#a855f7",
        lossColor:  "#fb7185",
        trackColor: "rgba(168,85,247,0.12)",
        centerBg:   "rgba(15,10,24,0.8)",
      }
    case "black-white":
      return {
        stroke:     "#e5e5e5",
        fillStop1:  { color: "#e5e5e5", opacity: 0.12 },
        fillStop2:  { color: "#000000", opacity: 0 },
        gridColor:  "rgba(255,255,255,0.06)",
        tickColor:  "#737373",
        glowFilter: "",
        dotGrid:    false,
        winColor:   "#e5e5e5",
        lossColor:  "#525252",
        trackColor: "rgba(80,80,80,0.2)",
        centerBg:   "rgba(10,10,10,0.8)",
      }
    case "dark":
      return {
        stroke:     "#34d399",
        fillStop1:  { color: "#34d399", opacity: 0.28 },
        fillStop2:  { color: "#34d399", opacity: 0 },
        gridColor:  "rgba(52,211,153,0.08)",
        tickColor:  "#4ade80",
        glowFilter: "drop-shadow(0 0 5px rgba(52,211,153,0.8))",
        dotGrid:    true,
        winColor:   "#34d399",
        lossColor:  "#fb7185",
        trackColor: "rgba(52,211,153,0.1)",
        centerBg:   "rgba(10,20,15,0.8)",
      }
    case "gold":
      return {
        stroke:     "#f59e0b",
        fillStop1:  { color: "#f59e0b", opacity: 0.28 },
        fillStop2:  { color: "#f59e0b", opacity: 0 },
        gridColor:  "rgba(245,158,11,0.1)",
        tickColor:  "#d97706",
        glowFilter: "",
        dotGrid:    false,
        winColor:   "#22c55e",
        lossColor:  "#ef4444",
        trackColor: "rgba(34,197,94,0.1)",
        centerBg:   "rgba(20,15,5,0.8)",
      }
    case "midnight":
    default:
      return {
        stroke:     "#60a5fa",
        fillStop1:  { color: "#60a5fa", opacity: 0.28 },
        fillStop2:  { color: "#60a5fa", opacity: 0 },
        gridColor:  "rgba(96,165,250,0.08)",
        tickColor:  "#7dd3fc",
        glowFilter: "drop-shadow(0 0 4px rgba(96,165,250,0.5))",
        dotGrid:    false,
        winColor:   "#22c55e",
        lossColor:  "#fb7185",
        trackColor: "rgba(34,197,94,0.1)",
        centerBg:   "rgba(10,15,30,0.8)",
      }
  }
}

interface Trade {
  id:        string
  date:      string
  symbol:    string
  setup:     string
  rMultiple: number
  direction?: string
  notes?:    string
}

const MONTHS  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const DOW     = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

// ── Format helpers ──────────────────────────────────────────────────────
function fmtCurrency(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return "—"
  const sign = n < 0 ? "-" : "+"
  return `${sign}$${Math.abs(n).toFixed(decimals)}`
}
function fmtPercent(n: number): string {
  if (!Number.isFinite(n)) return "—"
  return `${n >= 0 ? "" : "-"}${Math.abs(n).toFixed(2)}%`
}
function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return "—"
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : "+"
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
  return `${sign}$${abs.toFixed(0)}`
}

// Pull main asset tag for grouping
function assetTag(symbol: string): string {
  const u = symbol.toUpperCase()
  if (u.includes("XAU") || u.includes("GOLD")) return "XAUUSD"
  if (u.includes("EUR")) return "EURUSD"
  if (u.includes("GBP")) return "GBPUSD"
  if (u.includes("BTC")) return "BTCUSD"
  if (u.includes("USTEC") || u.includes("NAS") || u.includes("NDX")) return "USTEC"
  return symbol.toUpperCase()
}

// ── Sub-components ──────────────────────────────────────────────────────

function StatTile({
  icon: Icon, label, value, sub, valueColor = "text-foreground",
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  valueColor?: string
}) {
  return (
    <div className="p-3 sm:p-4 rounded-xl bg-card/60 border border-border/40 shadow-lg">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} className="text-muted-foreground flex-shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{label}</span>
      </div>
      <p className={`text-lg sm:text-xl md:text-2xl font-black tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

function MicroStat({ label, value, valueColor = "text-foreground" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="p-2.5 sm:p-3 rounded-lg bg-card/40 border border-border/30 text-center">
      <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/80">{label}</p>
      <p className={`text-sm sm:text-base font-black tabular-nums mt-0.5 ${valueColor}`}>{value}</p>
    </div>
  )
}

function SymbolBreakdownCard({
  symbol, total, wins, losses, netPnl,
}: {
  symbol: string; total: number; wins: number; losses: number; netPnl: number
}) {
  const winRate = total > 0 ? Math.round((wins / total) * 100 * 10) / 10 : 0
  return (
    <div className="p-3 sm:p-4 rounded-lg bg-card/40 border border-border/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-black tracking-widest text-foreground">{symbol}</span>
        <span className={`text-sm font-black tabular-nums ${netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {fmtCurrency(netPnl)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground">
        <span>{total}T</span>
        <span className={winRate >= 50 ? "text-emerald-400" : "text-amber-400"}>{winRate.toFixed(0)}% WR</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-rose-500/20">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${(wins / Math.max(1, total)) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ── Main view ───────────────────────────────────────────────────────────

export function PnLAnalyticsView({ trades = [] }: { trades: Trade[] }) {

  // ── Aggregate stats (all trades, all time) ──────────────────────────
  const stats = useMemo(() => {
    if (trades.length === 0) {
      return {
        netPnl: 0, winRate: 0, profitFactor: 0, avgWin: 0, avgLoss: 0,
        maxDrawdown: 0, expectancy: 0, riskReward: 0,
        totalTrades: 0, wins: 0, losses: 0,
        bestDay: 0, worstDay: 0, grossWin: 0, grossLoss: 0,
      }
    }

    const wins   = trades.filter(t => t.rMultiple > 0)
    const losses = trades.filter(t => t.rMultiple < 0)
    const grossWin  = wins.reduce((s, t) => s + Number(t.rMultiple), 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + Number(t.rMultiple), 0))
    const netPnl    = grossWin - grossLoss
    const winRate   = trades.length > 0 ? (wins.length / trades.length) * 100 : 0
    const avgWin    = wins.length > 0 ? grossWin / wins.length : 0
    const avgLoss   = losses.length > 0 ? grossLoss / losses.length : 0
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0
    const riskReward   = avgLoss > 0 ? avgWin / avgLoss : 0
    const expectancy   = trades.length > 0
      ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss
      : 0

    // Max drawdown: peak-to-trough on running equity
    let running = 0, peak = 0, maxDD = 0
    ;[...trades]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(t => {
        running += Number(t.rMultiple || 0)
        if (running > peak) peak = running
        const dd = peak > 0 ? ((peak - running) / peak) * 100 : 0
        if (dd > maxDD) maxDD = dd
      })

    // Daily aggregation for best/worst day
    const dailyMap: Record<string, number> = {}
    for (const t of trades) {
      const k = new Date(t.date).toDateString()
      dailyMap[k] = (dailyMap[k] || 0) + Number(t.rMultiple || 0)
    }
    const dailyValues = Object.values(dailyMap)
    const bestDay  = dailyValues.length > 0 ? Math.max(...dailyValues) : 0
    const worstDay = dailyValues.length > 0 ? Math.min(...dailyValues) : 0

    return {
      netPnl, winRate, profitFactor, avgWin, avgLoss,
      maxDrawdown: maxDD, expectancy, riskReward,
      totalTrades: trades.length, wins: wins.length, losses: losses.length,
      bestDay, worstDay, grossWin, grossLoss,
    }
  }, [trades])

  // ── Equity curve data ───────────────────────────────────────────────
  const equityData = useMemo(() => {
    let running = 0
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    if (sorted.length === 0) return [{ date: "—", value: 0 }]
    const data = sorted.map(t => {
      running += Number(t.rMultiple || 0)
      return {
        date: new Date(t.date).toLocaleDateString("en-CA"),  // YYYY-MM-DD
        value: Number(running.toFixed(2)),
      }
    })
    return data
  }, [trades])

  const firstDate = equityData[0]?.date ?? "—"
  const lastDate  = equityData[equityData.length - 1]?.date ?? "—"

  // ── By Symbol breakdown ─────────────────────────────────────────────
  const bySymbol = useMemo(() => {
    const m: Record<string, { total: number; wins: number; losses: number; netPnl: number }> = {}
    for (const t of trades) {
      const tag = assetTag(t.symbol)
      if (!m[tag]) m[tag] = { total: 0, wins: 0, losses: 0, netPnl: 0 }
      m[tag].total += 1
      m[tag].netPnl += Number(t.rMultiple || 0)
      if (t.rMultiple > 0) m[tag].wins += 1
      else if (t.rMultiple < 0) m[tag].losses += 1
    }
    return Object.entries(m).sort(([, a], [, b]) => b.total - a.total)
  }, [trades])

  // ── By Day of Week ──────────────────────────────────────────────────
  const byDayOfWeek = useMemo(() => {
    const arr = Array.from({ length: 7 }, () => ({ total: 0, wins: 0, netPnl: 0 }))
    for (const t of trades) {
      const dow = new Date(t.date).getDay()
      arr[dow].total += 1
      arr[dow].netPnl += Number(t.rMultiple || 0)
      if (t.rMultiple > 0) arr[dow].wins += 1
    }
    const maxAbs = Math.max(1, ...arr.map(d => Math.abs(d.netPnl)))
    return arr.map((d, i) => ({
      day: DOW[i],
      ...d,
      winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0,
      barWidth: Math.abs(d.netPnl) / maxAbs * 100,
    }))
  }, [trades])

  // ── Monthly returns matrix (per year) ───────────────────────────────
  const monthly = useMemo(() => {
    const m: Record<number, number[]> = {}
    for (const t of trades) {
      const d = new Date(t.date)
      const yr = d.getFullYear()
      const mo = d.getMonth()
      if (!m[yr]) m[yr] = Array(12).fill(0)
      m[yr][mo] += Number(t.rMultiple || 0)
    }
    return m
  }, [trades])

  const monthlyYears = Object.keys(monthly).map(Number).sort((a, b) => b - a)
  const currentYear  = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const { theme } = useTheme()
  const cfg = getThemeChartConfig(theme)

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ═══ PERFORMANCE OVERVIEW — top 6 stat tiles ═══════════════════ */}
      <div>
        <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Performance Overview</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile
            icon={DollarSign}
            label="Net P&L"
            value={fmtCurrency(stats.netPnl)}
            valueColor={stats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
          />
          <StatTile
            icon={Trophy}
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            valueColor={stats.winRate >= 50 ? "text-emerald-400" : "text-amber-400"}
          />
          <StatTile
            icon={TrendingUp}
            label="Profit Factor"
            value={Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"}
            valueColor={stats.profitFactor >= 1 ? "text-emerald-400" : "text-rose-400"}
          />
          <StatTile
            icon={ArrowUpRight}
            label="Avg Win"
            value={fmtCurrency(stats.avgWin)}
            valueColor="text-emerald-400"
          />
          <StatTile
            icon={ArrowDownRight}
            label="Avg Loss"
            value={fmtCurrency(-stats.avgLoss)}
            valueColor="text-rose-400"
          />
          <StatTile
            icon={TrendingDown}
            label="Max Drawdown"
            value={fmtPercent(-stats.maxDrawdown)}
            valueColor="text-rose-400"
          />
        </div>
      </div>

      {/* ═══ Secondary metrics row ════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={Target}
          label="Expectancy"
          value={fmtCurrency(stats.expectancy)}
          sub="per trade avg"
          valueColor={stats.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
        <StatTile
          icon={Refresh}
          label="Risk-to-Reward"
          value={stats.riskReward > 0 ? `${stats.riskReward.toFixed(2)} R` : "—"}
          sub="avg win / avg loss"
          valueColor="text-emerald-400"
        />
        <StatTile
          icon={Hash}
          label="Sharpe Ratio"
          value="Low Sample"
          sub="needs more trades"
          valueColor="text-muted-foreground"
        />
        <StatTile
          icon={Activity}
          label="Avg Hold Time"
          value="N/A"
          sub="bots need open-time"
          valueColor="text-muted-foreground"
        />
      </div>

      {/* ═══ Micro-stats row ══════════════════════════════════════════ */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <MicroStat label="Trades"    value={String(stats.totalTrades)} />
        <MicroStat label="Wins"      value={String(stats.wins)}   valueColor="text-emerald-400" />
        <MicroStat label="Losses"    value={String(stats.losses)} valueColor="text-rose-400" />
        <MicroStat label="Best Day"  value={fmtCurrency(stats.bestDay)}   valueColor="text-emerald-400" />
        <MicroStat label="Worst Day" value={fmtCurrency(stats.worstDay)}  valueColor="text-rose-400" />
        <MicroStat label="Gross Win"  value={fmtCurrency(stats.grossWin)}  valueColor="text-emerald-400" />
        <MicroStat label="Gross Loss" value={fmtCurrency(-stats.grossLoss)} valueColor="text-rose-400" />
        <MicroStat
          label="Avg / Trade"
          value={stats.totalTrades > 0 ? fmtCurrency(stats.netPnl / stats.totalTrades) : "—"}
          valueColor={stats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
      </div>

      {/* ═══ EQUITY CURVE + DISTRIBUTION — side by side ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">

        {/* Equity Curve */}
        <div className="rounded-xl border border-border/40 bg-card/60 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-background/30">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" style={{ color: cfg.stroke }} />
              <span className="text-xs font-black uppercase tracking-widest">System Equity Curve</span>
              <span className="text-[10px] text-muted-foreground italic">({stats.totalTrades} trades)</span>
            </div>
            <span className="text-xs font-black font-mono" style={{ color: stats.netPnl >= 0 ? cfg.winColor : cfg.lossColor }}>
              {fmtCurrency(stats.netPnl)} total
            </span>
          </div>
          <div className="h-48 sm:h-56 lg:h-64 px-2 pt-3 pb-2 relative">
            {/* Dot grid for Dark/Green theme */}
            {cfg.dotGrid && (
              <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `radial-gradient(circle, ${cfg.stroke}88 1px, transparent 0)`,
                  backgroundSize: "14px 14px",
                }} />
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsEquityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor={cfg.fillStop1.color} stopOpacity={cfg.fillStop1.opacity}/>
                    <stop offset="95%" stopColor={cfg.fillStop2.color} stopOpacity={cfg.fillStop2.opacity}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={cfg.gridColor} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: cfg.tickColor }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: cfg.tickColor }}
                  tickFormatter={v => `$${v.toFixed(0)}`} />
                <Tooltip
                  formatter={(v: number) => [fmtCurrency(v), "Equity"]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: cfg.tickColor, fontSize: 11 }}
                />
                <Area
                  type="monotone" dataKey="value"
                  stroke={cfg.stroke} strokeWidth={2.5}
                  fill="url(#analyticsEquityFill)"
                  style={cfg.glowFilter ? { filter: cfg.glowFilter } : undefined}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between px-4 py-2 border-t border-border/30 text-[10px] text-muted-foreground/60 font-mono">
            <span>{firstDate}</span>
            <span>{lastDate}</span>
          </div>
        </div>

        {/* Distribution ring */}
        <div className="rounded-xl border border-border/40 bg-card/60 shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-background/30">
            <Activity className="h-3.5 w-3.5" style={{ color: cfg.stroke }} />
            <span className="text-xs font-black uppercase tracking-widest">Distribution</span>
          </div>
          <div className="flex flex-col items-center justify-center p-6 gap-5">
            {/* Dual-arc donut */}
            {(() => {
              const circumference = 2 * Math.PI * 54
              const winRate  = stats.totalTrades > 0 ? stats.wins / stats.totalTrades : 0
              const lossRate = 1 - winRate
              const winOffset  = circumference - winRate  * circumference
              const lossOffset = circumference - lossRate * circumference
              const lossRotate = winRate * 360
              return (
                <div className="relative w-36 h-36">
                  <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120"
                    style={cfg.glowFilter ? { filter: cfg.glowFilter } : undefined}>
                    {/* Track */}
                    <circle cx="60" cy="60" r="54" stroke={cfg.trackColor} strokeWidth="9" fill="none" />
                    {/* Loss arc */}
                    <circle cx="60" cy="60" r="54"
                      stroke={cfg.lossColor} strokeWidth="9" strokeLinecap="butt" fill="none"
                      strokeDasharray={circumference} strokeDashoffset={lossOffset}
                      style={{ transform: `rotate(${lossRotate}deg)`, transformOrigin: "50% 50%" }}
                      opacity={0.8}
                    />
                    {/* Win arc */}
                    <circle cx="60" cy="60" r="54"
                      stroke={cfg.winColor} strokeWidth="9" strokeLinecap="butt" fill="none"
                      strokeDasharray={circumference} strokeDashoffset={winOffset}
                      className="transition-all duration-500"
                    />
                  </svg>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full"
                    style={{ background: cfg.centerBg }}>
                    <span className="text-xl font-black text-foreground">{stats.totalTrades}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Signals</span>
                  </div>
                </div>
              )
            })()}

            {/* Win % / Loss % labels */}
            <div className="flex w-full justify-between px-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.winColor }} />
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: cfg.winColor }}>
                  Wins&nbsp;<span className="font-black">{stats.wins}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.lossColor }} />
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: cfg.lossColor }}>
                  Losses&nbsp;<span className="font-black">{stats.losses}</span>
                </span>
              </div>
            </div>

            {/* Win rate % */}
            <div className="text-center -mt-2">
              <span className="text-2xl font-black" style={{ color: stats.winRate >= 50 ? cfg.winColor : cfg.lossColor }}>
                {stats.winRate.toFixed(1)}%
              </span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Win Rate</p>
            </div>
          </div>
        </div>

      </div>

      {/* ═══ BY SYMBOL ═════════════════════════════════════════════════ */}
      {bySymbol.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/60 shadow-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-3.5 w-3.5 text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-widest">By Symbol</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bySymbol.map(([sym, s]) => (
              <SymbolBreakdownCard
                key={sym}
                symbol={sym}
                total={s.total}
                wins={s.wins}
                losses={s.losses}
                netPnl={s.netPnl}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══ BY DAY OF WEEK ════════════════════════════════════════════ */}
      <div className="rounded-xl border border-border/40 bg-card/60 shadow-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          <h3 className="text-xs font-black uppercase tracking-widest">By Day of Week</h3>
        </div>
        <div className="space-y-2">
          {byDayOfWeek.map((d) => (
            <div key={d.day} className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-10 sm:w-12 flex-shrink-0">
                {d.day}
              </span>

              <div className="flex-1 h-5 sm:h-6 bg-background/40 rounded relative overflow-hidden">
                {d.total > 0 && (
                  <div
                    className={`h-full ${d.netPnl >= 0 ? "bg-emerald-500/40" : "bg-rose-500/40"} transition-all`}
                    style={{ width: `${d.barWidth}%` }}
                  />
                )}
              </div>

              <span className={`text-[10px] sm:text-xs font-black font-mono tabular-nums w-14 sm:w-16 text-right flex-shrink-0 ${d.netPnl > 0 ? "text-emerald-400" : d.netPnl < 0 ? "text-rose-400" : "text-muted-foreground/40"}`}>
                {d.total > 0 ? fmtCurrency(d.netPnl) : "—"}
              </span>

              <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 w-10 sm:w-12 text-right flex-shrink-0">
                {d.total > 0 ? `${d.winRate}%` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ MONTHLY RETURNS ═══════════════════════════════════════════ */}
      <div className="rounded-xl border border-border/40 bg-card/60 shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-background/30">
          <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
          <h3 className="text-xs font-black uppercase tracking-widest">Monthly Returns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-border/20 text-[9px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 sm:px-4 py-2.5 font-black w-14 sticky left-0 bg-card/60">Yr</th>
                {MONTHS.map(m => (
                  <th key={m} className="px-2 py-2.5 font-black text-center">{m}</th>
                ))}
                <th className="px-3 py-2.5 font-black text-center">YTD</th>
              </tr>
            </thead>
            <tbody>
              {monthlyYears.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-6 text-[11px] text-muted-foreground italic">No data yet</td>
                </tr>
              ) : monthlyYears.map(yr => {
                const row = monthly[yr] ?? Array(12).fill(0)
                const ytd = row.reduce((s, v) => s + v, 0)
                return (
                  <tr key={yr} className="border-b border-border/10 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 sm:px-4 py-3 font-black text-sm text-foreground sticky left-0 bg-card/60">{yr}</td>
                    {row.map((val, i) => {
                      const isCurrent = yr === currentYear && i === currentMonth
                      return (
                        <td key={i} className="px-2 py-3 text-center">
                          <div className={`text-[10px] sm:text-[11px] font-mono font-black tabular-nums
                            ${val > 0 ? "text-emerald-400"
                              : val < 0 ? "text-rose-400"
                              : "text-muted-foreground/30"}
                            ${isCurrent ? "bg-emerald-500/[0.08] rounded px-1 py-0.5" : ""}`}>
                            {val === 0 ? "—" : fmtCompact(val)}
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-center">
                      <div className={`text-[10px] sm:text-[11px] font-mono font-black tabular-nums
                        ${ytd > 0 ? "text-emerald-400" : ytd < 0 ? "text-rose-400" : "text-muted-foreground/30"}`}>
                        {ytd === 0 ? "—" : fmtCompact(ytd)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="sm:hidden px-3 py-1.5 border-t border-border/20 text-center">
          <p className="text-[9px] text-muted-foreground/60 italic">← swipe to view all months →</p>
        </div>
      </div>
    </div>
  )
}
