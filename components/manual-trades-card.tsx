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
  const currentLogs = trades.slice(0, 20);

  return (
    <div className="bg-[#070b12]/60 border border-slate-800 rounded-xl flex flex-col shadow-xl max-h-[380px] overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-[#03050a] border-b border-slate-900">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Logs</h3>
        <button
          onClick={onAddTrade}
          className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 p-1.5 rounded-md transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {currentLogs.length === 0 ? (
          <p className="text-[10px] text-slate-600 italic font-mono text-center mt-6">Database currently clear.</p>
        ) : (
          currentLogs.map((trade) => (
            <div
              key={trade.id}
              onClick={() => onEditTrade(trade)}
              className="flex items-center justify-between p-3 rounded-lg bg-[#03050a] border border-slate-800 group hover:border-slate-600 transition-all cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-slate-200 tracking-widest">
                  {trade.symbol} <span className="text-slate-500 font-normal ml-1">| {trade.setup}</span>
                </span>
                <span className="text-[9px] text-slate-600 font-mono">{new Date(trade.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-black font-mono tabular-nums ${trade.rMultiple >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {trade.rMultiple >= 0 ? "+" : ""}${trade.rMultiple.toFixed(2)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTrade(trade.id);
                  }}
                  className="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-0.5 rounded"
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