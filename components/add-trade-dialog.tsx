"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowUpRight, ArrowDownRight, Activity, Calendar as CalendarIcon } from "lucide-react"

// ── Pass F additions: full symbol list matching the PnL filter ─────
const SYMBOL_OPTIONS = ["XAUUSD", "USTEC", "EURUSD", "GBPUSD", "BTCUSD"]

export function AddTradeDialog({
  open, onOpenChange, onSubmit, initialDate, existingTrade, initialDraft, trades = [],
}: any) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: "XAUUSD",
    setup: "Manual Entry",
    direction: "BUY",
    rMultiple: 0,
    notes: "",
    screenshot: ""
  });

  useEffect(() => {
    if (open) {
      if (existingTrade) {
        // Editing an existing trade — full overwrite from existing
        setFormData({
          ...existingTrade,
          date: new Date(existingTrade.date).toISOString().split('T')[0],
        });
      } else if (initialDraft) {
        // Pass G: Copy-to-Journal from bot signal — pre-fill from bot trade
        // Use today's date by default (user can change). Append note that this
        // was copied from a bot execution, preserving any original notes.
        const draftDate = initialDraft.date
          ? new Date(initialDraft.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
        const originalNotes = initialDraft.notes ? `\n\n— Original: ${initialDraft.notes}` : ""
        setFormData({
          date:       draftDate,
          symbol:     initialDraft.symbol     ?? "XAUUSD",
          setup:      initialDraft.setup      ?? "Manual Entry",
          direction:  initialDraft.direction  ?? "BUY",
          rMultiple:  Number(initialDraft.rMultiple ?? 0),
          notes:      `Copied from bot execution${originalNotes}`,
          screenshot: initialDraft.screenshot ?? "",
        })
      } else {
        // Fresh log — use initialDate if provided
        setFormData({
          date: initialDate ? new Date(initialDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          symbol: "XAUUSD",
          setup: "Manual Entry",
          direction: "BUY",
          rMultiple: 0,
          notes: "",
          screenshot: ""
        });
      }
    }
  }, [open, initialDate, existingTrade, initialDraft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(existingTrade ? { ...formData, id: existingTrade.id } : formData);
  }

  // Day-trades list shows trades on the SAME date as the form's current date
  // (used to reflect the user's date selection live)
  const formDateStr = new Date(formData.date + "T12:00:00").toDateString()
  const dayTrades = trades.filter((t: any) => new Date(t.date).toDateString() === formDateStr);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border border-border/80 shadow-2xl sm:max-w-[450px] text-foreground rounded-xl backdrop-blur-xl
                                 max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="uppercase tracking-widest text-xs font-black text-foreground flex items-center gap-2">
            <Activity size={14} className="text-primary"/>
            {existingTrade ? "Edit Position Log" : initialDraft ? "Copy from Bot — Review & Save" : "Log Execution"}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable body — form + ledger live here, dialog never exceeds viewport */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">

          {/* ── Pass F: Visible, editable date field ──────────────── */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon size={11} className="text-muted-foreground" />
              Execution Date
            </label>
            <input
              type="date"
              required
              max={new Date().toISOString().split('T')[0]}
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground font-mono focus:border-primary outline-none transition-colors cursor-pointer
                         [color-scheme:dark]"
            />
            <p className="text-[9px] text-muted-foreground/70 mt-1">
              Trades on this date will appear in the ledger below.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Asset</label>
              <select
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors appearance-none cursor-pointer"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value})}>
                {SYMBOL_OPTIONS.map(sym => (
                  <option key={sym} value={sym} className="bg-card">{sym}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Direction</label>
              <select
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors appearance-none cursor-pointer"
                value={formData.direction}
                onChange={(e) => setFormData({...formData, direction: e.target.value})}>
                <option value="BUY"  className="bg-background">BUY</option>
                <option value="SELL" className="bg-background">SELL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Setup / Engine</label>
              <input
                type="text"
                required
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors"
                value={formData.setup}
                onChange={(e) => setFormData({...formData, setup: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Net P&L ($)</label>
              <input
                type="number"
                step="0.01"
                required
                className={`w-full bg-background border rounded px-3 py-2 text-sm focus:border-primary outline-none transition-colors font-mono font-black
                  ${Number(formData.rMultiple) < 0
                    ? 'border-rose-500/30 text-rose-400 bg-rose-950/10'
                    : 'border-emerald-500/30 text-emerald-400 bg-emerald-950/10'}`}
                value={formData.rMultiple}
                onChange={(e) => setFormData({...formData, rMultiple: parseFloat(e.target.value)})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TradingView Snapshot URL</label>
            <input
              type="url"
              placeholder="https://www.tradingview.com/x/..."
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:border-primary outline-none font-mono"
              value={formData.screenshot}
              onChange={(e) => setFormData({...formData, screenshot: e.target.value})}/>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Context Notes</label>
            <textarea
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors min-h-[60px]"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Setup verification, market structure, key levels..." />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="gradient-primary font-black uppercase tracking-widest text-[11px] px-6 py-2 rounded shadow-md hover:opacity-90 transition-opacity cursor-pointer">
              Save Position Data
            </button>
          </div>
        </form>

        <div className="mt-4 border-t border-border/40 pt-4">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Intraday Position Ledger
            <span className="ml-2 text-foreground/60 font-mono normal-case tracking-normal">
              ({new Date(formData.date + "T12:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
            </span>
          </h4>
          <div className="max-h-[130px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {dayTrades.length === 0 ? (
              <p className="text-xs italic text-muted-foreground text-center py-4 font-mono">
                No historical records logged on this date.
              </p>
            ) : (
              dayTrades.map((t: any, i: number) => {
                const isBuy = (t.direction || "BUY").toUpperCase() === "BUY";
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border/40 hover:border-border/80 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase flex items-center gap-1.5 text-foreground tracking-widest">
                        {isBuy
                          ? <ArrowUpRight size={12} className="text-emerald-400"/>
                          : <ArrowDownRight size={12} className="text-rose-400"/>}
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

        </div>
      </DialogContent>
    </Dialog>
  )
}
