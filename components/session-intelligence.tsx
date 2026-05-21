"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, ShieldAlert, Cpu, Zap, Clock } from "lucide-react"

export function SessionIntelligence({ trades = [] }: { trades: any[] }) {
  const [localTime, setLocalTime] = useState<Date | null>(null);

  useEffect(() => {
    setLocalTime(new Date());
    const interval = setInterval(() => setLocalTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper: Get hours as a number in your local AST time
  const getASTHour = () => {
    if (!localTime) return 0;
    return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Antigua', hour: '2-digit', hour12: false }).format(localTime));
  };

  const currentHour = getASTHour();
  
  // Dealing Windows:
  // London: 3 AM - 11:30 AM AST (Local)
  // New York: 8 AM - 5 PM AST (Local)
  const isLondonActive = currentHour >= 3 && currentHour < 12; 
  const isNYActive = currentHour >= 8 && currentHour < 17;

  const regime = trades.length > 0 ? (trades.slice(0, 5).reduce((sum, t) => sum + Math.abs(t.rMultiple), 0) / 5 > 10 ? "HIGH EXPANSION" : "NORMAL FLOW") : "STABLE";

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Clock size={120} /></div>
        <CardContent className="p-6 relative z-10">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400 animate-pulse" /> Institutional Dealing Windows
          </h3>
          
          <div className="space-y-5">
            {/* Live Time */}
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground">Live Local Time (AST)</span>
              <span className="text-lg font-black font-mono text-white">
                {localTime?.toLocaleTimeString('en-US', { timeZone: 'America/Antigua' })}
              </span>
            </div>
            
            {/* London Window */}
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground">London Core Active</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isLondonActive ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-slate-500 bg-slate-500/10 border-slate-500/20"}`}>
                {isLondonActive ? "ACTIVE" : "CLOSED"}
              </span>
            </div>

            {/* NY Window */}
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground">New York Dealing</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isNYActive ? "text-rose-400 bg-rose-400/10 border-rose-400/20" : "text-slate-500 bg-slate-500/10 border-slate-500/20"}`}>
                {isNYActive ? "ACTIVE" : "CLOSED"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infrastructure Card */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><ShieldAlert size={120} /></div>
        <CardContent className="p-6 relative z-10">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" /> Infrastructure & Liquidity
          </h3>
          
          <div className="space-y-5">
             <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground">Volatility Regime</span>
              <span className="text-sm font-black uppercase tracking-widest text-emerald-400">{regime}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground">Equity Allocation</span>
              <span className="text-sm font-mono font-bold text-emerald-400">$200.00</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <span className="text-sm font-medium text-foreground">Execution Latency</span>
              <span className="text-xs font-black uppercase text-muted-foreground">AWS EC2 (Optimized)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}