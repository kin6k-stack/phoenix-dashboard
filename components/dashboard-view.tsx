"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, DollarSign, Target, Activity, BarChart3, Zap } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, CartesianGrid } from "recharts"
import { useTheme } from "@/lib/use-theme"

// ─────────────────────────────────────────────────────────────────────
// Pass D v2 — CSS-variable driven chart palette
//
// All chart colors now live in globals.css as --chart-* CSS variables
// per [data-theme]. This component just:
//   1. Reads them at render time (so SVG attrs like stroke="..." work)
//   2. Re-reads them whenever the theme changes
//   3. Uses var(--chart-*) directly in CSS-aware spots (filters, glows)
//
// Benefits over Pass D v1:
//   • Theme switching animates smoothly (no JS palette swap)
//   • Future themes = CSS edits only, no JS code change
//   • Cleaner separation: design tokens in CSS, logic in TS
// ─────────────────────────────────────────────────────────────────────

interface ChartTokens {
  primary:     string
  fillStart:   string
  fillEnd:     string
  glow:        string
  grid:        string
  axisText:    string
  barFill:     string
  barGlow:     string
  win:         string
  loss:        string
  winGlow:     string
  lossGlow:    string
  stroke1:     string
  stroke2:     string
  stroke3:     string
  hasGradientStroke: boolean
}

const FALLBACK_TOKENS: ChartTokens = {
  primary:     "#e5e5e5",
  fillStart:   "rgba(229,229,229,0.25)",
  fillEnd:     "rgba(229,229,229,0.02)",
  glow:        "rgba(255,255,255,0.4)",
  grid:        "hsla(0,0%,40%,0.2)",
  axisText:    "hsl(0 0% 60%)",
  barFill:     "#a3a3a3",
  barGlow:     "rgba(255,255,255,0.2)",
  win:         "#34d399",
  loss:        "#fb7185",
  winGlow:     "rgba(52,211,153,0.4)",
  lossGlow:    "rgba(251,113,133,0.4)",
  stroke1:     "",
  stroke2:     "",
  stroke3:     "",
  hasGradientStroke: false,
}

// Read CSS variable values from <html>'s computed style.
// Returns trimmed value, or empty string if not defined.
function readVar(name: string): string {
  if (typeof window === "undefined") return ""
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function readTokens(): ChartTokens {
  const s1 = readVar("--chart-stroke-1")
  const s2 = readVar("--chart-stroke-2")
  const s3 = readVar("--chart-stroke-3")
  return {
    primary:    readVar("--chart-primary")    || FALLBACK_TOKENS.primary,
    fillStart:  readVar("--chart-fill-start") || FALLBACK_TOKENS.fillStart,
    fillEnd:    readVar("--chart-fill-end")   || FALLBACK_TOKENS.fillEnd,
    glow:       readVar("--chart-glow")       || FALLBACK_TOKENS.glow,
    grid:       readVar("--chart-grid")       || FALLBACK_TOKENS.grid,
    axisText:   readVar("--chart-axis-text")  || FALLBACK_TOKENS.axisText,
    barFill:    readVar("--chart-bar-fill")   || FALLBACK_TOKENS.barFill,
    barGlow:    readVar("--chart-bar-glow")   || FALLBACK_TOKENS.barGlow,
    win:        readVar("--chart-win")        || FALLBACK_TOKENS.win,
    loss:       readVar("--chart-loss")       || FALLBACK_TOKENS.loss,
    winGlow:    readVar("--chart-win-glow")   || FALLBACK_TOKENS.winGlow,
    lossGlow:   readVar("--chart-loss-glow")  || FALLBACK_TOKENS.lossGlow,
    stroke1:    s1,
    stroke2:    s2,
    stroke3:    s3,
    hasGradientStroke: Boolean(s1 && s2 && s3),
  }
}

// ─────────────────────────────────────────────────────────────────────
// Numora-style chart tooltip
// ─────────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, valuePrefix = "", labelHeader }: any) {
  if (!active || !payload?.length) return null
  const value: number = payload[0].value
  const isPositive = value >= 0
  return (
    <div className="px-3 py-2 rounded-lg border bg-card/95 border-border backdrop-blur-md shadow-xl"
         style={{ minWidth: 140 }}>
      {labelHeader && (
        <div className="text-[8.5px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
          {labelHeader}
        </div>
      )}
      {label && (
        <div className="text-[10px] font-mono text-muted-foreground mb-1.5 pb-1.5 border-b border-border/50">
          {label}
        </div>
      )}
      <div className="flex items-baseline gap-2">
        <span className={`text-[10px] ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
          {isPositive ? "▲" : "▼"}
        </span>
        <span className="text-sm font-black font-mono text-foreground tabular-nums">
          {valuePrefix}{isPositive ? "+" : ""}{value.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

function DistributionTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const datum = payload[0]
  const name: string = datum.name
  const value: number = datum.value
  const isWin = name === "Wins"
  // Read the active theme's win/loss tokens directly so the tooltip dot
  // matches the donut cell color (critical for Black/White theme where the
  // semantic emerald/rose would conflict with the monochrome aesthetic).
  const dotColor = typeof window !== "undefined"
    ? getComputedStyle(document.documentElement).getPropertyValue(isWin ? "--chart-win" : "--chart-loss").trim()
    : (isWin ? "#34d399" : "#fb7185")
  return (
    <div className="px-3 py-2 rounded-lg border bg-card/95 border-border backdrop-blur-md shadow-xl">
      <div className="text-[8.5px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        Distribution
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{name}</span>
      </div>
      <div className="mt-1 text-base font-black font-mono text-foreground tabular-nums">
        {value}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Main dashboard
// ─────────────────────────────────────────────────────────────────────
export function DashboardView({ trades = [] }: { trades: any[] }) {
  const { theme, invert } = useTheme()
  const [tokens, setTokens] = useState<ChartTokens>(FALLBACK_TOKENS)

  // Re-read CSS vars whenever theme/invert changes.
  // Pass U: double-RAF ensures we read AFTER the full CSS cascade applies
  // (single RAF fires before data-theme attribute change fully propagates).
  // Also listen to phoenix-settings-changed so tokens update on hot-swap.
  useEffect(() => {
    let id1: number, id2: number
    const read = () => {
      id1 = requestAnimationFrame(() => {
        id2 = requestAnimationFrame(() => setTokens(readTokens()))
      })
    }
    read()
    window.addEventListener("phoenix-settings-changed", read)
    return () => {
      cancelAnimationFrame(id1)
      cancelAnimationFrame(id2)
      window.removeEventListener("phoenix-settings-changed", read)
    }
  }, [theme, invert])

  const totalPnl = trades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0)
  const wins     = trades.filter(t => t.rMultiple > 0).length
  const losses   = trades.filter(t => t.rMultiple < 0).length
  const winRate  = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0
  const avgR     = trades.length > 0 ? (trades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0) / trades.length) : 0

  const now = new Date()
  const oneWeekAgo   = new Date(now.getTime() - 7 * 86400_000)
  const twoWeeksAgo  = new Date(now.getTime() - 14 * 86400_000)
  const oneMonthAgo  = new Date(now.getTime() - 30 * 86400_000)
  const twoMonthsAgo = new Date(now.getTime() - 60 * 86400_000)

  const currWeekTrades = trades.filter(t => new Date(t.date) >= oneWeekAgo)
  const prevWeekTrades = trades.filter(t => { const d = new Date(t.date); return d >= twoWeeksAgo && d < oneWeekAgo })
  const currMonthTrades = trades.filter(t => new Date(t.date) >= oneMonthAgo)
  const prevMonthTrades = trades.filter(t => { const d = new Date(t.date); return d >= twoMonthsAgo && d < oneMonthAgo })

  const currPnL = currWeekTrades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0)
  const prevPnL = prevWeekTrades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0)
  const pnlDelta = prevPnL !== 0 ? ((currPnL - prevPnL) / Math.abs(prevPnL)) * 100 : (currPnL > 0 ? 100 : 0)

  const calcWR = (arr: any[]) => arr.length > 0 ? (arr.filter(t => t.rMultiple > 0).length / arr.length) * 100 : 0
  const wrDelta = calcWR(currWeekTrades) - calcWR(prevWeekTrades)
  const tradesDelta = prevWeekTrades.length > 0
    ? ((currWeekTrades.length - prevWeekTrades.length) / prevWeekTrades.length) * 100
    : (currWeekTrades.length > 0 ? 100 : 0)
  const calcAvg = (arr: any[]) => arr.length > 0 ? arr.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0) / arr.length : 0
  const currAvg = calcAvg(currMonthTrades)
  const prevAvg = calcAvg(prevMonthTrades)
  const avgDelta = prevAvg !== 0 ? ((currAvg - prevAvg) / Math.abs(prevAvg)) * 100 : (currAvg > 0 ? 100 : 0)

  let runningEquity = 200
  const equityData = [...trades].reverse().map(t => {
    runningEquity += Number(t.rMultiple || 0)
    return { date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: Number(runningEquity.toFixed(2)) }
  })

  const weeklyMap = trades.reduce((acc: any, t) => {
    const week = `Wk ${Math.ceil(new Date(t.date).getDate() / 7)}`
    acc[week] = (acc[week] || 0) + Number(t.rMultiple || 0)
    return acc
  }, {})
  const weeklyData = Object.entries(weeklyMap).map(([name, pnl]) => ({ name, pnl: Number(Number(pnl).toFixed(2)) }))

  const strokeUrl = tokens.hasGradientStroke ? "url(#equityStrokeGradient)" : tokens.primary

  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return percent > 0 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
            className="text-[10px] sm:text-[11px] font-black drop-shadow-md">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {[
          { label: "Total P&L",    val: `$${totalPnl.toFixed(2)}`, icon: DollarSign, color: totalPnl >= 0 ? "text-emerald-400" : "text-rose-400", delta: pnlDelta,    deltaColor: pnlDelta    < 0 ? "text-rose-400" : "text-emerald-400" },
          { label: "Win Rate",     val: `${winRate}%`,             icon: Target,     color: "text-blue-400",                                       delta: wrDelta,     deltaColor: wrDelta     < 0 ? "text-rose-400" : "text-blue-400" },
          { label: "Total Trades", val: trades.length,             icon: Activity,   color: "text-indigo-400",                                     delta: tradesDelta, deltaColor: "text-muted-foreground" },
          { label: "Avg Execution",val: `${avgR.toFixed(2)} R`,    icon: Zap,        color: "text-amber-400",                                      delta: avgDelta,    deltaColor: avgDelta    < 0 ? "text-rose-400" : "text-amber-400" },
        ].map((item, i) => (
          <Card key={i} className="border-border/40 bg-card/60 shadow-lg backdrop-blur-md hover:bg-card/70 transition-colors">
            <CardContent className="p-3 sm:p-4 lg:p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-background/50 border border-border/50">
                  <item.icon size={14} className={item.color} />
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate">{item.label}</p>
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className={`text-xl sm:text-2xl lg:text-3xl font-black ${item.color} tracking-tighter drop-shadow-sm`}>{item.val}</p>
                <span className={`text-[9px] sm:text-[10px] font-bold ${item.deltaColor} tracking-widest whitespace-nowrap`}>
                  {item.delta > 0 ? "▲" : item.delta < 0 ? "▼" : "—"} {Math.abs(item.delta).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Equity + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">

        <Card className="lg:col-span-2 p-3 sm:p-4 lg:p-5 border-border/40 bg-card/60 shadow-lg backdrop-blur-md">
          <h3 className="text-xs sm:text-sm font-black flex items-center gap-2 uppercase tracking-widest text-foreground mb-3 sm:mb-4">
            <TrendingUp size={14} style={{ color: tokens.primary, filter: `drop-shadow(0 0 5px ${tokens.glow})` }} />
            <span className="truncate">System Equity Curve</span>
          </h3>
          <div className="rounded-xl border border-border/30 bg-background/20 overflow-hidden">
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border/20 bg-background/30">
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase">Cumulative P&L</span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-muted-foreground bg-background/50 px-2 py-0.5 rounded border border-border/50 whitespace-nowrap">Base: $200</span>
            </div>
            <div className="h-[140px] sm:h-[170px] lg:h-[200px] px-2 pt-2 pb-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={tokens.fillStart} />
                      <stop offset="95%" stopColor={tokens.fillEnd}   />
                    </linearGradient>
                    {tokens.hasGradientStroke && (
                      <linearGradient id="equityStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor={tokens.stroke1} />
                        <stop offset="50%"  stopColor={tokens.stroke2} />
                        <stop offset="100%" stopColor={tokens.stroke3} />
                      </linearGradient>
                    )}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.grid} />
                  <XAxis dataKey="date" hide />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: tokens.axisText, fontWeight: 'bold' }} />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <ChartTooltip active={active} payload={payload} label={label} labelHeader="Equity" valuePrefix="$" />
                    )}
                  />
                  <Area
                    type="monotone" dataKey="value"
                    stroke={strokeUrl} strokeWidth={2.5}
                    fill="url(#equityAreaGradient)"
                    style={{ filter: `drop-shadow(0 4px 8px ${tokens.glow})` }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 lg:p-5 border-border/40 bg-card/60 shadow-lg backdrop-blur-md flex flex-col">
          <h3 className="text-xs sm:text-sm font-black mb-2 flex items-center gap-2 uppercase tracking-widest text-foreground">
            <Target size={14} style={{ color: tokens.win, filter: `drop-shadow(0 0 5px ${tokens.winGlow})` }} />
            Distribution
          </h3>
          <div className="flex-1 min-h-[180px] sm:min-h-[200px] lg:min-h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{name: 'Wins', value: wins}, {name: 'Losses', value: losses}]}
                  dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={6}
                  labelLine={false} label={renderCustomizedLabel}>
                  <Cell fill={tokens.win}  style={{ filter: `drop-shadow(0px 0px 6px ${tokens.winGlow})` }} />
                  <Cell fill={tokens.loss} style={{ filter: `drop-shadow(0px 0px 6px ${tokens.lossGlow})` }} />
                </Pie>
                <Tooltip content={<DistributionTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl sm:text-2xl font-black text-foreground drop-shadow-md">{trades.length}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Signals</span>
            </div>
          </div>

          <div className="flex items-center justify-around pt-2 mt-1 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: tokens.win }} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Wins</span>
              <span className="text-[11px] font-black text-foreground font-mono">{wins}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: tokens.loss }} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Losses</span>
              <span className="text-[11px] font-black text-foreground font-mono">{losses}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">

        <Card className="p-3 sm:p-4 lg:p-5 border-border/40 bg-card/60 shadow-lg backdrop-blur-md">
          <h3 className="text-xs sm:text-sm font-black mb-3 sm:mb-4 flex items-center gap-2 uppercase tracking-widest text-foreground">
            <BarChart3 size={14} style={{ color: tokens.barFill, filter: `drop-shadow(0 0 5px ${tokens.barGlow})` }} />
            Weekly P&L
          </h3>
          <div className="rounded-xl border border-border/30 bg-background/20 overflow-hidden">
            <div className="flex items-center px-3 sm:px-4 py-2 border-b border-border/20 bg-background/30">
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase">P&L per week</span>
            </div>
            <div className="h-[110px] sm:h-[130px] px-2 pt-2 pb-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 0, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: tokens.axisText, fontWeight: 'bold'}} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: tokens.axisText, fontWeight: 'bold'}} />
                  <Tooltip
                    cursor={{ fill: tokens.grid, opacity: 0.4 }}
                    content={({ active, payload, label }) => (
                      <ChartTooltip active={active} payload={payload} label={label} labelHeader="Weekly P&L" valuePrefix="$" />
                    )}
                  />
                  <Bar dataKey="pnl" fill={tokens.barFill} radius={[4, 4, 0, 0]}
                       style={{ filter: `drop-shadow(0 0 4px ${tokens.barGlow})` }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 lg:p-5 border-border/40 bg-card/60 shadow-lg backdrop-blur-md flex flex-col">
          <h3 className="text-xs sm:text-sm font-black mb-3 sm:mb-4 flex items-center gap-2 uppercase tracking-widest text-foreground">
            <Activity size={14} className="text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]"/> Recent Activity
          </h3>
          <div className="flex-1 overflow-auto pr-1 sm:pr-2 space-y-2 sm:space-y-2.5 custom-scrollbar max-h-[160px]">
            {trades.length === 0 ? (
              <p className="text-xs text-muted-foreground italic mt-4 text-center">No recent signals.</p>
            ) : trades.slice(0, 5).map((t, i) => (
              <div key={i} className="flex justify-between items-center p-2 sm:p-2.5 rounded-lg bg-background/40 border border-border/30 hover:border-border/60 transition-colors gap-2">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-black tracking-widest truncate">{t.symbol}</span>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold truncate">{t.setup}</span>
                </div>
                <span className={`text-xs sm:text-[13px] font-black tabular-nums whitespace-nowrap ${t.rMultiple >= 0 ? "text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]" : "text-rose-400 drop-shadow-[0_0_4px_rgba(251,113,133,0.3)]"}`}>
                  {t.rMultiple >= 0 ? "+" : ""}${Number(t.rMultiple).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  )
}
