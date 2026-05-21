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

  // Map trades to specific bots
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

  const coreBots = [
  { title: "Gold Sentinel Engine", asset: "XAUUSD", icon: Shield, color: "amber", trades: getBotTrades("Gold Sentinel", "XAUUSD") },
  { title: "Phoenix Hybrid Engine", asset: "XAUUSD", icon: Zap, color: "emerald", trades: getBotTrades("Phoenix Hybrid", "XAUUSD") },
  { title: "Gold Sentinel Apex", asset: "XAUUSD", icon: Cpu, color: "indigo", trades: getBotTrades("Apex", "XAUUSD") },
  { title: "Phoenix NQ Engine", asset: "USTEC", icon: BarChart3, color: "cyan", trades: getBotTrades("Phoenix NQ", "USTEC") }
];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-card/40 backdrop-blur-md rounded-xl border border-border/40 shadow-[0_0_15px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Data Source Layer</span>
          <span className="text-[11px] text-foreground font-medium italic">Isolating automated engines from manual journals</span>
        </div>
        <div className="flex gap-1 bg-background/50 p-1.5 rounded-lg border border-border/50 shadow-inner">
          {(["ALL", "BOT", "MANUAL"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                filterMode === mode
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {mode === "ALL" ? "Combined Matrix" : mode === "BOT" ? "Core Engines" : "Manual Logs"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filterMode === "MANUAL" ? (
           <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.15)] relative overflow-hidden group hover:bg-card/60 transition-colors">
            <div className={`absolute top-0 left-0 w-1.5 h-full bg-slate-500/80 shadow-[0_0_10px_var(--tw-shadow-color)] shadow-slate-500`} />
            <CardHeader className="pb-4 border-b border-border/30">
              <CardTitle className="flex items-center justify-between text-sm font-black uppercase tracking-widest text-foreground">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-slate-500/10 border border-slate-500/20">
                    <Activity className="h-4 w-4 text-slate-400" />
                  </div>
                  <span className="tracking-tight">Manual Trade Logs</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-slate-500/10 text-slate-400 rounded-md border border-slate-500/20">
                  {manualTrades.length} Trades Active
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/40 border border-border/30 p-4 rounded-xl shadow-inner">
                  <span className="text-[10px] font-black text-muted-foreground block uppercase tracking-widest mb-1">Net Performance</span>
                  <span className={`text-2xl font-black tabular-nums tracking-tighter drop-shadow-sm ${getAssetStats(manualTrades).netPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {getAssetStats(manualTrades).netPnL >= 0 ? "+" : ""}${getAssetStats(manualTrades).netPnL.toFixed(2)}
                  </span>
                </div>
                <div className="bg-background/40 border border-border/30 p-4 rounded-xl shadow-inner">
                  <span className="text-[10px] font-black text-muted-foreground block uppercase tracking-widest mb-1">Profit Factor</span>
                  <span className="text-2xl font-black tabular-nums text-foreground tracking-tighter drop-shadow-sm">{getAssetStats(manualTrades).profitFactor}</span>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground uppercase tracking-widest font-bold">Win Rate Efficiency</span>
                  <span className="text-foreground font-black font-mono text-sm">{getAssetStats(manualTrades).winRate}%</span>
                </div>
                <div className="w-full bg-background/50 h-2 rounded-full overflow-hidden border border-border/50 shadow-inner">
                  <div className="bg-slate-500 h-full transition-all duration-700 shadow-[0_0_8px_var(--tw-shadow-color)] shadow-slate-500" style={{ width: `${getAssetStats(manualTrades).winRate}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                  <div className="flex justify-between items-center p-2.5 bg-background/30 rounded-lg border border-border/30">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Wins</span>
                    <span className="text-emerald-400 font-black font-mono text-sm">{getAssetStats(manualTrades).winsCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-background/30 rounded-lg border border-border/30">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Losses</span>
                    <span className="text-rose-400 font-black font-mono text-sm">{getAssetStats(manualTrades).lossesCount}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          coreBots.map((bot) => {
            const stats = getAssetStats(bot.trades);
            const Icon = bot.icon;
            
            return (
              <Card key={bot.title} className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.15)] relative overflow-hidden group hover:bg-card/60 transition-colors">
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-${bot.color}-500/80 shadow-[0_0_10px_var(--tw-shadow-color)] shadow-${bot.color}-500`} />
                
                <CardHeader className="pb-4 border-b border-border/30">
                  <CardTitle className="flex items-center justify-between text-sm font-black uppercase tracking-widest text-foreground">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded bg-${bot.color}-500/10 border border-${bot.color}-500/20`}>
                        <Icon className={`h-4 w-4 text-${bot.color}-400 drop-shadow-[0_0_5px_var(--tw-shadow-color)] shadow-${bot.color}-500`} />
                      </div>
                      <span className="tracking-tight">{bot.title} <span className="text-muted-foreground font-medium text-xs">({bot.asset})</span></span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 bg-${bot.color}-500/10 text-${bot.color}-400 rounded-md border border-${bot.color}-500/20`}>
                      {stats.total} Trades Active
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background/40 border border-border/30 p-4 rounded-xl shadow-inner">
                      <span className="text-[10px] font-black text-muted-foreground block uppercase tracking-widest mb-1">Net Performance</span>
                      <span className={`text-2xl font-black tabular-nums tracking-tighter drop-shadow-sm ${stats.netPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {stats.netPnL >= 0 ? "+" : ""}${stats.netPnL.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-background/40 border border-border/30 p-4 rounded-xl shadow-inner">
                      <span className="text-[10px] font-black text-muted-foreground block uppercase tracking-widest mb-1">Profit Factor</span>
                      <span className="text-2xl font-black tabular-nums text-foreground tracking-tighter drop-shadow-sm">{stats.profitFactor}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground uppercase tracking-widest font-bold">Win Rate Efficiency</span>
                      <span className="text-foreground font-black font-mono text-sm">{stats.winRate}%</span>
                    </div>
                    <div className="w-full bg-background/50 h-2 rounded-full overflow-hidden border border-border/50 shadow-inner">
                      <div className={`bg-${bot.color}-500 h-full transition-all duration-700 shadow-[0_0_8px_var(--tw-shadow-color)] shadow-${bot.color}-500`} style={{ width: `${stats.winRate}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                      <div className="flex justify-between items-center p-2.5 bg-background/30 rounded-lg border border-border/30">
                        <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Wins</span>
                        <span className="text-emerald-400 font-black font-mono text-sm">{stats.winsCount}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-background/30 rounded-lg border border-border/30">
                        <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Losses</span>
                        <span className="text-rose-400 font-black font-mono text-sm">{stats.lossesCount}</span>
                      </div>
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