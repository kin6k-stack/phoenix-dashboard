"use client"
import { ArrowUpRight, ArrowDownRight, History } from "lucide-react"

export function SignalHistoryView({ trades = [] }: { trades: any[] }) {
  return (
    <div className="w-full border border-white/5 rounded-xl overflow-hidden bg-[#0f172a]/40 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.3)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-black/40 border-b border-white/5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-4 font-black flex items-center gap-2"><History size={14}/> Date / Time</th>
              <th className="p-4 font-black">Asset</th>
              <th className="p-4 font-black">Direction</th>
              <th className="p-4 font-black">Engine / Setup</th>
              <th className="p-4 font-black text-right">Outcome ($)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-xs text-muted-foreground italic font-mono">No historical executions found.</td>
              </tr>
            ) : (
              trades.map((t: any, i: number) => {
                // Bug Fix: Guarantee the direction pulls correctly from the payload
                const isBuy = (t.direction || t.type || t.action || "BUY").toUpperCase() === "BUY";
                
                return (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 text-[11px] font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                      {new Date(t.date).toLocaleString()}
                    </td>
                    <td className="p-4 font-black tracking-widest text-xs text-foreground">
                      {t.symbol}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded font-mono ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {isBuy ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                        {isBuy ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                    <td className="p-4 text-[10px] text-muted-foreground uppercase font-black tracking-wider">
                      {t.setup}
                    </td>
                    <td className={`p-4 text-right text-sm font-mono font-black tabular-nums ${t.rMultiple < 0 ? 'text-rose-400 drop-shadow-[0_0_5px_rgba(251,113,133,0.3)]' : 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]'}`}>
                      {t.rMultiple < 0 ? '' : '+'}${Number(t.rMultiple).toFixed(2)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}