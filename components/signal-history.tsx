"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

export function SignalHistoryView({ trades = [] }: { trades: any[] }) {
  return (
    <div className="space-y-4">
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-muted-foreground uppercase bg-muted/20 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-black tracking-widest">Date / Time</th>
                  <th className="px-6 py-4 font-black tracking-widest">Engine / Setup</th>
                  <th className="px-6 py-4 font-black tracking-widest">Asset</th>
                  <th className="px-6 py-4 font-black tracking-widest text-right">Result ($)</th>
                  <th className="px-6 py-4 font-black tracking-widest text-center">Media</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">No signals recorded yet.</td>
                  </tr>
                ) : (
                  trades.map((t, i) => {
                    const dateObj = new Date(t.date);
                    return (
                      <tr key={t.id || i} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{dateObj.toLocaleDateString()}</span>
                            <span className="text-xs text-muted-foreground font-mono">{dateObj.toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">{t.setup}</td>
                        <td className="px-6 py-4 font-bold tracking-tight">{t.symbol}</td>
                        <td className={`px-6 py-4 text-right font-black font-mono ${t.rMultiple >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {t.rMultiple >= 0 ? "+" : ""}{Number(t.rMultiple).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {t.screenshot ? (
                            <a href={t.screenshot} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors">
                              <ExternalLink size={16} />
                            </a>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
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