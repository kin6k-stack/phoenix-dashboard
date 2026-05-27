"use client"
import { useState } from "react"
import { Shield, BarChart3, Activity, Cpu, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function PerformanceView({ trades = [] }: { trades: any[] }) {
  const [filterMode, setFilterMode] = useState<"ALL" | "BOT" | "MANUAL">("ALL")
  const [selectedBot, setSelectedBot] = useState<string | null>(null)

  // Force initialize Manual Entry so the tile never disappears
  const engines: Record<string, any[]> = { "Manual Entry": [] };

  trades.forEach((t: any) => {
    const name = t.setup || "Manual Entry"
    if (!engines[name]) engines[name] = []
    if (t.setup) engines[name].push(t)
    else if (name === "Manual Entry") engines[name].push(t)
  })

  // Theme & Icon Mapping matches the text file style precisely
  const getEngineStyles = (name: string) => {
    const nameUpper = name.toUpperCase()
    if (nameUpper.includes("APEX") || nameUpper.includes("SENTINEL")) 
      return { icon: Cpu, bg: "bg-indigo-500", text: "text-indigo-400", bgSoft: "bg-indigo-500/10" }
    if (nameUpper.includes("HYBRID GOLD") || nameUpper.includes("PHOENIX GOLD")) 
      return { icon: Zap, bg: "bg-emerald-500", text: "text-emerald-400", bgSoft: "bg-emerald-500/10" }
    if (nameUpper.includes("NQ") || nameUpper.includes("USTEC")) 
      return { icon: BarChart3, bg: "bg-cyan-500", text: "text-cyan-400", bgSoft: "bg-cyan-500/10" }
    if (nameUpper.includes("MANUAL")) 
      return { icon: Activity, bg: "bg-slate-500", text: "text-slate-400", bgSoft: "bg-slate-500/10" }
    
    return { icon: Shield, bg: "bg-blue-500", text: "text-blue-400", bgSoft: "bg-blue-500/10" }
  }

  const filteredEngines = Object.entries(engines).filter(([name]) => {
    if (filterMode === "ALL") return true;
    if (filterMode === "BOT") return name.toUpperCase() !== "MANUAL ENTRY";
    if (filterMode === "MANUAL") return name.toUpperCase() === "MANUAL ENTRY";
    return true;
  });

  const getModeLabel = (mode: string) => {
    if (mode === "ALL") return "Combined Matrix";
    if (mode === "BOT") return "Core Engines";
    return "Manual Logs";
  };

  const botTrades = selectedBot ? engines[selectedBot] : [];

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between p-4 bg-card/40 backdrop-blur-md rounded-xl border border-border/40 shadow-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Data Source Layer</span>
          <span className="text-[11px] text-foreground font-medium italic">Active performance pipeline</span>
        </div>
        <div className="flex gap-1 bg-background/50 p-1.5 rounded-lg border border-border/50">
          {(["ALL", "BOT", "MANUAL"] as const).map((mode) => (
            <button 
              key={mode} 
              onClick={() => setFilterMode(mode)} 
              className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${filterMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60"}`}
            >
              {getModeLabel(mode)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredEngines.map(([name, engineTrades]: [string, any[]]) => {
          const styles = getEngineStyles(name)
          const wins = engineTrades.filter((t: any) => t.rMultiple > 0).length
          const netPnl = engineTrades.reduce((sum: number, t: any) => sum + Number(t.rMultiple), 0)
          const grossProfit = engineTrades.filter((t: any) => t.rMultiple > 0).reduce((sum: number, t: any) => sum + Number(t.rMultiple), 0)
          const grossLoss = Math.abs(engineTrades.filter((t: any) => t.rMultiple < 0).reduce((sum: number, t: any) => sum + Number(t.rMultiple), 0))
          const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "MAX" : "0.00"

          return (
            <Card key={name} className="border-border/40 bg-card/60 shadow-lg relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${styles.bg}`} />
              
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="flex items-center justify-between text-sm font-black uppercase tracking-widest">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${styles.bgSoft}`}>
                      <styles.icon className={`h-4 w-4 ${styles.text}`} />
                    </div>
                    {name}
                  </div>
                  <button 
                    onClick={() => setSelectedBot(name)}
                    className={`text-[10px] font-mono px-2 py-1 rounded cursor-pointer hover:brightness-125 transition-all ${styles.bgSoft} ${styles.text}`}
                  >
                    {engineTrades.length} Trades
                  </button>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-background/50 rounded-lg">
                    <span className="text-[10px] text-muted-foreground uppercase">Net P&L</span>
                    <p className={`text-xl font-black ${netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      ${netPnl.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <span className="text-[10px] text-muted-foreground uppercase">Profit Factor</span>
                    <p className="text-xl font-black text-foreground">{profitFactor}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!selectedBot} onOpenChange={() => setSelectedBot(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/40 shadow-2xl sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm font-black text-foreground">
              {selectedBot} Execution Ledger
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar mt-4 pr-2">
            {botTrades.length === 0 ? (
              <p className="text-xs italic text-muted-foreground text-center py-4">No historical executions found.</p>
            ) : (
              botTrades.map((t: any, i: number) => {
                const isBuy = (t.direction || t.type || t.action || "BUY").toUpperCase() === "BUY";
                return (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-background/40 border border-border/30 hover:border-border/60 transition-colors">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black tracking-widest uppercase text-foreground">{t.symbol}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider ${isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(t.date).toLocaleString()}</span>
                    </div>
                    <span className={`text-sm font-black ${t.rMultiple < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {t.rMultiple < 0 ? '' : '+'}${Number(t.rMultiple).toFixed(2)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}