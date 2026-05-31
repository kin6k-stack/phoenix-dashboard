"use client"

import { useState, useEffect } from "react"
import { Calendar, AlertTriangle, Layers, Filter, RefreshCw, Zap } from "lucide-react"

interface MacroEvent {
  id: string
  time: string
  date: string
  currency: string
  event: string
  importance: "HIGH" | "MEDIUM" | "LOW"
  impactAsset: string
  previous: string
  forecast: string
  liveStatus: string
}

export function EconomicCalendar() {
  const [events, setEvents] = useState<MacroEvent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [importanceFilter, setImportanceFilter] = useState<string>("ALL")
  const [assetFilter,      setAssetFilter]      = useState<string>("ALL")

  const fetchCalendarData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/calendar")
      const result = await res.json()
      if (result.success) {
        setEvents(result.data)
        setError(null)
      } else {
        setError("Macro data retrieval mismatch.")
      }
    } catch {
      setError("Server connection disrupted.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCalendarData() }, [])

  const filteredEvents = events.filter((evt) => {
    const matchesImportance = importanceFilter === "ALL" || evt.importance === importanceFilter
    const matchesAsset = assetFilter === "ALL" || evt.impactAsset.includes(assetFilter) || evt.impactAsset === "GLOBAL DESK"
    return matchesImportance && matchesAsset
  })

  return (
    <div className="w-full font-sans space-y-6">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> MACROECONOMIC INTEGRATION COMMAND
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tracking active risk thresholds for XAUUSD, USTEC, and USD Index layers over a 60-day horizon.
          </p>
        </div>
        <button
          onClick={fetchCalendarData}
          className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-card/60 border border-border text-foreground hover:bg-card/80 hover:text-primary transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-primary" : ""}`} />
          FORCE REFRESH COMMAND
        </button>
      </div>

      {/* ── FILTERS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card/50 p-4 border border-border rounded-xl backdrop-blur-md">
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Filter className="w-3 h-3 text-primary" /> Volatility Threshold Filter
          </label>
          <div className="flex gap-2">
            {["ALL", "HIGH", "MEDIUM"].map((level) => (
              <button
                key={level}
                onClick={() => setImportanceFilter(level)}
                className={`px-3 py-1.5 text-xs rounded transition-all cursor-pointer font-medium border ${
                  importanceFilter === level
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted"
                }`}
              >
                {level === "ALL" ? "SHOW ALL" : `${level} IMPACT`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Layers className="w-3 h-3 text-primary" /> Operational Target Allocation
          </label>
          <div className="flex gap-2 flex-wrap">
            {["ALL", "XAUUSD", "USTEC", "USD"].map((asset) => (
              <button
                key={asset}
                onClick={() => setAssetFilter(asset)}
                className={`px-3 py-1.5 text-xs rounded transition-all cursor-pointer font-medium border ${
                  assetFilter === asset
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted"
                }`}
              >
                {asset === "ALL" ? "OMNI TARGETS" : asset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABLE / STATES ────────────────────────────────────── */}
      {loading ? (
        <div className="w-full h-64 flex flex-col items-center justify-center gap-3 bg-card/20 border border-border rounded-xl">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Synchronizing Secure Feeds...</p>
        </div>
      ) : error ? (
        <div className="w-full p-4 flex items-center gap-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="w-full py-16 text-center bg-card/20 border border-border rounded-xl">
          <p className="text-xs text-muted-foreground font-medium">No macro events map to selected constraints.</p>
        </div>
      ) : (
        <div className="w-full border border-border rounded-xl overflow-hidden bg-card/40 backdrop-blur-md shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background/60 text-[10px] uppercase font-bold tracking-widest text-muted-foreground border-b border-border">
                  <th className="py-4 px-5 w-28">TIMESTAMP</th>
                  <th className="py-4 px-4 w-20">ZONE</th>
                  <th className="py-4 px-4">FUNDAMENTAL DESCRIPTION</th>
                  <th className="py-4 px-4 w-36">IMPACT ALLOCATION</th>
                  <th className="py-4 px-4 w-28 text-center">RISK LEVEL</th>
                  <th className="py-4 px-4 w-24 text-right">FORECAST</th>
                  <th className="py-4 px-5 w-24 text-right">PREVIOUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs bg-card/30">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-foreground/[0.04] transition-colors group">
                    <td className="py-4 px-5 font-mono text-muted-foreground group-hover:text-foreground">
                      <span className="block text-[11px] font-bold text-foreground">{evt.date}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">{evt.time} EST</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="bg-background/50 px-2 py-0.5 border border-border rounded text-[10px] font-bold text-muted-foreground">
                        {evt.currency}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium text-foreground">
                      {evt.event}
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] text-primary font-medium">
                      {evt.impactAsset}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border tracking-wide ${
                        evt.importance === "HIGH"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}>
                        <Zap className="w-2.5 h-2.5 fill-current" />
                        {evt.importance}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-medium text-foreground">
                      {evt.forecast}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-muted-foreground">
                      {evt.previous}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
