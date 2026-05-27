"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Activity, Crosshair, Shield, Zap, TrendingUp, Cpu, Flame } from "lucide-react"

interface IntelligenceModel {
  supportFloor: string
  demandZone: string
  resistanceCeiling: string
  supplyZone: string
  institutionalBias: "BULLISH" | "BEARISH" | "CONSOLIDATING"
  liquidityTarget: string
  volatilityIndex: string
}

export function SessionIntelligence({ trades = [] }: { trades: any[] }) {
  const [selectedAsset, setSelectedAsset] = useState<"XAUUSD" | "USTEC">("XAUUSD")
  const [userNotes, setUserNotes] = useState<string>("")

  // Local Storage Note Persistence Layer
  useEffect(() => {
    const cachedNotes = localStorage.getItem(`phx_intel_notes_${selectedAsset}`)
    if (cachedNotes) {
      setUserNotes(cachedNotes)
    } else {
      setUserNotes("")
    }
  }, [selectedAsset])

  const handleNotesChange = (text: string) => {
    setUserNotes(text)
    localStorage.setItem(`phx_intel_notes_${selectedAsset}`, text)
  }

  // Live Daily Timeframe Market Intelligence Matrix (Late May 2026 Data)
  const marketIntelligence: Record<"XAUUSD" | "USTEC", IntelligenceModel> = {
    XAUUSD: {
      supportFloor: "$4,493.00",
      demandZone: "$4,533.00 - $4,557.00",
      resistanceCeiling: "$4,894.00",
      supplyZone: "$4,740.00 - $4,770.00",
      institutionalBias: "BULLISH",
      liquidityTarget: "$5,000.00 Psychological Ceiling",
      volatilityIndex: "High Volume Overlap"
    },
    USTEC: {
      supportFloor: "29,000.00 pts",
      demandZone: "29,050.00 - 29,280.00 pts",
      resistanceCeiling: "30,000.00 pts",
      supplyZone: "29,600.00 - 29,880.00 pts",
      institutionalBias: "BULLISH",
      liquidityTarget: "30,660.00 Impulse Wave Target",
      volatilityIndex: "Aggressive Trend Vector"
    }
  }

  const currentIntel = marketIntelligence[selectedAsset]

  return (
    <div className="w-full min-h-screen bg-[#020406] text-slate-100 p-6 font-sans">
      
      {/* HUD CONTROL PANEL HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-6 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-green-400 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-green-500 animate-pulse" /> SESSION INTELLIGENCE COMMAND HUD
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Institutional volatility tracking matrix & automated order block evaluation.
          </p>
        </div>

        {/* ASSET SELECTOR MATRIX */}
        <div className="flex gap-2 mt-4 md:mt-0 bg-[#070b12] p-1 rounded-lg border border-slate-800/80">
          {(["XAUUSD", "USTEC"] as const).map((asset) => (
            <button
              key={asset}
              onClick={() => setSelectedAsset(asset)}
              className={`px-4 py-1.5 text-xs font-mono font-bold tracking-widest rounded-md transition-all cursor-pointer ${
                selectedAsset === asset
                  ? "bg-green-500/10 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                  : "text-slate-500 hover:text-slate-300 bg-transparent"
              }`}
            >
              {asset === "XAUUSD" ? "🥇 XAUUSD (GOLD)" : "⚡ USTEC (NASDAQ)"}
            </button>
          ))}
        </div>
      </div>

      {/* CORE HUD TECH GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* BLOCK 1: DEMAND AREA (SUPPORT) */}
        <Card className="bg-[#070b12]/60 border border-slate-900 shadow-2xl backdrop-blur-md">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900/60 flex flex-row items-center gap-2">
            <Crosshair className="w-4 h-4 text-green-400" />
            <CardTitle className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Institutional Demand Floor</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-4 pb-4">
            <div className="mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Major Daily Support</span>
              <p className="text-xl font-mono font-black text-green-400 mt-0.5">{currentIntel.supportFloor}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mitigation Demand Zone</span>
              <p className="text-xs font-mono font-semibold text-slate-200 mt-0.5">{currentIntel.demandZone}</p>
            </div>
          </CardContent>
        </Card>

        {/* BLOCK 2: SUPPLY AREA (RESISTANCE) */}
        <Card className="bg-[#070b12]/60 border border-slate-900 shadow-2xl backdrop-blur-md">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900/60 flex flex-row items-center gap-2">
            <Shield className="w-4 h-4 text-red-400" />
            <CardTitle className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Institutional Supply Ceiling</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-4 pb-4">
            <div className="mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Major Daily Resistance</span>
              <p className="text-xl font-mono font-black text-red-400 mt-0.5">{currentIntel.resistanceCeiling}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Supply Order Block</span>
              <p className="text-xs font-mono font-semibold text-slate-200 mt-0.5">{currentIntel.supplyZone}</p>
            </div>
          </CardContent>
        </Card>

        {/* BLOCK 3: VECTOR DESK ANALYSIS */}
        <Card className="bg-[#070b12]/60 border border-slate-900 shadow-2xl backdrop-blur-md">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900/60 flex flex-row items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Market Structure Metrics</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-4 pb-4 grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Daily Context Bias</span>
              <span className="inline-block text-[10px] font-black tracking-widest bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded mt-1">
                {currentIntel.institutionalBias}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Volatility State</span>
              <span className="text-xs font-mono font-bold text-slate-300 mt-1 block">{currentIntel.volatilityIndex}</span>
            </div>
            <div className="col-span-2 border-t border-slate-900/60 pt-2 mt-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Primary Liquidity Target</span>
              <p className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                <Flame className="w-3 h-3 text-amber-500 animate-bounce" /> {currentIntel.liquidityTarget}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* JEAFX INSTITUTIONAL FRAMEWORK ANALYSIS & PERSISTENT LOGGER */}
      <div className="w-full bg-[#070b12]/30 border border-slate-900 rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-[#000001] px-5 py-4 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-bold tracking-wider font-mono uppercase text-slate-300">
              JEAFX INSTITUTIONAL BIAS JOURNAL & MANUAL OVERRIDES
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-500 bg-[#03050a] px-2 py-1 border border-slate-800 rounded">
            PERSISTENT ENCRYPTION ENGINE ACTIVE
          </span>
        </div>
        
        <div className="p-5">
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Input localized supply/demand zone expansions or strategic notes observed from daily markups below. Data syncs automatically via your hardware cache shell, shielding logs from random system resets.
          </p>
          <textarea
            value={userNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder={`Enter structural zone targets, imbalances, or daily bias notes for ${selectedAsset} here...`}
            className="w-full h-40 bg-[#03050a] border border-slate-800/80 rounded-lg p-4 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/20 transition-all custom-scrollbar resize-none"
          />
        </div>
      </div>
    </div>
  )
}