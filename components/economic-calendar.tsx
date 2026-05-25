"use client"

import { useState, useEffect } from "react"
import { Calendar, AlertTriangle, ShieldCheck, Layers, Filter, RefreshCw, Zap } from "lucide-react"

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

export function EconomicCalendarView() {
  const [events, setEvents] = useState<MacroEvent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtering states
  const [importanceFilter, setImportanceFilter] = useState<string>("ALL")
  const [assetFilter, setAssetFilter] = useState<string>("ALL")

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
    } catch (err) {
      setError("Server connection disrupted.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalendarData()
  }, [])

  // Filtering Matrix Logic
  const filteredEvents = events.filter((evt) => {
    const matchesImportance = importanceFilter === "ALL" || evt.importance === importanceFilter
    const matchesAsset = assetFilter === "ALL" || evt.impactAsset.includes(assetFilter) || evt.impactAsset === "GLOBAL DESK"
    return matchesImportance && matchesAsset
  })

  return (
    <div className="w-full min-h-screen bg-[#03050a] text-slate-100 p-6 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800/60 pb-6 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-amber-400 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> MACROECONOMIC INTEGRATION COMMAND
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tracking active risk thresholds for XAUUSD, USTEC, and USD Index layers over a 60-day horizon.
          </p>
        </div>
        <button 
          onClick={fetchCalendarData}
          className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-slate-900 border border-slate-700/80 hover:bg-slate-800 hover:text-amber-400 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-amber-400" : ""}`} /> 
          FORCE REFRESH MATRIX
        </button>
      </div>

      {/* FILTER BAR CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-950/40 p-4 border border-slate-850/60 rounded backdrop-blur-md">
        {/* IMPORTANCE FILTER PANEL */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Filter className="w-3 h-3 text-dodgerblue" /> Volatility Threshold Filter
          </label>
          <div className="flex gap-2">
            {["ALL", "HIGH", "MEDIUM"].map((level) => (
              <button
                key={level}
                onClick={() => setImportanceFilter(level)}
                className={`px-3 py-1.5 text-xs rounded transition-all cursor-pointer font-medium border ${
                  importanceFilter === level 
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.1)]" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {level === "ALL" ? "SHOW ALL OUTCOMES" : `${level} IMPACT SETUP`}
              </button>
            ))}
          </div>
        </div>

        {/* ASSET FOCUS FILTER PANEL */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Layers className="w-3 h-3 text-dodgerblue" /> Operational Target Allocation
          </label>
          <div className="flex gap-2">
            {["ALL", "XAUUSD", "USTEC", "USD"].map((asset) => (
              <button
                key={asset}
                onClick={() => setAssetFilter(asset)}
                className={`px-3 py-1.5 text-xs rounded transition-all cursor-pointer font-medium border ${
                  assetFilter === asset 
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.1)]" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {asset === "ALL" ? "OMNI TARGETS" : asset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RENDER BODY STATE */}
      {loading ? (
        <div className="w-full h-64 flex flex-col items-center justify-center gap-3 bg-slate-950/20 border border-slate-900 rounded">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs text-slate-400 font-medium tracking-widest">SYNCHRONIZING SECURE CALENDAR CHANNELS...</p>
        </div>
      ) : error ? (
        <div className="w-full p-6 flex items-center gap-3 bg-red-950/20 border border-red-900/50 text-red-400 rounded">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-medium">{error} Check Vercel application environment variables variables list.</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="w-full py-16 text-center bg-slate-950/20 border border-slate-900 rounded">
          <p className="text-xs text-slate-500 font-medium">No macroeconomic items match selected filters criteria metrics.</p>
        </div>
      ) : (
        /* HIGHFIDELITY FINANCIAL TIMELINE MATRIX */
        <div className="w-full bg-[#070b12] border border-slate-850/80 rounded overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-slate-800/80">
                  <th className="py-3.5 px-4 w-28">TIMESTAMP</th>
                  <th className="py-3.5 px-4 w-20">ZONE</th>
                  <th className="py-3.5 px-4">FUNDAMENTAL METRIC DESCRIPTION</th>
                  <th className="py-3.5 px-4 w-32">IMPACT SPEC</th>
                  <th className="py-3.5 px-4 w-24 text-center">RISK WEIGHT</th>
                  <th className="py-3.5 px-4 w-20 text-right">FORECAST</th>
                  <th className="py-3.5 px-4 w-20 text-right">PREVIOUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50 text-xs">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-900/30 transition-colors group">
                    <td className="py-4 px-4 font-mono text-slate-400 group-hover:text-slate-200">
                      <span className="block text-[11px] font-bold text-slate-300">{evt.date}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{evt.time} EST</span>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-300">
                      <span className="bg-slate-900 px-2 py-0.5 border border-slate-800 rounded text-[10px]">
                        {evt.currency}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-200 group-hover:text-white">
                      {evt.event}
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] text-blue-400 font-medium">
                      {evt.impactAsset}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border tracking-wide ${
                        evt.importance === "HIGH" 
                          ? "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.05)]" 
                          : "bg-orange-500/10 text-orange-400 border-orange-500/30"
                      }`}>
                        <Zap className="w-2.5 h-2.5 fill-current" />
                        {evt.importance}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-medium text-slate-300">
                      {evt.forecast}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-500">
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