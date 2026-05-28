"use client"

import { TrendingUp, TrendingDown, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SlimMonthlyPerformanceProps {
  winRate: number
  trades: number
  wins: number
  losses: number
  netPnL: number
  fees: number
}

export function SlimMonthlyPerformance({
  winRate = 0,
  trades = 0,
  wins = 0,
  losses = 0,
  netPnL = 0,
  fees = 0,
}: SlimMonthlyPerformanceProps) {
  const safeWinRate = Math.min(Math.max(Number(winRate), 0), 100)
  const isProfitable = Number(netPnL) >= 0

  const strokeColorClass = safeWinRate >= 50 ? "text-emerald-500" : "text-rose-500"
  const circumference = 2 * Math.PI * 26
  const strokeDashoffset = circumference - (safeWinRate / 100) * circumference

  return (
    <Card className="border-border/40 bg-card/60 shadow-lg">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
          <Activity className={`h-4 w-4 ${isProfitable ? "text-emerald-500" : "text-rose-500"}`} />
          Monthly Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">

        {/* Win-rate ring */}
        <div className="flex items-center gap-4 bg-background/50 rounded-lg p-3">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="5" fill="none" className="text-muted/30" />
              <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none"
                className={`${strokeColorClass} transition-all duration-500`}
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-black text-foreground tracking-tighter">{safeWinRate}%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Win Rate</p>
            <p className="text-xs text-muted-foreground mt-0.5">Baseline this month</p>
          </div>
        </div>

        {/* Stat rows */}
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Executions</span>
            </div>
            <span className="text-sm font-black text-foreground tabular-nums">{Number(trades)}</span>
          </div>

          <div className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Targets Hit</span>
            </div>
            <span className="text-sm font-black text-emerald-400 tabular-nums">{Number(wins)}</span>
          </div>

          <div className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3 w-3 text-rose-500" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Loss Caps Hit</span>
            </div>
            <span className="text-sm font-black text-rose-400 tabular-nums">{Number(losses)}</span>
          </div>
        </div>

        {/* Net P&L footer */}
        <div className="pt-2 border-t border-border/30 space-y-2">
          <div className="flex justify-between items-center bg-background/50 rounded-lg px-3 py-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Net P&L</span>
            <span className={`text-sm font-black tabular-nums ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
              {isProfitable ? "+" : ""}${Number(netPnL).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center bg-background/50 rounded-lg px-3 py-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Fees</span>
            <span className="text-sm font-black text-rose-500 tabular-nums">-${Math.abs(Number(fees)).toFixed(2)}</span>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
