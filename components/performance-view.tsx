"use client"

import { Cpu, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
}

export function PerformanceView({ trades = [] }: { trades: Trade[] }) {
  // Define the exact bots that must ALWAYS show
  const coreBots = [
    { id: "Gold Sentinel Apex", display: "Gold Sentinel Engine", asset: "XAUUSD", color: "amber" },
    { id: "Phoenix Hybrid Engine", display: "Phoenix Hybrid Engine", asset: "XAUUSD", color: "emerald" },
    { id: "Phoenix NQ Engine", display: "Phoenix NQ Engine", asset: "USTEC", color: "cyan" }
  ];

  const getAssetStats = (botSetupName: string) => {
    // Attempt exact match or partial match (to handle version numbers like v11.12)
    const botTrades = trades.filter(t => t.setup.toLowerCase().includes(botSetupName.toLowerCase()) && t.setup !== "Manual Entry");
    
    const total = botTrades.length
    const winsList = botTrades.filter(t => t.rMultiple > 0)
    const lossesList = botTrades.filter(t => t.rMultiple < 0)
    
    const winsCount = winsList.length
    const lossesCount = lossesList.length
    const winRate = total > 0 ? Math.round((winsCount / total) * 100) : 0
    
    const grossProfit = winsList.reduce((sum, t) => sum + Number(t.rMultiple), 0)
    const grossLoss = Math.abs(lossesList.reduce((sum, t) => sum + Number(t.rMultiple), 0))
    
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "MAX" : "0.00"
    const netPnL = botTrades.reduce((sum, t) => sum + Number(t.rMultiple), 0)

    return { total, winsCount, lossesCount, winRate, profitFactor, netPnL }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-card/40 backdrop-blur-md rounded-xl border border-border/40 shadow-[0_0_15px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Data Source Layer</span>
          <span className="text-[11px] text-foreground font-medium italic">Fixed Core Execution Engines</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {coreBots.map((bot) => {
          const stats = getAssetStats(bot.id);
          const colorTheme = bot.color;

          return (
            <Card key={bot.id} className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.15)] relative overflow-hidden group hover:bg-card/60 transition-colors">
              <div className={`absolute top-0 left-0 w-1.5 h-full bg-${colorTheme}-500/80 shadow-[0_0_10px_var(--tw-shadow-color)] shadow-${colorTheme}-500`} />
              
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="flex items-center justify-between text-sm font-black uppercase tracking-widest text-foreground">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded bg-${colorTheme}-500/10 border border-${colorTheme}-500/20`}>
                      <Cpu className={`h-4 w-4 text-${colorTheme}-400 drop-shadow-[0_0_5px_var(--tw-shadow-color)] shadow-${colorTheme}-500`} />
                    </div>
                    <span className="tracking-tight">{bot.display} <span className="text-muted-foreground font-medium text-xs">({bot.asset})</span></span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 bg-${colorTheme}-500/10 text-${colorTheme}-400 rounded-md border border-${colorTheme}-500/20`}>
                    {stats.total} Executions
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
                    <div className={`bg-${colorTheme}-500 h-full transition-all duration-700 shadow-[0_0_8px_var(--tw-shadow-color)] shadow-${colorTheme}-500`} style={{ width: `${stats.winRate}%` }} />
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
        })}
      </div>
    </div>
  )
}