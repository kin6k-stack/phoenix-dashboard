"use client"

import { useState, useEffect, useMemo } from "react"
import {
  collection, onSnapshot, query, where,
  doc, setDoc, getDoc
} from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import {
  TrendingUp, TrendingDown, Activity, Zap, Shield,
  ChevronRight, Clock, Target, BarChart2, GitBranch,
  CheckCircle2, XCircle, MinusCircle, Settings2
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
  CartesianGrid, Tooltip
} from "recharts"

// ─── Bot registry ──────────────────────────────────────────────────────────
const BOTS = [
  {
    id:        "apex",
    name:      "Gold Sentinel Apex",
    version:   "v5.1",
    magic:     88802,
    symbol:    "XAUUSDm",
    timeframe: "M15",
    color:     "#f59e0b",
    glow:      "rgba(245,158,11,0.4)",
    icon:      "🦅",
    firestore: "Gold Sentinel Apex",
    config: {
      "Mode":       "CRT M15 Sniper",
      "Anchor":     "03:00 broker (pre-London H1)",
      "Entry":      "M15 close inside range + EMA8",
      "SL":         "Sweep wick + 10 pts padding",
      "TP":         "Opposite range extreme (static)",
      "BE":         "35% of TP distance",
      "Stagnation": "2 M15 bars (30 min)",
      "Filters":    "H4 bias + ADX ≥22 (optional)",
    },
    changelog: [
      { version:"v5.1", date:"Jun 2026",  note:"CRT rebuild — 4-state machine (IDLE→RANGE→SWEEP→TRADE). M15 sniper. 35% BE. 2-bar stagnation fuse. ADX + H4 bias preserved." },
      { version:"v5.0", date:"Jun 2026",  note:"SMC rebuild — OB+FVG+Sweep+H4 bias. Trailing Runner restored." },
      { version:"v4.44",date:"May 2026",  note:"Session filter 03-20 NY. Fixed Runner 3R. BE at 1R. Server guard." },
      { version:"v4.40",date:"Apr 2026",  note:"ADX threshold 25. DoubleShot enabled. London block partial." },
      { version:"v4.0", date:"Mar 2026",  note:"Initial institutional version. Trailing stop active." },
    ],
  },
  {
    id:        "hybrid",
    name:      "Phoenix Gold Hybrid",
    version:   "v13.0",
    magic:     88803,
    symbol:    "XAUUSDm",
    timeframe: "M5",
    color:     "#f97316",
    glow:      "rgba(249,115,22,0.4)",
    icon:      "🔥",
    firestore: "Phoenix Gold Hybrid",
    config: {
      "Mode":       "24/4 Adaptive Scalper",
      "Sessions":   "Asia · London · LDN+NY Overlap · NY PM",
      "Entry":      "ST(1.4/10) + MACD(12,26,9) + PDH/PDL sweep",
      "EMA Filter": "EMA 150/250 macro trend gate",
      "RR":         "1.0 Asia · 1.5 London · 1.8 Overlap · 1.2 NY PM",
      "Ghost Shield":"BE at 1.0R — remainder risk-free",
      "Exits":      "Decay 20-35 min · Volume Abort 150% vol",
      "Kill":       "Friday 21:00 UTC",
    },
    changelog: [
      { version:"v13.0",date:"Jun 2026",  note:"24/4 Session-Adaptive Scalper — full stack restored. ST+MACD+EMA150/250+PDH/PDL sweeps. Ghost Shield BE at 1.0R. Session-dynamic RR 1.0-1.8. Decay + VolumeAbort. Trades Asia/London/Overlap/NY PM, skips Close window 21-22 UTC." },
      { version:"v12.1",date:"Jun 2026",  note:"CRT rebuild — London sweep traded, not blocked. 4-state machine. 50% BE. 4-bar stagnation fuse. Consecutive loss decay preserved." },
      { version:"v12.0",date:"Jun 2026",  note:"SMC rebuild — London block. H1 bias. Sweep required. $5 SL cap." },
      { version:"v11.14",date:"May 2026", note:"Trailing removed → pure scalper. Ghost Shield added." },
      { version:"v11.12",date:"Apr 2026", note:"ATR trailing restored. consecutiveLoss memory added." },
      { version:"v11.0", date:"Mar 2026", note:"Initial M5 scalp engine. No session filter." },
    ],
  },
  {
    id:        "nq",
    name:      "Phoenix NQ Engine",
    version:   "v2.1",
    magic:     88801,
    symbol:    "USTECm",
    timeframe: "M5",
    color:     "#06b6d4",
    glow:      "rgba(6,182,212,0.4)",
    icon:      "⚡",
    firestore: "Phoenix NQ v2.1",
    config: {
      "Mode":       "CRT M5 NQ",
      "Anchor":     "08:00 AM NY (pre-open H1)",
      "Entry":      "M5 close inside range + EMA8",
      "SL":         "Sweep wick + 5 pts padding",
      "TP":         "Opposite range extreme (static)",
      "BE":         "50% of TP distance",
      "Stagnation": "3 M5 bars (15 min)",
      "Filters":    "H1 bias optional",
    },
    changelog: [
      { version:"v2.1", date:"Jun 2026",  note:"CRT rebuild — 4-state machine (IDLE→RANGE→SWEEP→TRADE). Pre-NY H1 anchor. 50% BE. 3-bar stagnation fuse. Invalidation candle rule." },
      { version:"v2.0", date:"Jun 2026",  note:"SMC rebuild — 1-bar open delay. BOS confirmation. OB + H1 bias." },
      { version:"v1.9", date:"May 2026",  note:"Lot reduced 0.10→0.03. consecutiveLoss lookback 7d→2d." },
      { version:"v1.6", date:"Apr 2026",  note:"SuperTrend + MACD + EMA150/250. News filter. EOD kill." },
      { version:"v1.0", date:"Mar 2026",  note:"Initial NQ momentum engine." },
    ],
  },
]

// ─── BotMeta: live data from botConfig/{magic} via onSnapshot ────────────────
// botName, botVersion, botMode come from the EA's BOT_INIT webhook call.
// lastSeenAt is refreshed every 5 min by the heartbeat; zeroed by BOT_OFFLINE.
interface BotMeta {
  botName?:    string
  botVersion?: string
  botMode?:    string
  lastSeenAt?: any
}

// ─── Returns true if lastSeenAt is within the last 10 minutes ────────────────
function getIsLive(meta: BotMeta): boolean {
  if (!meta.lastSeenAt) return false
  try {
    const t = meta.lastSeenAt?.toDate?.() ?? new Date(meta.lastSeenAt)
    return (Date.now() - t.getTime()) < 10 * 60 * 1000
  } catch { return false }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface BotTrade {
  id:         string
  symbol:     string
  direction:  string
  profit:     number
  outcome:    string
  openedAt?:  any
  closedAt?:  any
  entryPrice: number
  sl:         number
  tp1:        number
  lot:        number
  status:     string
}

interface BotStats { trades: BotTrade[]; loaded: boolean }

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs backdrop-blur-sm">
      <p className="text-white/40 mb-1">{label}</p>
      <p className="font-black text-white">${Number(payload[0]?.value ?? 0).toFixed(2)}</p>
    </div>
  )
}

// ─── BotCard ──────────────────────────────────────────────────────────────────
function BotCard({ bot, stats, botMeta, selected, onClick }: {
  bot:     typeof BOTS[0]
  stats:   BotStats
  botMeta: BotMeta
  selected: boolean
  onClick:  () => void
}) {
  const pnl    = useMemo(() => stats.trades.reduce((s, t) => s + t.profit, 0), [stats.trades])
  const wins   = stats.trades.filter(t => t.profit > 0).length
  const wr     = stats.trades.length > 0 ? (wins / stats.trades.length) * 100 : 0
  const pnlPos = pnl >= 0
  const isLive = getIsLive(botMeta)

  // Show live bot name if the EA has registered under a different name
  const displayName = botMeta.botName ?? bot.name

  return (
    <button
      onClick={onClick}
      className="relative rounded-2xl border p-4 text-left transition-all duration-200 w-full"
      style={{
        background:  selected ? `${bot.color}12` : "rgba(255,255,255,0.02)",
        borderColor: selected ? `${bot.color}50` : "rgba(255,255,255,0.06)",
        boxShadow:   selected ? `0 0 32px ${bot.glow}` : "none",
      }}>
      <div className="absolute top-0 left-4 right-4 h-0.5 rounded-full transition-opacity"
        style={{ background: `linear-gradient(90deg,transparent,${bot.color},transparent)`, opacity: selected ? 1 : 0.3 }} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{bot.icon}</span>
          <div>
            {/* displayName reflects live botName from Firestore if EA has registered */}
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black text-white leading-tight">{displayName}</p>
              {/* Live dot: green pulse = online, grey = offline/never connected */}
              <span
                className={isLive ? "w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" : "w-1.5 h-1.5 rounded-full flex-shrink-0"}
                style={{ background: isLive ? "#22c55e" : "rgba(255,255,255,0.15)" }}
                title={isLive ? "Live — heartbeat <10 min ago" : "Offline"}
              />
            </div>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: `${bot.color}99` }}>
              {bot.symbol} · {bot.timeframe} · Magic {bot.magic}
            </p>
          </div>
        </div>
        <span className="text-[9px] font-black px-2 py-0.5 rounded-full border"
          style={{ background:`${bot.color}18`, borderColor:`${bot.color}40`, color:bot.color }}>
          {botMeta.botVersion ?? bot.version}
        </span>
      </div>

      {!stats.loaded ? (
        <p className="text-[10px] text-white/20 animate-pulse">Loading...</p>
      ) : stats.trades.length === 0 ? (
        <p className="text-[10px] text-white/20 italic">No signals yet</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[9px] text-white/30 uppercase tracking-wider">P&amp;L</p>
            <p className="text-sm font-black" style={{ color: pnlPos ? bot.color : "#f87171" }}>
              {pnlPos?"+":""}${pnl.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Win Rate</p>
            <p className="text-sm font-black" style={{ color: wr >= 50 ? bot.color : "#f87171" }}>
              {wr.toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Trades</p>
            <p className="text-sm font-black text-white">{stats.trades.length}</p>
          </div>
        </div>
      )}

      {selected && (
        <ChevronRight size={12} className="absolute right-3 bottom-4 opacity-50"
          style={{ color: bot.color }} />
      )}
    </button>
  )
}

// ─── BotDetail ────────────────────────────────────────────────────────────────
function BotDetail({ bot, stats, botMeta }: {
  bot:     typeof BOTS[0]
  stats:   BotStats
  botMeta: BotMeta
}) {
  const [tab,       setTab]       = useState<"overview"|"signals"|"trades"|"config"|"changelog">("overview")
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [savedMsg,  setSavedMsg]  = useState(false)
  const [remoteConfig, setRemoteConfig] = useState<Record<string,any> | null>(null)

  const defaultCfg = {
    isActive:       true,
    normalLot:      0.01,
    maxSLDollars:   5.0,
    requireHTFBias: true,
    maxSpread:      400,
    dailyWinGoal:   10.0,
    dailyLossCap:   5.0,
  }
  const [cfg, setCfg] = useState(defaultCfg)

  const { user } = useAuth()
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    if (!user) return
    getDoc(doc(db, "allowedUsers", user.uid)).then(snap => {
      setIsOwner(snap.exists() && snap.data()?.isPhoenixOwner === true)
    })
  }, [user])

  // Load remote config (one-time is fine — config doesn't need real-time)
  useEffect(() => {
    if (!user) return
    getDoc(doc(db, "botConfig", String(bot.magic))).then(snap => {
      if (snap.exists()) {
        const data = snap.data()
        setCfg({
          isActive:       data.isActive       ?? true,
          normalLot:      data.normalLot      ?? 0.01,
          maxSLDollars:   data.maxSLDollars   ?? 5.0,
          requireHTFBias: data.requireHTFBias ?? true,
          maxSpread:      data.maxSpread      ?? 400,
          dailyWinGoal:   data.dailyWinGoal   ?? 10.0,
          dailyLossCap:   data.dailyLossCap   ?? 5.0,
        })
        setRemoteConfig(data)
      }
    })
  }, [bot.magic, user])

  // Live status: botMeta comes from parent onSnapshot — updates in real time.
  // isLive = true only if lastSeenAt is within the last 10 minutes.
  const isLive = useMemo(() => getIsLive(botMeta), [botMeta.lastSeenAt])

  // Use live name/version/mode from Firestore if available, else fall back to registry
  const displayName = botMeta.botName    ?? bot.name
  const liveVersion = botMeta.botVersion ?? bot.version
  const liveMode    = botMeta.botMode    ?? bot.config["Mode"]

  const saveConfig = async () => {
    if (!user) return
    setSaving(true)
    try {
      await setDoc(doc(db, "botConfig", String(bot.magic)), {
        ...cfg,
        magic:     bot.magic,
        botName:   bot.name,
        ownerId:   user.uid,
        updatedAt: new Date(),
      })
      setRemoteConfig({ ...cfg })
      setEditing(false)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const trades  = stats.trades
  const pnl     = trades.reduce((s, t) => s + t.profit, 0)
  const wins    = trades.filter(t => t.profit > 0)
  const losses  = trades.filter(t => t.profit < 0)
  const wr      = trades.length > 0 ? (wins.length / trades.length) * 100 : 0
  const avgWin  = wins.length   > 0 ? wins.reduce((s,t)=>s+t.profit,0)   / wins.length   : 0
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s,t)=>s+t.profit,0)) / losses.length : 0
  const pf      = avgLoss > 0 ? avgWin / avgLoss : 0

  const equityData = useMemo(() => {
    let run = 0
    return [...trades]
      .sort((a, b) => {
        const ta = a.closedAt?.toDate ? a.closedAt.toDate() : new Date(a.closedAt || 0)
        const tb = b.closedAt?.toDate ? b.closedAt.toDate() : new Date(b.closedAt || 0)
        return ta.getTime() - tb.getTime()
      })
      .map(t => {
        run += t.profit
        const d = t.closedAt?.toDate ? t.closedAt.toDate() : new Date(t.closedAt || 0)
        return {
          date:  d.toLocaleDateString("en-US", { month:"short", day:"numeric" }),
          value: Number(run.toFixed(2))
        }
      })
  }, [trades])

  const TABS = [
    { id:"overview",  label:"Overview"   },
    { id:"signals",   label:"Signals"    },
    { id:"trades",    label:"All Trades" },
    ...(isOwner ? [{ id:"config", label:"Config" }] : []),
    { id:"changelog", label:"Changelog"  },
  ]

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor:`${bot.color}25`, background:"rgba(255,255,255,0.015)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor:`${bot.color}18`, background:`${bot.color}08` }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{bot.icon}</span>
          <div>
            {/* displayName: live from Firestore botName field, falls back to registry */}
            <h2 className="text-sm font-black text-white">{displayName}</h2>
            <p className="text-[10px] font-mono" style={{ color:`${bot.color}80` }}>
              {bot.symbol} · {bot.timeframe} · Magic {bot.magic} · {liveVersion}
              {/* Live indicator: green = heartbeat recent, grey dot = offline */}
              {isLive
                ? <span className="ml-1 text-green-400 animate-pulse">● live</span>
                : botMeta.lastSeenAt
                  ? <span className="ml-1 text-white/20">● offline</span>
                  : null
              }
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-black" style={{ color: pnl>=0 ? bot.color : "#f87171" }}>
            {pnl>=0?"+":""}${pnl.toFixed(2)}
          </p>
          <p className="text-[10px] text-white/30">{trades.length} signals total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor:`${bot.color}12` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all"
            style={{
              color:        tab===t.id ? bot.color         : "rgba(255,255,255,0.25)",
              borderBottom: tab===t.id ? `2px solid ${bot.color}` : "2px solid transparent",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:"Win Rate",      value:`${wr.toFixed(1)}%`,       color: wr>=50?bot.color:"#f87171" },
                { label:"Profit Factor", value:pf>0?pf.toFixed(2):"—",   color: pf>=1.5?bot.color:pf>=1?"#fbbf24":"#f87171" },
                { label:"Avg Win",       value:`$${avgWin.toFixed(2)}`,   color: bot.color },
                { label:"Avg Loss",      value:`$${avgLoss.toFixed(2)}`,  color: "#f87171" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
                  <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1">{s.label}</p>
                  <p className="text-base font-black" style={{ color:s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Strategy config summary */}
            <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
              <p className="text-[9px] uppercase tracking-widest text-white/25 mb-2">
                {liveMode} — Current Config
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
                {Object.entries(bot.config).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-[9px] text-white/30">{k}: </span>
                    <span className="text-[9px] font-bold" style={{ color:bot.color }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Equity curve */}
            {equityData.length > 1 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Equity Curve</p>
                <div className="h-40 rounded-xl border border-white/6 bg-white/[0.02] px-3 pt-3 pb-1 relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
                    style={{ background:`linear-gradient(to top,${bot.color}08,transparent)` }} />
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                      <defs>
                        <linearGradient id={`bf${bot.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={bot.color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={bot.color} stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" hide />
                      <YAxis axisLine={false} tickLine={false}
                        tick={{ fontSize:8, fill:"rgba(255,255,255,0.25)" }}
                        tickFormatter={v => `$${v}`} />
                      <Tooltip content={<ChartTip />} />
                      <Area type="monotone" dataKey="value"
                        stroke={bot.color} strokeWidth={2}
                        fill={`url(#bf${bot.id})`}
                        style={{ filter:`drop-shadow(0 0 6px ${bot.glow})` }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* W/L bar */}
            {trades.length > 0 && (
              <div>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span style={{ color:bot.color }}>● Wins {wins.length} ({wr.toFixed(0)}%)</span>
                  <span className="text-rose-400">● Losses {losses.length} ({(100-wr).toFixed(0)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-rose-500/30 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width:`${wr}%`, background:bot.color, boxShadow:`0 0 8px ${bot.glow}` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SIGNALS ── */}
        {tab === "signals" && (
          <div className="space-y-3">
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
              Recent Signals — {displayName} · Last 30 entries
            </p>
            <div className="rounded-xl border border-white/6 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Time","Symbol","Dir","Entry","SL","TP1","Lot","P&L","Status"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest text-white/20">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...trades]
                    .sort((a, b) => {
                      const ta = a.closedAt?.toDate ? a.closedAt.toDate() : new Date(a.closedAt||0)
                      const tb = b.closedAt?.toDate ? b.closedAt.toDate() : new Date(b.closedAt||0)
                      return tb.getTime() - ta.getTime()
                    })
                    .slice(0, 30)
                    .map(t => {
                      const d      = t.closedAt?.toDate ? t.closedAt.toDate() : new Date(t.closedAt||0)
                      const isOpen = t.status === "OPEN"
                      const pos    = t.profit >= 0
                      return (
                        <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-3 py-2 text-[10px] font-mono text-white/30">
                            {isOpen
                              ? <span className="animate-pulse" style={{color:bot.color}}>LIVE</span>
                              : d.toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                          </td>
                          <td className="px-3 py-2 text-[10px] font-bold text-white">{t.symbol}</td>
                          <td className="px-3 py-2">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                              style={{
                                background: t.direction==="BUY"?"rgba(52,211,153,0.15)":"rgba(248,113,113,0.15)",
                                color:      t.direction==="BUY"?"#34d399":"#f87171"
                              }}>{t.direction}</span>
                          </td>
                          <td className="px-3 py-2 text-[10px] font-mono text-white/50">{t.entryPrice>0?t.entryPrice.toFixed(2):"—"}</td>
                          <td className="px-3 py-2 text-[10px] font-mono text-rose-400/60">{t.sl>0?t.sl.toFixed(2):"—"}</td>
                          <td className="px-3 py-2 text-[10px] font-mono" style={{color:`${bot.color}80`}}>{t.tp1>0?t.tp1.toFixed(2):"—"}</td>
                          <td className="px-3 py-2 text-[10px] font-mono text-white/40">{t.lot>0?t.lot.toFixed(2):"—"}</td>
                          <td className="px-3 py-2 text-[10px] font-black"
                            style={{ color: isOpen?"rgba(255,255,255,0.3)": pos ? bot.color : "#f87171" }}>
                            {isOpen ? "—" : `${pos?"+":""}$${t.profit.toFixed(2)}`}
                          </td>
                          <td className="px-3 py-2">
                            {isOpen
                              ? <span className="text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse"
                                  style={{background:`${bot.color}20`,color:bot.color}}>OPEN</span>
                              : pos
                                ? <CheckCircle2 size={12} style={{color:bot.color}} />
                                : <XCircle size={12} className="text-rose-400" />}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
            {trades.length === 0 && (
              <p className="text-center text-white/20 text-sm py-8">No signals recorded yet</p>
            )}
          </div>
        )}

        {/* ── ALL TRADES ── */}
        {tab === "trades" && (
          <div className="space-y-2">
            {trades.length === 0 && (
              <p className="text-center text-white/20 text-sm py-8">No trades recorded yet</p>
            )}
            <div className="rounded-xl border border-white/6 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Date","Symbol","Dir","Entry","P&L","Outcome"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest text-white/20">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...trades]
                    .sort((a, b) => {
                      const ta = a.closedAt?.toDate ? a.closedAt.toDate() : new Date(a.closedAt||0)
                      const tb = b.closedAt?.toDate ? b.closedAt.toDate() : new Date(b.closedAt||0)
                      return tb.getTime() - ta.getTime()
                    })
                    .slice(0, 50)
                    .map(t => {
                      const d   = t.closedAt?.toDate ? t.closedAt.toDate() : new Date(t.closedAt||0)
                      const pos = t.profit >= 0
                      return (
                        <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-3 py-2 text-[10px] text-white/40 font-mono">
                            {d.toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                          </td>
                          <td className="px-3 py-2 text-[10px] font-bold text-white">{t.symbol}</td>
                          <td className="px-3 py-2">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                              style={{
                                background: t.direction==="BUY"?"rgba(52,211,153,0.15)":"rgba(248,113,113,0.15)",
                                color:      t.direction==="BUY"?"#34d399":"#f87171"
                              }}>{t.direction}</span>
                          </td>
                          <td className="px-3 py-2 text-[10px] font-mono text-white/50">
                            {t.entryPrice > 0 ? t.entryPrice.toFixed(2) : "—"}
                          </td>
                          <td className="px-3 py-2 text-[10px] font-black"
                            style={{ color: pos ? bot.color : "#f87171" }}>
                            {pos?"+":""}${t.profit.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            {pos
                              ? <CheckCircle2 size={12} style={{ color:bot.color }} />
                              : t.profit === 0
                                ? <MinusCircle size={12} className="text-white/30" />
                                : <XCircle size={12} className="text-rose-400" />}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
            {trades.length > 50 && (
              <p className="text-center text-[10px] text-white/20">Showing 50 of {trades.length} trades</p>
            )}
          </div>
        )}

        {/* ── CONFIG — owner only ── */}
        {tab === "config" && isOwner && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                  Live Parameters — {displayName} {liveVersion}
                </p>
                {remoteConfig?.updatedAt && (
                  <p className="text-[9px] text-white/20 mt-0.5">
                    Last pushed: {new Date(remoteConfig.updatedAt?.toDate?.() ?? remoteConfig.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {savedMsg && (
                  <span className="text-[10px] font-bold" style={{color:bot.color}}>✓ Pushed to bot</span>
                )}
                {!editing
                  ? <button onClick={() => setEditing(true)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border"
                      style={{background:`${bot.color}18`,borderColor:`${bot.color}40`,color:bot.color}}>
                      Edit Config
                    </button>
                  : <div className="flex gap-2">
                      <button onClick={() => setEditing(false)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white/40 border border-white/10 hover:bg-white/5 transition-all">
                        Cancel
                      </button>
                      <button onClick={saveConfig} disabled={saving}
                        className="px-4 py-1.5 rounded-lg text-[10px] font-black text-black transition-all"
                        style={{background:bot.color,boxShadow:`0 0 12px ${bot.glow}`,opacity:saving?0.7:1}}>
                        {saving ? "Pushing..." : "Push to Bot"}
                      </button>
                    </div>
                }
              </div>
            </div>

            {/* Kill switch */}
            <div className="flex items-center justify-between rounded-xl border px-4 py-3"
              style={{
                background:  cfg.isActive ? `${bot.color}08` : "rgba(248,113,113,0.06)",
                borderColor: cfg.isActive ? `${bot.color}25` : "rgba(248,113,113,0.25)",
              }}>
              <div>
                <p className="text-xs font-black text-white">Bot Active</p>
                <p className="text-[10px] text-white/30">Disabling stops all new entries immediately</p>
              </div>
              <button
                disabled={!editing}
                onClick={() => setCfg(p => ({ ...p, isActive: !p.isActive }))}
                className="relative w-11 h-6 rounded-full transition-all duration-200 disabled:opacity-60"
                style={{ background: cfg.isActive ? bot.color : "rgba(255,255,255,0.1)" }}>
                <span className="absolute top-0.5 transition-all duration-200 w-5 h-5 bg-white rounded-full shadow"
                  style={{ left: cfg.isActive ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>

            {/* Numeric params */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key:"normalLot",    label:"Base Lot",     step:0.005, min:0.001, max:1    },
                { key:"maxSLDollars", label:"Max SL ($)",   step:0.5,   min:1,     max:50   },
                { key:"maxSpread",    label:"Max Spread",   step:10,    min:10,    max:2000 },
                { key:"dailyWinGoal", label:"Daily Win %",  step:0.5,   min:1,     max:50   },
                { key:"dailyLossCap", label:"Daily Loss %", step:0.5,   min:1,     max:20   },
              ].map(({ key, label, step, min, max }) => (
                <div key={key} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3">
                  <p className="text-[9px] uppercase tracking-widest text-white/30 mb-2">{label}</p>
                  {editing ? (
                    <input
                      type="number" step={step} min={min} max={max}
                      value={(cfg as any)[key]}
                      onChange={e => setCfg(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-sm font-black text-white focus:outline-none focus:border-white/30"
                      style={{ colorScheme:"dark" }}
                    />
                  ) : (
                    <p className="text-sm font-black" style={{ color:bot.color }}>
                      {(cfg as any)[key]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* HTF bias toggle */}
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/20 mb-2">HTF Bias Filter</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[{ key:"requireHTFBias", label: bot.timeframe === "M15" ? "H4 Bias" : "H1 Bias" }].map(({ key, label }) => {
                  const on = (cfg as any)[key]
                  return (
                    <button key={key}
                      disabled={!editing}
                      onClick={() => setCfg(p => ({ ...p, [key]: !(p as any)[key] }))}
                      className="flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all disabled:opacity-60"
                      style={{
                        background:  on ? `${bot.color}18` : "rgba(255,255,255,0.02)",
                        borderColor: on ? `${bot.color}40` : "rgba(255,255,255,0.06)",
                      }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: on ? bot.color : "rgba(255,255,255,0.2)" }} />
                      <span className="text-[10px] font-bold"
                        style={{ color: on ? bot.color : "rgba(255,255,255,0.3)" }}>
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
              <p className="text-[9px] text-white/25 leading-relaxed">
                📡 Changes pushed to Firestore <strong className="text-white/40">botConfig/{bot.magic}</strong>.
                EA polls every 5 min and applies on the next new bar — no restart required.
                CRT anchor hour, sweep buffer, and stagnation bars are set as EA inputs and require MT5 restart to change.
              </p>
            </div>
          </div>
        )}

        {/* ── CHANGELOG ── */}
        {tab === "changelog" && (
          <div className="space-y-3">
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-4">Version History</p>
            <div className="relative">
              <div className="absolute left-3.5 top-2 bottom-2 w-px"
                style={{ background:`linear-gradient(to bottom,${bot.color}60,transparent)` }} />
              <div className="space-y-4 pl-8">
                {bot.changelog.map((c, i) => (
                  <div key={c.version} className="relative">
                    <div className="absolute -left-5 w-3 h-3 rounded-full border-2 flex items-center justify-center"
                      style={{
                        background:  i===0 ? bot.color : "transparent",
                        borderColor: i===0 ? bot.color : `${bot.color}50`,
                        boxShadow:   i===0 ? `0 0 8px ${bot.glow}` : "none",
                        top: "2px",
                      }} />
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-black" style={{ color: i===0?bot.color:"rgba(255,255,255,0.5)" }}>
                        {c.version}
                      </span>
                      <span className="text-[9px] text-white/25">{c.date}</span>
                      {i===0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background:`${bot.color}20`, color:bot.color }}>
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/40 leading-relaxed">{c.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function BotHubView() {
  const [selectedBot, setSelectedBot] = useState(BOTS[0].id)
  const [botStats,    setBotStats]    = useState<Record<string, BotStats>>({})
  // Real-time botMeta per bot — subscribed via onSnapshot so heartbeats and
  // BOT_OFFLINE updates reflect instantly without a page refresh.
  const [botMetas,    setBotMetas]    = useState<Record<string, BotMeta>>({})

  const bot = BOTS.find(b => b.id === selectedBot)!

  // Subscribe to botTrades per bot
  useEffect(() => {
    const unsubs: (() => void)[] = []
    for (const b of BOTS) {
      setBotStats(prev => ({ ...prev, [b.id]: { trades:[], loaded:false } }))
      const q = query(collection(db, "botTrades"), where("bot", "==", b.firestore))
      const unsub = onSnapshot(q, snap => {
        const trades = snap.docs.map(d => {
          const data = d.data()
          return {
            id:         d.id,
            symbol:     data.symbol     || "",
            direction:  data.direction  || data.type || "BUY",
            profit:     data.profit     ?? data.rMultiple ?? 0,
            outcome:    data.outcome    || (data.profit >= 0 ? "WIN" : "LOSS"),
            openedAt:   data.openedAt,
            closedAt:   data.closedAt   || data.timestamp,
            entryPrice: data.entryPrice || 0,
            sl:         data.sl         || 0,
            tp1:        data.tp1        || 0,
            lot:        data.lot        || 0,
            status:     data.status     || "CLOSED",
          } as BotTrade
        })
        setBotStats(prev => ({ ...prev, [b.id]: { trades, loaded:true } }))
      }, () => {
        setBotStats(prev => ({ ...prev, [b.id]: { trades:[], loaded:true } }))
      })
      unsubs.push(unsub)
    }
    return () => unsubs.forEach(u => u())
  }, [])

  // Subscribe to botConfig/{magic} for EACH bot via onSnapshot.
  // This is what makes the live indicator update in real time:
  // - Heartbeat BOT_INIT every 5 min → lastSeenAt refreshes → green dot stays
  // - BOT_OFFLINE → lastSeenAt goes to year 2000 → dot goes grey instantly
  // - Name/version changes → card and detail update without page reload
  useEffect(() => {
    const unsubs: (() => void)[] = []
    for (const b of BOTS) {
      const unsub = onSnapshot(doc(db, "botConfig", String(b.magic)), snap => {
        if (snap.exists()) {
          const d = snap.data()
          setBotMetas(prev => ({
            ...prev,
            [b.id]: {
              botName:    d.botName,
              botVersion: d.botVersion,
              botMode:    d.botMode,
              lastSeenAt: d.lastSeenAt,
            }
          }))
        }
      })
      unsubs.push(unsub)
    }
    return () => unsubs.forEach(u => u())
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
          <Zap size={15} className="text-muted-foreground" />
          Bot Hub
        </h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Live performance monitoring for all deployed engines
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BOTS.map(b => (
          <BotCard
            key={b.id}
            bot={b}
            stats={botStats[b.id] ?? { trades:[], loaded:false }}
            botMeta={botMetas[b.id] ?? {}}
            selected={selectedBot === b.id}
            onClick={() => setSelectedBot(b.id)}
          />
        ))}
      </div>

      <BotDetail
        bot={bot}
        stats={botStats[bot.id] ?? { trades:[], loaded:false }}
        botMeta={botMetas[bot.id] ?? {}}
      />
    </div>
  )
}
