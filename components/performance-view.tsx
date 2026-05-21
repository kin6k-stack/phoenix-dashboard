"use client"

import { useState } from "react"
import { Shield, BarChart3, Activity, Cpu, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
}

interface PerformanceViewProps {
  trades: Trade[]
}

export function PerformanceView({ trades = [] }: PerformanceViewProps) {
  const [filterMode, setFilterMode] = useState<"ALL" | "BOT" | "MANUAL">("ALL")

  const applyFilter = (t: Trade) => {
    const isBot = t.setup !== "Manual Entry"
    if (filterMode === "BOT") return isBot
    if (filterMode === "MANUAL") return !isBot
    return true
  }

  const filtered = trades.filter(applyFilter)

  // Robust matching: Finds any trade containing the 'botIdentifier' string
  const getBotTrades = (botIdentifier: string, asset: string) => {
    return filtered.filter(t => 
      t.symbol === asset && 
      t.setup.toLowerCase().includes(botIdentifier.toLowerCase()) &&
      t.setup !== "Manual Entry"
    )
  }

  const manualTrades = filtered.filter(t => t.setup === "Manual Entry")

  const getAssetStats = (assetTrades: Trade[]) => {
    const total = assetTrades.length
    const winsList = assetTrades.filter(t => t.rMultiple > 0)
    const lossesList = assetTrades.filter(t => t.rMultiple < 0)
    const winsCount = winsList.length
    const lossesCount = lossesList.length
    const winRate = total > 0 ? Math.round((winsCount / total) * 100) : 0
    const grossProfit = winsList.reduce((sum, t) => sum + Number(t.rMultiple), 0)
    const grossLoss = Math.abs(lossesList.reduce((sum, t) => sum + Number(t.rMultiple), 0))
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "MAX" : "0.00"
    const netPnL = assetTrades.reduce((sum, t) => sum + Number(t.rMultiple), 0)
    return { total, winsCount, lossesCount, winRate, profitFactor, netPnL }
  }

  // DEFINED ONLY YOUR 3 BOTS
  const coreBots = [
    { title: "Gold Sentinel Apex", asset: "XAUUSD", icon: Cpu, color: "indigo", trades: getBotTrades("Gold Sentinel Apex", "XAUUSD") },
    { title: "Phoenix Hybrid Engine", asset: "XAUUSD", icon: Zap, color: "emerald", trades: getBotTrades("Phoenix Gold", "XAUUSD") },
    { title: "Phoenix NQ Engine", asset: "USTEC", icon: BarChart3, color: "cyan", trades: getBotTrades("Phoenix NQ", "USTEC") }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-card/40 backdrop-blur-md rounded-xl border border-border/40 shadow-[0_0_15px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Data Source Layer</span>
          <span className="text-[11px] text-foreground font-medium italic">Active pipeline mapping for {coreBots.length} Engines</span>
        </div>
        <div className="flex gap-1 bg-background/50 p-1.5 rounded-lg border border-border/50 shadow-inner">
          {(["ALL", "BOT", "MANUAL"] as const).map((mode) => (
            <button key={mode} onClick={() => setFilterMode(mode)} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === mode ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}>
              {mode === "ALL" ? "Combined Matrix" : mode === "BOT" ? "Core Engines" : "Manual Logs"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filterMode === "MANUAL" ? (
           <Card className="border-border/40 bg-card/60 shadow-lg">
            <CardHeader className="border-b border-border/30"><CardTitle className="text-sm font-black uppercase">Manual Trade Logs</CardTitle></CardHeader>
            <CardContent className="pt-6">{/* ... Manual Stats ... */}</CardContent>
          </Card>
        ) : (
          coreBots.map((bot) => {
            const stats = getAssetStats(bot.trades);
            const Icon = bot.icon;
            return (
              <Card key={bot.title} className="border-border/40 bg-card/60 shadow-lg relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-${bot.color}-500`} />
                <CardHeader className="pb-4 border-b border-border/30">
                  <CardTitle className="flex items-center justify-between text-sm font-black uppercase tracking-widest">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded bg-${bot.color}-500/10`}><Icon className={`h-4 w-4 text-${bot.color}-400`} /></div>
                      {bot.title}
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-1 rounded bg-${bot.color}-500/10 text-${bot.color}-400`}>{stats.total} Trades</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-background/50 rounded-lg">
                      <span className="text-[10px] text-muted-foreground uppercase">Net P&L</span>
                      <p className={`text-xl font-black ${stats.netPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>${stats.netPnL.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg">
                      <span className="text-[10px] text-muted-foreground uppercase">Profit Factor</span>
                      <p className="text-xl font-black">{stats.profitFactor}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  )
}