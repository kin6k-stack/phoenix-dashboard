"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, ShieldAlert, Cpu, Zap, Wifi, Clock } from "lucide-react"

export function SessionIntelligence({ trades = [] }: { trades: any[] }) {
  const [localTime, setLocalTime] = useState<Date | null>(null);

  useEffect(() => {
    setLocalTime(new Date());
    const interval = setInterval(() => setLocalTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const recentTrades = trades.slice(0, 5);
  const avgSwing = recentTrades.length > 0 
    ? recentTrades.reduce((sum, t) => sum + Math.abs(t.rMultiple), 0) / recentTrades.length 
    : 0;

  const regime = avgSwing > 15 ? "HIGH EXPANSION" : avgSwing > 5 ? "NORMAL FLOW" : "COMPRESSED";
  const regimeColor = avgSwing > 15 ? "text-rose-400" : avgSwing > 5 ? "text-emerald-400" : "text-amber-400";

  // Time conversion for Local (AST) representations
  const formatLocal = (timeZone: string) => {
    if (!localTime) return "--:--:--";
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(localTime);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Clock size={120} /></div>
        <CardContent className="p-6 relative z-10">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400 animate-pulse" /> Institutional Dealing Windows
          </h3>
          
          <div className="space-y-5">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Live Local Time</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Base Reference (AST)</span>
              </div>
              <span className="text-lg font-black font-mono tracking-tight text-white drop-shadow-sm">
                {formatLocal('America/Antigua')}
              </span>
            </div>
            
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">London Core Active</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Converted to Local</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">3:00 AM - 11:30 AM</span>
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">New York Dealing</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Converted to Local</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-[10px] font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20">8:00 AM - 5:00 PM</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><ShieldAlert size={120} /></div>
        <CardContent className="p-6 relative z-10">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" /> Infrastructure & Liquidity
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
    </div>
  )
}