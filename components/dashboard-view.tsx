"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, DollarSign, Target, Activity, BarChart3, Zap } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, CartesianGrid } from "recharts"

export function DashboardView({ trades = [] }: { trades: any[] }) {
  const totalPnl = trades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0)
  const wins = trades.filter(t => t.rMultiple > 0).length
  const losses = trades.filter(t => t.rMultiple < 0).length
  const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0
  const avgR = trades.length > 0 ? (trades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0) / trades.length) : 0

  let runningEquity = 200 
  const equityData = [...trades].reverse().map(t => {
    runningEquity += Number(t.rMultiple || 0)
    return { date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: runningEquity }
  })

  const weeklyMap = trades.reduce((acc: any, t) => {
    const week = `Wk ${Math.ceil(new Date(t.date).getDate() / 7)}`
    acc[week] = (acc[week] || 0) + Number(t.rMultiple || 0)
    return acc
  }, {})
  const weeklyData = Object.entries(weeklyMap).map(([name, pnl]) => ({ name, pnl }))

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return percent > 0 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-black drop-shadow-md">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <div className="p-8 space-y-6">
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Total P&L", val: `$${totalPnl.toFixed(2)}`, icon: DollarSign, color: totalPnl >= 0 ? "text-emerald-400" : "text-rose-400", glow: "shadow-[0_0_15px_rgba(16,185,129,0.1)]" },
          { label: "Win Rate", val: `${winRate}%`, icon: Target, color: "text-blue-400", glow: "shadow-[0_0_15px_rgba(59,130,246,0.1)]" },
          { label: "Total Trades", val: trades.length, icon: Activity, color: "text-indigo-400", glow: "shadow-[0_0_15px_rgba(99,102,241,0.1)]" },
          { label: "Avg Execution", val: `${avgR.toFixed(2)} R`, icon: Zap, color: "text-amber-400", glow: "shadow-[0_0_15px_rgba(245,158,11,0.1)]" }
        ].map((item, i) => (
          <Card key={i} className={`border-border/40 bg-card/40 backdrop-blur-md ${item.glow} hover:bg-card/60 transition-colors`}>
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-background/50 border border-border/50">
                  <item.icon size={14} className={item.color} />
                </div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{item.label}</p>
              </div>
              <p className={`text-3xl font-black ${item.color} tracking-tighter drop-shadow-sm`}>{item.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5 border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.2)]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-foreground">
              <TrendingUp size={16} className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]"/> System Equity Curve
            </h3>
            <span className="text-[10px] font-mono font-bold text-muted-foreground bg-background/50 px-2 py-1 rounded border border-border/50">Base: $200.00</span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.3} />
                <XAxis dataKey="date" hide />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#666', fontWeight: 'bold'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }}
                  itemStyle={{ color: '#34d399', fontWeight: '900', fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={3} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.2)] flex flex-col">
          <h3 className="text-sm font-black mb-2 flex items-center gap-2 uppercase tracking-widest text-foreground">
            <Target size={16} className="text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]"/> Distribution
          </h3>
          <div className="flex-1 min-h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[{name: 'Wins', value: wins}, {name: 'Losses', value: losses}]} 
                  dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={6} labelLine={false} label={renderCustomizedLabel}
                >
                  <Cell fill="#34d399" style={{ filter: 'drop-shadow(0px 0px 6px rgba(52,211,153,0.5))' }} />
                  <Cell fill="#fb7185" style={{ filter: 'drop-shadow(0px 0px 6px rgba(251,113,133,0.5))' }} />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-foreground drop-shadow-md">{trades.length}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Signals</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Compact Row */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.15)]">
          <h3 className="text-sm font-black mb-4 flex items-center gap-2 uppercase tracking-widest text-foreground">
            <BarChart3 size={16} className="text-indigo-400 drop-shadow-[0_0_5px_rgba(129,140,248,0.5)]"/> Weekly P&L
          </h3>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#666', fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#666', fontWeight: 'bold'}} />
                <Tooltip cursor={{fill: '#333', opacity: 0.2}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="pnl" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-border/40 bg-card/40 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.15)] flex flex-col">
          <h3 className="text-sm font-black mb-4 flex items-center gap-2 uppercase tracking-widest text-foreground">
            <Activity size={16} className="text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]"/> Recent Activity
          </h3>
          <div className="flex-1 overflow-auto pr-2 space-y-2.5 custom-scrollbar max-h-[160px]">
            {trades.length === 0 ? <p className="text-xs text-muted-foreground italic mt-4 text-center">No recent signals.</p> : trades.slice(0, 5).map((t, i) => (
              <div key={i} className="flex justify-between items-center p-2.5 rounded-lg bg-background/40 border border-border/30 hover:border-border/60 transition-colors">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black tracking-widest">{t.symbol}</span>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold">{t.setup}</span>
                </div>
                <span className={`text-[13px] font-black tabular-nums ${t.rMultiple >= 0 ? "text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]" : "text-rose-400 drop-shadow-[0_0_4px_rgba(251,113,133,0.3)]"}`}>
                  {t.rMultiple >= 0 ? "+" : ""}${Number(t.rMultiple).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  )
}