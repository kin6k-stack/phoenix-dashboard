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

  const filteredEvents = events.filter((evt) => {
    const matchesImportance = importanceFilter === "ALL" || evt.importance === importanceFilter
    const matchesAsset = assetFilter === "ALL" || evt.impactAsset.includes(assetFilter) || evt.impactAsset === "GLOBAL DESK"
    return matchesImportance && matchesAsset
  })

  return (
    <div className="w-full min-h-screen bg-[#020406] text-slate-100 p-6 font-sans">
      {/* HUD HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-6 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-green-400 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-400" /> MACROECONOMIC INTEGRATION COMMAND
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking active risk thresholds for XAUUSD, USTEC, and USD Index layers over a 60-day horizon.
          </p>
        </div>
        <button 
          onClick={fetchCalendarData}
          className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-[#0b0f17]/60 border border-slate-800/80 text-slate-300 hover:bg-[#121824]/80 hover:text-green-400 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-green-400" : ""}`} /> 
          FORCE REFRESH COMMAND
        </button>
      </div>

      {/* FILTER CONTROL CENTER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-[#070b12]/50 p-4 border border-slate-900 rounded-xl backdrop-blur-md">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Filter className="w-3 h-3 text-green-400" /> Volatility Threshold Filter
          </label>
          <div className="flex gap-2">
            {["ALL", "HIGH", "MEDIUM"].map((level) => (
              <button
                key={level}
                onClick={() => setImportanceFilter(level)}
                className={`px-3 py-1.5 text-xs rounded transition-all cursor-pointer font-medium border ${
                  importanceFilter === level 
                    ? "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.1)]" 
                    : "bg-[#0c1017] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {level === "ALL" ? "SHOW ALL" : `${level} IMPACT`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Layers className="w-3 h-3 text-green-400" /> Operational Target Allocation
          </label>
          <div className="flex gap-2">
            {["ALL", "XAUUSD", "USTEC", "USD"].map((asset) => (
              <button
                key={asset}
                onClick={() => setAssetFilter(asset)}
                className={`px-3 py-1.5 text-xs rounded transition-all cursor-pointer font-medium border ${
                  assetFilter === asset 
                    ? "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.1)]" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {asset === "ALL" ? "OMNI TARGETS" : asset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MATRIX DISPLAY RUNTIME */}
      {loading ? (
        <div className="w-full h-64 flex flex-col items-center justify-center gap-3 bg-[#070b12]/20 border border-slate-900 rounded-xl">
          <RefreshCw className="w-6 h-6 animate-spin text-green-400" />
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Synchronizing Secure Feeds...</p>
        </div>
      ) : error ? (
        <div className="w-full p-4 flex items-center gap-3 bg-red-950/20 border border-red-900/40 text-red-400 rounded-xl">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="w-full py-16 text-center bg-[#070b12]/20 border border-slate-900 rounded-xl">
          <p className="text-xs text-slate-500 font-medium">No macro events map to selected constraints.</p>
        </div>
      ) : (
        <div className="w-full border border-slate-800/40 rounded-xl overflow-hidden bg-[#070b12]/40 backdrop-blur-md shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {/* Institutional True-Black Header Tone */}
                <tr className="bg-[#000001] text-[10px] uppercase font-bold tracking-widest text-slate-500 border-b border-slate-800/60">
                  <th className="py-4 px-5 w-28">TIMESTAMP</th>
                  <th className="py-4 px-4 w-20">ZONE</th>
                  <th className="py-4 px-4">FUNDAMENTAL DESCRIPTION</th>
                  <th className="py-4 px-4 w-36">IMPACT ALLOCATION</th>
                  <th className="py-4 px-4 w-28 text-center">RISK LEVEL</th>
                  <th className="py-4 px-4 w-24 text-right">FORECAST</th>
                  <th className="py-4 px-5 w-24 text-right">PREVIOUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs bg-[#06090e]/30">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#0d131f]/40 transition-colors group">
                    <td className="py-4 px-5 font-mono text-slate-400 group-hover:text-slate-200">
                      <span className="block text-[11px] font-bold text-slate-300">{evt.date}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{evt.time} EST</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="bg-[#090d14] px-2 py-0.5 border border-slate-800 rounded text-[10px] font-bold text-slate-400">
                        {evt.currency}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-200 group-hover:text-white">
                      {evt.event}
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] text-green-400 font-medium">
                      {evt.impactAsset}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border tracking-wide ${
                        evt.importance === "HIGH" 
                          ? "bg-red-500/10 text-red-400 border-red-500/20" 
                          : "bg-orange-500/10 text-orange-400 border-orange-500/20"
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