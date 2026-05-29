"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, BarChart2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function PnLCalendarPage() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth  = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const monthName = viewDate.toLocaleString("default", { month: "long", year: "numeric" });

  // Placeholder: real PnL data would come from /api/pnl
  const pnlData: Record<number, number> = {};

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">P&L Calendar</h1>
          <p className="text-xs text-[var(--t-muted)] mt-0.5">Track performance across all your trading accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <BarChart2 className="h-3.5 w-3.5" />
            Analytics
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Log Trade
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Trades", value: "0" },
          { label: "Wins",   value: "0", color: "text-emerald-400" },
          { label: "P&L",    value: "$0.00" },
          { label: "Win %",  value: "0%" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">{label}</p>
              <p className={cn("text-xl font-bold font-mono", color ?? "text-foreground")}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 hover:bg-white/[0.04] rounded transition-colors">
              <ChevronLeft className="h-4 w-4 text-zinc-400" />
            </button>
            <h2 className="text-sm font-semibold text-foreground">{monthName}</h2>
            <button onClick={nextMonth} className="p-1.5 hover:bg-white/[0.04] rounded transition-colors">
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] text-zinc-600 py-1 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day  = i + 1;
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();
              const pnl = pnlData[day];

              return (
                <button
                  key={day}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors relative",
                    isToday
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold"
                      : "hover:bg-white/[0.03] text-zinc-500",
                    pnl !== undefined &&
                      (pnl > 0
                        ? "bg-emerald-500/[0.08]"
                        : pnl < 0
                        ? "bg-red-500/[0.08]"
                        : "")
                  )}
                >
                  <span>{day}</span>
                  {pnl !== undefined && (
                    <span className={cn(
                      "text-[8px] font-mono mt-0.5",
                      pnl > 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {pnl > 0 ? "+" : ""}{pnl}R
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-zinc-600 mt-4">Click a date to journal trades</p>
        </CardContent>
      </Card>
    </div>
  );
}
