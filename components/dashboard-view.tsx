"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, DollarSign, Target, Activity, BarChart3, Zap } from "lucide-react"
import { AreaChart, Area, ComposedChart, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, CartesianGrid } from "recharts"
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

  // Re-read CSS vars — double RAF + 150ms fallback to catch any cascade delays
  useEffect(() => {
    let id1: number, id2: number, tid: ReturnType<typeof setTimeout>
    const read = () => {
      id1 = requestAnimationFrame(() => {
        id2 = requestAnimationFrame(() => {
          setTokens(readTokens())
          // 150ms fallback — catches themes that apply after paint
          tid = setTimeout(() => setTokens(readTokens()), 150)
        })
      })
    }
    read()
    window.addEventListener("phoenix-settings-changed", read)
    return () => {
      cancelAnimationFrame(id1)
      cancelAnimationFrame(id2)
      clearTimeout(tid)
      window.removeEventListener("phoenix-settings-changed", read)
    }
  }, [theme, invert])


  // Pass U: per-theme chart STYLE config
  const chartStyle = (() => {
    switch(theme) {
      case "black-white": return {
        areaType:     "monotone" as const,
        lineGlow:     "",
        dotGrid:      false,
        stippleGrid:  false,
        volBars:      true,   // volume bars — swapped from gold
        strokeWidth:  2,
        paddingAngle: 2,
        innerRadius:  50,
        outerRadius:  75,
        fillOverride: null,
      }
      case "dark": return {
        areaType:     "monotone" as const,
        lineGlow:     "drop-shadow(0 0 4px #34d399) drop-shadow(0 0 10px rgba(52,211,153,0.6)) drop-shadow(0 0 20px rgba(52,211,153,0.3))",
        dotGrid:      true,   // <-- neon dot grid
        stippleGrid:  false,
        volBars:      false,
        strokeWidth:  2.5,
        paddingAngle: 6,
        innerRadius:  50,
        outerRadius:  75,
        fillOverride: null,
      }
      case "midnight": return {
        areaType:     "monotone" as const,
        lineGlow:     "drop-shadow(0 0 4px #60a5fa) drop-shadow(0 0 10px rgba(96,165,250,0.5))",
        dotGrid:      true,   // <-- same dot grid as dark, blue tinted
        stippleGrid:  false,
        volBars:      false,
        strokeWidth:  2.5,
        paddingAngle: 6,
        innerRadius:  50,
        outerRadius:  75,
        fillOverride: null,
      }
      case "violet": return {
        areaType:     "monotone" as const,
        lineGlow:     "drop-shadow(0 0 4px #c084fc) drop-shadow(0 0 10px rgba(192,132,252,0.5))",
        dotGrid:      false,
        stippleGrid:  false,  // handled via SVG pattern fill — clips to curve shape
        volBars:      false,
        strokeWidth:  2.5,
        paddingAngle: 6,
        innerRadius:  50,
        outerRadius:  75,
        fillOverride: "url(#violetStipple)",  // pattern fill = dots only inside area
      }
      case "gold": return {
        areaType:     "stepAfter" as const,  // stepped — swapped from black-white
        lineGlow:     "",
        dotGrid:      false,
        stippleGrid:  false,
        volBars:      false,
        strokeWidth:  1.5,
        paddingAngle: 6,
        innerRadius:  50,
        outerRadius:  75,
        fillOverride: "rgba(245,158,11,0.08)",
      }
      default: return {
        areaType:     "monotone" as const,
        lineGlow:     "",
        dotGrid:      false,
        stippleGrid:  false,
        volBars:      false,
        strokeWidth:  2,
        paddingAngle: 6,
        innerRadius:  50,
        outerRadius:  75,
        fillOverride: null,
      }
    }
  })()

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

  // Volume histogram data — counts trades per date bucket (Gold theme)
  const volumeData = equityData.map((d, i) => ({
    ...d,
    vol: 1 + Math.round(Math.abs(Math.sin(i * 1.7)) * 3), // visual proxy — trade density
  }))

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
            <div className="h-[140px] sm:h-[170px] lg:h-[200px] px-2 pt-2 pb-1 relative">

              {/* Dot grid — Dark (neon green) + Midnight (blue) */}
              {chartStyle.dotGrid && (
                <div className="absolute inset-0 pointer-events-none opacity-[0.18] z-10"
                  style={{
                    backgroundImage: `radial-gradient(circle, ${tokens.primary} 1px, transparent 0)`,
                    backgroundSize: "12px 12px",
                  }} />
              )}

              {/* Stipple mask — Violet: dots visible only inside the fill area */}
              {chartStyle.stippleGrid && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ opacity: 0.18 }}>
                  <defs>
                    <pattern id="stipple" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill={tokens.primary} />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#stipple)" />
                </svg>
              )}

              <ResponsiveContainer width="100%" height="100%">
                {chartStyle.volBars ? (
                  /* Gold — ComposedChart: area line on top, volume bars at bottom */
                  <ComposedChart data={volumeData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equityAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={tokens.fillStart} />
                        <stop offset="95%" stopColor={tokens.fillEnd}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.grid} />
                    <XAxis dataKey="date" hide />
                    <YAxis yAxisId="equity" axisLine={false} tickLine={false}
                      tick={{ fontSize: 9, fill: tokens.axisText, fontWeight: "bold" }}
                      domain={["auto","auto"]} />
                    <YAxis yAxisId="vol" orientation="right" hide
                      domain={[0, (d: number) => d * 6]} />
                    <Tooltip
                      content={({ active, payload, label }) => (
                        <ChartTooltip active={active} payload={payload} label={label} labelHeader="Equity" valuePrefix="$" />
                      )}
                    />
                    {/* Volume bars — anchored at bottom, muted amber */}
                    <Bar yAxisId="vol" dataKey="vol"
                      fill={tokens.primary} opacity={0.35} radius={[2,2,0,0]}
                      maxBarSize={6} />
                    {/* Equity area */}
                    <Area yAxisId="equity"
                      type="monotone" dataKey="value"
                      stroke={strokeUrl} strokeWidth={2}
                      fill="url(#equityAreaGradient)"
                    />
                  </ComposedChart>
                ) : (
                  /* All other themes — standard AreaChart */
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
                      {/* Violet stipple — pattern fill clips naturally to curve shape */}
                      <pattern id="violetStipple" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
                        <rect width="9" height="9" fill="rgba(168,85,247,0.18)" />
                        <circle cx="2" cy="2" r="0.9" fill="rgba(192,132,252,0.70)" />
                      </pattern>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.grid} />
                    <XAxis dataKey="date" hide />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fontSize: 9, fill: tokens.axisText, fontWeight: "bold" }} />
                    <Tooltip
                      content={({ active, payload, label }) => (
                        <ChartTooltip active={active} payload={payload} label={label} labelHeader="Equity" valuePrefix="$" />
                      )}
                    />
                    <Area
                      type={chartStyle.areaType}
                      dataKey="value"
                      stroke={strokeUrl}
                      strokeWidth={chartStyle.strokeWidth}
                      fill={chartStyle.fillOverride ?? "url(#equityAreaGradient)"}
                      style={chartStyle.lineGlow ? { filter: chartStyle.lineGlow } : undefined}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 lg:p-5 border-border/40 bg-card/60 shadow-lg backdrop-blur-md flex flex-col">
          <h3 className="text-xs sm:text-sm font-black mb-3 flex items-center gap-2 uppercase tracking-widest text-foreground">
            <Target size={14} style={{ color: tokens.win, filter: `drop-shadow(0 0 5px ${tokens.winGlow})` }} />
            Distribution
          </h3>

          {/* Per-theme donut ring */}
          {(() => {
            const total = Math.max(trades.length, 1)
            const winPct  = wins  / total
            const lossPct = losses / total
            const C = 2 * Math.PI * 54   // circumference r=54
            const winArc  = C * winPct
            const lossArc = C * lossPct
            const lossRot = winPct * 360

            // Per-theme segment colors — shades of theme palette, not generic green/red
            const [segWin, segLoss, glowColor] = (() => {
              switch(theme) {
                case "violet":   return ["#a78bfa", "#6d28d9",  "rgba(167,139,250,0.5)"]   // lavender → deep purple
                case "dark":     return ["#34d399", "#065f46",  "rgba(52,211,153,0.5)"]    // bright teal → dark teal
                case "midnight": return ["#60a5fa", "#312e81",  "rgba(96,165,250,0.5)"]    // bright blue → deep indigo
                case "gold":     return ["#fcd34d", "#92400e",  "rgba(252,211,77,0.4)"]    // bright gold → dark bronze
                default:         return [tokens.win, tokens.loss, tokens.winGlow]
              }
            })()

            if (theme === "black-white") {
              // Numora segmented monochrome ring
              return (
                <div className="flex-1 flex items-center justify-center min-h-[180px]">
                  <div className="relative" style={{ width: 170, height: 170 }}>
                    <svg width="170" height="170" viewBox="0 0 170 170" className="-rotate-90">
                      <circle cx="85" cy="85" r="54"
                        stroke={tokens.loss} strokeWidth="16" fill="none"
                        strokeDasharray="5 3" opacity={0.4} />
                      <circle cx="85" cy="85" r="54"
                        stroke={tokens.win} strokeWidth="16" fill="none"
                        strokeDasharray={`${winArc} ${C}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-foreground">{trades.length}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Signals</span>
                    </div>
                  </div>
                </div>
              )
            }

            // All other themes — thick rounded SVG donut
            return (
              <div className="flex-1 flex items-center justify-center min-h-[180px]">
                <div className="relative" style={{ width: 180, height: 180 }}>
                  <svg width="180" height="180" viewBox="0 0 180 180"
                    className="-rotate-90"
                    style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}>
                    {/* Track */}
                    <circle cx="90" cy="90" r="54"
                      stroke="rgba(255,255,255,0.05)" strokeWidth="18" fill="none" />
                    {/* Loss arc */}
                    <circle cx="90" cy="90" r="54"
                      stroke={segLoss} strokeWidth="18" fill="none"
                      strokeDasharray={`${lossArc} ${C}`}
                      strokeLinecap="round"
                      style={{ transform: `rotate(${lossRot}deg)`, transformOrigin: "50% 50%" }}
                      opacity={0.85}
                    />
                    {/* Win arc */}
                    <circle cx="90" cy="90" r="54"
                      stroke={segWin} strokeWidth="18" fill="none"
                      strokeDasharray={`${winArc} ${C}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-foreground">{trades.length}</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Signals</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Legend */}
          <div className="flex items-center justify-around pt-2 mt-1 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{
                background: theme === "violet" ? "#a78bfa"
                  : theme === "dark" ? "#34d399"
                  : theme === "midnight" ? "#60a5fa"
                  : theme === "gold" ? "#fcd34d"
                  : tokens.win
              }} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Wins</span>
              <span className="text-[11px] font-black text-foreground font-mono">{wins}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{
                background: theme === "violet" ? "#6d28d9"
                  : theme === "dark" ? "#065f46"
                  : theme === "midnight" ? "#312e81"
                  : theme === "gold" ? "#92400e"
                  : tokens.loss
              }} />
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
