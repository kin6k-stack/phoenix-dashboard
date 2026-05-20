"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Target, Activity, BarChart3, Zap, Calendar } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"

export function DashboardView({ trades = [] }: { trades: any[] }) {
  // 1. Calculate Metrics
  const totalPnl = trades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0)
  const wins = trades.filter(t => t.rMultiple > 0).length
  const losses = trades.filter(t => t.rMultiple < 0).length
  const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0
  
  // 2. Prepare Chart Data
  // Equity Curve: Cumulative sum over time
  let runningEquity = 200
  const equityData = [...trades].reverse().map(t => {
    runningEquity += Number(t.rMultiple || 0)
    return { 
      date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
      value: runningEquity 
    }
  })

  // Weekly P&L: Group by week
  const weeklyMap = trades.reduce((acc: any, t) => {
    const week = `Wk ${Math.ceil(new Date(t.date).getDate() / 7)}`
    acc[week] = (acc[week] || 0) + Number(t.rMultiple || 0)
    return acc
  }, {})
  const weeklyData = Object.entries(weeklyMap).map(([name, pnl]) => ({ name, pnl }))

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total P&L</p>
          <p className={`text-2xl font-semibold ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>${totalPnl.toFixed(2)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Win Rate</p>
          <p className="text-2xl font-semibold">{winRate}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Trades</p>
          <p className="text-2xl font-semibold">{trades.length}</p>
        </CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <CardTitle className="text-sm mb-4">Equity Curve</CardTitle>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <XAxis dataKey="date" hide />
                <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <CardTitle className="text-sm mb-4">Win/Loss Distribution</CardTitle>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{name: 'Wins', value: wins}, {name: 'Losses', value: losses}]} dataKey="value" innerRadius={40} outerRadius={60}>
                  <Cell fill="#22c55e" /><Cell fill="#ef4444" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <CardTitle className="text-sm mb-4">Weekly P&L</CardTitle>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="name" />
                <Bar dataKey="pnl" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}