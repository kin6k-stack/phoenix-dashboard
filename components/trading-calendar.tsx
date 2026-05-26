"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Zap, Shield } from "lucide-react"

interface Trade {
  id: string
  ticket: string
  symbol: string
  type: string
  profit: number
  date: string
}

export function TradingCalendar({ trades = [] }: { trades: Trade[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ]

  // Calculate daily P&L mappings
  const getDayData = (day: number) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const dailyTrades = trades.filter((t) => t.date === formattedDate)
    const totalPnl = dailyTrades.reduce((sum, t) => sum + t.profit, 0)
    return { tradesCount: dailyTrades.length, totalPnl }
  }

  return (
    <div className="w-full min-h-screen bg-[#020406] text-slate-200 p-6 font-sans">
      {/* NAVIGATION PANEL BAR */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-widest text-green-400 font-mono">
            {months[month]} {year}
          </h2>
          <div className="flex bg-[#070b12] border border-slate-800 rounded-md overflow-hidden">
            <button onClick={prevMonth} className="p-2 border-r border-slate-800 text-slate-400 hover:text-green-400 hover:bg-[#0c1017] transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-green-400 hover:bg-[#0c1017] transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-green-400 bg-green-500/5 px-2.5 py-1 rounded border border-green-500/10">
            <Shield className="w-3 h-3" /> BALANCED TELEMETRY
          </div>
        </div>
      </div>

      {/* MATRIX CALENDAR FRAMEWORK */}
      <div className="border border-slate-800/40 rounded-xl overflow-hidden bg-[#070b12]/40 backdrop-blur-md shadow-2xl">
        <div className="grid grid-cols-7 bg-[#000001] text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center py-3 border-b border-slate-800/60">
          <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
        </div>

        <div className="grid grid-cols-7 bg-[#06090e]/20">
          {/* Empty prefix padding days */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-28 border-b border-r border-slate-900/40 bg-[#020406]/30" />
          ))}

          {/* Active monthly day tracks */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const { tradesCount, totalPnl } = getDayData(day)
            
            let pnlStyle = "text-slate-500"
            let cellGlow = "hover:bg-[#0d131f]/20"
            if (tradesCount > 0) {
              pnlStyle = totalPnl >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"
              cellGlow = totalPnl >= 0 ? "bg-green-950/10 hover:bg-green-950/20" : "bg-red-950/10 hover:bg-red-950/20"
            }

            return (
              <div key={`day-${day}`} className={`h-28 p-2 border-b border-r border-slate-900/60 flex flex-col justify-between transition-all ${cellGlow}`}>
                <span className="text-[11px] font-bold font-mono text-slate-400">{day}</span>
                {tradesCount > 0 && (
                  <div className="text-right font-mono">
                    <span className="text-[9px] text-slate-500 block">{tradesCount} Trades</span>
                    <span className={`text-xs block mt-0.5 ${pnlStyle}`}>
                      {totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}