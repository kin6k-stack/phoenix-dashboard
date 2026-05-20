"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase" // Points to your provided firebase init
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, BarChart3, Zap, Calendar } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"

export function DashboardView() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalPnl: 0,
    winRate: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0,
  })
  const [chartData, setChartData] = useState({
    equityCurve: [],
    weeklyPnl: [],
    winLoss: [],
    recentTrades: []
  })

  useEffect(() => {
    // Assuming your firestore collection is named "trades"
    const q = query(collection(db, "trades"), orderBy("timestamp", "desc"))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTrades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      let totalPnl = 0
      let wins = 0
      let losses = 0
      let currentEquity = 200 // Base capital initialization

      const equityCurveData: any[] = []
      
      // Process trades in chronological order for the equity curve
      const chronologicalTrades = [...fetchedTrades].reverse()
      
      chronologicalTrades.forEach((trade: any) => {
        // Handle common variations in database field names
        const pnl = Number(trade.pnl || trade.profit || 0)
        totalPnl += pnl
        
        if (pnl > 0) wins++
        else if (pnl < 0) losses++

        currentEquity += pnl

        // Format date/timestamp safely
        let dateStr = "Unknown"
        if (trade.timestamp?.toDate) {
          dateStr = trade.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        } else if (trade.date) {
          dateStr = trade.date
        }

        equityCurveData.push({ date: dateStr, value: currentEquity })
      })

      const total = wins + losses
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

      // Map recent trades for the table
      const recentTrades = fetchedTrades.slice(0, 4).map((t: any) => ({
        symbol: t.symbol || t.asset || "Unknown",
        side: t.side || t.type || "Long",
        pnl: Number(t.pnl || t.profit || 0),
        date: t.timestamp?.toDate 
          ? t.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
          : (t.date || "Unknown")
      }))

      setMetrics({
        totalPnl,
        winRate,
        totalTrades: fetchedTrades.length,
        wins,
        losses
      })

      setChartData({
        equityCurve: equityCurveData,
        winLoss: [
          { name: "Wins", value: wins, color: "#22c55e" },
          { name: "Losses", value: losses, color: "#ef4444" }
        ],
        recentTrades,
        weeklyPnl: [] // Add week-grouping logic here if you store week numbers in DB
      })

      setLoading(false)
    }, (error) => {
      console.error("Error fetching trades from Firebase:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex h-full items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Syncing live database...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your trading performance</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Live Data Sync</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total P&L</p>
                <p className={`text-2xl font-semibold ${metrics.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {metrics.totalPnl >= 0 ? '+' : ''}${metrics.totalPnl.toFixed(2)}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${metrics.totalPnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <DollarSign className={`w-5 h-5 ${metrics.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</p>
                <p className="text-2xl font-semibold text-foreground">{metrics.winRate}%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <span>{metrics.wins} wins / {metrics.losses} losses</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Trades</p>
                <p className="text-2xl font-semibold text-foreground">{metrics.totalTrades}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg R-Multiple</p>
                <p className="text-2xl font-semibold text-foreground">-- R</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <span>Requires Risk Input</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Equity Curve */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Equity Curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.equityCurve}>
                  <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#equityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Win/Loss Distribution */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              Win/Loss Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.winLoss}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.winLoss.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-semibold text-foreground">{metrics.winRate}%</span>
                <span className="text-xs text-muted-foreground">Win Rate</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Wins ({metrics.wins})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">Losses ({metrics.losses})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Weekly P&L (Requires specific backend date grouping, left blank UI layer for safety) */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Weekly P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                Awaiting weekly distribution mapping.
             </div>
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              Recent Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chartData.recentTrades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent trades found.</p>
              ) : (
                chartData.recentTrades.map((trade: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                        trade.side.toLowerCase() === "long" || trade.side === "Buy" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      }`}>
                        {trade.side.toLowerCase() === "long" || trade.side === "Buy" ? "L" : "S"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{trade.symbol}</p>
                        <p className="text-xs text-muted-foreground">{trade.date}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}