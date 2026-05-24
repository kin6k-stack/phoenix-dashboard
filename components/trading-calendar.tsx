"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function TradingCalendar({ selectedDate, onDateSelect, trades = [], onMonthYearChange }: any) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Dynamic PnL allocation map based on trade data
  const dailyPnLMap = trades.reduce((acc: any, t: any) => {
    const dStr = new Date(t.date).toDateString();
    acc[dStr] = (acc[dStr] || 0) + Number(t.rMultiple);
    return acc;
  }, {});

  // Mathematical block generation for proper grid alignment
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
      
      {/* Visual Update: Darker header container */}
      <div className="flex justify-between items-center mb-6 p-4 rounded-xl bg-[#1e293b]/60 border border-border">
        <h2 className="text-xl font-bold tracking-tight text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
           <button onClick={prevMonth} className="p-2 bg-slate-700/50 border border-slate-700 rounded hover:bg-slate-700/80 transition-colors"><ChevronLeft size={18} className="text-white" /></button>
           <button onClick={nextMonth} className="p-2 bg-slate-700/50 border border-slate-700 rounded hover:bg-slate-700/80 transition-colors"><ChevronRight size={18} className="text-white" /></button>
        </div>
      </div>
      
      {/* Trading Matrix Day Grid */}
      <div className="grid grid-cols-7 gap-2 flex-1">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{day}</div>
        ))}
        
        {days.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[60px] bg-slate-900/10 border border-slate-900 rounded-lg" />
          
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
              className={`p-3 border rounded-xl flex flex-col items-start justify-between min-h-[65px] transition-all relative overflow-hidden group
                ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-600/30' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-emerald-500 bg-emerald-500/10' : ''}
                ${isNegative && !isSelected ? 'bg-rose-950 border-rose-900 hover:border-rose-700' : 
                  isPositive && !isSelected ? 'bg-emerald-950 border-emerald-900 hover:border-emerald-700' : 
                  !isSelected && !isToday ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700' : ''}
              `}
            >
              <span className={`text-sm font-bold ${isToday ? 'text-emerald-300' : 'text-foreground'}`}>{day.getDate()}</span>
              
              {/* Dynamic trade aggregation result display */}
              {dayPnL !== 0 && (
                <span className={`text-xs font-mono font-extrabold tracking-tight tabular-nums ${isNegative ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {isNegative ? '-' : '+'}${Math.abs(dayPnL).toFixed(2)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-border/40 text-center">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Select an execution date window to reveal intraday historical logs.</p>
      </div>
    </div>
  )
}