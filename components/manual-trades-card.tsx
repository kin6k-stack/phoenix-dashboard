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
  onEditTrade: (trade: Trade) => void
  onDeleteTrade: (id: string) => void
}

export function ManualTradesCard({ trades, onAddTrade, onEditTrade, onDeleteTrade }: ManualTradesCardProps) {
  const currentLogs = trades.slice(0, 20)

  return (
    <div className="bg-card/60 border border-border/40 rounded-xl flex flex-col shadow-lg max-h-[320px] overflow-hidden">

      {/* Header — tightened */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-background/30">
        <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Historical Logs</h3>
        <button
          onClick={onAddTrade}
          className="bg-primary/10 hover:bg-primary/20 text-primary p-1 rounded-md transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {currentLogs.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic text-center mt-4">Database currently clear.</p>
        ) : (
          currentLogs.map((trade) => (
            <div
              key={trade.id}
              onClick={() => onEditTrade(trade)}
              className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border/30 group hover:border-border/60 transition-all cursor-pointer"
            >
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[11px] font-bold text-foreground tracking-tight truncate">
                  {trade.symbol}
                  <span className="text-muted-foreground font-normal ml-1">| {trade.setup}</span>
                </span>
                <span className="text-[9px] text-muted-foreground">{new Date(trade.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-black tabular-nums ${trade.rMultiple >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {trade.rMultiple >= 0 ? "+" : ""}${trade.rMultiple.toFixed(2)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteTrade(trade.id) }}
                  className="text-muted-foreground hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-0.5 rounded"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
