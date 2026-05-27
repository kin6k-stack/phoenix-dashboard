"use client"

import { useState } from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ShieldCheck, Activity, Filter, Clock, Percent, ShieldAlert } from "lucide-react"

interface Trade {
  id: string
  bot?: string
  symbol: string
  type: string
  profit: number
  grossProfit?: number
  commission?: number
  swap?: number
  date: string
  timestamp?: number
  entryPrice?: number
  exitPrice?: number
  mae?: number
  mfe?: number
  durationSeconds?: number
  setup?: string
}

export function PerformanceView({ trades = [] }: { trades: Trade[] }) {
  const [assetFilter, setAssetFilter] = useState<string>("ALL")
  const [setupFilter, setSetupFilter] = useState<string>("ALL")

  // --- COMPREHENSIVE PERFORMANCE METRICS ENGINE ---
  const calculatedMetrics = () => {
    let currentBalance = 10000 // Standard baseline reference
    const equityCurveData: any[] = [{ index: 0, balance: currentBalance, drawdown: 0 }]
    
    let grossProfit = 0
    let grossLoss = 0
    let winCount = 0
    let totalTradesCount = 0
    let maxDrawdownPoints = 0
    let peakBalance = currentBalance
    
    let accumulatedDuration = 0
    let accumulatedExitEfficiency = 0
    let accumulatedMae = 0
    let accumulatedMfe = 0
    let winTradesDuration = 0
    let lossTradesDuration = 0

    // Filter loops matching user selector matrix criteria
    const filteredTrades = trades.filter(t => {
      const matchAsset = assetFilter === "ALL" || t.symbol === assetFilter
      const matchSetup = setupFilter === "ALL" || t.setup === setupFilter || (setupFilter === "MANUAL" && !t.bot)
      return matchAsset && matchSetup
    })

    filteredTrades.forEach((trade, i) => {
      totalTradesCount++
      const p = Number(trade.profit || 0)
      currentBalance += p
      
      accumulatedDuration += Number(trade.durationSeconds || 600)
      accumulatedMae += Number(trade.mae || Math.abs(p * 0.15))
      accumulatedMfe += Number(trade.mfe || Math.abs(p * 1.35))

      if (p >= 0) {
        grossProfit += p
        winCount++
        winTradesDuration += Number(trade.durationSeconds || 600)
      } else {
        grossLoss += Math.abs(p)
        lossTradesDuration += Number(trade.durationSeconds || 600)
      }

      // Peak drawdown trailing high-water-mark lookups
      if (currentBalance > peakBalance) peakBalance = currentBalance
      const currentDrawdown = peakBalance - currentBalance
      if (currentDrawdown > maxDrawdownPoints) maxDrawdownPoints = currentDrawdown

      // Mathematical Exit Efficiency Model evaluation mapping
      const localMae = Number(trade.mae || Math.abs(p * 0.2))
      const localMfe = Number(trade.mfe || Math.abs(p * 1.4))
      const totalPotentialRange = localMfe + localMae
      const tradeEfficiency = totalPotentialRange > 0 ? ((p + localMae) / totalPotentialRange) * 100 : 85
      accumulatedExitEfficiency += Math.max(0, Math.min(100, tradeEfficiency))

      equityCurveData.push({
        index: i + 1,
        balance: Number(currentBalance.toFixed(2)),
        drawdown: Number(currentDrawdown.toFixed(2))
      });
    });

    const totalTrades = totalTradesCount || 1
    const winRate = (winCount / totalTrades) * 100
    const lossCount = totalTrades - winCount
    const avgWin = winCount > 0 ? grossProfit / winCount : 0
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss

    return {
      netProfit: currentBalance - 10000,
      winRate,
      profitFactor,
      expectancy,
      maxDrawdown: maxDrawdownPoints,
      avgWin,
      avgLoss,
      avgHoldingTime: accumulatedDuration / totalTrades,
      exitEfficiency: accumulatedExitEfficiency / totalTrades,
      avgMae: accumulatedMae / totalTrades,
      avgMfe: accumulatedMfe / totalTrades,
      equityCurveData
    }
  }

  const stats = calculatedMetrics()

  return (
    <div className="w-full min-h-screen bg-[#020406] text-slate-200 p-6 font-sans">
      
      {/* HUD CONTROL MATRIX FILTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-[#070b12]/60 p-4 border border-slate-900 rounded-xl backdrop-blur-md">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-green-400" /> Operational Asset Allocation
          </label>
          <select 
            value={assetFilter} 
            onChange={(e) => setAssetFilter(e.target.value)} 
            className="w-full bg-[#03050a] border border-slate-800 text-xs text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-green-500/40 font-mono"
          >
            <option value="ALL">OMNI ENGINE METRICS (ALL ASSETS)</option>
            <option value="XAUUSD">🥇 XAUUSD (GOLD DESK)</option>
            <option value="USTEC">⚡ USTEC (NASDAQ MATRIX)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-green-400" /> Strategy Pipeline Segment
          </label>
          <select 
            value={setupFilter} 
            onChange={(e) => setSetupFilter(e.target.value)} 
            className="w-full bg-[#03050a] border border-slate-800 text-xs text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-green-500/40 font-mono"
          >
            <option value="ALL">ALL CAPTURED CONFLUENCE RUNTIMES</option>
            <option value="ADX Momentum Momentum">AUTOMATED: ADX MOMENTUM</option>
            <option value="Trend Continuation Reversion">AUTOMATED: TREND REVERSAL</option>
            <option value="MANUAL">MANUAL WORKFLOW LAYER</option>
          </select>
        </div>
      </div>

      {/* INSTANT TOP LINE HIGHLIGHT METRICS */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#070b12]/50 border border-slate-900 text-slate-100">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Absolute Net Return</span>
            <p className={`text-lg font-mono font-black mt-0.5 ${stats.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
              {stats.netProfit >= 0 ? `+$${stats.netProfit.toFixed(2)}` : `-$${Math.abs(stats.netProfit).toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#070b12]/50 border border-slate-900 text-slate-100">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">System Profit Factor</span>
            <p className="text-lg font-mono font-black text-slate-100 mt-0.5">{stats.profitFactor.toFixed(3)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#070b12]/50 border border-slate-900 text-slate-100">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Statistical Expectancy</span>
            <p className="text-lg font-mono font-black text-amber-400 mt-0.5">${stats.expectancy.toFixed(2)} / Trade</p>
          </CardContent>
        </Card>
        <Card className="bg-[#070b12]/50 border border-slate-900 text-slate-100">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Win/Loss Distribution</span>
            <p className="text-lg font-mono font-black text-green-400 mt-0.5">{stats.winRate.toFixed(1)}% WR</p>
          </CardContent>
        </Card>
      </div>

      {/* DOUBLE COMPREHENSIVE PERFORMANCE GRAPH LAYERS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card className="bg-[#070b12]/30 border border-slate-900 overflow-hidden shadow-2xl">
          <CardHeader className="bg-[#000001] border-b border-slate-900/60 py-3 px-4 flex flex-row items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <CardTitle className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Chronological Account Equity Curve</CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.equityCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0d131f" />
                <XAxis dataKey="index" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} domain={['dataMin - 50', 'dataMax + 50']} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#000001', borderColor: '#1e293b', color: '#f8fafc', fontSize: 11 }} />
                <Line type="monotone" dataKey="balance" stroke="#22c55e" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#070b12]/30 border border-slate-900 overflow-hidden shadow-2xl">
          <CardHeader className="bg-[#000001] border-b border-slate-900/60 py-3 px-4 flex flex-row items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <CardTitle className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Underwater Peak-To-Trough Deficit Drawdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.equityCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0d131f" />
                <XAxis dataKey="index" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} inverted />
                <Tooltip contentStyle={{ backgroundColor: '#000001', borderColor: '#1e293b', color: '#f8fafc', fontSize: 11 }} />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="rgba(239, 68, 68, 0.06)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* DETAILED CRITIQUE SEGMENT MODULES (INTEGRATED BELOW CHARTS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
        <div className="bg-[#070b12]/40 p-4 border border-slate-900 rounded-xl backdrop-blur-sm flex flex-col justify-between">
          <span className="text-slate-500 font-bold block mb-1 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-green-400" /> AVERAGE HOLDING TIME
          </span>
          <p className="text-slate-100 text-sm font-black mt-2">
            {(stats.avgHoldingTime / 60).toFixed(1)} Minutes / Execution Cycle
          </p>
        </div>

        <div className="bg-[#070b12]/40 p-4 border border-slate-900 rounded-xl backdrop-blur-sm flex flex-col justify-between">
          <span className="text-slate-500 font-bold block mb-1 uppercase tracking-wider flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-green-400" /> OPTIMAL EXIT EFFICIENCY
          </span>
          <p className="text-green-400 text-sm font-black mt-2">
            {stats.exitEfficiency.toFixed(1)}% Precision Threshold Rate
          </p>
        </div>

        <div className="bg-[#070b12]/40 p-4 border border-slate-900 rounded-xl backdrop-blur-sm flex flex-col justify-between">
          <span className="text-slate-500 font-bold block mb-1 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> AVERAGE EXCURSION LIMITS
          </span>
          <p className="text-slate-300 text-[11px] font-bold mt-2 leading-relaxed">
            Avg MFE: <span className="text-green-400 font-black">${stats.avgMfe.toFixed(2)}</span>
            <br />
            Avg MAE: <span className="text-red-400 font-black">-${stats.avgMae.toFixed(2)}</span>
          </p>
        </div>
      </div>

    </div>
  )
}