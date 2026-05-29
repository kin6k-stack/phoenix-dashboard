"use client"

import { useState, useMemo } from "react"
import { TrendingUp } from "lucide-react"

interface Trade {
  id: string
  date: string
  rMultiple: number
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

export function YearlyPerformanceTable({ trades = [] }: { trades: Trade[] }) {
  const currentYear = new Date().getFullYear()
  const [activeYear, setActiveYear] = useState(currentYear)

  // ── Aggregate P&L per [year][month] ──────────────────────────────────
  const matrix = useMemo(() => {
    const m: Record<number, number[]> = {}
    for (const t of trades) {
      const d = new Date(t.date)
      const yr = d.getFullYear()
      const mo = d.getMonth()
      if (!m[yr]) m[yr] = Array(12).fill(0)
      m[yr][mo] += Number(t.rMultiple)
    }
    return m
  }, [trades])

  // ── Always show current year + the 3 before it ──────────────────────
  const yearsToShow = [currentYear - 1, currentYear].filter((y, i, arr) => arr.indexOf(y) === i)
  // Year tabs always show last 4 years
  const yearTabs = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear]

  // Format cell value
  const fmt = (n: number) => {
    if (n === 0) return "—"
    const sign = n < 0 ? "-" : "+"
    const abs = Math.abs(n)
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
    return `${sign}$${abs.toFixed(0)}`
  }

  const ytdFor = (year: number) =>
    (matrix[year] ?? []).reduce((s, v) => s + v, 0)

  return (
    <div className="bg-card/60 border border-border/40 rounded-xl shadow-lg overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-background/30">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Yearly Performance</h3>
        </div>

        {/* Year tabs */}
        <div className="flex items-center gap-1">
          {yearTabs.map(y => (
            <button
              key={y}
              onClick={() => setActiveYear(y)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all
                ${activeYear === y
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border/20 text-[9px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-2.5 font-bold w-16">Year</th>
              {MONTHS.map(m => (
                <th key={m} className="px-2 py-2.5 font-bold text-center">{m}</th>
              ))}
              <th className="px-3 py-2.5 font-bold text-center">YTD</th>
            </tr>
          </thead>
          <tbody>
            {yearsToShow.map(yr => {
              const row = matrix[yr] ?? Array(12).fill(0)
              const ytd = ytdFor(yr)
              return (
                <tr key={yr} className="border-b border-border/10 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-black text-sm text-foreground">{yr}</td>
                  {row.map((val, i) => {
                    const isCurrent = yr === currentYear && i === new Date().getMonth()
                    return (
                      <td key={i} className="px-2 py-3 text-center">
                        <div className={`text-[11px] font-mono font-bold tabular-nums
                          ${val > 0 ? "text-emerald-400"
                            : val < 0 ? "text-rose-400"
                            : "text-muted-foreground/40"}
                          ${isCurrent ? "bg-emerald-500/[0.06] rounded px-1 py-0.5" : ""}`}>
                          {fmt(val)}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-3 py-3 text-center">
                    <div className={`text-[11px] font-mono font-black tabular-nums
                      ${ytd > 0 ? "text-emerald-400" : ytd < 0 ? "text-rose-400" : "text-muted-foreground/40"}`}>
                      {fmt(ytd)}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
