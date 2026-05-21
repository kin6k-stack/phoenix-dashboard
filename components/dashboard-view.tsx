"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, DollarSign, Target, Activity, BarChart3, Zap } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, CartesianGrid } from "recharts"

export function DashboardView({ trades = [] }: { trades: any[] }) {
  // --- Calculation Logic ---
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

  return (
    <div className="p-4 lg:p-8 space-y-6">
      
      {/* 1. Top Metrics Row (Responsive 1 to 4 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total P&L", val: `$${totalPnl.toFixed(2)}`, icon: DollarSign, color: totalPnl >= 0 ? "text-emerald-400" : "text-rose-400" },
          { label: "Win Rate", val: `${winRate}%`, icon: Target, color: "text-blue-400" },
          { label: "Total Trades", val: trades.length, icon: Activity, color: "text-indigo-400" },
          { label: "Avg Execution", val: `${avgR.toFixed(2)} R`, icon: Zap, color: "text-amber-400" }
        ].map((item, i) => (
          <Card key={i} className="glass-card glow-effect hover:scale-[1.02] transition-transform">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-background/20"><item.icon size={14} className={item.color} /></div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{item.label}</p>
              </div>
              <p className={`text-2xl font-black ${item.color} tracking-tighter`}>{item.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. Main Visual Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass-card p-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400"/> System Equity Curve
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#333', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass-card p-5 flex flex-col justify-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-4">Win/Loss Distribution</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{name: 'Wins', value: wins}, {name: 'Losses', value: losses}]} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={5}>
                  <Cell fill="#34d399" />
                  <Cell fill="#fb7185" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#333', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 3. Bottom Uniform Row (Weekly P&L + Recent Activity) */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card p-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-indigo-400"/> Weekly P&L
          </h3>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="name" hide />
                <Bar dataKey="pnl" fill="#818cf8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass-card p-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
            <Activity size={14} className="text-amber-400"/> Recent Activity
          </h3>
          <div className="space-y-2 max-h-[150px] overflow-auto custom-scrollbar">
            {trades.slice(0, 5).map((t, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-background/20 border border-border/20">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black">{t.symbol}</span>
                  <span className="text-[9px] text-muted-foreground uppercase">{t.setup}</span>
                </div>
                <span className={`text-[12px] font-mono font-bold ${Number(t.rMultiple) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {Number(t.rMultiple) >= 0 ? "+" : ""}${Number(t.rMultiple).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}