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

interface SlimPnLChartProps {
  trades: Trade[]
}

export function SlimPnLChart({ trades = [] }: SlimPnLChartProps) {
  // 1. CALCULATE TRUE INTRADAY METRICS
  const todayStr = new Date().toDateString();
  const dailyTrades = trades.filter(t => new Date(t.date).toDateString() === todayStr);
  const dynamicDailyPnL = dailyTrades.reduce((sum, t) => sum + Number(t.rMultiple), 0);
  const totalAccumulatedPnL = trades.reduce((sum, t) => sum + Number(t.rMultiple), 0);
  
  const livePnLValue = dailyTrades.length > 0 ? dynamicDailyPnL : totalAccumulatedPnL;
  const isPositive = livePnLValue >= 0;

  // 2. PARSE AND MAP RUNNING CUMULATIVE CHRONOLOGICAL EQUITY WAVE
  // Sort trades chronologically from oldest to newest to generate a clean timeline curve
  const chronologicalTrades = trades
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningPnL = 0;
  const waveData = chronologicalTrades.map((trade, index) => {
    runningPnL += Number(trade.rMultiple);
    return {
      index: index + 1,
      pnl: Number(runningPnL.toFixed(2)),
      symbol: trade.symbol,
      date: new Date(trade.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
  });

  // Inject an absolute base starter anchor point if the database is currently clear to prevent component collapse
  const fallbackWaveData = waveData.length > 0 ? waveData : [{ index: 0, pnl: 0, symbol: "Base", date: "Start" }];

  return (
    <Card className="border-slate-800 bg-[#070b12]/60">
      <CardHeader className="pb-2 bg-[#03050a] rounded-t-xl border-b border-slate-900">
        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {dailyTrades.length > 0 ? "Net Daily P&L Tracker" : "Net Total P&L Tracker"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Metric Value Display Header */}
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-black tracking-tight transition-colors duration-300 ${
            isPositive ? "text-emerald-400" : "text-rose-500"
          }`}>
            {isPositive ? "+" : ""}${livePnLValue.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-tight">USD</span>
        </div>

        {/* Dynamic Context Tag */}
        <div className="flex items-center gap-1.5 mt-2 text-xs font-bold uppercase tracking-wider">
          {isPositive ? (
            <>
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-500">Account expansion active</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3 w-3 text-rose-500" />
              <span className="text-rose-400">Drawdown active</span>
            </>
          )}
          <span className="text-slate-600 font-normal text-[10px] lowercase tracking-normal">
            ({dailyTrades.length > 0 ? "today's metrics" : "all-time logs curve"})
          </span>
        </div>

        {/* 🔥 THE PREMIUM MONOTONE AREA WAVE CHART */}
        <div className="mt-5 h-20 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fallbackWaveData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                {/* Glowing Dynamic Gradients mapped safely to performance directions */}
                <linearGradient id="wavePerformanceColor" x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="5%" 
                    stopColor={isPositive ? "rgb(16, 185, 129)" : "rgb(244, 63, 94)"} 
                    stopOpacity={0.25}
                  />
                  <stop 
                    offset="95%" 
                    stopColor={isPositive ? "rgb(16, 185, 129)" : "rgb(244, 63, 94)"} 
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              
              {/* Internal structured boundary constraints hidden to keep layout minimalist and flush */}
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
              
              {/* Pro Custom Tooltip Overlays */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-border px-2.5 py-1.5 rounded shadow-xl text-[10px] space-y-0.5">
                        <p className="text-muted-foreground font-bold uppercase tracking-wider">{data.date} ({data.symbol})</p>
                        <p className={`font-black ${data.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          Equity: ${data.pnl.toFixed(2)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              
              {/* The Active Vector Area Wave line */}
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={isPositive ? "#10b981" : "#f43f5e"}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#wavePerformanceColor)"
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}