"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function TradingCalendar({ selectedDate, onDateSelect, trades = [], onMonthYearChange }: any) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Dynamic real-time execution aggregate mapper
  const dailyPnLMap = trades.reduce((acc: any, t: any) => {
    const dStr = new Date(t.date).toDateString();
    acc[dStr] = (acc[dStr] || 0) + Number(t.rMultiple);
    return acc;
  }, {});

  // Perfect architectural calendar cell grid calculations block
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
      
      {/* Month Header Selection Panel: Explicitly styled to track dark tile standards */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/[0.04]">
        <h2 className="text-sm font-mono font-black tracking-widest uppercase text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.15)]">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-1.5">
           <button onClick={prevMonth} className="p-2 bg-[#070b12] border border-white/5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"><ChevronLeft size={14} /></button>
           <button onClick={nextMonth} className="p-2 bg-[#070b12] border border-white/5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"><ChevronRight size={14} /></button>
        </div>
      </div>
      
      {/* Structural Data Day Grid */}
      <div className="grid grid-cols-7 gap-1.5 flex-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">{day}</div>
        ))}
        
        {days.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[60px] bg-black/10 border border-white/[0.01] rounded-md opacity-25" />
          
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
                ${isSelected ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : ''}
                ${isToday && !isSelected ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : ''}
                ${isNegative && !isSelected ? 'bg-rose-500/[0.03] border-rose-500/20 hover:border-rose-500/40' : 
                  isPositive && !isSelected ? 'bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/40' : 
                  !isSelected && !isToday ? 'bg-[#090d16]/40 border-white/[0.03] hover:border-white/10' : ''}
              `}
            >
              <span className={`text-[11px] font-mono font-black ${isToday ? 'text-emerald-400 font-extrabold' : 'text-foreground/70 group-hover:text-foreground'}`}>
                {day.getDate()}
              </span>
              {dayPnL !== 0 ? (
                <span className={`text-[10px] font-mono font-black tracking-tight tabular-nums ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isNegative ? '-' : '+'}${Math.abs(dayPnL).toFixed(2)}
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors">—</span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-white/[0.04] text-center">
        <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Click an active date frame cell to reveal intraday historical logs or log entries.</p>
      </div>
    </div>
  )
}