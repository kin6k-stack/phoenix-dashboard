"use client"

import { Plus, Trash2 } from "lucide-react"

interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
}

interface ManualTradesCardProps {
  trades: Trade[]
  onAddTrade: () => void
  onDeleteTrade: (id: string) => void
}

export function ManualTradesCard({ trades, onAddTrade, onDeleteTrade }: ManualTradesCardProps) {
  // Show the last 20 elements to keep layout viewport perfect
  const currentLogs = trades.slice(0, 20);

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col shadow-sm max-h-[380px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Historical Logs</h3>
        <button 
          onClick={onAddTrade}
          className="bg-primary/10 hover:bg-primary/20 text-primary p-1.5 rounded-md transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {currentLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center mt-6">Database currently clear.</p>
        ) : (
          currentLogs.map((trade) => (
            <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border group hover:border-primary/40 transition-all">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground tracking-tight">{trade.symbol}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(trade.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold tracking-tight ${trade.rMultiple >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {trade.rMultiple >= 0 ? "+" : ""}${trade.rMultiple.toFixed(2)}
                </span>
                <button 
                  onClick={() => onDeleteTrade(trade.id)}
                  className="text-muted-foreground hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-0.5 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}