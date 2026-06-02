"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useTheme } from "@/lib/use-theme"

interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
}

// ── Pass U: Per-theme equity curve config ─────────────────────────────────────
// Reference images:
//   violet    → smooth violet area, purple stroke, purple-to-transparent fill
//   black-white → white/grey stepped monotone, minimal fill
//   dark      → neon emerald + dot grid, bright glow line
//   gold      → amber/orange smooth area, warm fill
//   midnight  → electric blue smooth area, blue-to-transparent fill
function getChartConfig(theme: string, isPositive: boolean) {
  switch (theme) {

    case "violet":
      return {
        type:        "monotone" as const,
        strokeColor: "#a855f7",
        strokeWidth: 2,
        fillId:      "violetFill",
        fillStart:   "rgba(168,85,247,0.35)",
        fillEnd:     "rgba(168,85,247,0)",
        dotGrid:     false,
        glowFilter:  "drop-shadow(0 0 4px rgba(168,85,247,0.55))",
        dot:         false,
        activeDot:   { r: 4, fill: "#a855f7", strokeWidth: 0 },
      }

    case "black-white":
      return {
        type:        "stepAfter" as const,
        strokeColor: "#e5e5e5",
        strokeWidth: 1.5,
        fillId:      "bwFill",
        fillStart:   "rgba(229,229,229,0.12)",
        fillEnd:     "rgba(0,0,0,0)",
        dotGrid:     false,
        glowFilter:  "",
        dot:         false,
        activeDot:   { r: 3, fill: "#e5e5e5", strokeWidth: 0 },
      }

    case "dark":
      // Image 8: neon emerald glowing line + dot grid
      return {
        type:        "monotone" as const,
        strokeColor: "#34d399",
        strokeWidth: 2,
        fillId:      "darkFill",
        fillStart:   "rgba(52,211,153,0.22)",
        fillEnd:     "rgba(0,0,0,0)",
        dotGrid:     true,
        glowFilter:  "drop-shadow(0 0 5px rgba(52,211,153,0.85)) drop-shadow(0 0 10px rgba(52,211,153,0.4))",
        dot:         false,
        activeDot:   { r: 4, fill: "#34d399", strokeWidth: 0 },
      }

    case "gold":
      // Image 11: amber/gold stepped line with volume bar feel, warm fill
      return {
        type:        "monotone" as const,
        strokeColor: "#f59e0b",
        strokeWidth: 2,
        fillId:      "goldFill",
        fillStart:   "rgba(245,158,11,0.22)",
        fillEnd:     "rgba(245,158,11,0)",
        dotGrid:     false,
        glowFilter:  "",
        dot:         false,
        activeDot:   { r: 4, fill: "#f59e0b", strokeWidth: 0 },
      }

    case "midnight":
      // Image 13: electric blue smooth area
      return {
        type:        "monotone" as const,
        strokeColor: "#60a5fa",
        strokeWidth: 2,
        fillId:      "midnightFill",
        fillStart:   "rgba(96,165,250,0.28)",
        fillEnd:     "rgba(96,165,250,0)",
        dotGrid:     false,
        glowFilter:  "drop-shadow(0 0 4px rgba(96,165,250,0.5))",
        dot:         false,
        activeDot:   { r: 4, fill: "#60a5fa", strokeWidth: 0 },
      }

    default:
      return {
        type:        "monotone" as const,
        strokeColor: isPositive ? "#10b981" : "#f43f5e",
        strokeWidth: 2,
        fillId:      "defaultFill",
        fillStart:   isPositive ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.2)",
        fillEnd:     "rgba(0,0,0,0)",
        dotGrid:     false,
        glowFilter:  "",
        dot:         false,
        activeDot:   { r: 3, fill: "#10b981", strokeWidth: 0 },
      }
  }
}

export function SlimPnLChart({ trades = [] }: { trades: Trade[] }) {
  const { theme } = useTheme()

  const todayStr = new Date().toDateString()
  const dailyTrades = trades.filter(t => new Date(t.date).toDateString() === todayStr)
  const dynamicDailyPnL = dailyTrades.reduce((sum, t) => sum + Number(t.rMultiple), 0)
  const totalAccumulatedPnL = trades.reduce((sum, t) => sum + Number(t.rMultiple), 0)

  const livePnLValue = dailyTrades.length > 0 ? dynamicDailyPnL : totalAccumulatedPnL
  const isPositive = livePnLValue >= 0
  const label = dailyTrades.length > 0 ? "Net Daily P&L" : "Net Total P&L"

  const chronologicalTrades = trades.slice().sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  let runningPnL = 0
  const waveData = chronologicalTrades.map((trade, index) => {
    runningPnL += Number(trade.rMultiple)
    return {
      index: index + 1,
      pnl: Number(runningPnL.toFixed(2)),
      symbol: trade.symbol,
      date: new Date(trade.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }
  })
  const chartData = waveData.length > 0
    ? waveData
    : [{ index: 0, pnl: 0, symbol: "Base", date: "Start" }]

  const cfg = getChartConfig(theme, isPositive)

  return (
    <Card className="border-border/40 bg-card/60 shadow-lg gap-0 py-0">
      <CardHeader className="px-3 py-2 border-b border-border/30">
        <CardTitle className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{label}</CardTitle>
      </CardHeader>

      <CardContent className="p-3 space-y-2">

        {/* Value + trend */}
        <div className="bg-background/50 rounded-lg px-2.5 py-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black tracking-tight" style={{ color: cfg.strokeColor }}>
              {isPositive ? "+" : ""}${livePnLValue.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">USD</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold uppercase tracking-wider">
            {isPositive ? (
              <><TrendingUp className="h-3 w-3" style={{ color: cfg.strokeColor }} /><span style={{ color: cfg.strokeColor }}>Expansion active</span></>
            ) : (
              <><TrendingDown className="h-3 w-3" style={{ color: cfg.strokeColor }} /><span style={{ color: cfg.strokeColor }}>Drawdown active</span></>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-border/30 bg-background/20 overflow-hidden">
          <div className="flex items-center px-2.5 py-1.5 border-b border-border/20 bg-background/30">
            <TrendingUp className="h-3 w-3 mr-1.5" style={{ color: cfg.strokeColor }} />
            <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
              Equity Wave
            </span>
          </div>
          <div className="h-16 p-1.5 relative">
            {cfg.dotGrid && (
              <div className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(52,211,153,0.5) 1px, transparent 0)",
                  backgroundSize: "10px 10px",
                }} />
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 3, right: 3, left: 3, bottom: 0 }}>
                <defs>
                  <linearGradient id={cfg.fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={cfg.fillStart} stopOpacity={1} />
                    <stop offset="95%" stopColor={cfg.fillEnd}   stopOpacity={1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-card/95 border border-border/50 px-2 py-1 rounded shadow-xl text-[10px] space-y-0.5">
                          <p className="text-muted-foreground font-bold uppercase tracking-wider">{d.date} ({d.symbol})</p>
                          <p className="font-black" style={{ color: cfg.strokeColor }}>${d.pnl.toFixed(2)}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type={cfg.type}
                  dataKey="pnl"
                  stroke={cfg.strokeColor}
                  strokeWidth={cfg.strokeWidth}
                  fillOpacity={1}
                  fill={`url(#${cfg.fillId})`}
                  animationDuration={600}
                  dot={cfg.dot}
                  activeDot={cfg.activeDot}
                  style={cfg.glowFilter ? { filter: cfg.glowFilter } : undefined}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
