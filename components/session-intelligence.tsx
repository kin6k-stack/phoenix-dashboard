"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Clock,
  Activity,
  Crosshair,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Cpu,
  Flame,
  BarChart3,
  Target,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
  direction?: string
}

// ─── Session time windows (UTC hours) ─────────────────────────────────────────
const SESSIONS = {
  ASIAN: { label: "Asian", start: 0, end: 8, color: "#a78bfa", glow: "rgba(167,139,250,0.15)" },
  LONDON: { label: "London", start: 8, end: 13, color: "#34d399", glow: "rgba(52,211,153,0.15)" },
  OVERLAP: { label: "Overlap", start: 13, end: 16, color: "#fbbf24", glow: "rgba(251,191,36,0.15)" },
  NY: { label: "New York", start: 16, end: 22, color: "#60a5fa", glow: "rgba(96,165,250,0.15)" },
} as const

type SessionKey = keyof typeof SESSIONS

function getSessionKey(date: Date): SessionKey {
  const h = date.getUTCHours()
  if (h >= 0 && h < 8) return "ASIAN"
  if (h >= 8 && h < 13) return "LONDON"
  if (h >= 13 && h < 16) return "OVERLAP"
  return "NY"
}

function isActiveSessions(key: SessionKey): boolean {
  const now = new Date()
  const h = now.getUTCHours()
  const { start, end } = SESSIONS[key]
  return h >= start && h < end
}

function calcSessionStats(trades: Trade[]) {
  const wins = trades.filter((t) => t.rMultiple > 0).length
  const losses = trades.filter((t) => t.rMultiple < 0).length
  const netPnl = trades.reduce((s, t) => s + Number(t.rMultiple), 0)
  const grossProfit = trades.filter((t) => t.rMultiple > 0).reduce((s, t) => s + Number(t.rMultiple), 0)
  const grossLoss = Math.abs(trades.filter((t) => t.rMultiple < 0).reduce((s, t) => s + Number(t.rMultiple), 0))
  const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : "0.0"
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "∞" : "0.00"
  const avgPnl = trades.length > 0 ? (netPnl / trades.length).toFixed(2) : "0.00"
  return { wins, losses, netPnl, winRate, profitFactor, avgPnl, total: trades.length }
}

// ─── Live clock ───────────────────────────────────────────────────────────────
function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SessionIntelligence({ trades = [] }: { trades: Trade[] }) {
  const [assetFilter, setAssetFilter] = useState<"ALL" | "XAUUSD" | "USTEC">("ALL")
  const [userNotes, setUserNotes] = useState<string>("")
  const [notesAsset, setNotesAsset] = useState<"XAUUSD" | "USTEC">("XAUUSD")
  const now = useLiveClock()

  // Notes persistence
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`phx_intel_notes_${notesAsset}`)
      setUserNotes(cached || "")
    } catch {
      setUserNotes("")
    }
  }, [notesAsset])

  const handleNotesChange = (text: string) => {
    setUserNotes(text)
    try {
      localStorage.setItem(`phx_intel_notes_${notesAsset}`, text)
    } catch {}
  }

  // Filter trades by asset
  const filteredTrades = useMemo(
    () =>
      assetFilter === "ALL"
        ? trades
        : trades.filter((t) => t.symbol === assetFilter),
    [trades, assetFilter]
  )

  // Group trades by session
  const sessionTrades = useMemo(() => {
    const map: Record<SessionKey, Trade[]> = { ASIAN: [], LONDON: [], OVERLAP: [], NY: [] }
    filteredTrades.forEach((t) => {
      const key = getSessionKey(new Date(t.date))
      map[key].push(t)
    })
    return map
  }, [filteredTrades])

  // Best/worst sessions
  const sessionStats = useMemo(
    () =>
      (Object.keys(SESSIONS) as SessionKey[]).map((k) => ({
        key: k,
        ...calcSessionStats(sessionTrades[k]),
        session: SESSIONS[k],
      })),
    [sessionTrades]
  )

  // Hour-of-day P&L breakdown
  const hourlyData = useMemo(() => {
    const map: Record<number, { pnl: number; count: number }> = {}
    filteredTrades.forEach((t) => {
      const h = new Date(t.date).getUTCHours()
      if (!map[h]) map[h] = { pnl: 0, count: 0 }
      map[h].pnl += Number(t.rMultiple)
      map[h].count++
    })
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}:00`,
      pnl: Number((map[h]?.pnl || 0).toFixed(2)),
      count: map[h]?.count || 0,
    }))
  }, [filteredTrades])

  // Symbol breakdown
  const symbolStats = useMemo(() => {
    const map: Record<string, { pnl: number; wins: number; count: number }> = {}
    filteredTrades.forEach((t) => {
      const sym = t.symbol || "Unknown"
      if (!map[sym]) map[sym] = { pnl: 0, wins: 0, count: 0 }
      map[sym].pnl += Number(t.rMultiple)
      map[sym].count++
      if (t.rMultiple > 0) map[sym].wins++
    })
    return Object.entries(map)
      .map(([sym, s]) => ({
        sym,
        pnl: Number(s.pnl.toFixed(2)),
        winRate: s.count > 0 ? ((s.wins / s.count) * 100).toFixed(1) : "0.0",
        count: s.count,
      }))
      .sort((a, b) => b.pnl - a.pnl)
  }, [filteredTrades])

  // Recent trades (last 8)
  const recentTrades = useMemo(
    () =>
      [...filteredTrades]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8),
    [filteredTrades]
  )

  // Overall stats
  const overall = useMemo(() => calcSessionStats(filteredTrades), [filteredTrades])

  const currentSession = getSessionKey(now)

  return (
    <div className="w-full space-y-6 text-slate-100 font-sans">

      {/* ── HUD Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-[#070b12]/70 border border-slate-800 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <Cpu className="w-5 h-5 text-green-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-widest uppercase text-green-400">
              Live Session Intelligence
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
              UTC {now.toUTCString().slice(17, 25)} &nbsp;·&nbsp;
              <span className="text-green-400 font-bold">
                {SESSIONS[currentSession].label} Session Active
              </span>
            </p>
          </div>
        </div>

        {/* Asset filter */}
        <div className="flex gap-1.5 bg-[#03050a] p-1.5 rounded-lg border border-slate-800">
          {(["ALL", "XAUUSD", "USTEC"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAssetFilter(a)}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold tracking-widest rounded-md transition-all ${
                assetFilter === a
                  ? "bg-green-500/10 text-green-400 border border-green-500/30"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {a === "XAUUSD" ? "🥇 XAUUSD" : a === "USTEC" ? "⚡ USTEC" : "ALL ASSETS"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Top-line stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Total Net P&L",
            val: `${overall.netPnl >= 0 ? "+" : ""}$${overall.netPnl.toFixed(2)}`,
            color: overall.netPnl >= 0 ? "text-emerald-400" : "text-rose-400",
            icon: TrendingUp,
          },
          {
            label: "Win Rate",
            val: `${overall.winRate}%`,
            color: "text-blue-400",
            icon: Target,
          },
          {
            label: "Profit Factor",
            val: overall.profitFactor,
            color: "text-amber-400",
            icon: BarChart3,
          },
          {
            label: "Total Signals",
            val: `${overall.total}`,
            color: "text-slate-200",
            icon: Activity,
          },
        ].map((item, i) => (
          <Card key={i} className="bg-[#070b12]/50 border border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {item.label}
                </span>
              </div>
              <p className={`text-xl font-black font-mono ${item.color}`}>{item.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Session Breakdown Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {sessionStats.map(({ key, session, total, wins, losses, netPnl, winRate, profitFactor }) => {
          const isActive = isActiveSessions(key)
          return (
            <Card
              key={key}
              className={`bg-[#070b12]/60 border shadow-xl backdrop-blur-md transition-all ${
                isActive ? "border-opacity-60" : "border-slate-800"
              }`}
              style={{
                borderColor: isActive ? session.color : undefined,
                boxShadow: isActive ? `0 0 20px ${session.glow}` : undefined,
              }}
            >
              <CardHeader className="bg-[#000001] py-2.5 px-4 border-b border-slate-900 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" style={{ color: session.color }} />
                  <CardTitle
                    className="text-[11px] font-mono font-black tracking-widest uppercase"
                    style={{ color: session.color }}
                  >
                    {session.label}
                  </CardTitle>
                </div>
                {isActive && (
                  <span
                    className="text-[8px] font-black px-1.5 py-0.5 rounded border animate-pulse"
                    style={{
                      color: session.color,
                      borderColor: session.color,
                      backgroundColor: session.glow,
                    }}
                  >
                    LIVE
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">Net P&L</span>
                  <span
                    className={`text-base font-black font-mono ${
                      netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">Win Rate</span>
                  <span className="text-sm font-black font-mono text-slate-200">{winRate}%</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">P. Factor</span>
                  <span className="text-sm font-black font-mono text-amber-400">{profitFactor}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">Signals</span>
                  <span className="text-sm font-black font-mono text-slate-300">
                    {wins}W / {losses}L / {total}T
                  </span>
                </div>
                {/* Mini progress bar */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 mt-1">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: total > 0 ? `${(wins / total) * 100}%` : "0%",
                      backgroundColor: session.color,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Hourly P&L heatmap + Symbol stats ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Hourly bar chart */}
        <Card className="xl:col-span-2 bg-[#070b12]/40 border border-slate-800 shadow-2xl">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900 flex flex-row items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <CardTitle className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Hourly P&L Distribution (UTC)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0d131f" />
                <XAxis
                  dataKey="hour"
                  stroke="#475569"
                  fontSize={8}
                  tickLine={false}
                  interval={3}
                />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    name === "pnl" ? `$${v.toFixed(2)}` : v,
                    name === "pnl" ? "P&L" : "Trades",
                  ]}
                  contentStyle={{
                    backgroundColor: "#000001",
                    borderColor: "#1e293b",
                    color: "#f8fafc",
                    fontSize: 11,
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                  {hourlyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Symbol breakdown */}
        <Card className="bg-[#070b12]/40 border border-slate-800 shadow-2xl">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900 flex flex-row items-center gap-2">
            <Crosshair className="w-4 h-4 text-green-400" />
            <CardTitle className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Asset Performance Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {symbolStats.length === 0 ? (
              <p className="text-[11px] italic text-slate-500 text-center py-4">No data yet.</p>
            ) : (
              symbolStats.map(({ sym, pnl, winRate, count }) => (
                <div
                  key={sym}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#03050a] border border-slate-800/60"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-black tracking-widest text-slate-200 font-mono">
                      {sym}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {count} trades · {winRate}% WR
                    </span>
                  </div>
                  <span
                    className={`text-sm font-black font-mono ${
                      pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent trades feed + Notes ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Recent trades */}
        <Card className="bg-[#070b12]/40 border border-slate-800 shadow-2xl">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900 flex flex-row items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              Latest Execution Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {recentTrades.length === 0 ? (
              <p className="text-[11px] italic text-slate-500 text-center py-4">
                No trades recorded yet.
              </p>
            ) : (
              recentTrades.map((t, i) => {
                const sKey = getSessionKey(new Date(t.date))
                const sess = SESSIONS[sKey]
                const isBuy = (t.direction || "BUY").toUpperCase() === "BUY"
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#03050a] border border-slate-800/60 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-1.5 h-8 rounded-full"
                        style={{ backgroundColor: sess.color }}
                      />
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black tracking-widest font-mono text-slate-200">
                            {t.symbol}
                          </span>
                          <span
                            className={`text-[8px] px-1 py-0.5 rounded font-black ${
                              isBuy
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {isBuy ? "BUY" : "SELL"}
                          </span>
                          <span
                            className="text-[8px] px-1 py-0.5 rounded font-bold"
                            style={{ color: sess.color, backgroundColor: sess.glow }}
                          >
                            {sess.label.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(t.date).toLocaleString()} · {t.setup}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-black font-mono ${
                        t.rMultiple >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {t.rMultiple >= 0 ? "+" : ""}${Number(t.rMultiple).toFixed(2)}
                    </span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Notes panel */}
        <Card className="bg-[#070b12]/40 border border-slate-800 shadow-2xl flex flex-col">
          <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                  JEAFX Bias Journal
                </CardTitle>
              </div>
              {/* Notes asset toggle */}
              <div className="flex gap-1 bg-[#03050a] p-1 rounded-lg border border-slate-800">
                {(["XAUUSD", "USTEC"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setNotesAsset(a)}
                    className={`px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest rounded transition-all ${
                      notesAsset === a
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 flex flex-col gap-3">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Log supply/demand zones, order blocks, bias notes, or structural targets for{" "}
              <span className="text-slate-300 font-bold">{notesAsset}</span>. Syncs to your
              local cache automatically.
            </p>
            <textarea
              value={userNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder={`Enter structural notes for ${notesAsset}...\n\nE.g. Support at $4,500 · OB mitigation zone $4,550–$4,570 · Daily bias: Bullish`}
              className="flex-1 min-h-[160px] w-full bg-[#03050a] border border-slate-800 rounded-lg p-4 text-[11px] font-mono text-slate-300 placeholder-slate-700 focus:outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/20 transition-all resize-none"
            />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] font-mono text-slate-600">
                Auto-saved to local cache
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
