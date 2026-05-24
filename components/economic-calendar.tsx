"use client"

import { useState, useEffect } from "react"
import { Globe, RefreshCw, Clock } from "lucide-react"

export function EconomicCalendar() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCalendar = async () => {
    setLoading(true)
    try {
      const res = await fetch("https://fxmacrodata.com/api/v1/calendar/usd")
      if (res.ok) {
        const data = await res.json()
        const upcoming = data.filter((e: any) => new Date(e.announcement_datetime).getTime() > Date.now())
        upcoming.sort((a: any, b: any) => new Date(a.announcement_datetime).getTime() - new Date(b.announcement_datetime).getTime())
        setEvents(upcoming)
      }
    } catch (error) {
      console.error("Failed to fetch macro data", error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCalendar()
  }, [])

  const getImpact = (indicator: string) => {
    const ind = indicator?.toLowerCase() || "";
    if (["policy_rate", "non_farm_payrolls", "inflation", "core_inflation", "gdp", "unemployment", "pce"].some(k => ind.includes(k))) return { level: "HIGH", color: "text-rose-400", dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]" };
    if (["retail_sales", "ppi", "trade_balance", "job_openings", "consumer_sentiment", "pmi", "nmi"].some(k => ind.includes(k))) return { level: "MED", color: "text-amber-400", dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]" };
    return { level: "LOW", color: "text-slate-400", dot: "bg-slate-500" };
  }

  return (
    <div className="w-full border border-border/40 rounded-xl overflow-hidden bg-card/40 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.3)]">
      <div className="flex justify-between items-center p-4 border-b border-border/30 bg-background/40">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Live USD Macro Feed</h3>
        </div>
        <button onClick={fetchCalendar} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="p-0">
        {loading ? (
          <div className="p-12 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Institutional Feed...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest">No upcoming high impact USD events found.</div>
        ) : (
          <div className="divide-y divide-border/20 max-h-[600px] overflow-y-auto custom-scrollbar">
            {events.map((event, idx) => {
              const impact = getImpact(event.indicator);
              const eventDate = new Date(event.announcement_datetime);
              const isToday = new Date().toDateString() === eventDate.toDateString();
              
              return (
                <div key={idx} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${impact.dot}`} />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-foreground uppercase tracking-wider">{event.title}</span>
                        {isToday && <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest animate-pulse">TODAY</span>}
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{event.source || "Federal Reserve / BLS"}</span>
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-[11px] font-mono font-black text-foreground flex items-center gap-1.5">
                      <Clock size={12} className="text-muted-foreground"/> 
                      {eventDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-border/40 bg-background/50 ${impact.color}`}>
                      {impact.level} IMPACT
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}