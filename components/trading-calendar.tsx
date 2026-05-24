"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function TradingCalendar({ selectedDate, onDateSelect, trades = [], onMonthYearChange }: any) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Map out daily trade aggregation numbers securely
  const dailyPnLMap = trades.reduce((acc: any, t: any) => {
    const dStr = new Date(t.date).toDateString();
    acc[dStr] = (acc[dStr] || 0) + Number(t.rMultiple);
    return acc;
  }, {});

  // Generate perfect structural 42-cell grid math to align layouts
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    
    const days = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    while (days.length < 42) {
      days.push(null)
    }
    return days
  }

  const nextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    setCurrentDate(next)
    if (onMonthYearChange) onMonthYearChange({ month: next.getMonth(), year: next.getFullYear() })
  }

  const prevMonth = () => {
    const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    setCurrentDate(prev)
    if (onMonthYearChange) onMonthYearChange({ month: prev.getMonth(), year: prev.getFullYear() })
  }

  const days = getDaysInMonth(currentDate)
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const todayStr = new Date().toDateString();

  return (
    <div className="w-full flex flex-col h-full bg-transparent">
      
      {/* Month Selection Control Strip */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-black tracking-widest uppercase text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-1.5">
           <button onClick={prevMonth} className="p-2 bg-black/50 border border-white/5 rounded-md hover:bg-white/5 hover:text-foreground transition-all cursor-pointer"><ChevronLeft size={14} /></button>
           <button onClick={nextMonth} className="p-2 bg-black/50 border border-white/5 rounded-md hover:bg-white/5 hover:text-foreground transition-all cursor-pointer"><ChevronRight size={14} /></button>
        </div>
      </div>
      
      {/* Institutional Day Grid System */}
      <div className="grid grid-cols-7 gap-1.5 flex-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{day}</div>
        ))}
        
        {days.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[65px] bg-black/10 border border-white/[0.02] rounded-md opacity-20" />
          
          const dayStr = day.toDateString();
          const dayPnL = dailyPnLMap[dayStr] || 0;
          const isNegative = dayPnL < 0;
          const isPositive = dayPnL > 0;
          const isSelected = selectedDate?.toDateString() === dayStr;
          const isToday = dayStr === todayStr;
          
          return (
            <button 
              key={i}
              onClick={() => onDateSelect(day)}
              className={`p-2 rounded-md flex flex-col items-start justify-between min-h-[65px] transition-all relative overflow-hidden group border cursor-pointer
                ${isSelected ? 'ring-1 ring-primary border-primary bg-primary/5' : ''}
                ${isToday && !isSelected ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : ''}
                ${isNegative && !isSelected ? 'bg-rose-500/[0.04] border-rose-500/20 hover:border-rose-500/40' : 
                  isPositive && !isSelected ? 'bg-emerald-500/[0.04] border-emerald-500/20 hover:border-emerald-500/40' : 
                  !isSelected && !isToday ? 'bg-black/40 border-white/[0.03] hover:border-white/10' : ''}
              `}
            >
              {/* Day Numeric Label */}
              <span className={`text-[11px] font-black font-mono ${isToday ? 'text-emerald-400 font-extrabold' : 'text-foreground/80 group-hover:text-foreground'}`}>
                {day.getDate()}
              </span>

              {/* Dynamic Trade Allocation Outcome Metrics */}
              {dayPnL !== 0 ? (
                <span className={`text-[10px] font-mono font-black tracking-tight tabular-nums ${isNegative ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.2)]' : 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.2)]'}`}>
                  {isNegative ? '-' : '+'}${Math.abs(dayPnL).toFixed(2)}
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors">—</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}