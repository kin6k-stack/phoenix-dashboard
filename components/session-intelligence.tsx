"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Activity, ShieldAlert, Cpu, Zap, Wifi } from "lucide-react"

export function SessionIntelligence({ trades = [] }: { trades: any[] }) {
  // Compute recent volatility based on last 5 trades R-Multiples
  const recentTrades = trades.slice(0, 5);
  const avgSwing = recentTrades.length > 0 
    ? recentTrades.reduce((sum, t) => sum + Math.abs(t.rMultiple), 0) / recentTrades.length 
    : 0;

  const regime = avgSwing > 15 ? "HIGH EXPANSION" : avgSwing > 5 ? "NORMAL FLOW" : "COMPRESSED";
  const regimeColor = avgSwing > 15 ? "text-rose-400" : avgSwing > 5 ? "text-emerald-400" : "text-amber-400";

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><ShieldAlert size={100} /></div>
        <CardContent className="p-6">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary animate-pulse" /> Live Infrastructure
          </h3>
          
          <div className="space-y-5">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground">Volatility Regime Status</span>
              <span className={`text-sm font-black uppercase tracking-widest ${regimeColor} drop-shadow-sm`}>{regime}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground">Active Liquidity Allocation</span>
              <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Base: $200.00</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground">Spread Guardian Limits</span>
              <div className="flex gap-2 text-xs font-mono font-bold">
                <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">XAU: &lt;350</span>
                <span className="text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">NQ: &lt;1500</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Cpu size={100} /></div>
        <CardContent className="p-6">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Execution Constraints
          </h3>
          
          <div className="space-y-5">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground">Data Feed / Broker</span>
              <span className="text-sm font-black text-indigo-400 tracking-wider">EXNESS DYNAMIC</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground">Broker Margin Layer</span>
              <span className="text-sm font-mono font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20">1:400 LEVERAGE</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                Server Latency <Wifi className="h-3 w-3 text-emerald-500" />
              </span>
              <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">AWS EC2 VPS (Optimized)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}