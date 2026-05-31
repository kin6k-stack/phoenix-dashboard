"use client"

import { useState, useMemo, useEffect } from "react"
import { TrendingUp, X, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon } from "lucide-react"

interface Trade {
  id:        string
  date:      string
  rMultiple: number
  symbol?:   string
  setup?:    string
  direction?: string
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"]

export function YearlyPerformanceTable({ trades = [] }: { trades: Trade[] }) {
  const currentYear = new Date().getFullYear()
  const [activeYear, setActiveYear] = useState(currentYear)

  // Pass F: month-detail modal state
  const [modalYear,  setModalYear]  = useState<number | null>(null)
  const [modalMonth, setModalMonth] = useState<number | null>(null)

  const matrix = useMemo(() => {
    const m: Record<number, number[]> = {}
    for (const t of trades) {
      const d = new Date(t.date)
      const yr = d.getFullYear()
      const mo = d.getMonth()
      if (!m[yr]) m[yr] = Array(12).fill(0)
      m[yr][mo] += Number(t.rMultiple)
    }
    return m
  }, [trades])

  // Pass L: Single row showing whichever year is active. Tabs at top
  // are the year selector. Frees up vertical space — empty future-year
  // rows were just visual clutter.
  const yearsToShow = [activeYear]
  const yearTabs    = [currentYear, currentYear + 1, currentYear + 2]

  const fmt = (n: number) => {
    if (n === 0) return "—"
    const sign = n < 0 ? "-" : "+"
    const abs = Math.abs(n)
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
    return `${sign}$${abs.toFixed(0)}`
  }

  const ytdFor = (year: number) =>
    (matrix[year] ?? []).reduce((s, v) => s + v, 0)

  // Pass F: month click handler — only opens if trades exist that month
  const handleMonthClick = (year: number, monthIdx: number, value: number) => {
    if (value === 0) return  // Q2 decision: no-trades-no-click
    setModalYear(year)
    setModalMonth(monthIdx)
  }

  // ESC closes modal
  useEffect(() => {
    if (modalYear === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal() }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [modalYear])

  const closeModal = () => { setModalYear(null); setModalMonth(null) }

  // ── Compute the modal's month-detail data ────────────────────────
  const monthDetail = useMemo(() => {
    if (modalYear === null || modalMonth === null) return null
    const monthTrades = trades
      .filter(t => {
        const d = new Date(t.date)
        return d.getFullYear() === modalYear && d.getMonth() === modalMonth
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const totalPnL = monthTrades.reduce((s, t) => s + Number(t.rMultiple || 0), 0)
    const wins     = monthTrades.filter(t => Number(t.rMultiple) > 0).length
    const losses   = monthTrades.filter(t => Number(t.rMultiple) < 0).length
    const winRate  = monthTrades.length > 0 ? Math.round((wins / monthTrades.length) * 100) : 0

    // Best & worst single days within the month
    const byDay: Record<string, number> = {}
    for (const t of monthTrades) {
      const dayKey = new Date(t.date).toDateString()
      byDay[dayKey] = (byDay[dayKey] || 0) + Number(t.rMultiple || 0)
    }
    const dayEntries = Object.entries(byDay)
    const bestDay  = dayEntries.length ? dayEntries.reduce((a, b) => a[1] > b[1] ? a : b) : null
    const worstDay = dayEntries.length ? dayEntries.reduce((a, b) => a[1] < b[1] ? a : b) : null

    return {
      monthTrades, totalPnL, wins, losses, winRate,
      bestDay, worstDay,
    }
  }, [modalYear, modalMonth, trades])

  // ── "View in calendar" — fires a custom event the PnL view can listen to ──
  const handleNavigateToMonth = () => {
    if (modalYear === null || modalMonth === null) return
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("phoenix:calendar:nav", {
        detail: { year: modalYear, month: modalMonth },
      }))
    }
    closeModal()
  }

  return (
    <>
      <div className="bg-card/60 border border-border/40 rounded-xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 py-3 border-b border-border/30 bg-background/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Yearly Performance</h3>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
            {yearTabs.map(y => (
              <button
                key={y}
                onClick={() => setActiveYear(y)}
                className={`px-2.5 py-1.5 rounded text-[11px] font-bold transition-all min-h-[32px] flex-shrink-0
                  ${activeYear === y
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}>
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-border/20 text-[9px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 sm:px-4 py-2.5 font-bold w-16 sticky left-0 bg-card/60 backdrop-blur-sm">Year</th>
                {MONTHS_SHORT.map(m => (
                  <th key={m} className="px-2 py-2.5 font-bold text-center">{m}</th>
                ))}
                <th className="px-3 py-2.5 font-bold text-center">YTD</th>
              </tr>
            </thead>
            <tbody>
              {yearsToShow.map(yr => {
                const row = matrix[yr] ?? Array(12).fill(0)
                const ytd = ytdFor(yr)
                return (
                  <tr key={yr} className="border-b border-border/10 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 sm:px-4 py-3 font-black text-sm text-foreground sticky left-0 bg-card/60 backdrop-blur-sm">{yr}</td>
                    {row.map((val, i) => {
                      const isCurrent = yr === currentYear && i === new Date().getMonth()
                      const hasTrades = val !== 0
                      return (
                        <td key={i} className="px-2 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleMonthClick(yr, i, val)}
                            disabled={!hasTrades}
                            aria-label={hasTrades ? `View ${MONTHS_FULL[i]} ${yr} trades` : `No trades in ${MONTHS_FULL[i]} ${yr}`}
                            className={`text-[11px] font-mono font-bold tabular-nums w-full px-1 py-1 rounded transition-all
                              ${val > 0 ? "text-emerald-400" : val < 0 ? "text-rose-400" : "text-muted-foreground/40"}
                              ${hasTrades ? "cursor-pointer hover:bg-white/[0.05] hover:scale-105" : "cursor-default"}
                              ${isCurrent ? "bg-emerald-500/[0.06]" : ""}`}>
                            {fmt(val)}
                          </button>
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-center">
                      <div className={`text-[11px] font-mono font-black tabular-nums
                        ${ytd > 0 ? "text-emerald-400" : ytd < 0 ? "text-rose-400" : "text-muted-foreground/40"}`}>
                        {fmt(ytd)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden px-3 py-1.5 border-t border-border/20 text-center">
          <p className="text-[9px] text-muted-foreground/60 italic">← swipe to view all months · tap month for detail →</p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          Month-detail modal
          Opened by clicking a month with non-zero P&L. Shows stats
          + scrollable trade list + "View in Calendar" navigation.
          ════════════════════════════════════════════════════════════ */}
      {modalYear !== null && modalMonth !== null && monthDetail && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeModal}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in"
            aria-hidden="true"
          />

          {/* Centered modal */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${MONTHS_FULL[modalMonth]} ${modalYear} trade detail`}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                       w-[95vw] sm:w-[560px] max-h-[90vh] flex flex-col
                       bg-card border border-border rounded-xl shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/40">
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="h-4 w-4 text-emerald-400" />
                <div className="flex flex-col leading-tight">
                  <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
                    {MONTHS_FULL[modalMonth]} {modalYear}
                  </h2>
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                    {monthDetail.monthTrades.length} trade{monthDetail.monthTrades.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
                aria-label="Close detail">
                <X size={16} />
              </button>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-border/50 bg-background/20">
              <Stat
                label="Total P&L"
                value={`${monthDetail.totalPnL >= 0 ? "+" : ""}$${monthDetail.totalPnL.toFixed(2)}`}
                colorClass={monthDetail.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}
              />
              <Stat label="Win Rate" value={`${monthDetail.winRate}%`} colorClass="text-blue-400" />
              <Stat label="Wins"     value={String(monthDetail.wins)}   colorClass="text-emerald-400" />
              <Stat label="Losses"   value={String(monthDetail.losses)} colorClass="text-rose-400" />
            </div>

            {/* Best/Worst day row */}
            {(monthDetail.bestDay || monthDetail.worstDay) && (
              <div className="grid grid-cols-2 gap-3 px-4 py-2.5 border-b border-border/50 text-[10px] font-bold tracking-widest">
                {monthDetail.bestDay && (
                  <div className="flex items-center justify-between rounded bg-emerald-500/[0.05] border border-emerald-500/20 px-2.5 py-1.5">
                    <span className="uppercase text-muted-foreground">Best Day</span>
                    <span className="text-emerald-400 font-mono">
                      +${monthDetail.bestDay[1].toFixed(2)}
                    </span>
                  </div>
                )}
                {monthDetail.worstDay && (
                  <div className="flex items-center justify-between rounded bg-rose-500/[0.05] border border-rose-500/20 px-2.5 py-1.5">
                    <span className="uppercase text-muted-foreground">Worst Day</span>
                    <span className="text-rose-400 font-mono">
                      ${monthDetail.worstDay[1].toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Trade list — scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-1.5">
              {monthDetail.monthTrades.map((t, i) => {
                const isBuy   = (t.direction || "BUY").toUpperCase() === "BUY"
                const isWin   = Number(t.rMultiple) >= 0
                const dateStr = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-background/40 border border-border/30 hover:border-border/60 transition-colors">
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isBuy
                          ? <ArrowUpRight   size={12} className="text-emerald-400 flex-shrink-0" />
                          : <ArrowDownRight size={12} className="text-rose-400 flex-shrink-0" />}
                        <span className="text-[11px] font-black uppercase tracking-widest text-foreground truncate">{t.symbol ?? "—"}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">· {dateStr}</span>
                      </div>
                      {t.setup && (
                        <span className="text-[9px] text-muted-foreground uppercase font-bold truncate mt-0.5 ml-4">{t.setup}</span>
                      )}
                    </div>
                    <span className={`text-sm font-black font-mono tabular-nums whitespace-nowrap ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                      {isWin ? "+" : ""}${Number(t.rMultiple).toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-background/40 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <p className="text-[9px] text-muted-foreground italic font-mono">
                Click "View in Calendar" to navigate to {MONTHS_SHORT[modalMonth]} {modalYear}.
              </p>
              <button
                onClick={handleNavigateToMonth}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest
                           bg-emerald-500/10 border border-emerald-500/30 text-emerald-400
                           hover:bg-emerald-500/20 transition-colors min-h-[36px]">
                <CalendarIcon size={12} />
                View in Calendar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Small stat tile used in the modal stat row ───────────────────
function Stat({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-[8.5px] uppercase tracking-widest text-muted-foreground font-bold">{label}</span>
      <span className={`text-sm font-black font-mono tabular-nums ${colorClass}`}>{value}</span>
    </div>
  )
}
