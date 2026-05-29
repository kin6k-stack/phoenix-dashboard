"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Edit3 } from "lucide-react"

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

  // ── Daily P&L aggregate map (recompute when trades change) ──────────────
  const dailyPnLMap = useMemo(() => {
    return trades.reduce<Record<string, number>>((acc, t) => {
      const k = new Date(t.date).toDateString()
      acc[k] = (acc[k] || 0) + Number(t.rMultiple)
      return acc
    }, {})
  }, [trades])

  // ── Build calendar grid (always 6 rows of 7) ─────────────────────────────
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const days: (Date | null)[] = []
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    while (days.length < 42) days.push(null)
    return days
  }

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

  const days = getDaysInMonth(currentDate)
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"]
  const todayStr = new Date().toDateString()

  // ── Week aggregation — sum each row of 7 ─────────────────────────────────
  const weekTotals = useMemo(() => {
    const totals: number[] = []
    for (let row = 0; row < 6; row++) {
      const weekDays = days.slice(row * 7, row * 7 + 7)
      const sum = weekDays.reduce<number>((s, day) => {
        if (!day) return s
        return s + (dailyPnLMap[day.toDateString()] || 0)
      }, 0)
      totals.push(sum)
    }
    return totals
  }, [days, dailyPnLMap])

  const safeWinRate   = Number.isFinite(winRate) ? winRate : 0
  const netPnlIsPos   = netPnL >= 0

  return (
    <div className="w-full flex flex-col h-full bg-transparent">

      {/* ── Month nav + stats strip ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 bg-background/50 border border-border/50 rounded hover:bg-white/10 transition-colors text-foreground cursor-pointer"
            aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-lg font-black tracking-widest uppercase text-foreground px-1 min-w-[160px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 bg-background/50 border border-border/50 rounded hover:bg-white/10 transition-colors text-foreground cursor-pointer"
            aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-4 sm:gap-6">
          {[
            { label: "Trades", value: totalTrades, color: "text-foreground" },
            { label: "Wins",   value: wins,        color: "text-foreground" },
            { label: "P&L",    value: `${netPnlIsPos ? "" : "-"}$${Math.abs(netPnL).toFixed(2)}`, color: netPnlIsPos ? "text-emerald-400" : "text-rose-400" },
            { label: "Win %",  value: `${safeWinRate}%`, color: "text-foreground" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className={`text-sm font-black tabular-nums mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground/70 italic">
            <Edit3 size={11} />
            <span>click date to journal</span>
          </div>
        </div>
      </div>

      {/* ── Day-of-week header (with WEEK column on the right) ──────────── */}
      <div className="grid grid-cols-8 gap-2 mb-2">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {d}
          </div>
        ))}
        <div className="text-center text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
          Week
        </div>
      </div>

      {/* ── Calendar grid (7 day cells + 1 week-total cell per row) ─────── */}
      <div className="grid grid-cols-8 gap-2 flex-1 auto-rows-fr">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="contents">
            {days.slice(row * 7, row * 7 + 7).map((day, idx) => {
              if (!day) return <div key={`${row}-${idx}`} className="min-h-[60px]" />

              const dayStr     = day.toDateString()
              const dayPnL     = dailyPnLMap[dayStr] || 0
              const isNegative = dayPnL < 0
              const isPositive = dayPnL > 0
              const isSelected = selectedDate?.toDateString() === dayStr
              const isToday    = dayStr === todayStr

              return (
                <button
                  key={`${row}-${idx}`}
                  onClick={() => onDateSelect(day)}
                  className={`p-2 border rounded-md flex flex-col items-start justify-between min-h-[60px] transition-all hover:border-foreground/50 cursor-pointer
                    ${isSelected ? "ring-2 ring-primary border-primary bg-primary/10" : ""}
                    ${isToday && !isSelected ? "ring-1 ring-emerald-500/50 border-emerald-500/30 bg-emerald-500/[0.05]" : ""}
                    ${isNegative && !isSelected ? "bg-rose-500/10 border-rose-500/30"
                      : isPositive && !isSelected ? "bg-emerald-500/10 border-emerald-500/30"
                      : !isSelected && !isToday ? "bg-background/40 border-border/40" : ""}
                  `}>
                  <span className={`text-xs font-bold ${isToday ? "text-emerald-400 font-black" : "text-foreground"}`}>
                    {day.getDate()}
                  </span>
                  {dayPnL !== 0 && (
                    <span className={`text-[10px] font-mono font-black tracking-tighter tabular-nums ${isNegative ? "text-rose-400" : "text-emerald-400"}`}>
                      {isNegative ? "-" : "+"}${Math.abs(dayPnL).toFixed(2)}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Week total cell */}
            <div className="min-h-[60px] flex flex-col items-center justify-center rounded-md border border-border/20 bg-background/20">
              {weekTotals[row] !== 0 ? (
                <span className={`text-[10px] font-mono font-black tabular-nums ${weekTotals[row] < 0 ? "text-rose-400/70" : "text-emerald-400/70"}`}>
                  {weekTotals[row] < 0 ? "-" : "+"}${Math.abs(weekTotals[row]).toFixed(0)}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground/40">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
