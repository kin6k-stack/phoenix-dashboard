"use client"

import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface PnLChartProps {
  data?: { day: string; pnl: number }[]
}

const defaultData = [
  { day: "1", pnl: 0 },
  { day: "2", pnl: 5 },
  { day: "3", pnl: 3 },
  { day: "4", pnl: 8 },
  { day: "5", pnl: 12 },
  { day: "6", pnl: 10 },
  { day: "7", pnl: 15 },
  { day: "8", pnl: 18 },
  { day: "9", pnl: 16 },
  { day: "10", pnl: 22 },
  { day: "11", pnl: 25 },
  { day: "12", pnl: 20 },
  { day: "13", pnl: 28 },
  { day: "14", pnl: 30 },
]

export function PnLChart({ data = defaultData }: PnLChartProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" />
          Net Daily P&L
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.75 0.18 145)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.75 0.18 145)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'oklch(0.65 0 0)', fontSize: 10 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'oklch(0.65 0 0)', fontSize: 10 }}
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'oklch(0.16 0.01 260)', 
                  border: '1px solid oklch(0.25 0.01 260)',
                  borderRadius: '8px',
                  color: 'oklch(0.95 0 0)'
                }}
                labelStyle={{ color: 'oklch(0.65 0 0)' }}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="oklch(0.75 0.18 145)"
                strokeWidth={2}
                fill="url(#pnlGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>14 days ago</span>
          <span>Today</span>
        </div>
      </CardContent>
    </Card>
  )
}
