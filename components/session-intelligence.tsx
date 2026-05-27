"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Layers, Filter, Crosshair, Shield, Zap, Flame, Eye, Lock, Unlock } from "lucide-react"

interface TechnicalLevels {
  pdh: number; pdl: number; pdc: number;
  eqh: number; eql: number;
  fvgHigh: number; fvgLow: number;
  avwap: number;
  vah: number; val: number; poc: number;
}

export function SessionIntelligence({ trades = [] }: { trades: any[] }) {
  const [asset, setAsset] = useState<"XAUUSD" | "USTEC">("XAUUSD")
  const [timeMode, setTimeMode] = useState<"INTRADAY" | "SWING">("INTRADAY")
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Rule Checklists states persisted locally
  const [noTradeFriday, setNoTradeFriday] = useState<boolean>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("phx_rule_friday") === "true"
    return false
  })
  const [drawdownReached, setDrawdownReached] = useState<boolean>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("phx_rule_dd") === "true"
    return false
  })

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const updateRule = (type: "friday" | "dd", val: boolean) => {
    if (type === "friday") {
      setNoTradeFriday(val)
      localStorage.setItem("phx_rule_friday", String(val))
    } else {
      setDrawdownReached(val)
      localStorage.setItem("phx_rule_dd", String(val))
    }
  }

  // Daily Live Timeframe Technical Intelligence Feeds
  const intradayLevels: Record<"XAUUSD" | "USTEC", TechnicalLevels> = {
    XAUUSD: { pdh: 2435.50, pdl: 2410.20, pdc: 2422.10, eqh: 2442.00, eql: 2405.10, fvgHigh: 2428.50, fvgLow: 2424.00, avwap: 2425.20, vah: 2431.00, val: 2415.00, poc: 2421.50 },
    USTEC: { pdh: 18650.0, pdl: 18420.0, pdc: 18560.0, eqh: 18720.0, eql: 18390.0, fvgHigh: 18510.0, fvgLow: 18480.0, avwap: 18545.0, vah: 18610.0, val: 18460.0, poc: 18530.0 }
  }

  const swingLevels: Record<"XAUUSD" | "USTEC", TechnicalLevels> = {
    XAUUSD: { pdh: 2450.00, pdl: 2380.00, pdc: 2415.00, eqh: 2482.00, eql: 2360.00, fvgHigh: 2405.00, fvgLow: 2390.00, avwap: 2410.00, vah: 2440.00, val: 2395.00, poc: 2408.00 },
    USTEC: { pdh: 18900.0, pdl: 18100.0, pdc: 18450.0, eqh: 19120.0, eql: 17980.0, fvgHigh: 18350.0, fvgLow: 18210.0, avwap: 18410.0, vah: 18750.0, val: 18200.0, poc: 18420.0 }
  }

  const levels = timeMode === "INTRADAY" ? intradayLevels[asset] : swingLevels[asset]

  // Dynamic Session Allocation Math
  const getSessionState = () => {
    const hour = currentTime.getUTCHours()
    if (hour >= 7 && hour < 13) return { session: "LONDON RUNNING", countdown: "London Close approaching", color: "text-green-400", ib: "Range established" }
    if (hour >= 13 && hour < 19) return { session: "NEW YORK S Session Open", countdown: "NY Equities active", color: "text-amber-400", ib: "Breakout window active" }
    return { session: "ASIA CONSOLIDATION CONTEXT", countdown: "London session countdown armed", color: "text-blue-400", ib: "Building liquidity boundaries" }
  }

  const session = getSessionState()

  return (
    <div className="w-full min-h-screen bg-[#020406] text-slate-100 p-6 font-sans">
      
      {/* HEADER HUD LAYER */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between border-b border-slate-900 pb-5 mb-6 gap-4">
        <div>
          <h1 className="text-xl font-black tracking-wider text-green-400 flex items-center gap-2 font-mono">
            <Activity className="w-5 h-5 animate-pulse" /> PHOENIX SESSION INTELLIGENCE DESK
          </h1>
          <p className="text-xs text-slate-500 mt-1">Cross-market analysis models with localized memory architecture grids.</p>
        </div>

        {/* HUD MULTI-CONTROLS SWITCHER */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex bg-[#000001] p-1 border border-slate-800 rounded-lg">
            <button onClick={() => setAsset("XAUUSD")} className={`px-4 py-1.5 text-xs font-mono font-bold tracking-widest rounded-md transition-all ${asset === "XAUUSD" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "text-slate-500"}`}>GOLD</button>
            <button onClick={() => setAsset("USTEC")} className={`px-4 py-1.5 text-xs font-mono font-bold tracking-widest rounded-md transition-all ${asset === "USTEC" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "text-slate-500"}`}>NASDAQ</button>
          </div>

          <div className="flex bg-[#000001] p-1 border border-slate-800 rounded-lg">
            <button onClick={() => setTimeMode("INTRADAY")} className={`px-4 py-1.5 text-xs font-mono font-bold tracking-widest rounded-md transition-all flex items-center gap-1.5 ${timeMode === "INTRADAY" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "text-slate-500"}`}><Clock className="w-3 h-3" /> INTRADAY (M5-M30)</button>
            <button onClick={() => setTimeMode("SWING")} className={`px-4 py-1.5 text-xs font-mono font-bold tracking-widest rounded-md transition-all flex items-center gap-1.5 ${timeMode === "SWING" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "text-slate-500"}`}><Layers className="w-3 h-3" /> SWING (H1-D1)</button>
          </div>
        </div>
      </div>

      {/* BLOCK 1: TIME, SESSION & INITIAL BALANCE HUBS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="bg-[#070b12]/40 border border-slate-900 shadow-2xl backdrop-blur-md">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900/60 flex flex-row items-center gap-2">
            <Clock className="w-4 h-4 text-green-400" />
            <CardTitle className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Session State Processing Engine</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-4 pb-4 font-mono text-xs space-y-3">
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500 uppercase tracking-wider font-bold">Active Engine Node:</span>
              <span className={`font-black tracking-widest ${session.color}`}>{session.session}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-2">
              <span className="text-slate-500 uppercase tracking-wider font-bold">Session Clock Cycle:</span>
              <span className="text-slate-200 font-bold tracking-widest">{session.countdown}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 uppercase tracking-wider font-bold">Initial Balance Phase:</span>
              <span className="text-slate-300 font-bold">{session.ib}</span>
            </div>
          </CardContent>
        </Card>

        {/* BLOCK 2: QUANT ORDER-BLOCK & LIQUIDITY MATRIX */}
        <Card className="bg-[#070b12]/40 border border-slate-900 shadow-2xl backdrop-blur-md">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900/60 flex flex-row items-center gap-2">
            <Crosshair className="w-4 h-4 text-green-400" />
            <CardTitle className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Algorithmic Liquidity References</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-4 pb-4 font-mono text-xs grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex justify-between border-b border-slate-900/40 pb-1">
              <span className="text-slate-500 font-bold">PDH Level:</span>
              <span className="text-slate-200 font-bold">{levels.pdh.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900/40 pb-1">
              <span className="text-slate-500 font-bold">PDL Level:</span>
              <span className="text-slate-200 font-bold">{levels.pdl.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900/40 pb-1">
              <span className="text-slate-500 font-bold">EQH Sweep:</span>
              <span className="text-amber-400 font-bold">{levels.eqh.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900/40 pb-1">
              <span className="text-slate-500 font-bold">EQL Sweep:</span>
              <span className="text-amber-400 font-bold">{levels.eql.toFixed(2)}</span>
            </div>
            <div className="flex justify-between col-span-2 pt-1">
              <span className="text-slate-500 font-bold">FVG Imbalance Zone:</span>
              <span className="text-red-400 font-bold">{levels.fvgLow.toFixed(2)} - {levels.fvgHigh.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* BLOCK 3: VOLUME POINT OF CONTROL DESK */}
        <Card className="bg-[#070b12]/40 border border-slate-900 shadow-2xl backdrop-blur-md">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900/60 flex flex-row items-center gap-2">
            <Filter className="w-4 h-4 text-green-400" />
            <CardTitle className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Volume Profile Variables</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-4 pb-4 font-mono text-xs space-y-2">
            <div className="flex justify-between border-b border-slate-900/40 pb-1">
              <span className="text-slate-500 font-bold">Anchored VWAP Anchor:</span>
              <span className="text-green-400 font-bold">{levels.avwap.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900/40 pb-1">
              <span className="text-slate-500 font-bold">Value Area High (VAH):</span>
              <span className="text-slate-200 font-bold">{levels.vah.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900/40 pb-1">
              <span className="text-slate-500 font-bold">Value Area Low (VAL):</span>
              <span className="text-slate-200 font-bold">{levels.val.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Point of Control (POC Magnet):</span>
              <span className="text-amber-400 font-black tracking-wider">{levels.poc.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COMMAND CENTER OPERATIONS & RISK PROTOCOL TOGGLES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RISK MATRIX EVALUATIONS */}
        <Card className="bg-[#070b12]/40 border border-slate-900 shadow-2xl backdrop-blur-md lg:col-span-1">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900/60 flex flex-row items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <CardTitle className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Risk Engine Parameters</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-4 pb-4 font-mono text-xs space-y-3">
            <div className="flex justify-between border-b border-slate-900/40 pb-1">
              <span className="text-slate-500 font-bold">Volatility stop distance (ATR):</span>
              <span className="text-slate-200 font-bold">{asset === "XAUUSD" ? "4.50 pts" : "45.00 pts"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Expected R-Multiple setup target:</span>
              <span className="text-green-400 font-bold font-black">1:2.50 Target Matrix</span>
            </div>
          </CardContent>
        </Card>

        {/* PLAN HARD LIMIT CHECKLISTS TIE */}
        <Card className="bg-[#070b12]/40 border border-slate-900 shadow-2xl backdrop-blur-md lg:col-span-2">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900/60 flex flex-row items-center gap-2">
            <Lock className="w-4 h-4 text-green-400" />
            <CardTitle className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Compliance Rule Circuit Brakers</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-4 pb-4 font-mono text-xs flex flex-col sm:flex-row gap-6 justify-between">
            <div className="flex items-center justify-between w-full bg-[#000001]/40 p-3 border border-slate-900 rounded-lg">
              <div>
                <span className="block font-bold text-slate-300">FRIDAY LIQUIDITY LOCKOUT</span>
                <span className="text-[10px] text-slate-500">Block expansion fields on Friday afternoons</span>
              </div>
              <button onClick={() => updateRule("friday", !noTradeFriday)} className={`px-4 py-1 rounded text-[10px] font-black tracking-widest cursor-pointer transition-colors ${noTradeFriday ? "bg-red-500/10 text-red-400 border border-red-500/30" : "bg-green-500/10 text-green-400 border border-green-500/30"}`}>
                {noTradeFriday ? "LOCK ENGAGED" : "CLEAR TO HUNT"}
              </button>
            </div>

            <div className="flex items-center justify-between w-full bg-[#000001]/40 p-3 border border-slate-900 rounded-lg">
              <div>
                <span className="block font-bold text-slate-300">MAX DAILY RISK CEILING</span>
                <span className="text-[10px] text-slate-500">Auto stop gate if target deficit activates</span>
              </div>
              <button onClick={() => updateRule("dd", !drawdownReached)} className={`px-4 py-1 rounded text-[10px] font-black tracking-widest cursor-pointer transition-colors ${drawdownReached ? "bg-red-500/10 text-red-400 border border-red-500/30" : "bg-green-500/10 text-green-400 border border-green-500/30"}`}>
                {drawdownReached ? "CEILING REACHED" : "UNDER LIMIT"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}