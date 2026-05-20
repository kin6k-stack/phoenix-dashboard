"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, DollarSign, Target, Activity, BarChart3, Zap } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip } from "recharts"

export function DashboardView({ trades = [] }: { trades: any[] }) {
  // 1. Calculations
  const totalPnl = trades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0)
  const wins = trades.filter(t => t.rMultiple > 0).length
  const losses = trades.filter(t => t.rMultiple < 0).length
  const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0
  const avgR = trades.length > 0 ? (trades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0) / trades.length) : 0

  // 2. Chart Data Prep
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
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total P&L", val: `$${totalPnl.toFixed(2)}`, icon: DollarSign, color: totalPnl >= 0 ? "text-green-500" : "text-red-500" },
          { label: "Win Rate", val: `${winRate}%`, icon: Target, color: "text-emerald-500" },
          { label: "Total Trades", val: trades.length, icon: Activity, color: "text-blue-500" },
          { label: "Avg R-Multiple", val: `${avgR.toFixed(2)} R`, icon: Zap, color: "text-purple-500" }
        ].map((item, i) => (
          <Card key={i}><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">{item.label}</p><p className={`text-2xl font-semibold ${item.color}`}>{item.val}</p></CardContent></Card>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><TrendingUp size={16}/>Equity Curve</h3>
          <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={equityData}><XAxis dataKey="date" hide /><Tooltip /><Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Target size={16}/>Win/Loss Distribution</h3>
          <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{name: 'Wins', value: wins}, {name: 'Losses', value: losses}]} dataKey="value" innerRadius={50} outerRadius={70}><Cell fill="#22c55e" /><Cell fill="#ef4444" /></Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><BarChart3 size={16}/>Weekly P&L</h3>
          <div className="h-[180px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={weeklyData}><XAxis dataKey="name" /><Tooltip /><Bar dataKey="pnl" fill="#3b82f6" /></BarChart></ResponsiveContainer></div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Activity size={16}/>Recent Trades</h3>
          <div className="space-y-2">
            {trades.slice(0, 5).map((t, i) => (
              <div key={i} className="flex justify-between text-xs border-b pb-1"><span>{t.symbol}</span><span className={t.rMultiple >= 0 ? "text-green-500" : "text-red-500"}>{t.rMultiple} R</span></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}