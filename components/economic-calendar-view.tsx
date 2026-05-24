"use client"

import { useState, useEffect } from "react"
import { Globe, RefreshCw, AlertTriangle, Clock, Activity } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface MacroEvent {
  title: string;
  announcement_datetime: string;
  indicator: string;
  source: string;
  currency: string;
}

export function EconomicCalendar() {
  const [events, setEvents] = useState<MacroEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currencyFilter, setCurrencyFilter] = useState("usd")

  const fetchCalendar = async (currency: string) => {
    setLoading(true)
    try {
      const res = await fetch(`https://fxmacrodata.com/api/v1/calendar/${currency}`)
      if (res.ok) {
        const data = await res.json()
        const sorted = data.sort((a: any, b: any) => new Date(a.announcement_datetime).getTime() - new Date(b.announcement_datetime).getTime())
        // Filter strictly to upcoming events
        const upcoming = sorted.filter((e: any) => new Date(e.announcement_datetime).getTime() > Date.now())
        setEvents(upcoming)
      }
    } catch (error) {
      console.error("Failed to fetch macro data", error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCalendar(currencyFilter)
  }, [currencyFilter])

  const getImpact = (indicator: string) => {
    const ind = indicator.toLowerCase();
    if (["policy_rate", "non_farm_payrolls", "inflation", "core_inflation", "gdp", "unemployment", "pce"].some(k => ind.includes(k))) return { level: "HIGH", color: "text-rose-500", dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]" };
    if (["retail_sales", "ppi", "trade_balance", "job_openings", "consumer_sentiment", "pmi", "nmi"].some(k => ind.includes(k))) return { level: "MED", color: "text-amber-400", dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]" };
    return { level: "LOW", color: "text-slate-400", dot: "bg-slate-500" };
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#0f172a]/60 backdrop-blur-xl p-2 rounded-lg border border-white/5 shadow-lg">
        <div className="flex gap-2">
          {["usd", "eur", "gbp", "jpy", "aud"].map((curr) => (
            <button
              key={curr}
              onClick={() => setCurrencyFilter(curr)}
              className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${currencyFilter === curr ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
            >
              {curr}
            </button>
          ))}
        </div>
        <button onClick={() => fetchCalendar(currencyFilter)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <Card className="bg-[#0f172a]/40 backdrop-blur-xl border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
        <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-black/20">
          <Globe size={16} className="text-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Global Data Feed</h3>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Institutional Feed...</div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest">No upcoming events found for {currencyFilter.toUpperCase()}.</div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
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
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{event.source}</span>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-[11px] font-mono font-black text-foreground flex items-center gap-1.5">
                        <Clock size={12} className="text-muted-foreground"/> 
                        {eventDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-white/5 bg-black/40 ${impact.color}`}>
                        {impact.level} IMPACT
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}