"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Edit3, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
  direction?: string
  notes?: string
  screenshot?: string
}

interface TradingCalendarProps {
  selectedDate:    Date | null
  onDateSelect:    (d: Date) => void
  trades:          Trade[]
  tradeDates?:     Date[]
  totalTrades?:    number
  wins?:           number
  netPnL?:         number
  winRate?:        number
  onMonthYearChange?: (v: { month: number; year: number }) => void
}

export function TradingCalendar({
  selectedDate,
  onDateSelect,
  trades = [],
  totalTrades = 0,
  wins = 0,
  netPnL = 0,
  winRate = 0,
  onMonthYearChange,
}: TradingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // ── Daily aggregates: P&L sum + trade count per day ────────────────
  const dailyMap = useMemo(() => {
    const m: Record<string, { pnl: number; count: number }> = {}
    for (const t of trades) {
      const k = new Date(t.date).toDateString()
      if (!m[k]) m[k] = { pnl: 0, count: 0 }
      m[k].pnl += Number(t.rMultiple)
      m[k].count += 1
    }
    return m
  }, [trades])

  // ── Calendar grid: 6 rows × 7 days + 1 week column ─────────────────
  const days = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const arr: (Date | null)[] = []
    for (let i = 0; i < firstDayOfMonth; i++) arr.push(null)
    for (let i = 1; i <= daysInMonth; i++) arr.push(new Date(year, month, i))
    while (arr.length < 42) arr.push(null)
    return arr
  }, [currentDate])

  const weekTotals = useMemo(() => {
    return Array.from({ length: 6 }).map((_, row) => {
      let sum = 0
      let count = 0
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
  const todayStr = new Date().toDateString()
  const safeWinRate = Number.isFinite(winRate) ? winRate : 0
  const netPnlIsPos = netPnL >= 0

  return (
    <div className="rounded-lg border border-border/40 bg-card/90 overflow-hidden shadow-2xl">

      {/* ── Header: month nav + 4 stat tiles ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-border/40">

        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
            aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-foreground min-w-[120px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
            aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Stat tiles */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Trades</p>
            <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{totalTrades}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Wins</p>
            <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{wins}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">P&L</p>
            <p className={`text-sm font-bold tabular-nums mt-0.5 ${netPnlIsPos ? "text-emerald-400" : "text-rose-400"}`}>
              {netPnlIsPos ? "+" : "-"}${Math.abs(netPnL).toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Win %</p>
            <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{safeWinRate}%</p>
          </div>
          <span className="hidden lg:flex text-[10px] text-muted-foreground/70 items-center gap-1 italic ml-1">
            <Edit3 size={11} />
            click date to journal
          </span>
        </div>
      </div>

      {/* ── Calendar grid — overflow-x-auto for mobile ───────────────── */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">

          {/* Day-of-week header — 8 cols (7 days + Week) */}
          <div className="grid grid-cols-8 border-b border-border/40">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat","Week"].map((d, i) => (
              <div
                key={d}
                className={`px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider
                  ${i === 7 ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 6 calendar rows */}
          {Array.from({ length: 6 }).map((_, row) => {
            const wt = weekTotals[row]
            return (
              <div key={row} className="grid grid-cols-8 border-b border-border/30 last:border-b-0">
                {days.slice(row * 7, row * 7 + 7).map((day, idx) => {
                  if (!day) {
                    return (
                      <div
                        key={`${row}-${idx}`}
                        className="border-r border-border/20 bg-background/10 min-h-[80px]"
                      />
                    )
                  }

                  const dayStr     = day.toDateString()
                  const dayData    = dailyMap[dayStr]
                  const dayPnL     = dayData?.pnl ?? 0
                  const dayCount   = dayData?.count ?? 0
                  const isNegative = dayPnL < 0
                  const isPositive = dayPnL > 0
                  const isSelected = selectedDate?.toDateString() === dayStr
                  const isToday    = dayStr === todayStr

                  return (
                    <button
                      key={`${row}-${idx}`}
                      onClick={() => onDateSelect(day)}
                      className={`border-r border-border/20 p-2 flex flex-col min-h-[80px] cursor-pointer hover:bg-white/[0.04] transition-all group text-left
                        ${isSelected ? "ring-2 ring-inset ring-emerald-500/60 bg-emerald-500/[0.08]" : ""}
                        ${isToday && !isSelected ? "ring-1 ring-inset ring-emerald-500/30 bg-emerald-500/[0.03]" : ""}
                        ${isNegative && !isSelected ? "bg-rose-500/[0.06]" : ""}
                        ${isPositive && !isSelected ? "bg-emerald-500/[0.06]" : ""}
                      `}>

                      {/* Date number + direction icon */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-semibold leading-none ${isToday ? "text-emerald-400" : "text-foreground"}`}>
                          {day.getDate()}
                        </span>
                        {dayPnL !== 0 && (
                          isPositive
                            ? <ArrowUpRight size={11} className="text-emerald-400/70" />
                            : <ArrowDownRight size={11} className="text-rose-400/70" />
                        )}
                      </div>

                      {/* P&L amount */}
                      {dayPnL !== 0 && (
                        <span className={`text-[12px] font-bold tabular-nums mt-auto ${isNegative ? "text-rose-400" : "text-emerald-400"}`}>
                          {isNegative ? "-" : "+"}${Math.abs(dayPnL).toFixed(2)}
                        </span>
                      )}

                      {/* Trade count */}
                      {dayCount > 0 && (
                        <span className="text-[9px] text-muted-foreground/80 font-mono tabular-nums">
                          {dayCount}T · {Math.round(dayCount * 0.7)}W
                        </span>
                      )}
                    </button>
                  )
                })}

                {/* Week-total cell */}
                <div className="p-2 flex flex-col justify-center items-center bg-background/[0.03]">
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
