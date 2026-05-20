"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Target, Activity, BarChart3, Zap, Calendar } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"

export function DashboardView({ trades = [] }: { trades: any[] }) {
  // Calculate metrics directly from props
  const totalPnl = trades.reduce((sum, t) => sum + Number(t.rMultiple || 0), 0)
  const wins = trades.filter(t => t.rMultiple > 0).length
  const losses = trades.filter(t => t.rMultiple < 0).length
  const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0
  
  // Equity Curve Calculation
  let currentEquity = 200
  const equityCurveData = [...trades].reverse().map(t => {
    currentEquity += Number(t.rMultiple || 0)
    return { date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: currentEquity }
  })

  // Weekly P&L Grouping
  const weeklyData = trades.reduce((acc: any, t) => {
    const week = `Wk ${Math.ceil(new Date(t.date).getDate() / 7)}`
    acc[week] = (acc[week] || 0) + Number(t.rMultiple || 0)
    return acc
  }, {})
  const weeklyChartData = Object.entries(weeklyData).map(([name, pnl]) => ({ name, pnl }))

  return (
    <div className="p-6 space-y-6">
      {/* ... (Keep your existing Header and Stats Grid here) ... */}
      
      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={16}/>Equity Curve</CardTitle></CardHeader>
          <CardContent className="h-[200px]">
             {/* ... (Use existing AreaChart with equityCurveData) ... */}
          </CardContent>
        </Card>

        {/* Win/Loss Pie */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Target size={16}/>Win/Loss Distribution</CardTitle></CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{name: 'Wins', value: wins, color: '#22c55e'}, {name: 'Losses', value: losses, color: '#ef4444'}]} dataKey="value" innerRadius={50} outerRadius={70}>
                  {[{color: '#22c55e'}, {color: '#ef4444'}].map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 size={16}/>Weekly P&L</CardTitle></CardHeader>
          <CardContent className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <XAxis dataKey="name" /><Bar dataKey="pnl" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Recent Trades Table */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity size={16}/>Recent Trades</CardTitle></CardHeader>
          <CardContent>
             {/* ... (Map trades.slice(0, 4) here) ... */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}