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

// ── Pass U: Per-theme ring/distribution configuration ─────────────────────────
function getRingConfig(theme: string, safeWinRate: number) {
  switch (theme) {

    case "black-white":
      // Numora monochrome: clean white arc on grey track
      return {
        winColor:    "#e5e5e5",
        lossColor:   "#525252",
        trackColor:  "rgba(80,80,80,0.3)",
        winGlow:     "",
        lossGlow:    "",
        winLabel:    "#e5e5e5",
        lossLabel:   "#737373",
        ringBg:      "rgba(20,20,20,0.6)",
        strokeWidth: 5,
      }

    case "dark":
      // Image 6: teal/emerald arc — neon glow ring
      return {
        winColor:    "#34d399",
        lossColor:   "#fb7185",
        trackColor:  "rgba(52,211,153,0.1)",
        winGlow:     "drop-shadow(0 0 6px rgba(52,211,153,0.7))",
        lossGlow:    "drop-shadow(0 0 6px rgba(251,113,133,0.7))",
        winLabel:    "#34d399",
        lossLabel:   "#fb7185",
        ringBg:      "rgba(20,30,25,0.5)",
        strokeWidth: 5,
      }

    case "midnight":
      // Image 5: blue/indigo segments — electric blue
      return {
        winColor:    "#60a5fa",
        lossColor:   "#818cf8",
        trackColor:  "rgba(96,165,250,0.1)",
        winGlow:     "drop-shadow(0 0 5px rgba(96,165,250,0.6))",
        lossGlow:    "drop-shadow(0 0 5px rgba(129,140,248,0.6))",
        winLabel:    "#60a5fa",
        lossLabel:   "#818cf8",
        ringBg:      "rgba(10,15,30,0.5)",
        strokeWidth: 5,
      }

    case "violet":
      // Image 5 purple variant: violet/magenta ring
      return {
        winColor:    "#c084fc",
        lossColor:   "#e879f9",
        trackColor:  "rgba(192,132,252,0.1)",
        winGlow:     "drop-shadow(0 0 6px rgba(192,132,252,0.6))",
        lossGlow:    "drop-shadow(0 0 6px rgba(232,121,249,0.5))",
        winLabel:    "#c084fc",
        lossLabel:   "#e879f9",
        ringBg:      "rgba(15,10,24,0.5)",
        strokeWidth: 5,
      }

    case "gold":
      // Warm amber/orange ring
      return {
        winColor:    "#f59e0b",
        lossColor:   "#f97316",
        trackColor:  "rgba(245,158,11,0.1)",
        winGlow:     "drop-shadow(0 0 5px rgba(245,158,11,0.5))",
        lossGlow:    "drop-shadow(0 0 5px rgba(249,115,22,0.5))",
        winLabel:    "#f59e0b",
        lossLabel:   "#f97316",
        ringBg:      "rgba(30,20,5,0.3)",
        strokeWidth: 5,
      }

    default:
      return {
        winColor:    "#34d399",
        lossColor:   "#fb7185",
        trackColor:  "rgba(52,211,153,0.1)",
        winGlow:     "",
        lossGlow:    "",
        winLabel:    "#34d399",
        lossLabel:   "#fb7185",
        ringBg:      "rgba(0,0,0,0.3)",
        strokeWidth: 5,
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

  const safeWinRate  = Math.min(Math.max(Number(winRate), 0), 100)
  const isProfitable = Number(netPnL) >= 0
  const circumference = 2 * Math.PI * 26
  const strokeDashoffset = circumference - (safeWinRate / 100) * circumference

  const ring = getRingConfig(theme, safeWinRate)
  const ringColor = safeWinRate >= 50 ? ring.winColor : ring.lossColor
  const ringGlow  = safeWinRate >= 50 ? ring.winGlow  : ring.lossGlow

  return (
    <Card className="border-border/40 bg-card/60 shadow-lg gap-0 py-0">
      <CardHeader className="px-3 py-2 border-b border-border/30">
        <CardTitle className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          <Activity className="h-3.5 w-3.5" style={{ color: isProfitable ? ring.winColor : ring.lossColor }} />
          Monthly Performance
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 space-y-2">

        {/* Win-rate ring */}
        <div className="flex items-center gap-3 bg-background/50 rounded-lg p-2.5">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg
              className="w-14 h-14 transform -rotate-90"
              viewBox="0 0 64 64"
              style={ringGlow ? { filter: ringGlow } : undefined}
            >
              {/* Track */}
              <circle
                cx="32" cy="32" r="26"
                stroke={ring.trackColor}
                strokeWidth={ring.strokeWidth}
                fill="none"
              />
              {/* Win arc */}
              <circle
                cx="32" cy="32" r="26"
                stroke={ringColor}
                strokeWidth={ring.strokeWidth}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-500"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full"
              style={{ background: ring.ringBg }}
            >
              <span
                className="text-xs font-black tracking-tighter"
                style={{ color: ringColor }}
              >
                {safeWinRate}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Win Rate</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">Baseline this month</p>
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
            <span
              className="text-xs font-black tabular-nums"
              style={{ color: isProfitable ? ring.winColor : ring.lossColor }}
            >
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
