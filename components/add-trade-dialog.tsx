"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

interface TradeData {
  id?: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
  notes: string
  screenshot: string
}

interface AddTradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (trade: Omit<TradeData, "id"> | TradeData) => void
  initialDate?: Date | null
  existingTrade?: TradeData | null
}

export function AddTradeDialog({ open, onOpenChange, onSubmit, initialDate, existingTrade }: AddTradeDialogProps) {
  const [formData, setFormData] = useState<TradeData>({
    date: new Date().toISOString().split('T')[0],
    symbol: "XAUUSD",
    setup: "Manual Entry",
    rMultiple: 0,
    notes: "",
    screenshot: ""
  })

  useEffect(() => {
    if (open) {
      if (existingTrade) {
        // Edit Mode
        setFormData({
          ...existingTrade,
          date: new Date(existingTrade.date).toISOString().split('T')[0]
        })
      } else {
        // Create Mode (Respects selected calendar date)
        setFormData({
          date: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          symbol: "XAUUSD", 
          setup: "Manual Entry",
          rMultiple: 0,
          notes: "",
          screenshot: ""
        })
      }
    }
  }, [open, initialDate, existingTrade])

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {existingTrade ? "Edit Trade Record" : "Log Historical Trade"}
          </h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="trade-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Asset Symbol</label>
                <select
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  className="w-full h-[38px] bg-background border border-input rounded-md px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="XAUUSD">GOLD (XAUUSD)</option>
                  <option value="USTEC">NASDAQ (USTEC)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Setup Type / Bot</label>
                <input 
                  type="text" 
                  placeholder="e.g. Trend Scalp"
                  required
                  value={formData.setup}
                  onChange={(e) => setFormData({ ...formData, setup: e.target.value })}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Net P&L ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  required
                  value={formData.rMultiple || ""}
                  onChange={(e) => setFormData({ ...formData, rMultiple: parseFloat(e.target.value) })}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                Screenshot URL <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input 
                type="url" 
                placeholder="https://www.tradingview.com/x/..."
                value={formData.screenshot || ""}
                onChange={(e) => setFormData({ ...formData, screenshot: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Trade Notes</label>
              <textarea 
                rows={3}
                placeholder="What went right? What went wrong?"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              />
            </div>

          </form>
        </div>

        {/* Action Button */}
        <div className="p-5 border-t border-border bg-muted/30 rounded-b-xl flex justify-end gap-3">
          <button 
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="trade-form"
            className="px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-md transition-colors shadow-sm"
          >
            {existingTrade ? "Update Trade" : "Save Trade"}
          </button>
        </div>

      </div>
    </div>
  )
}