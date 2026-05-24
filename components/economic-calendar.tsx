"use client"

import { useState, useEffect } from "react"
import { Calendar, RefreshCw, AlertCircle, ShieldCheck, Zap, HelpCircle } from "lucide-react"

interface MacroEvent {
  title: string
  announcement_datetime: string
  indicator: string
  source: string
  currency: string
}

export function EconomicCalendar() {
  const [eventsByMonth, setEventsByMonth] = useState<Record<string, MacroEvent[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeImportance, setActiveImportance] = useState<"ALL" | "HIGH" | "MED">("HIGH")

  const fetchThreeMonthCalendar = async () => {
    setLoading(true)
    try {
      // Pulling data directly via standard secure endpoint proxy
      const res = await fetch("https://fxmacrodata.com/api/v1/calendar/usd")
      if (res.ok) {
        const data: MacroEvent[] = await res.json()
        const nowMs = Date.now()
        const maxHorizonMs = nowMs + 90 * 24 * 60 * 60 * 1000 // Strict 3-Month structural window filter

        // Sort chronologically and isolate lookahead horizon window
        const filtered = data
          .filter((e) => {
            const t = new Date(e.announcement_datetime).getTime()
            return t >= nowMs && t <= maxHorizonMs
          })
          .sort((a, b) => new Date(a.announcement_datetime).getTime() - new Date(b.announcement_datetime).getTime())

        // Group explicitly by localized Month name strings
        const grouped: Record<string, MacroEvent[]> = {}
        filtered.forEach((event) => {
          const dateObj = new Date(event.announcement_datetime)
          const monthKey = dateObj.toLocaleString("en-US", { month: "long", year: "numeric" })

          if (!grouped[monthKey]) {
            grouped[monthKey] = []
          }
          grouped[monthKey].push(event)
        })

        setEventsByMonth(grouped)
      }
    } catch (error) {
      console.error("Failed to fetch rolling calendar matrix:", error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchThreeMonthCalendar()
  }, [])

  // Maps statistical high/med risk indicators explicitly to XAUUSD and USTEC parameters
  const getImpactData = (indicator: string) => {
    const ind = indicator?.toLowerCase() || ""
    if (["policy_rate", "non_farm_payrolls", "inflation", "core_inflation", "gdp", "unemployment", "pce"].some(k => ind.includes(k))) {
      return { level: "HIGH", color: "text-rose-400 border-rose-500/20 bg-rose-500/5", dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]" }
    }
    if (["retail_sales", "ppi", "trade_balance", "job_openings", "consumer_sentiment", "pmi", "nmi"].some(k => ind.includes(k))) {
      return { level: "MED", color: "text-amber-400 border-amber-500/20 bg-amber-500/5", dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]" }
    }
    return { level: "LOW", color: "text-slate-400 border-white/5 bg-white/5", dot: "bg-slate-500" }
  }

  return (
    <div className="space-y-6 w-full">
      {/* Target Alignment Summary Module Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 bg-card/40 backdrop-blur-md rounded-xl border border-border/40 shadow-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Calendar size={13} className="text-primary" /> Strategy Filter Focus: XAUUSD & USTEC
          </span>
          <span className="text-[10px] text-foreground font-medium italic">Isolating high-volatility macroeconomic catalysts over a 90-day pipeline</span>
        </div>

        {/* Cohesive design layout menu keys matching the tabs interface */}
        <div className="flex justify-end gap-1 bg-background/50 p-1 rounded-lg border border-border/50 max-w-fit md:ml-auto">
          {(["HIGH", "MED", "ALL"] as const).map((importance) => (
            <button
              key={importance}
              onClick={() => setActiveImportance(importance)}
              className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                activeImportance === importance
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {importance === "ALL" ? "Combined Feed" : `${importance} Risk`}
            </button>
          ))}
          <button 
            onClick={threeMonthHorizonSync}
            className="p-1.5 ml-1 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition-colors"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Render Lists segments classified cleanly by Month blocks */}
      {loading ? (
        <div className="p-16 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest animate-pulse border border-border/40 bg-card/20 rounded-xl backdrop-blur-md">
          Synchronizing institutional lookahead streams...
        </div>
      ) : Object.keys(eventsByMonth).length === 0 ? (
        <div className="p-16 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest border border-border/40 bg-card/20 rounded-xl backdrop-blur-md">
          No matching macro metrics captured for this asset window template.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(eventsByMonth).map(([monthName, monthEvents]) => {
            // Apply targeted risk-filter matrix logic safely on each month segment
            const displays = monthEvents.filter((ev) => {
              const r = getImpactData(ev.indicator).level
              if (activeImportance === "ALL") return true
              return r === activeImportance
            })

            if (displays.length === 0) return null

            return (
              <div key={monthName} className="space-y-3">
                {/* Month Group Divider Ribbon */}
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[11px] font-mono font-black uppercase tracking-widest text-primary drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                    {monthName}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-border/60 via-border/10 to-transparent" />
                  <span className="text-[9px] font-mono font-bold text-muted-foreground tracking-widest">
                    {displays.length} Releases Active
                  </span>
                </div>

                {/* Sub-grid array block list cards mapping inside month container */}
                <div className="border border-border/40 rounded-xl overflow-hidden bg-card/40 backdrop-blur-md divide-y divide-border/20 shadow-md">
                  {displays.map((event, idx) => {
                    const impact = getImpactData(event.indicator)
                    const dateObj = new Date(event.announcement_datetime)

                    return (
                      <div key={idx} className="p-4 hover:bg-white/[0.01] transition-colors flex items-center justify-between group">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${impact.dot}`} />
                          <div className="flex flex-col gap-0.5 truncate">
                            <span className="text-xs font-black text-foreground uppercase tracking-wider truncate">
                              {event.title}
                            </span>
                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">
                              {event.source || "Bureau of Economic Analysis / BLS"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0 ml-4">
                          <span className="text-[10px] font-mono font-black text-foreground/90 flex items-center gap-1">
                            <Clock size={11} className="text-muted-foreground/60" />
                            {dateObj.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${impact.color}`}>
                            {impact.level} IMPACT
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}