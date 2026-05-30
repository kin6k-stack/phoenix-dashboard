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
    <Card className="border-border/40 bg-card/60 shadow-lg gap-0 py-0">
      <CardHeader className="px-3 py-2 border-b border-border/30">
        <CardTitle className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          <Activity className={`h-3.5 w-3.5 ${isProfitable ? "text-emerald-500" : "text-rose-500"}`} />
          Monthly Performance
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 space-y-2">

        {/* Win-rate ring */}
        <div className="flex items-center gap-3 bg-background/50 rounded-lg p-2.5">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="5" fill="none" className="text-muted/30" />
              <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none"
                className={`${strokeColorClass} transition-all duration-500`}
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black text-foreground tracking-tighter">{safeWinRate}%</span>
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
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Targets Hit</span>
            </div>
            <span className="text-xs font-black text-emerald-400 tabular-nums">{Number(wins)}</span>
          </div>

          <div className="flex items-center justify-between bg-background/50 rounded-lg px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3 text-rose-500" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Loss Caps Hit</span>
            </div>
            <span className="text-xs font-black text-rose-400 tabular-nums">{Number(losses)}</span>
          </div>
        </div>

        {/* Net P&L + Fees */}
        <div className="pt-1.5 mt-1 border-t border-border/30 space-y-1.5">
          <div className="flex justify-between items-center bg-background/50 rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Net P&L</span>
            <span className={`text-xs font-black tabular-nums ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
              {isProfitable ? "+" : ""}${Number(netPnL).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center bg-background/50 rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Fees</span>
            <span className="text-xs font-black text-rose-500 tabular-nums">-${Math.abs(Number(fees)).toFixed(2)}</span>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
