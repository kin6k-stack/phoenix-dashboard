"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

export function SignalHistoryView({ trades = [] }: { trades: any[] }) {
  // Exclude manual trades automatically
  const botTrades = trades.filter(t => t.setup !== "Manual Entry");

  return (
    <div className="space-y-4">
      <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.15)] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-muted-foreground uppercase bg-background/60 border-b border-border/40 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-black tracking-widest">Date / Time</th>
                  <th className="px-6 py-4 font-black tracking-widest">Engine / Setup</th>
                  <th className="px-6 py-4 font-black tracking-widest">Asset</th>
                  <th className="px-6 py-4 font-black tracking-widest text-right">Result ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {botTrades.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground italic font-medium">No engine signals recorded yet.</td>
                  </tr>
                ) : (
                  botTrades.map((t, i) => {
                    const dateObj = new Date(t.date);
                    return (
                      <tr key={t.id || i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{dateObj.toLocaleDateString()}</span>
                            <span className="text-xs text-muted-foreground font-mono">{dateObj.toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-[11px] uppercase tracking-wider text-primary drop-shadow-[0_0_5px_rgba(6,182,212,0.3)]">{t.setup}</td>
                        <td className="px-6 py-4 font-bold tracking-tight">{t.symbol}</td>
                        <td className={`px-6 py-4 text-right font-black font-mono tracking-tighter text-[15px] ${t.rMultiple >= 0 ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]" : "text-rose-400 drop-shadow-[0_0_5px_rgba(251,113,133,0.3)]"}`}>
                          {t.rMultiple >= 0 ? "+" : ""}{Number(t.rMultiple).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}