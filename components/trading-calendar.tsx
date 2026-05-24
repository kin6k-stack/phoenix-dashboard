"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function TradingCalendar({ selectedDate, onDateSelect, trades = [], onMonthYearChange }: any) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Map out daily trade aggregation figures cleanly
  const dailyPnLMap = trades.reduce((acc: any, t: any) => {
    const dStr = new Date(t.date).toDateString();
    acc[dStr] = (acc[dStr] || 0) + Number(t.rMultiple);
    return acc;
  }, {});

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
    <div className="w-full flex flex-col h-full bg-[#070b12] p-1 rounded-xl">
      
      {/* Visual Update: Re-styled header wrapper using pure institutional flat dark backdrops */}
      <div className="flex justify-between items-center mb-6 p-4 rounded-lg bg-[#03050a] border border-white/[0.03]">
        <h2 className="text-sm font-mono font-black tracking-widest uppercase text-foreground">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
           <button onClick={prevMonth} className="p-2 bg-[#070b12] border border-white/5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"><ChevronLeft size={14} /></button>
           <button onClick={nextMonth} className="p-2 bg-[#070b12] border border-white/5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"><ChevronRight size={14} /></button>
        </div>
      </div>
      
      {/* Main Structural Day Matrix Grid */}
      <div className="grid grid-cols-7 gap-2 flex-1 p-2 rounded-xl bg-[#03050a] border border-white/[0.02]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-2">{day}</div>
        ))}
        
        {days.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[60px] bg-black/10 border border-white/[0.01] rounded-md opacity-10" />
          
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
              className={`p-2 border rounded-md flex flex-col items-start justify-between min-h-[60px] transition-all hover:border-foreground/30 cursor-pointer
                ${isSelected ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : ''}
                ${isToday && !isSelected ? 'border-emerald-500/50 bg-emerald-950/20' : ''}
                ${isNegative && !isSelected ? 'bg-rose-500/10 border-rose-500/30' : 
                  isPositive && !isSelected ? 'bg-emerald-500/10 border-emerald-500/30' : 
                  !isSelected && !isToday ? 'bg-[#070b12] border-white/[0.03]' : ''}
              `}
            >
              <span className={`text-xs font-mono font-black ${isToday ? 'text-emerald-400 font-extrabold' : 'text-foreground/80'}`}>{day.getDate()}</span>
              {dayPnL !== 0 ? (
                <span className={`text-[10px] font-mono font-black tracking-tighter tabular-nums ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isNegative ? '-' : '+'}${Math.abs(dayPnL).toFixed(2)}
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold text-muted-foreground/10 transition-colors">—</span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-4 pt-2 text-center">
        <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">Command Center Operations Pipeline Monitoring Hub Active.</p>
      </div>
    </div>
  )
}