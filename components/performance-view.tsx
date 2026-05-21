"use client"

import { useState } from "react"
import { Shield, Cpu, Activity } from "lucide-react"
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

  // Dynamically group trades by their bot/setup name
  const botGroups = filtered.reduce((acc, trade) => {
    const botName = trade.setup;
    if (!acc[botName]) acc[botName] = [];
    acc[botName].push(trade);
    return acc;
  }, {} as Record<string, Trade[]>);

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

  const getBotColor = (botName: string) => {
    if (botName.toLowerCase().includes("gold") || botName.toLowerCase().includes("sentinel")) return "amber";
    if (botName.toLowerCase().includes("nq") || botName.toLowerCase().includes("nasdaq")) return "cyan";
    if (botName.toLowerCase().includes("manual")) return "slate";
    return "indigo"; // Default for hybrid/others
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Data Source Layer</span>
          <span className="text-[11px] text-foreground font-medium italic">Dynamic routing from MT5 bridges</span>
        </div>
        <div className="flex gap-1 bg-background p-1.5 rounded-lg border border-border shadow-inner">
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
              {mode === "ALL" ? "Combined" : mode === "BOT" ? "Core Engines" : "Manual"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Object.entries(botGroups).map(([botName, botTrades]) => {
          const stats = getAssetStats(botTrades);
          const colorTheme = getBotColor(botName);
          const latestSymbol = botTrades[0]?.symbol || "UNKNOWN";

          return (
            <Card key={botName} className="border-border/50 bg-card/60 backdrop-blur shadow-md relative overflow-hidden group hover:border-border transition-colors">
              {/* Dynamic side border based on bot type */}
              <div className={`absolute top-0 left-0 w-1.5 h-full bg-${colorTheme}-500/80`} />
              
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="flex items-center justify-between text-sm font-black uppercase tracking-widest text-foreground">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded bg-${colorTheme}-500/10 border border-${colorTheme}-500/20`}>
                      {colorTheme === 'slate' ? <Activity className="h-4 w-4 text-slate-400" /> : <Cpu className={`h-4 w-4 text-${colorTheme}-400`} />}
                    </div>
                    <span className="tracking-tight">{botName} <span className="text-muted-foreground font-medium text-xs">({latestSymbol})</span></span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 bg-${colorTheme}-500/10 text-${colorTheme}-400 rounded-md border border-${colorTheme}-500/20`}>
                    {stats.total} Executions
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 border border-border/40 p-4 rounded-xl shadow-inner">
                    <span className="text-[10px] font-black text-muted-foreground block uppercase tracking-widest mb-1">Net Performance</span>
                    <span className={`text-2xl font-black tabular-nums tracking-tighter ${stats.netPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {stats.netPnL >= 0 ? "+" : ""}${stats.netPnL.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-background/50 border border-border/40 p-4 rounded-xl shadow-inner">
                    <span className="text-[10px] font-black text-muted-foreground block uppercase tracking-widest mb-1">Profit Factor</span>
                    <span className="text-2xl font-black tabular-nums text-foreground tracking-tighter">{stats.profitFactor}</span>
                  </div>
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground uppercase tracking-widest font-bold">Win Rate Efficiency</span>
                    <span className="text-foreground font-black font-mono text-sm">{stats.winRate}%</span>
                  </div>
                  <div className="w-full bg-background h-2 rounded-full overflow-hidden border border-border/50 shadow-inner">
                    <div className={`bg-${colorTheme}-500 h-full transition-all duration-700`} style={{ width: `${stats.winRate}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                    <div className="flex justify-between items-center p-2.5 bg-background/40 rounded-lg border border-border/40">
                      <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Wins</span>
                      <span className="text-emerald-400 font-black font-mono text-sm">{stats.winsCount}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-background/40 rounded-lg border border-border/40">
                      <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Losses</span>
                      <span className="text-rose-400 font-black font-mono text-sm">{stats.lossesCount}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  )
}