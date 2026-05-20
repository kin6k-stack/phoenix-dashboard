"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from "date-fns"
import { Button } from "@/components/ui/button"

interface TradingCalendarProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  tradeDates?: Date[]
  totalTrades?: number
  wins?: number
  netPnL?: number
  winRate?: number
  // 🔥 REGISTER HOOK INTERACTION VARIABLE
  onMonthYearChange?: (monthYear: { month: number; year: number }) => void
}

export function TradingCalendar({ 
  selectedDate, 
  onDateSelect, 
  tradeDates = [],
  totalTrades = 0,
  wins = 0,
  netPnL = 0,
  winRate = 0,
  onMonthYearChange
}: TradingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDay = getDay(monthStart)
  
  const totalSlots = 42;
  const emptyDaysAtEnd = totalSlots - (startDay + days.length);
  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

  // 🔥 EVENT FIRE PIPELINE: Updates parent filtering baseline parameters dynamically
  useEffect(() => {
    if (onMonthYearChange) {
      onMonthYearChange({
        month: currentMonth.getMonth(),
        year: currentMonth.getFullYear()
      });
    }
  }, [currentMonth, onMonthYearChange]);
  
  const hasTrade = (date: Date) => {
    return tradeDates.some(d => 
      d.getDate() === date.getDate() && 
      d.getMonth() === date.getMonth() && 
      d.getFullYear() === date.getFullYear()
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-muted"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-muted"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <button 
          onClick={() => onDateSelect(new Date())}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          <Pencil className="h-3 w-3" />
          <span>click date to journal</span>
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-6 mb-4 text-sm">
        <div>
          <span className="text-muted-foreground">TRADES</span>
          <span className="ml-2 font-semibold text-foreground">{totalTrades}</span>
        </div>
        <div>
          <span className="text-muted-foreground">WINS</span>
          <span className="ml-2 font-semibold text-foreground">{wins}</span>
        </div>
        <div>
          <span className="text-muted-foreground">P&L</span>
          <span className={`ml-2 font-semibold ${netPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {netPnL >= 0 ? "+" : ""}${netPnL.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">WIN %</span>
          <span className="ml-2 font-semibold text-foreground">{winRate}%</span>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 grid-rows-6 flex-1 border-t border-l border-border bg-card overflow-hidden">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-start-${i}`} className="border-r border-b border-border bg-muted/10" />
        ))}
        
        {days.map((day) => {
          const isSelected = selectedDate && 
            day.getDate() === selectedDate.getDate() &&
            day.getMonth() === selectedDate.getMonth() &&
            day.getFullYear() === selectedDate.getFullYear()
          const hasTradeOnDay = hasTrade(day)
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={`
                border-r border-b border-border p-2 flex flex-col items-center justify-start transition-colors relative
                hover:bg-muted/50 focus:outline-none
                ${isSelected ? "bg-primary/20" : ""}
                ${hasTradeOnDay ? "bg-emerald-500/10" : ""}
                ${!isSameMonth(day, currentMonth) ? "text-muted-foreground" : "text-foreground"}
              `}
            >
              <span className={`
                text-sm mt-1 w-7 h-7 flex items-center justify-center rounded-full
                ${isToday(day) ? "bg-primary text-primary-foreground font-semibold" : ""}
              `}>
                {format(day, "d")}
              </span>
              
              {hasTradeOnDay && (
                 <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
              )}
            </button>
          )
        })}

        {Array.from({ length: emptyDaysAtEnd }).map((_, i) => (
          <div key={`empty-end-${i}`} className="border-r border-b border-border bg-muted/10" />
        ))}
      </div>
    </div>
  )
}