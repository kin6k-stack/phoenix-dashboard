"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Target, Activity } from "lucide-react"

export default function PerformanceView({ trades = [] }: { trades: any[] }) {
  const [selectedBot, setSelectedBot] = useState<string | null>(null);

  // Group trades by engine
  const engines = trades.reduce((acc: any, t: any) => {
    const name = t.setup || "Manual Entry";
    if (!acc[name]) acc[name] = [];
    acc[name].push(t);
    return acc;
  }, {});

  // Task 3.1: Accent Tonal Alignment
  const getEngineStyles = (name: string) => {
    const nameUpper = name.toUpperCase();
    if (nameUpper.includes("HYBRID NQ")) return { color: "text-indigo-400", glow: "shadow-[0_0_20px_rgba(99,102,241,0.15)]", border: "border-indigo-500/30" };
    if (nameUpper.includes("HYBRID GOLD")) return { color: "text-amber-400", glow: "shadow-[0_0_20px_rgba(251,191,36,0.15)]", border: "border-amber-500/30" };
    if (nameUpper.includes("GOLD APEX")) return { color: "text-emerald-400", glow: "shadow-[0_0_20px_rgba(52,211,153,0.15)]", border: "border-emerald-500/30" };
    if (nameUpper.includes("MANUAL")) return { color: "text-fuchsia-400", glow: "shadow-[0_0_20px_rgba(232,121,249,0.15)]", border: "border-fuchsia-500/30" };
    return { color: "text-blue-400", glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]", border: "border-blue-500/30" };
  };

  const botTrades = selectedBot ? engines[selectedBot] : [];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {Object.entries(engines).map(([name, engineTrades]: [string, any]) => {
        const styles = getEngineStyles(name);
        const wins = engineTrades.filter((t: any) => t.rMultiple > 0).length;
        const winRate = engineTrades.length > 0 ? ((wins / engineTrades.length) * 100).toFixed(0) : 0;
        const netPnl = engineTrades.reduce((sum: number, t: any) => sum + Number(t.rMultiple), 0);

        return (
          <Card key={name} className={`bg-card/40 backdrop-blur-md ${styles.border} ${styles.glow}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-sm font-black uppercase tracking-widest ${styles.color}`}>{name}</h3>
                
                {/* Task 3.2: Interactive Trigger Badge */}
                <button 
                  onClick={() => setSelectedBot(name)}
                  className="px-2 py-1 bg-background/50 border border-border/50 rounded text-[10px] font-bold text-foreground hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {engineTrades.length} EXECUTIONS
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1 flex items-center gap-1"><Target size={12}/> Win Rate</p>
                  <p className="text-2xl font-black text-foreground">{winRate}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1 flex items-center gap-1"><Activity size={12}/> Net P&L</p>
                  <p className={`text-2xl font-black ${netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${netPnl.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Task 3.2: Bot-Specific History Modal */}
      <Dialog open={!!selectedBot} onOpenChange={() => setSelectedBot(null)}>
        <DialogContent className="bg-slate-950 border-border/40 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm font-black text-foreground">
              {selectedBot} Execution Ledger
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar mt-4 pr-2">
            {botTrades.map((t: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 rounded bg-background/40 border border-border/30">
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
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}