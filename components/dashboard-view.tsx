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

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total P&L", val: `$${totalPnl.toFixed(2)}`, icon: DollarSign, color: totalPnl >= 0 ? "text-emerald-500" : "text-rose-500" },
          { label: "Win Rate", val: `${winRate}%`, icon: Target, color: "text-blue-500" },
          { label: "Total Trades", val: trades.length, icon: Activity, color: "text-indigo-400" },
          { label: "Avg R-Multiple", val: `${avgR.toFixed(2)} R`, icon: Zap, color: "text-amber-500" }
        ].map((item, i) => (
          <Card key={i} className="border-border/50 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <item.icon size={14} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.label}</p>
              </div>
              <p className={`text-3xl font-black ${item.color} tracking-tight`}>{item.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border-border/50 shadow-sm">
          <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-wider text-foreground">
            <TrendingUp size={16} className="text-primary"/> Equity Curve
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="date" hide />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#888'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1b1e', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-border/50 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2 uppercase tracking-wider text-foreground">
            <Target size={16} className="text-primary"/> Win/Loss Ratio
          </h3>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{name: 'Wins', value: wins}, {name: 'Losses', value: losses}]} dataKey="value" innerRadius={60} outerRadius={85} paddingAngle={5}>
                  <Cell fill="#10b981" />
                  <Cell fill="#f43f5e" />
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1b1e', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 border-border/50 shadow-sm">
          <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-wider text-foreground">
            <BarChart3 size={16} className="text-primary"/> Weekly P&L
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#888'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#888'}} />
                <Tooltip 
                  cursor={{fill: '#333', opacity: 0.2}}
                  contentStyle={{ backgroundColor: '#1a1b1e', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="pnl" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-border/50 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-foreground">
            <Activity size={16} className="text-primary"/> Recent Activity
          </h3>
          <div className="flex-1 overflow-auto pr-2 space-y-3 custom-scrollbar">
            {trades.slice(0, 6).map((t, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{t.symbol}</span>
                  <span className="text-xs text-muted-foreground">{t.setup}</span>
                </div>
                <span className={`text-sm font-bold ${t.rMultiple >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {t.rMultiple >= 0 ? "+" : ""}${t.rMultiple}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}