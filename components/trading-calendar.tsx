"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function TradingCalendar({ selectedDate, onDateSelect, trades = [], onMonthYearChange }: any) {
  const [currentDate, setCurrentDate] = useState(new Date())

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

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-black tracking-widest uppercase text-foreground">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
           <button onClick={prevMonth} className="p-2 bg-background/50 border border-border/50 rounded hover:bg-white/10 transition-colors"><ChevronLeft size={16} /></button>
           <button onClick={nextMonth} className="p-2 bg-background/50 border border-border/50 rounded hover:bg-white/10 transition-colors"><ChevronRight size={16} /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2 flex-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{day}</div>
        ))}
        
        {days.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[60px]" />
          
          const dayStr = day.toDateString();
          const dayPnL = dailyPnLMap[dayStr] || 0;
          const isNegative = dayPnL < 0;
          const isPositive = dayPnL > 0;
          const isSelected = selectedDate?.toDateString() === dayStr;
          
          return (
            <button 
              key={i}
              onClick={() => onDateSelect(day)}
              className={`p-2 border rounded-md flex flex-col items-start justify-between min-h-[60px] transition-all hover:border-foreground/50
                ${isSelected ? 'ring-2 ring-primary border-primary bg-primary/10' : ''}
                ${isNegative && !isSelected ? 'bg-rose-500/10 border-rose-500/30' : 
                  isPositive && !isSelected ? 'bg-emerald-500/10 border-emerald-500/30' : 
                  !isSelected ? 'bg-background/40 border-border/40' : ''}
              `}
            >
              <span className="text-xs font-bold text-foreground">{day.getDate()}</span>
              {dayPnL !== 0 && (
                <span className={`text-[10px] font-black tracking-tighter ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isNegative ? '' : '+'}${Math.abs(dayPnL).toFixed(2)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-border/40 text-center">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Click any date to view intraday ledger or log manual setups.</p>
      </div>
    </div>
  )
}