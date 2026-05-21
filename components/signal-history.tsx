"use client"
import { Card, CardContent } from "@/components/ui/card"

export function SignalHistoryView({ trades = [] }: { trades: any[] }) {
  const botTrades = trades.filter(t => t.setup !== "Manual Entry");

  return (
    <div className="space-y-4">
      {/* Mobile Stacked View */}
      <div className="lg:hidden space-y-3">
        {botTrades.map((t, i) => (
          <div key={i} className="glass-card p-4 rounded-xl flex justify-between items-center">
            <div>
              <p className="font-black text-[11px] uppercase tracking-widest text-primary">{t.setup}</p>
              <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()}</p>
            </div>
            <p className={`font-black font-mono ${t.rMultiple >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {t.rMultiple >= 0 ? "+" : ""}{Number(t.rMultiple).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block glass-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] text-muted-foreground uppercase bg-background/60 border-b border-border/40">
            <tr>
              <th className="px-6 py-4 font-black tracking-widest">Date / Time</th>
              <th className="px-6 py-4 font-black tracking-widest">Engine</th>
              <th className="px-6 py-4 font-black tracking-widest">Asset</th>
              <th className="px-6 py-4 font-black tracking-widest text-right">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {botTrades.map((t, i) => (
              <tr key={i} className="hover:bg-muted/10 transition-colors">
                <td className="px-6 py-4"><span className="font-bold">{new Date(t.date).toLocaleDateString()}</span></td>
                <td className="px-6 py-4 font-black text-[11px] text-primary">{t.setup}</td>
                <td className="px-6 py-4 font-bold">{t.symbol}</td>
                <td className={`px-6 py-4 text-right font-black font-mono ${t.rMultiple >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {t.rMultiple >= 0 ? "+" : ""}{Number(t.rMultiple).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}