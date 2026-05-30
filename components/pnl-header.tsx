"use client"

import { useState, useEffect, useRef } from "react"
import { Activity, BarChart3, RefreshCw, DollarSign, Plus, ChevronDown, Check } from "lucide-react"

interface PnLHeaderProps {
  totalTrades?:   number
  onLogTrade:     () => void
  onSync?:        () => void
  syncing?:       boolean
  view:           "calendar" | "analytics"
  onViewChange:   (v: "calendar" | "analytics") => void
}

const EXCHANGE_OPTIONS = [
  "All Exchanges",
  "MT5 — Phoenix Account",
  "MT5 — Sentinel Account",
  "Manual",
]

export function PnLHeader({
  totalTrades = 0,
  onLogTrade,
  onSync,
  syncing = false,
  view,
  onViewChange,
}: PnLHeaderProps) {
  const [exchange, setExchange] = useState("All Exchanges")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hasTrades = totalTrades > 0

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [dropdownOpen])

  return (
    <div className="space-y-3 mb-4">

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">

        <div className="flex-shrink-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-black text-foreground uppercase tracking-widest">PnL Calendar</h1>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
            Track performance across all your exchanges
          </p>
        </div>

        {/* ── Calendar / Analytics toggle — wired to parent ──────────── */}
        <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5 w-fit">
          {([
            { id: "calendar",  label: "Calendar",  icon: Activity },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
          ] as const).map(t => {
            const Icon = t.icon
            const isActive = view === t.id
            return (
              <button
                key={t.id}
                onClick={() => onViewChange(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all min-h-[36px]
                  ${isActive ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="lg:ml-auto flex flex-wrap items-center gap-2">

          {/* Custom dropdown (dark themed, readable) */}
          <div ref={dropdownRef} className="relative flex-1 sm:flex-none min-w-[140px] sm:min-w-[180px]">
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="w-full flex items-center justify-between gap-2 bg-background/50 border border-border/40 rounded-lg px-3 py-2 text-[11px] sm:text-xs font-bold text-foreground hover:bg-white/[0.03] transition-colors min-h-[36px]"
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}>
              <span className="truncate">{exchange}</span>
              <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div
                role="listbox"
                className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-2xl overflow-hidden z-50"
                style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
                {EXCHANGE_OPTIONS.map(opt => {
                  const isSelected = opt === exchange
                  return (
                    <button
                      key={opt}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => { setExchange(opt); setDropdownOpen(false) }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-bold transition-colors min-h-[40px]
                        ${isSelected
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "text-foreground hover:bg-white/[0.04]"}`}>
                      <span className="truncate">{opt}</span>
                      {isSelected && <Check size={13} className="flex-shrink-0 text-emerald-400" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {onSync && (
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] sm:text-xs font-bold bg-background/50 border border-border/40 text-foreground hover:bg-white/[0.03] transition-colors disabled:opacity-50 min-h-[36px]"
              aria-label="Sync">
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{syncing ? "Syncing…" : "Sync"}</span>
            </button>
          )}

          <button
            onClick={onLogTrade}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] sm:text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors min-h-[36px]">
            <DollarSign size={13} />
            <span>Log Trade</span>
          </button>
        </div>
      </div>

      {/* Empty-state banner only shows on calendar view */}
      {!hasTrades && view === "calendar" && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-foreground">Calendar is empty</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Log trades manually or connect a bot to populate the calendar.
              </p>
            </div>
          </div>
          <button
            onClick={onLogTrade}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors min-h-[36px] w-full sm:w-auto">
            <Plus size={13} />
            Log Trade
          </button>
        </div>
      )}
    </div>
  )
}
