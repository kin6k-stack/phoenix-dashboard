"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Target, Activity, Cpu, Zap, PenTool, ArrowUpRight, ArrowDownRight } from "lucide-react"

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

  // Theme & Icon Mapping
  const getEngineStyles = (name: string) => {
    const nameUpper = name.toUpperCase()
    if (nameUpper.includes("HYBRID NQ") || nameUpper.includes("USTEC")) 
      return { icon: Cpu, color: "text-purple-400", bg: "bg-purple-500", glow: "shadow-[0_0_20px_rgba(168,85,247,0.15)]", border: "border-purple-500/30", bgSoft: "bg-purple-500/10" }
    if (nameUpper.includes("HYBRID GOLD")) 
      return { icon: Zap, color: "text-orange-400", bg: "bg-orange-500", glow: "shadow-[0_0_20px_rgba(249,115,22,0.15)]", border: "border-orange-500/30", bgSoft: "bg-orange-500/10" }
    if (nameUpper.includes("GOLD APEX")) 
      return { icon: Target, color: "text-emerald-400", bg: "bg-emerald-500", glow: "shadow-[0_0_20px_rgba(52,211,153,0.15)]", border: "border-emerald-500/30", bgSoft: "bg-emerald-500/10" }
    if (nameUpper.includes("MANUAL")) 
      return { icon: PenTool, color: "text-blue-400", bg: "bg-blue-500", glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]", border: "border-blue-500/30", bgSoft: "bg-blue-500/10" }
    
    return { icon: Activity, color: "text-slate-400", bg: "bg-slate-500", glow: "shadow-[0_0_20px_rgba(148,163,184,0.15)]", border: "border-slate-500/30", bgSoft: "bg-slate-500/10" }
  }

  const filteredEngines = Object.entries(engines).filter(([name]) => {
    if (filterMode === "ALL") return true;
    if (filterMode === "BOT") return name.toUpperCase() !== "MANUAL ENTRY";
    if (filterMode === "MANUAL") return name.toUpperCase() === "MANUAL ENTRY";
    return true;
  });

  const botTrades = selectedBot ? engines[selectedBot] : [];

  return (
    <div className="space-y-6">
      {/* Top Filter Separators */}
      <div className="flex gap-2 p-1.5 bg-[#0f172a]/60 backdrop-blur-xl rounded-lg border border-white/5 inline-flex shadow-lg">
        {(["ALL", "BOT", "MANUAL"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            className={`px-5 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              filterMode === mode
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {mode === "ALL" ? "Combined Matrix" : mode === "BOT" ? "Core Engines" : "Manual Logs"}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {filteredEngines.map(([name, engineTrades]: [string, any[]]) => {
          const styles = getEngineStyles(name)
          const wins = engineTrades.filter((t: any) => t.rMultiple > 0).length
          const losses = engineTrades.filter((t: any) => t.rMultiple < 0).length
          const winRate = engineTrades.length > 0 ? ((wins / engineTrades.length) * 100).toFixed(0) : 0
          const netPnl = engineTrades.reduce((sum: number, t: any) => sum + Number(t.rMultiple), 0)
          const grossProfit = engineTrades.filter((t: any) => t.rMultiple > 0).reduce((sum: number, t: any) => sum + Number(t.rMultiple), 0)
          const grossLoss = Math.abs(engineTrades.filter((t: any) => t.rMultiple < 0).reduce((sum: number, t: any) => sum + Number(t.rMultiple), 0))
          const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "MAX" : "0.00"

          return (
            <Card key={name} className={`bg-[#0f172a]/40 backdrop-blur-xl ${styles.border} ${styles.glow} transition-all hover:bg-[#0f172a]/60`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className={`flex items-center gap-3 px-3 py-1.5 rounded border ${styles.border} ${styles.bgSoft}`}>
                    <styles.icon size={16} className={styles.color} />
                    <h3 className={`text-xs font-black uppercase tracking-widest ${styles.color}`}>{name}</h3>
                  </div>
                  {/* Restored: (X trades) trigger text */}
                  <button 
                    onClick={() => setSelectedBot(name)}
                    className="text-[11px] text-muted-foreground font-bold hover:text-foreground transition-colors cursor-pointer bg-black/20 px-2 py-1 rounded border border-white/5"
                  >
                    ({engineTrades.length} trades)
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Net P&L</p>
                      <p className={`text-4xl font-mono font-black tabular-nums tracking-tighter ${netPnl >= 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]'}`}>
                        {netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Profit Factor</p>
                      <p className="text-2xl font-mono font-black text-foreground">{profitFactor}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                      <span className="text-muted-foreground">Win Rate Efficiency</span>
                      <span className="text-foreground font-mono">{winRate}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                      <div className={`h-full ${styles.bg} transition-all duration-1000 shadow-[0_0_10px_currentColor]`} style={{ width: `${winRate}%` }} />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-black tracking-widest font-mono">
                      <span className="text-emerald-400/80 hover:text-emerald-400 transition-colors">WINS: {wins}</span>
                      <span className="text-rose-400/80 hover:text-rose-400 transition-colors">LOSSES: {losses}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!selectedBot} onOpenChange={() => setSelectedBot(null)}>
        <DialogContent className="bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.7)] sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm font-black text-foreground flex items-center gap-2">
              <Activity size={16} className="text-primary"/> {selectedBot} Ledger
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar mt-4 pr-2">
            {botTrades.length === 0 ? (
              <p className="text-xs italic text-muted-foreground text-center py-6 font-mono">No historical executions found.</p>
            ) : (
              botTrades.map((t: any, i: number) => {
                const isBuy = (t.direction || t.type || t.action || "BUY").toUpperCase() === "BUY";
                return (
                  <div key={i} className="flex justify-between items-center p-3.5 rounded-lg bg-black/40 border border-white/5 hover:border-white/20 transition-all group">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black tracking-widest uppercase text-foreground">{t.symbol}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-widest font-mono ${isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                          {isBuy ? <ArrowUpRight size={10} className="inline mr-1"/> : <ArrowDownRight size={10} className="inline mr-1"/>}
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{new Date(t.date).toLocaleString()}</span>
                    </div>
                    <span className={`text-base font-mono font-black tabular-nums ${t.rMultiple < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
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