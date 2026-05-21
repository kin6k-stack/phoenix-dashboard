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

  // Helper: Calculate stats safely
  const getAssetStats = (botTrades: Trade[]) => {
    const total = botTrades.length
    const winsList = botTrades.filter(t => Number(t.rMultiple) > 0)
    const lossesList = botTrades.filter(t => Number(t.rMultiple) < 0)
    const winsCount = winsList.length
    const lossesCount = lossesList.length
    const winRate = total > 0 ? Math.round((winsCount / total) * 100) : 0
    const grossProfit = winsList.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0)
    const grossLoss = Math.abs(lossesList.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0))
    
    // Fix: If no losses, return Gross Profit, otherwise calculate ratio
    const profitFactor = grossLoss > 0 
      ? (grossProfit / grossLoss).toFixed(2) 
      : grossProfit.toFixed(2);
      
    const netPnL = botTrades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0)
    return { total, winsCount, lossesCount, winRate, profitFactor, netPnL }
  }

  // Grouping Logic: Categorize every trade into 4 defined buckets
  const getCategorizedTrades = () => {
    return [
      { 
        id: "apex", 
        title: "Gold Sentinel Apex", 
        icon: Cpu, 
        color: "indigo", 
        trades: trades.filter(t => t.setup.toLowerCase().includes("apex")) 
      },
      { 
        id: "hybrid", 
        title: "Phoenix Hybrid Engine", 
        icon: Zap, 
        color: "emerald", 
        trades: trades.filter(t => t.setup.toLowerCase().includes("hybrid") || t.setup.toLowerCase().includes("phoenix gold")) 
      },
      { 
        id: "nq", 
        title: "Phoenix NQ Engine", 
        icon: BarChart3, 
        color: "cyan", 
        trades: trades.filter(t => t.setup.toLowerCase().includes("nq")) 
      },
      { 
        id: "manual", 
        title: "Manual Trade Logs", 
        icon: Activity, 
        color: "slate", 
        trades: trades.filter(t => 
          !t.setup.toLowerCase().includes("apex") && 
          !t.setup.toLowerCase().includes("hybrid") && 
          !t.setup.toLowerCase().includes("phoenix gold") && 
          !t.setup.toLowerCase().includes("nq")
        ) 
      }
    ];
  };

  const categories = getCategorizedTrades();

  return (
    <div className="space-y-6">
      {/* Header with Original Labels */}
      <div className="flex flex-col md:flex-row justify-between items-center p-4 glass-card rounded-xl shadow-sm">
        <div className="flex flex-col gap-0.5 mb-4 md:mb-0">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Data Source Layer</span>
          <span className="text-[11px] text-foreground font-medium italic">Active performance pipeline</span>
        </div>
        <div className="flex gap-1 bg-background/50 p-1.5 rounded-lg border border-border/50">
          {[
            { id: "ALL", label: "Combined Matrix" },
            { id: "BOT", label: "Core Engines" },
            { id: "MANUAL", label: "Manual Logs" }
          ].map((mode) => (
            <button 
              key={mode.id} 
              onClick={() => setFilterMode(mode.id as any)} 
              className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === mode.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60"}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {categories
          .filter(c => filterMode === "ALL" || (filterMode === "BOT" && c.id !== "manual") || (filterMode === "MANUAL" && c.id === "manual"))
          .map((cat) => {
            const stats = getAssetStats(cat.trades);
            const Icon = cat.icon;
            
            return (
              <Card key={cat.id} className="glass-card shadow-lg relative overflow-hidden transition-all hover:border-primary/30">
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-${cat.color}-500`} />
                <CardHeader className="pb-4 border-b border-border/30">
                  <CardTitle className="flex items-center justify-between text-sm font-black uppercase tracking-widest">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded bg-${cat.color}-500/10`}><Icon className={`h-4 w-4 text-${cat.color}-400`} /></div>
                      {cat.title}
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-1 rounded bg-${cat.color}-500/10 text-${cat.color}-400`}>{stats.total} Trades</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-background/50 rounded-lg border border-border/20">
                      <span className="text-[10px] text-muted-foreground uppercase">Net P&L</span>
                      <p className={`text-xl font-black ${stats.netPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>${stats.netPnL.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg border border-border/20">
                      <span className="text-[10px] text-muted-foreground uppercase">Profit Factor</span>
                      <p className="text-xl font-black text-foreground">{stats.profitFactor}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        }
      </div>
    </div>
  )
}