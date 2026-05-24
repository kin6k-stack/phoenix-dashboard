"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

export function AddTradeDialog({ open, onOpenChange, onSubmit, initialDate, existingTrade, trades = [] }: any) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: "XAUUSDm",
    setup: "Manual Entry",
    direction: "BUY",
    rMultiple: 0,
    notes: "",
    screenshot: ""
  });

  useEffect(() => {
    if (open) {
      if (existingTrade) {
        setFormData({ ...existingTrade, date: new Date(existingTrade.date).toISOString().split('T')[0] });
      } else {
        setFormData({
          date: initialDate ? new Date(initialDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          symbol: "XAUUSDm",
          setup: "Manual Entry",
          direction: "BUY",
          rMultiple: 0,
          notes: "",
          screenshot: ""
        });
      }
    }
  }, [open, initialDate, existingTrade]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(existingTrade ? { ...formData, id: existingTrade.id } : formData);
  }

  const targetDateStr = initialDate ? initialDate.toDateString() : new Date().toDateString();
  const dayTrades = trades.filter((t: any) => new Date(t.date).toDateString() === targetDateStr);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f172a]/95 backdrop-blur-xl border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm font-black text-foreground">
            {existingTrade ? "Edit Execution" : `Log Execution - ${targetDateStr}`}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Asset</label>
              <select className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value})}>
                <option value="XAUUSDm">XAUUSDm</option>
                <option value="USTECm">USTECm</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Direction</label>
              <select className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors" value={formData.direction} onChange={(e) => setFormData({...formData, direction: e.target.value})}>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Setup / Engine</label>
              <input type="text" className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors" value={formData.setup} onChange={(e) => setFormData({...formData, setup: e.target.value})} required/>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Net P&L ($)</label>
              <input type="number" step="0.01" className={`w-full bg-black/40 border rounded-md px-3 py-2 text-sm focus:border-primary outline-none transition-colors font-mono font-black ${Number(formData.rMultiple) < 0 ? 'border-rose-500/50 text-rose-400' : 'border-emerald-500/50 text-emerald-400'}`} value={formData.rMultiple} onChange={(e) => setFormData({...formData, rMultiple: parseFloat(e.target.value)})} required/>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TradingView Image URL</label>
            <input type="url" placeholder="https://www.tradingview.com/x/..." className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors font-mono" value={formData.screenshot} onChange={(e) => setFormData({...formData, screenshot: e.target.value})}/>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Context Notes</label>
            <textarea className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors min-h-[60px]" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="What was the setup trigger?"/>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] px-6 py-2 rounded-md shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:opacity-90 transition-opacity">
              Save Execution
            </button>
          </div>
        </form>

        <div className="mt-4 border-t border-white/10 pt-4">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Intraday Execution Ledger</h4>
          <div className="max-h-[140px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {dayTrades.length === 0 ? (
              <p className="text-xs italic text-muted-foreground text-center py-4 font-mono">No trades logged on this date.</p>
            ) : (
              dayTrades.map((t: any, i: number) => {
                const isBuy = (t.direction || t.type || t.action || "BUY").toUpperCase() === "BUY";
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5 hover:border-white/20 transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-black uppercase flex items-center gap-1.5 text-foreground tracking-widest">
                        {isBuy ? <ArrowUpRight size={12} className="text-emerald-400"/> : <ArrowDownRight size={12} className="text-rose-400"/>}
                        {t.symbol}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{t.setup}</span>
                    </div>
                    <span className={`text-sm font-mono font-black ${t.rMultiple < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {t.rMultiple < 0 ? '' : '+'}${Number(t.rMultiple).toFixed(2)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}