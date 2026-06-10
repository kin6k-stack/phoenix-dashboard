
"use client"

import { TrendingUp, TrendingDown, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "@/lib/use-theme"

interface SlimMonthlyPerformanceProps {
  winRate:number; trades:number; wins:number; losses:number; netPnL:number; fees:number
}

function getRingConfig(theme: string) {
  const T: Record<string,{
    winColor:string; lossColor:string; trackColor:string
    winGlow:string; centerBg:string; winDot:string; lossDot:string
  }> = {
    "black-white": {
      winColor:"#e5e5e5", lossColor:"#525252", trackColor:"rgba(80,80,80,0.2)",
      winGlow:"", centerBg:"rgba(10,10,10,0.7)", winDot:"#e5e5e5", lossDot:"#525252",
    },
    "violet": {
      winColor:"#a855f7", lossColor:"#fb7185", trackColor:"rgba(168,85,247,0.12)",
      winGlow:"drop-shadow(0 0 5px rgba(168,85,247,0.6))",
      centerBg:"rgba(15,10,24,0.7)", winDot:"#a855f7", lossDot:"#fb7185",
    },
    "dark": {
      winColor:"#34d399", lossColor:"#fb7185", trackColor:"rgba(52,211,153,0.1)",
      winGlow:"drop-shadow(0 0 5px rgba(52,211,153,0.65))",
      centerBg:"rgba(10,20,15,0.7)", winDot:"#34d399", lossDot:"#fb7185",
    },
    "gold": {
      winColor:"#22c55e", lossColor:"#ef4444", trackColor:"rgba(34,197,94,0.1)",
      winGlow:"", centerBg:"rgba(20,15,5,0.5)", winDot:"#22c55e", lossDot:"#ef4444",
    },
    "midnight": {
      winColor:"#22c55e", lossColor:"#fb7185", trackColor:"rgba(34,197,94,0.1)",
      winGlow:"", centerBg:"rgba(10,15,30,0.7)", winDot:"#22c55e", lossDot:"#fb7185",
    },
    // ── Bloomberg — orange terminal ──────────────────────────────────────────
    // Win arc: Bloomberg orange. Loss: red. Minimal glow.
    "bloomberg": {
      winColor:"#ff6b00", lossColor:"#ff3d3d", trackColor:"rgba(255,107,0,0.1)",
      winGlow:"drop-shadow(0 0 4px rgba(255,107,0,0.5))",
      centerBg:"rgba(8,8,6,0.8)", winDot:"#ff6b00", lossDot:"#ff3d3d",
    },
    // ── Nord — arctic frost ──────────────────────────────────────────────────
    // Win arc: frost blue. Loss: Nordic rose. Cool and calm.
    "nord": {
      winColor:"#88c0d0", lossColor:"#bf616a", trackColor:"rgba(136,192,208,0.12)",
      winGlow:"drop-shadow(0 0 3px rgba(136,192,208,0.5))",
      centerBg:"rgba(30,42,52,0.8)", winDot:"#88c0d0", lossDot:"#bf616a",
    },
    // ── Cyber — neon magenta Phoenix ────────────────────────────────────────
    // Win arc: neon green #00ff88. Loss: neon red. Hard glow.
    "cyber": {
      winColor:"#00ff88", lossColor:"#ff3d3d", trackColor:"rgba(0,255,136,0.08)",
      winGlow:"drop-shadow(0 0 7px rgba(0,255,136,0.7)) drop-shadow(0 0 14px rgba(0,255,136,0.3))",
      centerBg:"rgba(10,2,12,0.85)", winDot:"#00ff88", lossDot:"#ff3d3d",
    },
  }
  return T[theme] ?? T["dark"]
}

export function SlimMonthlyPerformance({
  winRate=0,trades=0,wins=0,losses=0,netPnL=0,fees=0
}: SlimMonthlyPerformanceProps) {
  const { theme } = useTheme()
  const safeWinRate = Math.min(Math.max(Number(winRate),0),100)
  const isProfitable = Number(netPnL) >= 0
  const C = 2 * Math.PI * 26
  const lossRate = 100 - safeWinRate
  const winOffset  = C - (safeWinRate/100)*C
  const lossOffset = C - (lossRate/100)*C
  const lossRot    = (safeWinRate/100)*360
  const ring = getRingConfig(theme)

  return (
    <Card className="border-border/40 bg-card/60 shadow-lg gap-0 py-0">
      <CardHeader className="px-3 py-2 border-b border-border/30">
        <CardTitle className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          <Activity className="h-3.5 w-3.5" style={{color:isProfitable?ring.winColor:ring.lossColor}}/>
          Monthly Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {/* Distribution ring */}
        <div className="flex items-center gap-3 bg-background/50 rounded-lg p-2.5">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 64 64"
              style={ring.winGlow?{filter:ring.winGlow}:undefined}>
              <circle cx="32" cy="32" r="26" stroke={ring.trackColor} strokeWidth="5" fill="none"/>
              <circle cx="32" cy="32" r="26" stroke={ring.lossColor} strokeWidth="5"
                strokeLinecap="butt" fill="none" strokeDasharray={C} strokeDashoffset={lossOffset}
                style={{transform:`rotate(${lossRot}deg)`,transformOrigin:"50% 50%"}} opacity={0.75}/>
              <circle cx="32" cy="32" r="26" stroke={ring.winColor} strokeWidth="5"
                strokeLinecap="butt" fill="none" strokeDasharray={C} strokeDashoffset={winOffset}
                className="transition-all duration-500"/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full"
              style={{background:ring.centerBg}}>
              <span className="text-[9px] font-black tracking-tighter"
                style={{color:safeWinRate>=50?ring.winColor:ring.lossColor}}>
                {safeWinRate}%
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Win Rate</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{background:ring.winDot}}/>
                <span className="text-[9px] font-black" style={{color:ring.winColor}}>{wins}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{background:ring.lossDot}}/>
                <span className="text-[9px] font-black" style={{color:ring.lossColor}}>{losses}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {[
            {icon:<Activity className="h-3 w-3 text-muted-foreground"/>, label:"Executions", val:String(trades), color:"text-foreground"},
            {icon:<TrendingUp className="h-3 w-3" style={{color:ring.winColor}}/>, label:"Targets Hit", val:String(wins), color:ring.winColor},
            {icon:<TrendingDown className="h-3 w-3" style={{color:ring.lossColor}}/>, label:"Loss Caps Hit", val:String(losses), color:ring.lossColor},
          ].map(r=>(
            <div key={r.label} className="flex items-center justify-between bg-background/50 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">{r.icon}<span className="text-[10px] text-muted-foreground uppercase tracking-widest">{r.label}</span></div>
              <span className="text-xs font-black tabular-nums" style={typeof r.color==="string"&&r.color.startsWith("#")?{color:r.color}:{}}>{r.val}</span>
            </div>
          ))}
        </div>

        <div className="pt-1.5 mt-1 border-t border-border/30 space-y-1.5">
          <div className="flex justify-between items-center bg-background/50 rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Net P&L</span>
            <span className="text-xs font-black tabular-nums" style={{color:isProfitable?ring.winColor:ring.lossColor}}>
              {isProfitable?"+":""}${Number(netPnL).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center bg-background/50 rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Fees</span>
            <span className="text-xs font-black tabular-nums" style={{color:ring.lossColor}}>
              -${Math.abs(Number(fees)).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
