"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, BarChart3, PieChart, ShieldAlert, Award } from "lucide-react"

interface Trade {
  id: string
  ticket: string
  symbol: string
  type: string
  profit: number
  date: string
}

export function TradingCalendar({ trades = [] }: { trades: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()

  const mapDayMetrics = (day: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const match = trades.filter(t => t.date === dStr);
    const net = match.reduce((sum, t) => sum + Number(t.profit), 0);
    const wins = match.filter(t => t.profit >= 0).length;
    return { count: match.length, net, wr: match.length > 0 ? (wins / match.length) * 100 : 0 };
  }

  // Monthly Cumulative Calculations
  const calculatedMonthSummary = () => {
    let monthlyTotal = 0; let totalWins = 0; let totalLosses = 0;
    let grossProfit = 0; let grossLoss = 0;

    trades.forEach(t => {
      const p = Number(t.profit);
      monthlyTotal += p;
      if (p >= 0) { grossProfit += p; totalWins++; } else { grossLoss += Math.abs(p); totalLosses++; }
    });

    return {
      net: monthlyTotal,
      pf: grossLoss > 0 ? grossProfit / grossLoss : grossProfit,
      ratio: totalLosses > 0 ? totalWins / totalLosses : totalWins
    };
  }

  const summary = calculatedMonthSummary();

  return (
    <div className="w-full min-h-screen bg-[#020406] text-slate-200 p-6 font-sans">
      
      {/* HEADER CONTROLS GRID */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black font-mono tracking-widest text-green-400">
            {currentDate.toLocaleString('en-US', { month: 'long' }).toUpperCase()} {year}
          </h2>
          <div className="flex bg-[#000001] border border-slate-800 rounded-lg overflow-hidden">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 border-r border-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-900 transition-colors cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* SUMMARY TILES CONTAINER */}
        <div className="flex gap-4 font-mono text-xs">
          <div className="bg-[#070b12] px-3 py-1.5 border border-slate-900 rounded-lg">
            <span className="text-slate-500 font-bold uppercase">Accumulated Monthly PnL:</span>
            <span className={`font-black ml-1.5 ${summary.net >= 0 ? "text-green-400" : "text-red-400"}`}>
              {summary.net >= 0 ? `+$${summary.net.toFixed(2)}` : `-$${Math.abs(summary.net).toFixed(2)}`}
            </span>
          </div>
          <div className="bg-[#070b12] px-3 py-1.5 border border-slate-900 rounded-lg">
            <span className="text-slate-500 font-bold uppercase">Profit Factor:</span>
            <span className="text-slate-100 font-black ml-1.5">{summary.pf.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* PRIMARY TARGET CALENDAR MATRIX LAYER GRID */}
      <div className="border border-slate-900/60 rounded-xl overflow-hidden bg-[#070b12]/20 backdrop-blur-md shadow-2xl">
        <div className="grid grid-cols-7 bg-[#000001] text-[10px] font-black uppercase tracking-widest text-slate-500 text-center py-3.5 border-b border-slate-900/80">
          <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
        </div>

        <div className="grid grid-cols-7 text-xs">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-28 border-b border-r border-slate-900/40 bg-[#020406]/40" />
          ))}

          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1;
            const data = mapDayMetrics(day);
            
            let colorWeight = "bg-[#04060b]/20 hover:bg-slate-900/40";
            if (data.count > 0) {
              colorWeight = data.net >= 0 
                ? "bg-green-950/10 border border-green-500/10 hover:bg-green-950/20" 
                : "bg-red-950/10 border border-red-500/10 hover:bg-red-950/20";
            }

            return (
              <div key={`day-${day}`} className={`h-28 p-2.5 border-b border-r border-slate-900/60 flex flex-col justify-between transition-all ${colorWeight}`}>
                <span className="text-[11px] font-bold font-mono text-slate-500 block">{day}</span>
                {data.count > 0 && (
                  <div className="text-right font-mono space-y-0.5">
                    <span className="text-[9px] text-slate-500 font-semibold block">{data.count} Executions</span>
                    <span className={`text-[10px] font-bold block ${data.net >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {data.net >= 0 ? `+$${data.net.toFixed(2)}` : `-$${Math.abs(data.net).toFixed(2)}`}
                    </span>
                    <span className="text-[9px] text-slate-400 block">{data.wr.toFixed(0)}% WR</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  )
}