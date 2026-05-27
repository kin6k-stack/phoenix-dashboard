"use client"
import { useState } from "react"
import { Shield, BarChart3, Activity, Cpu, Zap, TrendingUp, ShieldAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
  direction?: string
  notes?: string
}

// ─── Equity + Drawdown chart data builder ─────────────────────────────────────
function buildChartData(trades: Trade[]) {
  let balance = 10000
  let peak = balance
  const data: { index: number; balance: number; drawdown: number }[] = [
    { index: 0, balance, drawdown: 0 },
  ]
  ;[...trades].reverse().forEach((t, i) => {
    balance += Number(t.rMultiple || 0)
    if (balance > peak) peak = balance
    const drawdown = Number((peak - balance).toFixed(2))
    data.push({ index: i + 1, balance: Number(balance.toFixed(2)), drawdown })
  })
  return data
}

// ─── Per-bot stats ─────────────────────────────────────────────────────────────
function calcStats(trades: Trade[]) {
  const wins = trades.filter((t) => t.rMultiple > 0)
  const losses = trades.filter((t) => t.rMultiple < 0)
  const grossProfit = wins.reduce((s, t) => s + Number(t.rMultiple), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + Number(t.rMultiple), 0))
  const netPnl = grossProfit - grossLoss
  const profitFactor =
    grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "MAX" : "0.00"
  const winRate =
    trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(1) : "0.0"
  const expectancy =
    trades.length > 0
      ? (
          (wins.length / trades.length) * (grossProfit / (wins.length || 1)) -
          (losses.length / trades.length) * (grossLoss / (losses.length || 1))
        ).toFixed(2)
      : "0.00"
  return { netPnl, profitFactor, winRate, expectancy, wins: wins.length, losses: losses.length }
}

// ─── Style map ─────────────────────────────────────────────────────────────────
function getEngineStyles(name: string) {
  const n = name.toUpperCase()
  if (n.includes("APEX") || n.includes("SENTINEL"))
    return { icon: Cpu, bar: "bg-indigo-500", text: "text-indigo-400", soft: "bg-indigo-500/10" }
  if (n.includes("HYBRID GOLD") || n.includes("PHOENIX GOLD") || n.includes("PHOENIX"))
    return { icon: Zap, bar: "bg-emerald-500", text: "text-emerald-400", soft: "bg-emerald-500/10" }
  if (n.includes("NQ") || n.includes("USTEC"))
    return { icon: BarChart3, bar: "bg-cyan-500", text: "text-cyan-400", soft: "bg-cyan-500/10" }
  if (n.includes("MANUAL"))
    return { icon: Activity, bar: "bg-slate-500", text: "text-slate-400", soft: "bg-slate-500/10" }
  return { icon: Shield, bar: "bg-blue-500", text: "text-blue-400", soft: "bg-blue-500/10" }
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function PerformanceView({ trades = [] }: { trades: Trade[] }) {
  const [filterMode, setFilterMode] = useState<"ALL" | "BOT" | "MANUAL">("ALL")
  const [selectedBot, setSelectedBot] = useState<string | null>(null)

  // Build engine map — always include Manual Entry
  const engines: Record<string, Trade[]> = { "Manual Entry": [] }
  trades.forEach((t) => {
    const name = t.setup || "Manual Entry"
    if (!engines[name]) engines[name] = []
    if (t.setup) engines[name].push(t)
    else engines["Manual Entry"].push(t)
  })

  const filteredEngines = Object.entries(engines).filter(([name]) => {
    if (filterMode === "BOT") return name.toUpperCase() !== "MANUAL ENTRY"
    if (filterMode === "MANUAL") return name.toUpperCase() === "MANUAL ENTRY"
    return true
  })

  const getModeLabel = (m: string) =>
    m === "ALL" ? "Combined Matrix" : m === "BOT" ? "Core Engines" : "Manual Logs"

  const botTrades = selectedBot ? engines[selectedBot] : []

  return (
    <div className="space-y-6">

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 bg-card/40 backdrop-blur-md rounded-xl border border-border/40 shadow-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
            Data Source Layer
          </span>
          <span className="text-[11px] text-foreground font-medium italic">
            Active performance pipeline
          </span>
        </div>
        <div className="flex gap-1 bg-background/50 p-1.5 rounded-lg border border-border/50">
          {(["ALL", "BOT", "MANUAL"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${
                filterMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {getModeLabel(mode)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bot tiles ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredEngines.map(([name, engineTrades]) => {
          const styles = getEngineStyles(name)
          const stats = calcStats(engineTrades)
          const chartData = buildChartData(engineTrades)

          return (
            <Card
              key={name}
              className="border-border/40 bg-card/60 shadow-lg relative overflow-hidden"
            >
              {/* Coloured left bar */}
              <div className={`absolute top-0 left-0 w-1.5 h-full ${styles.bar}`} />

              {/* ── Header ──────────────────────────────────────────────── */}
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="flex items-center justify-between text-sm font-black uppercase tracking-widest">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${styles.soft}`}>
                      <styles.icon className={`h-4 w-4 ${styles.text}`} />
                    </div>
                    {name}
                  </div>
                  <button
                    onClick={() => setSelectedBot(name)}
                    className={`text-[10px] font-mono px-2 py-1 rounded cursor-pointer hover:brightness-125 transition-all ${styles.soft} ${styles.text}`}
                  >
                    {engineTrades.length} Trades
                  </button>
                </CardTitle>
              </CardHeader>

              {/* ── Stats row ───────────────────────────────────────────── */}
              <CardContent className="pt-5 pb-4 space-y-5">
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-background/50 rounded-lg">
                    <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">
                      Net P&L
                    </span>
                    <p
                      className={`text-base font-black ${
                        stats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {stats.netPnl >= 0 ? "+" : ""}${stats.netPnl.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">
                      Profit Factor
                    </span>
                    <p className="text-base font-black text-foreground">{stats.profitFactor}</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">
                      Win Rate
                    </span>
                    <p className="text-base font-black text-blue-400">{stats.winRate}%</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">
                      Expectancy
                    </span>
                    <p className="text-base font-black text-amber-400">${stats.expectancy}</p>
                  </div>
                </div>

                {/* ── Equity Curve ────────────────────────────────────── */}
                {engineTrades.length > 0 && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/30 bg-background/20 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-background/30">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
                          Chronological Equity Curve
                        </span>
                      </div>
                      <div className="h-40 px-2 pt-2 pb-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                              dataKey="index"
                              stroke="#475569"
                              fontSize={9}
                              tickLine={false}
                            />
                            <YAxis
                              stroke="#475569"
                              fontSize={9}
                              tickLine={false}
                              domain={["dataMin - 50", "dataMax + 50"]}
                              width={55}
                              tickFormatter={(v) => `$${v}`}
                            />
                            <Tooltip
                              formatter={(v: number) => [`$${v.toFixed(2)}`, "Balance"]}
                              contentStyle={{
                                backgroundColor: "#0f172a",
                                borderColor: "#1e293b",
                                color: "#f8fafc",
                                fontSize: 11,
                                borderRadius: 8,
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="balance"
                              stroke="#22c55e"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* ── Drawdown Chart ───────────────────────────────── */}
                    <div className="rounded-xl border border-border/30 bg-background/20 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-background/30">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
                          Peak-to-Trough Drawdown
                        </span>
                      </div>
                      <div className="h-36 px-2 pt-2 pb-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                              dataKey="index"
                              stroke="#475569"
                              fontSize={9}
                              tickLine={false}
                            />
                            <YAxis
                              stroke="#475569"
                              fontSize={9}
                              tickLine={false}
                              inverted
                              width={55}
                              tickFormatter={(v) => `$${v}`}
                            />
                            <Tooltip
                              formatter={(v: number) => [`$${v.toFixed(2)}`, "Drawdown"]}
                              contentStyle={{
                                backgroundColor: "#0f172a",
                                borderColor: "#1e293b",
                                color: "#f8fafc",
                                fontSize: 11,
                                borderRadius: 8,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="drawdown"
                              stroke="#ef4444"
                              fill="rgba(239,68,68,0.08)"
                              strokeWidth={1.5}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {engineTrades.length === 0 && (
                  <div className="h-24 flex items-center justify-center text-[11px] text-muted-foreground italic font-mono">
                    No executions recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Trade ledger dialog ────────────────────────────────────────────── */}
      <Dialog open={!!selectedBot} onOpenChange={() => setSelectedBot(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/40 shadow-2xl sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm font-black text-foreground">
              {selectedBot} — Execution Ledger
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[320px] overflow-y-auto space-y-2 mt-4 pr-1">
            {botTrades.length === 0 ? (
              <p className="text-xs italic text-muted-foreground text-center py-6">
                No historical executions found.
              </p>
            ) : (
              botTrades.map((t, i) => {
                const isBuy = (t.direction || "BUY").toUpperCase() === "BUY"
                return (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 rounded-lg bg-background/40 border border-border/30 hover:border-border/60 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black tracking-widest uppercase text-foreground">
                          {t.symbol}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider ${
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {isBuy ? "BUY" : "SELL"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(t.date).toLocaleString()}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-black ${
                        t.rMultiple < 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {t.rMultiple >= 0 ? "+" : ""}${Number(t.rMultiple).toFixed(2)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
