"use client"

import { useState } from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ShieldCheck, Activity, Filter, Clock, Percent } from "lucide-react"

export function PerformanceView({ trades = [] }: { trades: any[] }) {
  const [assetFilter, setAssetFilter] = useState<string>("ALL")
  const [setupFilter, setSetupFilter] = useState<string>("ALL")

  // --- ARCHITECTURAL DATA COMPUTATION ENGINE ---
  const calculatedMetrics = () => {
    let balancePoints = 10000;
    const equityCurveData: any[] = [{ index: 0, balance: balancePoints, drawdown: 0 }];
    
    let grossProfit = 0; let grossLoss = 0;
    let winCount = 0; let totalCommission = 0;
    let peakEquity = balancePoints; let maxDrawdown = 0;
    let totalDuration = 0; let totalExitEfficiency = 0;

    const filtered = trades.filter(t => {
      const matchAsset = assetFilter === "ALL" || t.symbol === assetFilter;
      const matchSetup = setupFilter === "ALL" || t.setup === setupFilter;
      return matchAsset && matchSetup;
    });

    filtered.forEach((trade, i) => {
      const p = Number(trade.profit || 0);
      balancePoints += p;
      totalCommission += Number(trade.commission || 0) + Number(trade.swap || 0);
      totalDuration += Number(trade.durationSeconds || 600);

      if (p >= 0) { grossProfit += p; winCount++; } else { grossLoss += Math.abs(p); }

      if (balancePoints > peakEquity) peakEquity = balancePoints;
      const currentDD = peakEquity - balancePoints;
      if (currentDD > maxDrawdown) maxDrawdown = currentDD;

      // Simulated MAE/MFE dynamic tracking calculations
      const mae = Number(trade.mae || Math.abs(p * 0.2));
      const mfe = Number(trade.mfe || Math.abs(p * 1.5));
      const optimalExit = entryPriceDistance(trade) + mfe;
      const actualExit = entryPriceDistance(trade) + p;
      totalExitEfficiency += optimalExit > 0 ? (actualExit / optimalExit) * 100 : 85;

      equityCurveData.push({
        index: i + 1,
        balance: Number(balancePoints.toFixed(2)),
        drawdown: Number(currentDD.toFixed(2))
      });
    });

    const totalTrades = filtered.length || 1;
    const winRate = (winCount / totalTrades) * 100;
    const avgWin = winCount > 0 ? grossProfit / winCount : 0;
    const avgLoss = (totalTrades - winCount) > 0 ? grossLoss / (totalTrades - winCount) : 1;
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

    return {
      netProfit: balancePoints - 10000, winRate, profitFactor, expectancy,
      maxDrawdown, avgWin, avgLoss, totalDuration, totalTrades,
      exitEfficiency: totalExitEfficiency / totalTrades,
      equityCurveData
    };
  };

  const entryPriceDistance = (t: any) => Math.abs(Number(t.entryPrice || 0));
  const stats = calculatedMetrics();

  return (
    <div className="w-full min-h-screen bg-[#020406] text-slate-200 p-6 font-sans">
      
      {/* FILTER CONTROLS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-[#070b12] p-4 border border-slate-900 rounded-xl">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-1"><Activity className="w-3 h-3 text-green-400" /> Asset Segment</label>
          <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} className="w-full bg-[#03050a] border border-slate-800 text-xs text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-green-500/40">
            <option value="ALL">OMNI VECTOR (ALL ASSETS)</option>
            <option value="XAUUSD">XAUUSD (GOLDsentinel)</option>
            <option value="USTEC">USTEC (USTECm INDEX)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-1"><Filter className="w-3 h-3 text-green-400" /> Strategy Profile</label>
          <select value={setupFilter} onChange={(e) => setSetupFilter(e.target.value)} className="w-full bg-[#03050a] border border-slate-800 text-xs text-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:border-green-500/40">
            <option value="ALL">ALL CONFLUENCE SCHEMAS</option>
            <option value="ADX Momentum Momentum">ADX MOMENTUM</option>
            <option value="Trend Continuation Reversion">TREND REVERSAL</option>
          </select>
        </div>
      </div>

      {/* HIGH LEVEL STATS BAR */}
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
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Expectancy Payload</span>
            <p className="text-lg font-mono font-black text-amber-400 mt-0.5">${stats.expectancy.toFixed(2)} / Trade</p>
          </CardContent>
        </Card>
        <Card className="bg-[#070b12]/50 border border-slate-900 text-slate-100">
          <CardContent className="p-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Calculated Win Distribution</span>
            <p className="text-lg font-mono font-black text-green-400 mt-0.5">{stats.winRate.toFixed(1)}% WR</p>
          </CardContent>
        </Card>
      </div>

      {/* DOUBLE GRAPH TIMELINE PANEL GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        
        {/* GRAPH 1: CHRONOLOGICAL LOT EQUITY CURVE */}
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
                <YAxis stroke="#475569" fontSize={10} domain={['dataMin - 100', 'dataMax + 100']} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#000001', borderColor: '#1e293b', color: '#f8fafc', fontSize: 11 }} />
                <Line type="monotone" dataKey="balance" stroke="#22c55e" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* GRAPH 2: UNDERWATER CURVE DRAWDOWN METRIC */}
        <Card className="bg-[#070b12]/30 border border-slate-900 overflow-hidden shadow-2xl">
          <CardHeader className="bg-[#000001] border-b border-slate-900/60 py-3 px-4 flex flex-row items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-500" />
            <CardTitle className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Underwater Peak-To-Trough Deficit Drawdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.equityCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0d131f" />
                <XAxis dataKey="index" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} inverted />
                <Tooltip contentStyle={{ backgroundColor: '#000001', borderColor: '#1e293b', color: '#f8fafc', fontSize: 11 }} />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="rgba(239, 68, 68, 0.08)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM SEGMENT: EFFICIENCY CRITIQUE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
        <div className="bg-[#070b12]/40 p-4 border border-slate-900 rounded-lg">
          <span className="text-slate-500 font-bold block mb-1">AVERAGE HOLDING TIME:</span>
          <p className="text-slate-200 text-sm font-black">{(stats.totalDuration / stats.totalTrades / 60).toFixed(1)} Minutes / Setup</p>
        </div>
        <div className="bg-[#070b12]/40 p-4 border border-slate-800/40 rounded-lg">
          <span className="text-slate-500 font-bold block mb-1">OPTIMAL EXIT EFFICIENCY:</span>
          <p className="text-green-400 text-sm font-black">{stats.exitEfficiency.toFixed(1)}% Efficiency Rate</p>
        </div>
        <div className="bg-[#070b12]/40 p-4 border border-slate-900 rounded-lg">
          <span className="text-slate-500 font-bold block mb-1">AVERAGE EXCURSION LIMITS:</span>
          <p className="text-amber-500 text-sm font-black">Avg Win: ${stats.avgWin.toFixed(2)} / Avg Loss: -${stats.avgLoss.toFixed(2)}</p>
        </div>
      </div>

    </div>
  )
}