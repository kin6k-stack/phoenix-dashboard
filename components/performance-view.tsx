"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

export function PerformanceView({ trades = [] }: { trades: any[] }) {
  const [filterMode, setFilterMode] = useState<"ALL" | "BOT" | "MANUAL">("ALL")
  const [selectedBot, setSelectedBot] = useState<string | null>(null)

  // Group trades by engine
  const engines = trades.reduce((acc: any, t: any) => {
    const name = t.setup || "Manual Entry"
    if (!acc[name]) acc[name] = []
    acc[name].push(t)
    return acc
  }, {})

  const getEngineStyles = (name: string) => {
    const nameUpper = name.toUpperCase()
    if (nameUpper.includes("HYBRID NQ") || nameUpper.includes("USTEC")) return { color: "text-indigo-400", bg: "bg-indigo-500", glow: "shadow-[0_0_20px_rgba(99,102,241,0.15)]", border: "border-indigo-500/30" }
    if (nameUpper.includes("HYBRID GOLD")) return { color: "text-amber-400", bg: "bg-amber-500", glow: "shadow-[0_0_20px_rgba(251,191,36,0.15)]", border: "border-amber-500/30" }
    if (nameUpper.includes("GOLD APEX")) return { color: "text-emerald-400", bg: "bg-emerald-500", glow: "shadow-[0_0_20px_rgba(52,211,153,0.15)]", border: "border-emerald-500/30" }
    if (nameUpper.includes("MANUAL")) return { color: "text-fuchsia-400", bg: "bg-fuchsia-500", glow: "shadow-[0_0_20px_rgba(232,121,249,0.15)]", border: "border-fuchsia-500/30" }
    return { color: "text-blue-400", bg: "bg-blue-500", glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]", border: "border-blue-500/30" }
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
      <div className="flex gap-2 p-1 bg-background/50 backdrop-blur-md rounded-lg border border-border/40 inline-flex">
        {(["ALL", "BOT", "MANUAL"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
              filterMode === mode
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {mode === "ALL" ? "Combined Matrix" : mode === "BOT" ? "Core Engines" : "Manual Logs"}
          </button>
        ))}
      </div>

      {/* Analytics Tiles */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredEngines.map(([name, engineTrades]: [string, any]) => {
          const styles = getEngineStyles(name)
          const wins = engineTrades.filter((t: any) => t.rMultiple > 0).length
          const losses = engineTrades.filter((t: any) => t.rMultiple < 0).length
          const winRate = engineTrades.length > 0 ? ((wins / engineTrades.length) * 100).toFixed(0) : 0
          const netPnl = engineTrades.reduce((sum: number, t: any) => sum + Number(t.rMultiple), 0)
          const grossProfit = engineTrades.filter((t: any) => t.rMultiple > 0).reduce((sum: number, t: any) => sum + Number(t.rMultiple), 0)
          const grossLoss = Math.abs(engineTrades.filter((t: any) => t.rMultiple < 0).reduce((sum: number, t: any) => sum + Number(t.rMultiple), 0))
          const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "MAX" : "0.00"

          return (
            <Card key={name} className={`bg-card/40 backdrop-blur-md ${styles.border} ${styles.glow}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-sm font-black uppercase tracking-widest ${styles.color}`}>{name}</h3>
                  <button 
                    onClick={() => setSelectedBot(name)}
                    className="text-[11px] text-muted-foreground font-bold hover:text-foreground transition-colors cursor-pointer"
                  >
                    ({engineTrades.length} trades)
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Net Performance</p>
                      <p className={`text-3xl font-black tabular-nums ${netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Profit Factor</p>
                      <p className="text-xl font-black text-foreground">{profitFactor}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                      <span className="text-muted-foreground">Win Rate Efficiency</span>
                      <span className="text-foreground">{winRate}%</span>
                    </div>
                    <div className="h-2 w-full bg-background/50 rounded-full overflow-hidden border border-border/50">
                      <div className={`h-full ${styles.bg} transition-all duration-500`} style={{ width: `${winRate}%` }} />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-black tracking-widest">
                      <span className="text-emerald-400">WINS: {wins}</span>
                      <span className="text-rose-400">LOSSES: {losses}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Bot-Specific History Modal */}
      <Dialog open={!!selectedBot} onOpenChange={() => setSelectedBot(null)}>
        <DialogContent className="bg-[#0f172a]/95 backdrop-blur-xl border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm font-black text-foreground">
              {selectedBot} Execution Ledger
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar mt-4 pr-2">
            {botTrades.length === 0 ? (
              <p className="text-xs italic text-muted-foreground text-center">No historical executions found.</p>
            ) : (
              botTrades.map((t: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-background/40 border border-border/30 hover:border-white/10 transition-colors">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black tracking-widest uppercase text-foreground">{t.symbol}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider ${t.direction?.toUpperCase() === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {t.direction?.toUpperCase() || 'BUY'}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(t.date).toLocaleString()}</span>
                  </div>
                  <span className={`text-sm font-black ${t.rMultiple < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {t.rMultiple < 0 ? '' : '+'}${Number(t.rMultiple).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}