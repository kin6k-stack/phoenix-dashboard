"use client"

// FIX: Added viewDate prop — parent can now control which month is displayed.
// When "View in Calendar" fires phoenix:calendar:nav, page.tsx updates
// currentMonthYear, passes it as viewDate, and useEffect syncs the internal
// currentDate so the visual calendar jumps to the correct month instantly.
//
// RESPONSIVE FIX (small screens):
//  - Removed fixed min-w-[640px] that forced sideways scrolling on phones.
//  - Phones show a 7-col grid (Sun–Sat); the 8th "Week" total column is
//    hidden < sm and returns at sm+ (grid switches 7 -> 8 cols).
//  - Cell min-height, padding, and font sizes shrink on phones, grow at sm+.
//  - P&L text drops the "$" on phones to avoid overflow, restores it at sm+.
//  - Desktop / tablet (sm and up) look IDENTICAL to before.

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight, Edit3, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface Trade {
  id: string; date: string; symbol: string; setup: string
  rMultiple: number; direction?: string; notes?: string; screenshot?: string
}

interface TradingCalendarProps {
  selectedDate:      Date | null
  onDateSelect:      (d: Date) => void
  trades:            Trade[]
  tradeDates?:       Date[]
  totalTrades?:      number
  wins?:             number
  netPnL?:           number
  winRate?:          number
  onMonthYearChange?:(v: { month: number; year: number }) => void
  // ── controlled display month (from page.tsx currentMonthYear) ──
  viewDate?:         { month: number; year: number }
}

export function TradingCalendar({
  selectedDate, onDateSelect,
  trades = [],
  totalTrades = 0, wins = 0, netPnL = 0, winRate = 0,
  onMonthYearChange,
  viewDate,
}: TradingCalendarProps) {

  const [currentDate, setCurrentDate] = useState(new Date())

  // ── Sync displayed month when parent pushes a new viewDate ──
  useEffect(() => {
    if (!viewDate) return
    setCurrentDate(prev => {
      if (
        prev.getMonth()     === viewDate.month &&
        prev.getFullYear()  === viewDate.year
      ) return prev  // already showing — no-op to avoid re-render loop
      return new Date(viewDate.year, viewDate.month, 1)
    })
  }, [viewDate?.year, viewDate?.month])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Daily aggregates ──
  const dailyMap = useMemo(() => {
    const m: Record<string, { pnl: number; count: number }> = {}
    for (const t of trades) {
      const k = new Date(t.date).toDateString()
      if (!m[k]) m[k] = { pnl: 0, count: 0 }
      m[k].pnl   += Number(t.rMultiple)
      m[k].count += 1
    }
    return m
  }, [trades])

  // ── Calendar grid ──
  const days = useMemo(() => {
    const year  = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth    = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth= new Date(year, month, 1).getDay()
    const arr: (Date | null)[] = []
    for (let i = 0; i < firstDayOfMonth; i++) arr.push(null)
    for (let i = 1; i <= daysInMonth; i++)     arr.push(new Date(year, month, i))
    while (arr.length < 42) arr.push(null)
    return arr
  }, [currentDate])

  const weekTotals = useMemo(() => {
    return Array.from({ length: 6 }).map((_, row) => {
      let sum = 0, count = 0
      for (let i = 0; i < 7; i++) {
        const day = days[row * 7 + i]
        if (day) {
          const d = dailyMap[day.toDateString()]
          if (d) { sum += d.pnl; count += d.count }
        }
      }
      return { sum, count }
    })
  }, [days, dailyMap])

  const nextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    setCurrentDate(next)
    onMonthYearChange?.({ month: next.getMonth(), year: next.getFullYear() })
  }
  const prevMonth = () => {
    const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    setCurrentDate(prev)
    onMonthYearChange?.({ month: prev.getMonth(), year: prev.getFullYear() })
  }

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"]
  const todayStr   = new Date().toDateString()
  const safeWinRate= Number.isFinite(winRate) ? winRate : 0
  const netPnlIsPos= netPnL >= 0

  return (
    <div className="rounded-lg border border-border/40 bg-card/90 overflow-hidden shadow-2xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-foreground min-w-[120px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={nextMonth}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5">
          {[
            { label:"Trades", value: String(totalTrades),                           cls:"text-foreground"                             },
            { label:"Wins",   value: String(wins),                                   cls:"text-foreground"                             },
            { label:"P&L",    value: `${netPnlIsPos?"+":"-"}$${Math.abs(netPnL).toFixed(2)}`, cls:netPnlIsPos?"text-emerald-400":"text-rose-400" },
            { label:"Win %",  value: `${safeWinRate}%`,                              cls:"text-foreground"                             },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`text-sm font-bold tabular-nums mt-0.5 ${s.cls}`}>{s.value}</p>
            </div>
          ))}
          <span className="hidden lg:flex text-[10px] text-muted-foreground/70 items-center gap-1 italic ml-1">
            <Edit3 size={11} /> click date to journal
          </span>
        </div>
      </div>

      {/* Grid
          - No fixed min-width: fits phone screens, no sideways scroll.
          - 7 cols on phones (Week col hidden), 8 cols at sm+ (Week col shown). */}
      <div className="w-full">
        <div className="w-full">
          {/* Day header */}
          <div className="grid grid-cols-7 sm:grid-cols-8 border-b border-border/40">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat","Week"].map((d, i) => (
              <div key={d}
                className={`px-1 sm:px-2 py-2 sm:py-2.5 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider
                  ${i === 7 ? "text-muted-foreground/60 hidden sm:block" : "text-muted-foreground"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: 6 }).map((_, row) => {
            const wt = weekTotals[row]
            return (
              <div key={row} className="grid grid-cols-7 sm:grid-cols-8 border-b border-border/30 last:border-b-0">
                {days.slice(row * 7, row * 7 + 7).map((day, idx) => {
                  if (!day) return <div key={`${row}-${idx}`} className="border-r border-border/20 bg-background/10 min-h-[56px] sm:min-h-[80px]" />
                  const dayStr   = day.toDateString()
                  const dayData  = dailyMap[dayStr]
                  const dayPnL   = dayData?.pnl   ?? 0
                  const dayCount = dayData?.count  ?? 0
                  const isNeg    = dayPnL < 0
                  const isPos    = dayPnL > 0
                  const isSelected = selectedDate?.toDateString() === dayStr
                  const isToday    = dayStr === todayStr
                  return (
                    <button key={`${row}-${idx}`} onClick={() => onDateSelect(day)}
                      className={`border-r border-border/20 p-1 sm:p-2 flex flex-col min-h-[56px] sm:min-h-[80px] cursor-pointer hover:bg-white/[0.04] transition-all text-left
                        ${isSelected ? "ring-2 ring-inset ring-emerald-500/60 bg-emerald-500/[0.08]" : ""}
                        ${isToday && !isSelected ? "ring-1 ring-inset ring-emerald-500/30 bg-emerald-500/[0.03]" : ""}
                        ${isNeg && !isSelected ? "bg-rose-500/[0.06]" : ""}
                        ${isPos && !isSelected ? "bg-emerald-500/[0.06]" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] sm:text-[11px] font-semibold leading-none ${isToday ? "text-emerald-400" : "text-foreground"}`}>
                          {day.getDate()}
                        </span>
                        {dayPnL !== 0 && (isPos
                          ? <ArrowUpRight   size={10} className="text-emerald-400/70"/>
                          : <ArrowDownRight size={10} className="text-rose-400/70"/>
                        )}
                      </div>
                      {dayPnL !== 0 && (
                        <span className={`text-[10px] sm:text-[12px] font-bold tabular-nums mt-auto leading-tight ${isNeg ? "text-rose-400" : "text-emerald-400"}`}>
                          {/* "$" hidden on phones to save width, shown at sm+ */}
                          {isNeg ? "-" : "+"}<span className="hidden sm:inline">$</span>{Math.abs(dayPnL).toFixed(2)}
                        </span>
                      )}
                      {dayCount > 0 && (
                        <span className="text-[8px] sm:text-[9px] text-muted-foreground/80 font-mono tabular-nums">
                          {dayCount}T
                        </span>
                      )}
                    </button>
                  )
                })}
                {/* Week total — hidden on phones, shown at sm+ */}
                <div className="hidden sm:flex p-2 flex-col justify-center items-center bg-background/[0.03]">
                  {wt.sum !== 0 ? (
                    <>
                      <span className={`text-[12px] font-bold tabular-nums ${wt.sum < 0 ? "text-rose-400/80" : "text-emerald-400/80"}`}>
                        {wt.sum < 0 ? "-" : "+"}${Math.abs(wt.sum).toFixed(2)}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60 mt-0.5">week</span>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/30">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
