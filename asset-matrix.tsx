"use client"

import { useState } from "react"
import { Shield, BarChart3, TrendingUp, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
}

interface AssetMatrixProps {
  trades?: Trade[]
}

export function AssetMatrix({ trades = [] }: AssetMatrixProps) {
  const [filterMode, setFilterMode] = useState<"ALL" | "BOT" | "MANUAL">("ALL")

  const applyFilter = (t: Trade) => {
    const isBot = t.setup !== "Manual Entry"
    if (filterMode === "BOT") return isBot
    if (filterMode === "MANUAL") return !isBot
    return true
  }

  const filtered = trades.filter(applyFilter)
  const goldTrades = filtered.filter(t => t.symbol === "XAUUSD" || t.symbol === "GOLD")
  const nasTrades = filtered.filter(t => t.symbol === "USTEC" || t.symbol === "NAS100")

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

  const goldStats = getAssetStats(goldTrades)
  const nasStats = getAssetStats(nasTrades)

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Structural Toggle Toolbar Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card rounded-xl border border-border gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Data Source Layer</span>
          <span className="text-xs text-foreground font-medium italic">Isolating automated engines from manual journals</span>
        </div>
        
        <div className="flex flex-wrap gap-1 bg-background p-1 rounded-lg border border-border">
          {(["ALL", "BOT", "MANUAL"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                filterMode === mode
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {mode === "ALL" ? "Combined Matrix" : mode === "BOT" ? "Core Bots" : "Manual Logs"}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-Side Asset Analysis Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
        
        {/* --- GOLD TRACKER COLUMN --- */}
        <Card className="border-border bg-card shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/80" />
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="flex items-center justify-between text-sm font-black uppercase tracking-wider text-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                <span>Gold Sentinel Engine (XAUUSD)</span>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20`}>
                {goldTrades.length} Trades Active
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/40 border border-border/60 p-3 rounded-lg">
                <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">Net Performance</span>
                <span className={`text-xl font-black tabular-nums font-mono ${goldStats.netPnL >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                  {goldStats.netPnL >= 0 ? "+" : ""}${goldStats.netPnL.toFixed(2)}
                </span>
              </div>
              <div className="bg-background/40 border border-border/60 p-3 rounded-lg">
                <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">Profit Factor Baseline</span>
                <span className="text-xl font-black tabular-nums text-foreground font-mono">{goldStats.profitFactor}</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-muted-foreground uppercase tracking-wide">Win Rate Efficiency</span>
                <span className="text-foreground font-bold font-mono">{goldStats.winRate}%</span>
              </div>
              <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden border border-border/20">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${goldStats.winRate}%` }} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="flex justify-between p-2 bg-background/30 rounded border border-border/40">
                  <span className="text-muted-foreground font-mono">Hit Target:</span>
                  <span className="text-emerald-400 font-bold font-mono">{goldStats.winsCount}</span>
                </div>
                <div className="flex justify-between p-2 bg-background/30 rounded border border-border/40">
                  <span className="text-muted-foreground font-mono">Hit Invalidation:</span>
                  <span className="text-rose-400 font-bold font-mono">{goldStats.lossesCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- NASDAQ TRACKER COLUMN --- */}
        <Card className="border-border bg-card shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/80" />
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="flex items-center justify-between text-sm font-black uppercase tracking-wider text-foreground">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cyan-400" />
                <span>Phoenix NQ Engine (USTEC)</span>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20`}>
                {nasTrades.length} Trades Active
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/40 border border-border/60 p-3 rounded-lg">
                <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">Net Performance</span>
                <span className={`text-xl font-black tabular-nums font-mono ${nasStats.netPnL >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                  {nasStats.netPnL >= 0 ? "+" : ""}${nasStats.netPnL.toFixed(2)}
                </span>
              </div>
              <div className="bg-background/40 border border-border/60 p-3 rounded-lg">
                <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">Profit Factor Baseline</span>
                <span className="text-xl font-black tabular-nums text-foreground font-mono">{nasStats.profitFactor}</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-muted-foreground uppercase tracking-wide">Win Rate Efficiency</span>
                <span className="text-foreground font-bold font-mono">{nasStats.winRate}%</span>
              </div>
              <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden border border-border/20">
                <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${nasStats.winRate}%` }} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="flex justify-between p-2 bg-background/30 rounded border border-border/40">
                  <span className="text-muted-foreground font-mono">Hit Target:</span>
                  <span className="text-emerald-400 font-bold font-mono">{nasStats.winsCount}</span>
                </div>
                <div className="flex justify-between p-2 bg-background/30 rounded border border-border/40">
                  <span className="text-muted-foreground font-mono">Hit Invalidation:</span>
                  <span className="text-rose-400 font-bold font-mono">{nasStats.lossesCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}