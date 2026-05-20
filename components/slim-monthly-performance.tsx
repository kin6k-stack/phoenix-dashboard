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
  // 🔥 FIX 1: Enforce explicit numeric validation mapping to bypass potential string translation errors
  const safeWinRate = Math.min(Math.max(Number(winRate), 0), 100)
  const isProfitable = Number(netPnL) >= 0

  // 🔥 FIX 2: Dynamic theme style mapping to match your core theme layouts seamlessly
  const strokeColorClass = safeWinRate >= 50 ? "text-emerald-500" : "text-rose-500"
  const strokeGlowStyle = safeWinRate >= 50 
    ? "drop-shadow([0_0_4px_rgba(16,185,129,0.5)])" 
    : "drop-shadow([0_0_4px_rgba(244,63,94,0.5)])"

  // Mathematical constant scaling factor for the inner circumference arc metrics bounds (2 * PI * r) where r = 26
  const circumference = 2 * Math.PI * 26 // Approx 163.36
  const strokeDashoffset = circumference - (safeWinRate / 100) * circumference

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <Activity className={`h-4 w-4 ${isProfitable ? "text-emerald-500" : "text-rose-500"}`} />
          Monthly Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Win Rate Circle - Adaptive HUD Theming */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 transform -rotate-90">
              {/* Background Track Frame */}
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="currentColor"
                strokeWidth="5"
                fill="none"
                className="text-muted/30"
              />
              {/* Active Progress Filling Path */}
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
                className={`${strokeColorClass} ${strokeGlowStyle} transition-all duration-500`}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-black text-foreground tracking-tighter">{safeWinRate}%</span>
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Win Rate Baseline</span>
        </div>

        {/* Stats Grid Layout Context Tracker */}
        <div className="space-y-2 text-sm pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Executions</span>
            </div>
            <span className="font-semibold text-foreground">{Number(trades)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Profit Targets Hit</span>
            </div>
            <span className="font-semibold text-emerald-400">{Number(wins)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3 w-3 text-rose-500" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Inps Loss Caps Hit</span>
            </div>
            <span className="font-semibold text-rose-400">{Number(losses)}</span>
          </div>
        </div>

        {/* Financial Settlement Pipeline Overview */}
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Net P&L Snapshot</span>
            <span className={`font-black ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
              {isProfitable ? "+" : ""}${Number(netPnL).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Spread / Rollover Fees</span>
            <span className="text-rose-500 font-bold tracking-tight">
              -${Math.abs(Number(fees)).toFixed(2)}
            </span>
          </div>
        </div>
        
      </CardContent>
    </Card>
  )
}