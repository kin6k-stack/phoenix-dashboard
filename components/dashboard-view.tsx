"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Target, Activity, BarChart3, Zap, Calendar } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Cell } from "recharts"

export function DashboardView() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalPnl: 0,
    winRate: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    avgR: 0,
  })
  const [chartData, setChartData] = useState<any>({
    equityCurve: [],
    weeklyPnl: [],
    winLoss: [],
    recentTrades: []
  })

  useEffect(() => {
    const q = query(collection(db, "trades"), orderBy("timestamp", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTrades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      let totalPnl = 0
      let wins = 0
      let losses = 0
      let totalR = 0
      let currentEquity = 200

      const equityCurveData: any[] = []
      const weeklyDataMap: any = {}

      const chronologicalTrades = [...fetchedTrades].reverse()
      
      chronologicalTrades.forEach((trade: any) => {
        const pnl = Number(trade.profit || trade.pnl || 0)
        totalPnl += pnl
        totalR += Number(trade.rMultiple || 0)
        
        if (pnl > 0) wins++
        else if (pnl < 0) losses++
        currentEquity += pnl

        // Weekly Grouping
        const date = trade.timestamp?.toDate ? trade.timestamp.toDate() : new Date(trade.date)
        const weekKey = `W${Math.ceil(date.getDate() / 7)}`
        weeklyDataMap[weekKey] = (weeklyDataMap[weekKey] || 0) + pnl

        equityCurveData.push({ date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: currentEquity })
      })

      setMetrics({
        totalPnl,
        winRate: fetchedTrades.length > 0 ? Math.round((wins / fetchedTrades.length) * 100) : 0,
        totalTrades: fetchedTrades.length,
        wins,
        losses,
        avgR: fetchedTrades.length > 0 ? totalR / fetchedTrades.length : 0
      })

      setChartData({
        equityCurve: equityCurveData,
        weeklyPnl: Object.keys(weeklyDataMap).map(key => ({ name: key, pnl: weeklyDataMap[key] })),
        winLoss: [{ name: "Wins", value: wins, color: "#22c55e" }, { name: "Losses", value: losses, color: "#ef4444" }],
        recentTrades: fetchedTrades.slice(0, 4)
      })
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) return <div className="p-6 text-muted-foreground">Syncing...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stats Cards */}
        <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Total P&L</p>
            <p className={`text-2xl font-semibold ${metrics.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${metrics.totalPnl.toFixed(2)}
            </p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Win Rate</p>
            <p className="text-2xl font-semibold">{metrics.winRate}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Trades</p>
            <p className="text-2xl font-semibold">{metrics.totalTrades}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Avg R-Multiple</p>
            <p className="text-2xl font-semibold">{metrics.avgR.toFixed(2)} R</p>
        </CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 size={16}/>Weekly P&L</CardTitle></CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.weeklyPnl}>
                <XAxis dataKey="name" />
                <Bar dataKey="pnl" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}