"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
}

export function SlimPnLChart({ trades = [] }: { trades: Trade[] }) {
  const todayStr = new Date().toDateString()
  const dailyTrades = trades.filter(t => new Date(t.date).toDateString() === todayStr)
  const dynamicDailyPnL = dailyTrades.reduce((sum, t) => sum + Number(t.rMultiple), 0)
  const totalAccumulatedPnL = trades.reduce((sum, t) => sum + Number(t.rMultiple), 0)

  const livePnLValue = dailyTrades.length > 0 ? dynamicDailyPnL : totalAccumulatedPnL
  const isPositive = livePnLValue >= 0
  const label = dailyTrades.length > 0 ? "Net Daily P&L" : "Net Total P&L"

  const chronologicalTrades = trades.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  let runningPnL = 0
  const waveData = chronologicalTrades.map((trade, index) => {
    runningPnL += Number(trade.rMultiple)
    return { index: index + 1, pnl: Number(runningPnL.toFixed(2)), symbol: trade.symbol, date: new Date(trade.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }
  })
  const chartData = waveData.length > 0 ? waveData : [{ index: 0, pnl: 0, symbol: "Base", date: "Start" }]

  return (
    <Card className="border-border/40 bg-card/60 shadow-lg">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">

        {/* Value + trend label */}
        <div className="bg-background/50 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black tracking-tight ${isPositive ? "text-emerald-400" : "text-rose-500"}`}>
              {isPositive ? "+" : ""}${livePnLValue.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-tight">USD</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs font-bold uppercase tracking-wider">
            {isPositive ? (
              <><TrendingUp className="h-3 w-3 text-emerald-400" /><span className="text-emerald-500">Expansion active</span></>
            ) : (
              <><TrendingDown className="h-3 w-3 text-rose-500" /><span className="text-rose-400">Drawdown active</span></>
            )}
          </div>
        </div>

        {/* Chart — same container pattern as performance tab */}
        <div className="rounded-xl border border-border/30 bg-background/20 overflow-hidden">
          <div className="flex items-center px-3 py-2 border-b border-border/20 bg-background/30">
            <TrendingUp className={`h-3 w-3 mr-1.5 ${isPositive ? "text-emerald-400" : "text-rose-400"}`} />
            <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
              Equity Wave
            </span>
          </div>
          <div className="h-20 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 3, right: 3, left: 3, bottom: 0 }}>
                <defs>
                  <linearGradient id="waveColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? "rgb(16,185,129)" : "rgb(244,63,94)"} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={isPositive ? "rgb(16,185,129)" : "rgb(244,63,94)"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-card/95 border border-border/50 px-2.5 py-1.5 rounded shadow-xl text-[10px] space-y-0.5">
                          <p className="text-muted-foreground font-bold uppercase tracking-wider">{d.date} ({d.symbol})</p>
                          <p className={`font-black ${d.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            ${d.pnl.toFixed(2)}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area type="monotone" dataKey="pnl" stroke={isPositive ? "#10b981" : "#f43f5e"} strokeWidth={2} fillOpacity={1} fill="url(#waveColor)" animationDuration={600} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
