"use client"

import { TrendingUp, TrendingDown, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "@/lib/use-theme"

interface SlimMonthlyPerformanceProps {
  winRate: number
  trades: number
  wins: number
  losses: number
  netPnL: number
  fees: number
}

// ── Pass U: Per-theme distribution ring config ────────────────────────────────
// Reference images:
//   violet      → purple wins (#a855f7),  salmon losses (#fb7185)
//   black-white → white wins (#e5e5e5),   mid-grey losses (#525252)
//   dark        → emerald wins (#34d399), salmon losses (#fb7185)
//   gold        → classic green wins (#22c55e), classic red losses (#ef4444)
//   midnight    → green wins (#22c55e),   rose losses (#fb7185)
function getRingConfig(theme: string) {
  switch (theme) {

    case "violet":
      return {
        winColor:   "#a855f7",
        lossColor:  "#fb7185",
        trackColor: "rgba(168,85,247,0.12)",
        winGlow:    "drop-shadow(0 0 5px rgba(168,85,247,0.6))",
        centerBg:   "rgba(15,10,24,0.7)",
        winDot:     "#a855f7",
        lossDot:    "#fb7185",
      }

    case "black-white":
      return {
        winColor:   "#e5e5e5",
        lossColor:  "#525252",
        trackColor: "rgba(80,80,80,0.2)",
        winGlow:    "",
        centerBg:   "rgba(10,10,10,0.7)",
        winDot:     "#e5e5e5",
        lossDot:    "#525252",
      }

    case "dark":
      return {
        winColor:   "#34d399",
        lossColor:  "#fb7185",
        trackColor: "rgba(52,211,153,0.1)",
        winGlow:    "drop-shadow(0 0 5px rgba(52,211,153,0.65))",
        centerBg:   "rgba(10,20,15,0.7)",
        winDot:     "#34d399",
        lossDot:    "#fb7185",
      }

    case "gold":
      // Image 10: classic green wins / red losses — gold theme uses traditional colors
      return {
        winColor:   "#22c55e",
        lossColor:  "#ef4444",
        trackColor: "rgba(34,197,94,0.1)",
        winGlow:    "",
        centerBg:   "rgba(20,15,5,0.5)",
        winDot:     "#22c55e",
        lossDot:    "#ef4444",
      }

    case "midnight":
      // Image 13: green wins / rose losses on blue theme
      return {
        winColor:   "#22c55e",
        lossColor:  "#fb7185",
        trackColor: "rgba(34,197,94,0.1)",
        winGlow:    "",
        centerBg:   "rgba(10,15,30,0.7)",
        winDot:     "#22c55e",
        lossDot:    "#fb7185",
      }

    default:
      return {
        winColor:   "#34d399",
        lossColor:  "#fb7185",
        trackColor: "rgba(52,211,153,0.1)",
        winGlow:    "",
        centerBg:   "rgba(0,0,0,0.5)",
        winDot:     "#34d399",
        lossDot:    "#fb7185",
      }
  }
}

export function SlimMonthlyPerformance({
  winRate = 0,
  trades = 0,
  wins = 0,
  losses = 0,
  netPnL = 0,
  fees = 0,
}: SlimMonthlyPerformanceProps) {
  const { theme } = useTheme()

  const safeWinRate   = Math.min(Math.max(Number(winRate), 0), 100)
  const isProfitable  = Number(netPnL) >= 0
  const circumference = 2 * Math.PI * 26
  const lossRate      = 100 - safeWinRate

  // Win arc
  const winDashArray  = circumference
  const winDashOffset = circumference - (safeWinRate / 100) * circumference

  // Loss arc (starts where win ends)
  const lossDashArray  = circumference
  const lossDashOffset = circumference - (lossRate / 100) * circumference
  const lossRotation   = (safeWinRate / 100) * 360

  const ring = getRingConfig(theme)

  return (
    <Card className="border-border/40 bg-card/60 shadow-lg gap-0 py-0">
      <CardHeader className="px-3 py-2 border-b border-border/30">
        <CardTitle className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          <Activity className="h-3.5 w-3.5" style={{ color: isProfitable ? ring.winColor : ring.lossColor }} />
          Monthly Performance
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 space-y-2">

        {/* Distribution ring — win + loss arcs like reference images */}
        <div className="flex items-center gap-3 bg-background/50 rounded-lg p-2.5">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg
              className="w-14 h-14 transform -rotate-90"
              viewBox="0 0 64 64"
              style={ring.winGlow ? { filter: ring.winGlow } : undefined}
            >
              {/* Track */}
              <circle cx="32" cy="32" r="26"
                stroke={ring.trackColor} strokeWidth="5" fill="none" />

              {/* Loss arc (underneath, full circle tinted) */}
              <circle cx="32" cy="32" r="26"
                stroke={ring.lossColor} strokeWidth="5"
                strokeLinecap="butt" fill="none"
                strokeDasharray={lossDashArray}
                strokeDashoffset={lossDashOffset}
                style={{ transform: `rotate(${lossRotation}deg)`, transformOrigin: "50% 50%" }}
                opacity={0.75}
              />

              {/* Win arc (on top) */}
              <circle cx="32" cy="32" r="26"
                stroke={ring.winColor} strokeWidth="5"
                strokeLinecap="butt" fill="none"
                strokeDasharray={winDashArray}
                strokeDashoffset={winDashOffset}
                className="transition-all duration-500"
              />
            </svg>

            {/* Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full"
              style={{ background: ring.centerBg }}>
              <span className="text-[9px] font-black tracking-tighter"
                style={{ color: safeWinRate >= 50 ? ring.winColor : ring.lossColor }}>
                {safeWinRate}%
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Win Rate</p>
            {/* Wins / Losses legend like reference images */}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: ring.winDot }} />
                <span className="text-[9px] font-black" style={{ color: ring.winColor }}>{Number(wins)}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: ring.lossDot }} />
                <span className="text-[9px] font-black" style={{ color: ring.lossColor }}>{Number(losses)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stat rows */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between bg-background/50 rounded-lg px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Executions</span>
            </div>
            <span className="text-xs font-black text-foreground tabular-nums">{Number(trades)}</span>
          </div>

          <div className="flex items-center justify-between bg-background/50 rounded-lg px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" style={{ color: ring.winColor }} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Targets Hit</span>
            </div>
            <span className="text-xs font-black tabular-nums" style={{ color: ring.winColor }}>{Number(wins)}</span>
          </div>

          <div className="flex items-center justify-between bg-background/50 rounded-lg px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3" style={{ color: ring.lossColor }} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Loss Caps Hit</span>
            </div>
            <span className="text-xs font-black tabular-nums" style={{ color: ring.lossColor }}>{Number(losses)}</span>
          </div>
        </div>

        {/* Net P&L + Fees */}
        <div className="pt-1.5 mt-1 border-t border-border/30 space-y-1.5">
          <div className="flex justify-between items-center bg-background/50 rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Net P&L</span>
            <span className="text-xs font-black tabular-nums"
              style={{ color: isProfitable ? ring.winColor : ring.lossColor }}>
              {isProfitable ? "+" : ""}${Number(netPnL).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center bg-background/50 rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Fees</span>
            <span className="text-xs font-black tabular-nums" style={{ color: ring.lossColor }}>
              -${Math.abs(Number(fees)).toFixed(2)}
            </span>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
