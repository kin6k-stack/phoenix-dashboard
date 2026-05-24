"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Activity, Crosshair, MapMap, ShieldAlert } from "lucide-react"

export function SessionIntelligence({ trades = [] }: { trades: any[] }) {
  const [selectedAsset, setSelectedAsset] = useState<"XAUUSD" | "USTEC">("XAUUSD")

  // Interactive State for Jeafx S&D Mapping
  const [keyLevels, setKeyLevels] = useState({
    XAUUSD: { majorSupply: "", minorSupply: "", poc: "", minorDemand: "", majorDemand: "" },
    USTEC: { majorSupply: "", minorSupply: "", poc: "", minorDemand: "", majorDemand: "" }
  })

  const handleLevelChange = (level: string, value: string) => {
    setKeyLevels(prev => ({
      ...prev,
      [selectedAsset]: { ...prev[selectedAsset], [level]: value }
    }))
  }

  const now = new Date()
  const isWeekend = now.getDay() === 0 || now.getDay() === 6
  const hour = now.getUTCHours() - 4 // GMT-4 NYC Time assumption
  const isLondon = hour >= 3 && hour < 12
  const isNY = hour >= 8 && hour < 17

  return (
    <div className="space-y-6">
      {/* Row 1: Session Clocks */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className={`border-border/40 bg-card/40 backdrop-blur-md ${isWeekend ? 'opacity-50' : 'shadow-[0_0_20px_rgba(59,130,246,0.1)]'}`}>
          <CardContent className="p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
            <Clock className={`mb-3 ${isLondon && !isWeekend ? 'text-blue-400' : 'text-muted-foreground'}`} size={24} />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">London Session</h3>
            <p className={`text-xl font-black ${isLondon && !isWeekend ? 'text-foreground' : 'text-muted-foreground'}`}>
              {isWeekend ? "CLOSED" : isLondon ? "ACTIVE" : "WAITING"}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-border/40 bg-card/40 backdrop-blur-md ${isWeekend ? 'opacity-50' : 'shadow-[0_0_20px_rgba(52,211,153,0.1)]'}`}>
          <CardContent className="p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
            <Clock className={`mb-3 ${isNY && !isWeekend ? 'text-emerald-400' : 'text-muted-foreground'}`} size={24} />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">New York Session</h3>
            <p className={`text-xl font-black ${isNY && !isWeekend ? 'text-foreground' : 'text-muted-foreground'}`}>
              {isWeekend ? "CLOSED" : isNY ? "ACTIVE" : "WAITING"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(244,63,94,0.1)]">
          <CardContent className="p-6 flex flex-col justify-center items-center text-center">
            <ShieldAlert className="mb-3 text-rose-400" size={24} />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">Engine Safety</h3>
            <p className="text-xl font-black text-foreground">
              {isWeekend ? "OFFLINE (0.00)" : "SYSTEM NOMINAL"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Jeafx S&D Level Mapper */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.2)]">
        <div className="p-6 border-b border-border/40 flex justify-between items-center bg-background/30">
          <div>
            <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-foreground">
              <Crosshair size={16} className="text-amber-400" /> Jeafx Institutional Framework
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Manual Supply & Demand Mapping Workspace</p>
          </div>
          <div className="flex bg-background/50 border border-border/50 rounded-md p-1">
            <button onClick={() => setSelectedAsset("XAUUSD")} className={`px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all ${selectedAsset === "XAUUSD" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground"}`}>Gold (XAU)</button>
            <button onClick={() => setSelectedAsset("USTEC")} className={`px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all ${selectedAsset === "USTEC" ? "bg-indigo-500/20 text-indigo-400" : "text-muted-foreground"}`}>Nasdaq (NQ)</button>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Major Supply (Target)</label>
                <input type="text" value={keyLevels[selectedAsset].majorSupply} onChange={(e) => handleLevelChange('majorSupply', e.target.value)} placeholder="e.g. 2350.50" className="w-full bg-background/50 border border-rose-500/30 rounded px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-rose-500 outline-none font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-rose-400/70">Minor Supply (Resistance)</label>
                <input type="text" value={keyLevels[selectedAsset].minorSupply} onChange={(e) => handleLevelChange('minorSupply', e.target.value)} placeholder="e.g. 2342.00" className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-rose-400 outline-none font-mono" />
              </div>
              <div className="space-y-1 py-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Point of Control (POC)</label>
                <input type="text" value={keyLevels[selectedAsset].poc} onChange={(e) => handleLevelChange('poc', e.target.value)} placeholder="e.g. 2330.00" className="w-full bg-background/50 border border-amber-500/30 rounded px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-amber-500 outline-none font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">Minor Demand (Support)</label>
                <input type="text" value={keyLevels[selectedAsset].minorDemand} onChange={(e) => handleLevelChange('minorDemand', e.target.value)} placeholder="e.g. 2315.00" className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-emerald-400 outline-none font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Major Demand (Origin)</label>
                <input type="text" value={keyLevels[selectedAsset].majorDemand} onChange={(e) => handleLevelChange('majorDemand', e.target.value)} placeholder="e.g. 2300.00" className="w-full bg-background/50 border border-emerald-500/30 rounded px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono" />
              </div>
            </div>

            {/* Visual Level Mapper */}
            <div className="bg-background/40 border border-border/40 rounded-xl p-6 relative flex flex-col justify-between min-h-[300px]">
              <div className="absolute inset-0 flex justify-center py-8 z-0">
                <div className="w-px h-full bg-gradient-to-b from-rose-500/50 via-amber-500/20 to-emerald-500/50 border-dashed border-l border-border/50"></div>
              </div>
              
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-16 text-right"><span className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Major</span></div>
                <div className="h-0.5 flex-1 bg-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                <div className="w-24 bg-background/80 border border-rose-500/50 px-2 py-1 rounded text-center"><span className="text-xs font-mono font-bold text-foreground">{keyLevels[selectedAsset].majorSupply || "-----"}</span></div>
              </div>

              <div className="relative z-10 flex items-center gap-4">
                <div className="w-16 text-right"><span className="text-[10px] font-black uppercase text-rose-400/70 tracking-widest">Minor</span></div>
                <div className="h-px flex-1 bg-border/80 border-dashed border-t"></div>
                <div className="w-24 bg-background/80 border border-border/80 px-2 py-1 rounded text-center"><span className="text-xs font-mono font-bold text-muted-foreground">{keyLevels[selectedAsset].minorSupply || "-----"}</span></div>
              </div>

              <div className="relative z-10 flex items-center gap-4 py-4">
                <div className="w-16 text-right"><span className="text-[10px] font-black uppercase text-amber-400 tracking-widest">POC</span></div>
                <div className="h-0.5 flex-1 bg-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                <div className="w-24 bg-amber-500/10 border border-amber-500/50 px-2 py-1 rounded text-center"><span className="text-xs font-mono font-bold text-amber-400">{keyLevels[selectedAsset].poc || "-----"}</span></div>
              </div>

              <div className="relative z-10 flex items-center gap-4">
                <div className="w-16 text-right"><span className="text-[10px] font-black uppercase text-emerald-400/70 tracking-widest">Minor</span></div>
                <div className="h-px flex-1 bg-border/80 border-dashed border-t"></div>
                <div className="w-24 bg-background/80 border border-border/80 px-2 py-1 rounded text-center"><span className="text-xs font-mono font-bold text-muted-foreground">{keyLevels[selectedAsset].minorDemand || "-----"}</span></div>
              </div>

              <div className="relative z-10 flex items-center gap-4">
                <div className="w-16 text-right"><span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Major</span></div>
                <div className="h-0.5 flex-1 bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <div className="w-24 bg-background/80 border border-emerald-500/50 px-2 py-1 rounded text-center"><span className="text-xs font-mono font-bold text-foreground">{keyLevels[selectedAsset].majorDemand || "-----"}</span></div>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}