"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react"

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
      {/* DIALOG BODY LAYOUT: Locked back into your true deep dark background framework theme parameters */}
      <DialogContent className="bg-[#070b12] border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.8)] sm:max-w-[450px] text-foreground rounded-xl backdrop-blur-xl">
        <DialogHeader className="pb-2 border-b border-white/5">
          <DialogTitle className="uppercase tracking-widest text-xs font-black text-foreground flex items-center gap-2">
            <Activity size={14} className="text-primary"/> {existingTrade ? "Edit Execution" : `Log Execution - ${targetDateStr}`}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Asset</label>
              <select className="w-full bg-black/40 border border-white/5 rounded-md px-3 py-2 text-xs text-foreground focus:border-primary outline-none cursor-pointer tracking-wider" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value})}>
                <option value="XAUUSDm" className="bg-[#070b12]">XAUUSDm</option>
                <option value="USTECm" className="bg-[#070b12]">USTECm</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Direction</label>
              <select className="w-full bg-black/40 border border-white/5 rounded-md px-3 py-2 text-xs text-foreground focus:border-primary outline-none cursor-pointer tracking-wider" value={formData.direction} onChange={(e) => setFormData({...formData, direction: e.target.value})}>
                <option value="BUY" className="bg-[#070b12]">BUY</option>
                <option value="SELL" className="bg-[#070b12]">SELL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Engine Setup Name</label>
              <input type="text" className="w-full bg-black/40 border border-white/5 rounded-md px-3 py-2 text-xs text-foreground focus:border-primary outline-none tracking-wide" value={formData.setup} onChange={(e) => setFormData({...formData, setup: e.target.value})} required/>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Net Outcome ($)</label>
              <input type="number" step="0.01" className={`w-full bg-black/40 border rounded-md px-3 py-2 text-xs focus:ring-0 outline-none font-mono font-black tracking-wide ${Number(formData.rMultiple) < 0 ? 'border-rose-500/30 text-rose-400' : 'border-emerald-500/30 text-emerald-400'}`} value={formData.rMultiple} onChange={(e) => setFormData({...formData, rMultiple: parseFloat(e.target.value)})} required/>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">TradingView Snapshot URL</label>
            <input type="url" placeholder="https://www.tradingview.com/x/..." className="w-full bg-black/40 border border-white/5 rounded-md px-3 py-2 text-xs text-foreground focus:border-primary outline-none font-mono" value={formData.screenshot} onChange={(e) => setFormData({...formData, screenshot: e.target.value})}/>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Context Execution Notes</label>
            <textarea className="w-full bg-black/40 border border-white/5 rounded-md px-3 py-2 text-xs text-foreground focus:border-primary outline-none min-h-[60px] tracking-wide" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Confirm framework validation rules metrics logged here."/>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] px-5 py-2.5 rounded-md shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:opacity-90 transition-opacity cursor-pointer">
              Commit Execution
            </button>
          </div>
        </form>

        {/* Intraday List History Drawer Container */}
        <div className="mt-4 border-t border-white/5 pt-4">
          <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">Intraday Execution Drawer</h4>
          <div className="max-h-[125px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {dayTrades.length === 0 ? (
              <p className="text-[10px] italic text-muted-foreground text-center py-4 font-mono uppercase tracking-wider">No history records logged window date.</p>
            ) : (
              dayTrades.map((t: any, i: number) => {
                const isBuy = (t.direction || "BUY").toUpperCase() === "BUY";
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-md bg-black/20 border border-white/[0.03] hover:border-white/10 transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-black uppercase flex items-center gap-1.5 text-foreground tracking-widest">
                        {isBuy ? <ArrowUpRight size={12} className="text-emerald-400"/> : <ArrowDownRight size={12} className="text-rose-400"/>}
                        {t.symbol}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{t.setup}</span>
                    </div>
                    <span className={`text-xs font-mono font-black ${t.rMultiple < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
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