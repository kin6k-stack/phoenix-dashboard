"use client"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

export function SignalHistoryView({ trades = [] }: { trades: any[] }) {
  return (
    <div className="w-full border border-border/40 rounded-xl overflow-hidden bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.15)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-background/50 border-b border-border/40 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-4 font-bold">Date / Time</th>
              <th className="p-4 font-bold">Asset</th>
              <th className="p-4 font-bold">Direction</th>
              <th className="p-4 font-bold">Engine / Setup</th>
              <th className="p-4 font-bold text-right">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground italic">No historical executions found.</td>
              </tr>
            ) : (
              trades.map((t: any, i: number) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-xs font-mono text-muted-foreground">{new Date(t.date).toLocaleString()}</td>
                  <td className="p-4 font-black tracking-widest text-xs text-foreground">{t.symbol}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded ${t.direction?.toUpperCase() === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {t.direction?.toUpperCase() === 'BUY' ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                      {t.direction?.toUpperCase() || 'BUY'}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground uppercase font-bold">{t.setup}</td>
                  <td className={`p-4 text-right font-black tabular-nums ${t.rMultiple < 0 ? 'text-rose-400 drop-shadow-[0_0_5px_rgba(251,113,133,0.3)]' : 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]'}`}>
                    {t.rMultiple < 0 ? '' : '+'}${Number(t.rMultiple).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}