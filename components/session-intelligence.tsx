"use client"

import { useState, useEffect } from "react"
import { Clock, Globe, ShieldAlert, Zap, Layers } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SessionInfo {
  name: string
  hours: string
  status: "ACTIVE" | "WAITING" | "CLOSED" | "MARKETS CLOSED"
  market: string
  color: string
}

export function SessionIntelligence() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const currentHourUTC = time.getUTCHours()
  const currentDayUTC = time.getUTCDay() // 0 = Sunday, 5 = Friday, 6 = Saturday

  // 🔥 THE WEEKEND INTERCEPT CHECKER
  // Retail markets officially freeze on Friday at 21:00 UTC and thaw on Sunday at 21:00 UTC
  const isWeekend = 
    (currentDayUTC === 5 && currentHourUTC >= 21) || // Friday night after NY close
    currentDayUTC === 6 ||                          // All of Saturday
    (currentDayUTC === 0 && currentHourUTC < 21)    // Sunday morning/afternoon before Sydney open

  const getSessionStatus = (start: number, end: number, currentHour: number) => {
    if (isWeekend) return "MARKETS CLOSED" // Weekend structural clamp
    
    if (start < end) {
      return currentHour >= start && currentHour < end ? "ACTIVE" : "WAITING"
    } else {
      return currentHour >= start || currentHour < end ? "ACTIVE" : "WAITING"
    }
  }

  const tradingSessions: SessionInfo[] = [
    {
      name: "Asian Session",
      hours: "00:00 - 09:00 UTC",
      status: getSessionStatus(0, 9, currentHourUTC),
      market: "Tokyo / Sydney Volatility Mix",
      color: isWeekend 
        ? "text-muted-foreground border-border bg-muted/5" 
        : "text-blue-400 border-blue-500/20 bg-blue-500/5",
    },
    {
      name: "London Session",
      hours: "08:00 - 16:00 UTC",
      status: getSessionStatus(8, 16, currentHourUTC),
      market: "Institutional Core FX / Metals Liquidity",
      color: isWeekend 
        ? "text-muted-foreground border-border bg-muted/5" 
        : "text-purple-400 border-purple-500/20 bg-purple-500/5",
    },
    {
      name: "New York Session",
      hours: "13:00 - 21:00 UTC",
      status: getSessionStatus(13, 21, currentHourUTC),
      market: "High-Volume Macro Drive / Nasdaq Aggression",
      color: isWeekend 
        ? "text-muted-foreground border-border bg-muted/5" 
        : "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
    },
  ]

  const isCrossoverActive = !isWeekend && tradingSessions[1].status === "ACTIVE" && tradingSessions[2].status === "ACTIVE"

  return (
    <div className="space-y-6 p-1">
      {/* Network Cluster Status Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary" /> Live NY Dealing Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tabular-nums">
              {time.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour12: false })}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase mt-1 tracking-wider font-semibold">EDT Server Sync: UTC -4</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-primary" /> Live London Core Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tabular-nums">
              {time.toLocaleTimeString("en-US", { timeZone: "Europe/London", hour12: false })}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase mt-1 tracking-wider font-semibold">BST Sync: UTC +1</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className={`h-3.5 w-3.5 ${isWeekend ? "text-rose-500 animate-none" : "text-cyan-400 animate-pulse"}`} /> Volatility Regime Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 🔥 ADAPTIVE REGIME CARD TEXT */}
            <div className={`text-lg font-black tracking-wide ${
              isWeekend ? "text-rose-500" : isCrossoverActive ? "text-emerald-400" : "text-amber-400"
            }`}>
              {isWeekend ? "🔒 WEEKEND MARKET SHUTDOWN" : isCrossoverActive ? "💥 HIGH LIQUIDITY CROSSOVER" : "🛡️ STABLE DISTRIBUTED VOLUME"}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase mt-1.5 tracking-wider font-semibold">
              {isWeekend ? "Bot Risk Regime: OFFLINE (0.00 Lot)" : isCrossoverActive ? "Bot Risk Regime: AGGRESSIVE (5% Cap)" : "Bot Risk Regime: DEFENSIVE (1% Cap)"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tracking Layout Block */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Institutional Dealing Windows</h3>
          <div className="space-y-3">
            {tradingSessions.map((session) => (
              <div 
                key={session.name} 
                className={`p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
                  !isWeekend && session.status === "ACTIVE" ? "shadow-[0_0_15px_rgba(6,182,212,0.05)] border-primary/30" : "opacity-60"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-black text-foreground">{session.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${session.color}`}>
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{session.market}</p>
                </div>
                <div className="text-right flex items-center justify-between sm:justify-center">
                  <span className="text-xs font-mono font-bold text-foreground bg-background px-2.5 py-1 rounded border border-border/60">
                    {session.hours}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EA Guardians Monitoring Block */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">EA Guard Channels</h3>
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-xs font-bold uppercase text-foreground tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-500" /> Spread Guardian Limit
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">XAUUSD Target Threshold</span>
                <span className="font-mono font-bold text-foreground">40 Points (4 Pips)</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">USTEC Target Threshold</span>
                <span className="font-mono font-bold text-foreground">60 Points (6 Pips)</span>
              </div>
              <div className="p-3 bg-muted/20 border border-border rounded-lg text-[11px] text-muted-foreground leading-relaxed mt-1">
                ⚠️ <span className="text-foreground font-bold font-mono">Guardian Status:</span> {
                  isWeekend ? "OFFLINE (Spread Infinite)" : "ONLINE (Monitoring live price tick streams)"
                }
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-xs font-bold uppercase text-foreground tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" /> Active Liquidity Pools
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground uppercase tracking-wide font-medium">XAUUSD Core Retracements</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${isWeekend ? "bg-muted text-muted-foreground" : "text-emerald-400 bg-emerald-500/10"}`}>
                  {isWeekend ? "Staged" : "0.5 Fib Sniper Engaged"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground uppercase tracking-wide font-medium">USTEC Micro-Liquidity</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${isWeekend ? "bg-muted text-muted-foreground" : "text-cyan-400 bg-cyan-500/10"}`}>
                  {isWeekend ? "Staged" : "10s Cooldown Active"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}