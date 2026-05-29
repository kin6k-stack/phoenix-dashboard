"use client"

import { useState } from "react"
import { Activity, BarChart3, RefreshCw, DollarSign, Plus } from "lucide-react"

interface PnLHeaderProps {
  totalTrades?:   number
  onLogTrade:     () => void
  onSync?:        () => void
  syncing?:       boolean
  view?:          "calendar" | "analytics"
  onViewChange?:  (v: "calendar" | "analytics") => void
}

export function PnLHeader({
  totalTrades = 0,
  onLogTrade,
  onSync,
  syncing = false,
  view = "calendar",
  onViewChange,
}: PnLHeaderProps) {
  const [exchange, setExchange] = useState("All Exchanges")
  const hasTrades = totalTrades > 0

  return (
    <div className="space-y-3 mb-4">

      {/* ── Top row: title + view tabs + actions ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Title block */}
        <div className="flex-shrink-0">
          <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-widest">PnL Calendar</h1>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
            Track performance across all your exchanges
          </p>
        </div>

        {/* Calendar / Analytics segmented control */}
        {onViewChange && (
          <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5">
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all
                    ${isActive ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon size={13} />
                  {t.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Right-side actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Exchange selector */}
          <select
            value={exchange}
            onChange={e => setExchange(e.target.value)}
            className="bg-background/50 border border-border/40 rounded-lg px-3 py-1.5 text-xs font-bold text-foreground hover:bg-white/[0.03] transition-colors cursor-pointer outline-none"
          >
            <option>All Exchanges</option>
            <option>MT5 — Phoenix Account</option>
            <option>MT5 — Sentinel Account</option>
            <option>Manual</option>
          </select>

          {/* Sync */}
          {onSync && (
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-background/50 border border-border/40 text-foreground hover:bg-white/[0.03] transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync"}
            </button>
          )}

          {/* Log trade — primary CTA */}
          <button
            onClick={onLogTrade}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            <DollarSign size={13} />
            Log Trade
          </button>
        </div>
      </div>

      {/* ── Empty-state banner (only when no trades) ────────────────────── */}
      {!hasTrades && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            <Plus size={13} />
            Log Trade
          </button>
        </div>
      )}
    </div>
  )
}
