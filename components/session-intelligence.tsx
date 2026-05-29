"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Clock, Activity, Crosshair, Shield, Zap, TrendingUp, TrendingDown,
  Cpu, Flame, BarChart3, Target, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertCircle, Calculator,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Trade {
  id: string; date: string; symbol: string; setup: string; rMultiple: number; direction?: string
}

interface MarketData {
  symbol: string; currentPrice: number
  pdh: number; pdl: number; pdc: number; pdo: number
  pwh: number; pwl: number
  todayHigh: number; todayLow: number
  atr: number
  fvgs: { direction: 'bull' | 'bear'; top: number; bottom: number; date: string }[]
  eqhs: number[]; eqls: number[]
  poc: number; vah: number; val: number; avwap: number
  fetchedAt: number
  error?: string
}

// ─── Session definitions ──────────────────────────────────────────────────────
const SESSIONS = {
  ASIAN:   { label: "Asian",    start: 0,  end: 8,  color: "#a78bfa", glow: "rgba(167,139,250,0.15)" },
  LONDON:  { label: "London",   start: 8,  end: 13, color: "#34d399", glow: "rgba(52,211,153,0.15)"  },
  OVERLAP: { label: "Overlap",  start: 13, end: 16, color: "#fbbf24", glow: "rgba(251,191,36,0.15)"  },
  NY:      { label: "New York", start: 16, end: 22, color: "#60a5fa", glow: "rgba(96,165,250,0.15)"  },
} as const
type SessionKey = keyof typeof SESSIONS

// ICT Kill Zones (UTC)
const KILL_ZONES = [
  { name: "Asian Kill Zone",   start: 20, end: 24, color: "#f472b6" },
  { name: "Asian Kill Zone",   start: 0,  end: 2,  color: "#f472b6" },
  { name: "London Kill Zone",  start: 7,  end: 10, color: "#34d399" },
  { name: "NY AM Kill Zone",   start: 12, end: 14, color: "#60a5fa" },
  { name: "NY Lunch",          start: 17, end: 18, color: "#fbbf24" },
  { name: "NY PM Kill Zone",   start: 18, end: 21, color: "#a78bfa" },
]

// Session transitions for countdown
const TRANSITIONS = [
  { name: "London Open",   hour: 8,  min: 0 },
  { name: "NY Open",       hour: 13, min: 0 },
  { name: "London Close",  hour: 17, min: 0 },
  { name: "NY Close",      hour: 22, min: 0 },
  { name: "Asian Open",    hour: 23, min: 0 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSessionKey(date: Date): SessionKey {
  const h = date.getUTCHours()
  // Asian session wraps midnight: 22:00 UTC → 08:00 UTC
  // (Tokyo opens ~23:00 UTC, Sydney ~22:00 UTC, NY closes 22:00 UTC)
  if (h >= 22 || h < 8)  return "ASIAN"
  if (h >= 8  && h < 13) return "LONDON"
  if (h >= 13 && h < 16) return "OVERLAP"
  return "NY"  // 16:00–22:00 UTC
}

function getActiveKillZone(h: number) {
  return KILL_ZONES.find(kz => h >= kz.start && h < kz.end) || null
}

function getCountdown(now: Date): { name: string; hh: string; mm: string; ss: string } {
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes()
  const utcSec = utcMin * 60 + now.getUTCSeconds()
  for (const t of TRANSITIONS) {
    const tSec = (t.hour * 60 + t.min) * 60
    if (tSec > utcSec) {
      const diff = tSec - utcSec
      return { name: t.name, hh: String(Math.floor(diff / 3600)).padStart(2,'0'), mm: String(Math.floor((diff % 3600) / 60)).padStart(2,'0'), ss: String(diff % 60).padStart(2,'0') }
    }
  }
  const diff = (24 * 3600 - utcSec) + 8 * 3600
  return { name: "London Open", hh: String(Math.floor(diff / 3600)).padStart(2,'0'), mm: String(Math.floor((diff % 3600) / 60)).padStart(2,'0'), ss: String(diff % 60).padStart(2,'0') }
}

function matchSymbol(sym: string, filter: "XAUUSD" | "USTEC"): boolean {
  const s = sym.toUpperCase()
  if (filter === "XAUUSD") return s.includes("XAU") || s.includes("GOLD") || s === "XAUUSD"
  if (filter === "USTEC")  return s.includes("NQ") || s.includes("USTEC") || s.includes("NASDAQ") || s.includes("US100") || s.includes("NDX")
  return false
}

function calcStats(trades: Trade[]) {
  const wins = trades.filter(t => t.rMultiple > 0)
  const losses = trades.filter(t => t.rMultiple < 0)
  const netPnl = trades.reduce((s, t) => s + Number(t.rMultiple), 0)
  const gp = wins.reduce((s, t) => s + Number(t.rMultiple), 0)
  const gl = Math.abs(losses.reduce((s, t) => s + Number(t.rMultiple), 0))
  return {
    wins: wins.length, losses: losses.length, total: trades.length,
    netPnl, gp, gl,
    winRate: trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(1) : "0.0",
    profitFactor: gl > 0 ? (gp / gl).toFixed(2) : gp > 0 ? "∞" : "—",
  }
}

function fmt(n: number, dec = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  return now
}

// ─── TradingView Chart ────────────────────────────────────────────────────────
function TVChart({ symbol, interval }: { symbol: string; interval: string }) {
  const ref = useRef<HTMLDivElement>(null)
  // TVC:GOLD    = TradingView free spot gold — no broker connection required
  // NASDAQ:NDX  = NASDAQ 100 index — free on all TradingView accounts, no subscription needed
  //               (CME_MINI:NQ1! requires a CME data add-on which triggers the "only on TV" popup)
  const tvSymbol = symbol === "XAUUSD" ? "TVC:GOLD" : "NASDAQ:NDX"

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ""
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.async = true
    script.type = "text/javascript"
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "#000001",
      gridColor: "rgba(255,255,255,0.03)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
    })
    ref.current.appendChild(script)
    return () => { if (ref.current) ref.current.innerHTML = "" }
  }, [tvSymbol, interval])

  return (
    <div ref={ref} className="tradingview-widget-container w-full h-full">
      <div className="tradingview-widget-container__widget w-full h-full" />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SessionIntelligence({ trades = [] }: { trades: Trade[] }) {
  const now  = useLiveClock()
  const [assetFilter, setAssetFilter] = useState<"ALL" | "XAUUSD" | "USTEC">("ALL")
  const [marketAsset, setMarketAsset] = useState<"XAUUSD" | "USTEC">("XAUUSD")
  const [traderMode,  setTraderMode]  = useState<"INTRADAY" | "SWING">("INTRADAY")
  const [interval,    setInterval]    = useState("15")
  const [marketData,  setMarketData]  = useState<MarketData | null>(null)
  const [mdLoading,   setMdLoading]   = useState(false)
  const [notesAsset,  setNotesAsset]  = useState<"XAUUSD" | "USTEC">("XAUUSD")
  const [notes,       setNotes]       = useState("")

  // R/R Calculator state
  const [rrEntry,   setRREntry]   = useState("")
  const [rrSL,      setRRSL]      = useState("")
  const [rrTP,      setRRTP]      = useState("")

  // Rule checklist (manual toggles)
  const [checks, setChecks] = useState({ drawdownOk: true, spreadOk: true, tradesOk: true, newsOk: true })

  // Sync market asset when filter changes
  useEffect(() => { if (assetFilter !== "ALL") setMarketAsset(assetFilter) }, [assetFilter])

  // Default intervals per mode
  useEffect(() => { setInterval(traderMode === "INTRADAY" ? "15" : "240") }, [traderMode])

  // Fetch market data
  const fetchMarketData = useCallback(async () => {
    setMdLoading(true)
    try {
      const res = await fetch(`/api/market-data?symbol=${marketAsset}`)
      const data = await res.json()
      setMarketData(data)
    } catch { setMarketData(null) } finally { setMdLoading(false) }
  }, [marketAsset])

  useEffect(() => { fetchMarketData() }, [fetchMarketData])

  // Notes persistence
  useEffect(() => { try { setNotes(localStorage.getItem(`phx_notes_${notesAsset}`) || "") } catch { setNotes("") } }, [notesAsset])
  const saveNotes = (v: string) => { setNotes(v); try { localStorage.setItem(`phx_notes_${notesAsset}`, v) } catch {} }

  // ── Derived trade data ───────────────────────────────────────────────────
  const filteredTrades = useMemo(() => {
    if (assetFilter === "ALL") return trades
    return trades.filter(t => matchSymbol(t.symbol || "", assetFilter))
  }, [trades, assetFilter])

  const sessionTrades = useMemo(() => {
    const map: Record<SessionKey, Trade[]> = { ASIAN: [], LONDON: [], OVERLAP: [], NY: [] }
    filteredTrades.forEach(t => { const k = getSessionKey(new Date(t.date)); map[k].push(t) })
    return map
  }, [filteredTrades])

  const overallStats = useMemo(() => calcStats(filteredTrades), [filteredTrades])

  // ── Live session state ───────────────────────────────────────────────────
  const currentSession = getSessionKey(now)
  const killZone       = getActiveKillZone(now.getUTCHours())
  const countdown      = getCountdown(now)
  const isFriday       = now.getDay() === 5
  const noFridayTrade  = isFriday && now.getUTCHours() >= 17 // after 12pm NY

  // ── R/R Calculator ───────────────────────────────────────────────────────
  const rrCalc = useMemo(() => {
    const e = parseFloat(rrEntry), sl = parseFloat(rrSL), tp = parseFloat(rrTP)
    if (isNaN(e) || isNaN(sl) || isNaN(tp) || e === sl) return null
    const risk   = Math.abs(e - sl)
    const reward = Math.abs(tp - e)
    const ratio  = reward / risk
    return { risk: risk.toFixed(2), reward: reward.toFixed(2), ratio: ratio.toFixed(2), color: ratio >= 2 ? "text-emerald-400" : ratio >= 1 ? "text-amber-400" : "text-rose-400" }
  }, [rrEntry, rrSL, rrTP])

  // ── ATR stops ────────────────────────────────────────────────────────────
  const atrStops = useMemo(() => {
    if (!marketData?.atr || !marketData.currentPrice) return null
    const atr = marketData.atr
    const price = marketData.currentPrice
    return [1.0, 1.5, 2.0, 2.2].map(mult => ({
      mult, dist: (atr * mult).toFixed(2),
      above: (price + atr * mult).toFixed(2),
      below: (price - atr * mult).toFixed(2),
    }))
  }, [marketData])

  const allChecks = [
    { key: "killZone",    label: "Kill Zone Active",          auto: true,  value: !!killZone,       note: killZone?.name || "No active kill zone" },
    { key: "noFriday",    label: "Friday Blackout Clear",     auto: true,  value: !noFridayTrade,   note: noFridayTrade ? "BLOCKED — Friday after NY noon" : "Clear to trade" },
    { key: "drawdownOk",  label: "Daily Drawdown OK",         auto: false, value: checks.drawdownOk,  note: "< 5% daily loss limit" },
    { key: "spreadOk",    label: "Spread Within Limits",      auto: false, value: checks.spreadOk,    note: "< 350 spread threshold" },
    { key: "tradesOk",    label: "Daily Trade Cap OK",        auto: false, value: checks.tradesOk,    note: "Max trades not reached" },
    { key: "newsOk",      label: "No High-Impact News",       auto: false, value: checks.newsOk,      note: "News event window clear" },
  ] as const

  const allGreen = allChecks.every(c => c.value)
  const toggleCheck = (key: keyof typeof checks) => setChecks(p => ({ ...p, [key]: !p[key] }))

  const p = fmt  // price formatter alias

  return (
    <div className="w-full space-y-5 text-slate-100 font-sans">

      {/* ══ SECTION 1: Header ══════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-[#070b12]/70 border border-slate-800 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <Cpu className="w-5 h-5 text-green-400 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-black tracking-widest uppercase text-green-400">Session Intelligence HUD</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              UTC {now.toISOString().slice(11, 19)} · {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 bg-[#03050a] p-1.5 rounded-lg border border-slate-800">
          {(["ALL", "XAUUSD", "USTEC"] as const).map(a => (
            <button key={a} onClick={() => setAssetFilter(a)}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold tracking-widest rounded-md transition-all ${assetFilter === a ? "bg-green-500/10 text-green-400 border border-green-500/30" : "text-slate-500 hover:text-slate-300"}`}>
              {a === "XAUUSD" ? "🥇 XAUUSD" : a === "USTEC" ? "⚡ USTEC" : "ALL ASSETS"}
            </button>
          ))}
        </div>
      </div>

      {/* ══ SECTION 2: Session State Bar ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active session & kill zone */}
        <Card className="bg-[#070b12]/60 border border-slate-800 shadow-xl"
          style={{ borderColor: SESSIONS[currentSession].color + "55", boxShadow: `0 0 24px ${SESSIONS[currentSession].glow}` }}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Market</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse border"
                style={{ color: SESSIONS[currentSession].color, borderColor: SESSIONS[currentSession].color + "60", backgroundColor: SESSIONS[currentSession].glow }}>
                LIVE
              </span>
            </div>
            <p className="text-xl font-black font-mono" style={{ color: SESSIONS[currentSession].color }}>
              {SESSIONS[currentSession].label} Session
            </p>
            {killZone ? (
              <div className="flex items-center gap-1.5 bg-black/30 rounded-lg px-2 py-1.5 border border-white/5">
                <Flame className="w-3 h-3 animate-bounce" style={{ color: killZone.color }} />
                <span className="text-[10px] font-black tracking-widest font-mono" style={{ color: killZone.color }}>
                  {killZone.name}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-black/20 rounded-lg px-2 py-1.5 border border-white/5">
                <Clock className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] font-bold text-slate-600 font-mono">No Kill Zone Active</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Countdown timer */}
        <Card className="bg-[#070b12]/60 border border-slate-800 shadow-xl">
          <CardContent className="p-4 space-y-3">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Next Transition</span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{countdown.name}</p>
            <div className="flex items-baseline gap-1 font-mono">
              {[countdown.hh, countdown.mm, countdown.ss].map((val, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  <span className="text-2xl font-black text-slate-100">{val}</span>
                  {i < 2 && <span className="text-slate-600 text-lg font-black">:</span>}
                </span>
              ))}
            </div>
            <p className="text-[9px] text-slate-600 font-mono">HH : MM : SS</p>
          </CardContent>
        </Card>

        {/* Session Initial Balance */}
        <Card className="bg-[#070b12]/60 border border-slate-800 shadow-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Session Range (IB)</span>
              <span className="text-[9px] font-bold text-slate-600 font-mono">{marketAsset}</span>
            </div>
            {marketData && !marketData.error ? (
              <>
                <div className="flex justify-between items-center">
                  <div><p className="text-[9px] text-slate-500">Today H</p><p className="text-base font-black font-mono text-emerald-400">{p(marketData.todayHigh)}</p></div>
                  <div className="text-center"><p className="text-[9px] text-slate-500">Range</p><p className="text-base font-black font-mono text-amber-400">{p(marketData.todayHigh - marketData.todayLow)}</p></div>
                  <div className="text-right"><p className="text-[9px] text-slate-500">Today L</p><p className="text-base font-black font-mono text-rose-400">{p(marketData.todayLow)}</p></div>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400" style={{ width: "100%" }} />
                </div>
              </>
            ) : (
              <p className="text-[10px] text-slate-600 italic">{mdLoading ? "Loading..." : "No data"}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══ SECTION 3: Session Cards (Firebase Live Data) ═══════════════════════ */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {(Object.keys(SESSIONS) as SessionKey[]).map(key => {
          const sess  = SESSIONS[key]
          const stats = calcStats(sessionTrades[key])
          const isActive = key === currentSession
          return (
            <Card key={key} className="bg-[#070b12]/60 border shadow-xl backdrop-blur-md transition-all"
              style={{ borderColor: isActive ? sess.color + "80" : "#1e293b", boxShadow: isActive ? `0 0 18px ${sess.glow}` : undefined }}>
              <CardHeader className="bg-[#000001] py-2.5 px-3 border-b border-slate-900 flex flex-row items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" style={{ color: sess.color }} />
                  <span className="text-[10px] font-black font-mono tracking-widest uppercase" style={{ color: sess.color }}>{sess.label}</span>
                </div>
                {isActive && (
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded border animate-pulse"
                    style={{ color: sess.color, borderColor: sess.color + "60", backgroundColor: sess.glow }}>LIVE</span>
                )}
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between"><span className="text-[9px] text-slate-500 uppercase">Net P&L</span>
                  <span className={`text-sm font-black font-mono ${stats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {stats.netPnl >= 0 ? "+" : ""}${stats.netPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-[9px] text-slate-500 uppercase">Win Rate</span><span className="text-sm font-black font-mono text-slate-200">{stats.winRate}%</span></div>
                <div className="flex justify-between"><span className="text-[9px] text-slate-500 uppercase">P. Factor</span><span className="text-xs font-black font-mono text-amber-400">{stats.profitFactor}</span></div>
                <div className="flex justify-between"><span className="text-[9px] text-slate-500 uppercase">Signals</span><span className="text-xs font-black font-mono text-slate-300">{stats.wins}W/{stats.losses}L</span></div>
                <div className="w-full bg-slate-900 rounded-full h-1 mt-1">
                  <div className="h-1 rounded-full transition-all" style={{ width: stats.total > 0 ? `${(stats.wins / stats.total) * 100}%` : "0%", backgroundColor: sess.color }} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ══ SECTION 4: Structural & Liquidity Levels ════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-green-400" />
            <span className="text-xs font-black tracking-widest uppercase text-slate-300">Structural & Liquidity References</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Market asset toggle for levels section */}
            <div className="flex gap-1 bg-[#03050a] p-1 rounded-lg border border-slate-800">
              {(["XAUUSD", "USTEC"] as const).map(a => (
                <button key={a} onClick={() => setMarketAsset(a)}
                  className={`px-2.5 py-1 text-[9px] font-mono font-bold tracking-widest rounded transition-all ${marketAsset === a ? "bg-green-500/10 text-green-400 border border-green-500/20" : "text-slate-500 hover:text-slate-300"}`}>
                  {a === "XAUUSD" ? "🥇 XAUUSD" : "⚡ USTEC"}
                </button>
              ))}
            </div>
            <button onClick={fetchMarketData} disabled={mdLoading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 text-slate-400 ${mdLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {marketData?.error ? (
          <div className="p-4 rounded-xl border border-rose-900/40 bg-rose-900/10 text-rose-400 text-xs font-mono">
            Market data unavailable. Check your network or try refreshing.
          </div>
        ) : !marketData ? (
          <div className="p-4 rounded-xl border border-slate-800 bg-[#070b12]/40 text-slate-500 text-xs font-mono animate-pulse">
            Fetching live structural levels for {marketAsset}...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Previous Day/Week Levels */}
            <Card className="bg-[#070b12]/60 border border-slate-800 shadow-xl">
              <CardHeader className="bg-[#000001] py-2.5 px-4 border-b border-slate-900 flex flex-row items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                <CardTitle className="text-[10px] font-mono font-black tracking-widest text-slate-400 uppercase">Prev Day / Week Levels</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {[
                  { label: "PDH (Prev Day High)",   val: p(marketData.pdh), color: "text-emerald-400" },
                  { label: "PDL (Prev Day Low)",    val: p(marketData.pdl), color: "text-rose-400"    },
                  { label: "PDC (Prev Day Close)",  val: p(marketData.pdc), color: "text-blue-400"    },
                  { label: "PWH (Prev Week High)",  val: p(marketData.pwh), color: "text-emerald-300" },
                  { label: "PWL (Prev Week Low)",   val: p(marketData.pwl), color: "text-rose-300"    },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex justify-between items-center py-1 border-b border-slate-900/50 last:border-0">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                    <span className={`text-sm font-black font-mono ${color}`}>{val}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Equal Highs/Lows + FVG */}
            <Card className="bg-[#070b12]/60 border border-slate-800 shadow-xl">
              <CardHeader className="bg-[#000001] py-2.5 px-4 border-b border-slate-900 flex flex-row items-center gap-2">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <CardTitle className="text-[10px] font-mono font-black tracking-widest text-slate-400 uppercase">EQH / EQL / Liquidity</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {marketData.eqhs.length === 0 && marketData.eqls.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic">No equal levels detected in current window.</p>
                ) : null}
                {marketData.eqhs.map((lvl, i) => (
                  <div key={`eqh-${i}`} className="flex justify-between items-center py-1 border-b border-slate-900/50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">EQH {i + 1} (Sell-Side)</span>
                    </div>
                    <span className="text-sm font-black font-mono text-emerald-400">{p(lvl)}</span>
                  </div>
                ))}
                {marketData.eqls.map((lvl, i) => (
                  <div key={`eql-${i}`} className="flex justify-between items-center py-1 border-b border-slate-900/50 last:border-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">EQL {i + 1} (Buy-Side)</span>
                    </div>
                    <span className="text-sm font-black font-mono text-rose-400">{p(lvl)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Fair Value Gaps */}
            <Card className="bg-[#070b12]/60 border border-slate-800 shadow-xl">
              <CardHeader className="bg-[#000001] py-2.5 px-4 border-b border-slate-900 flex flex-row items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-violet-400" />
                <CardTitle className="text-[10px] font-mono font-black tracking-widest text-slate-400 uppercase">Fair Value Gaps (FVG)</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {marketData.fvgs.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic">No FVGs detected in current window.</p>
                ) : (
                  marketData.fvgs.map((fvg, i) => (
                    <div key={i} className="p-2 rounded-lg border space-y-1"
                      style={{ borderColor: fvg.direction === 'bull' ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)", backgroundColor: fvg.direction === 'bull' ? "rgba(52,211,153,0.04)" : "rgba(239,68,68,0.04)" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {fvg.direction === 'bull' ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                          <span className={`text-[9px] font-black uppercase tracking-widest ${fvg.direction === 'bull' ? "text-emerald-400" : "text-rose-400"}`}>
                            {fvg.direction === 'bull' ? 'Bullish FVG' : 'Bearish FVG'}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-600 font-mono">{fvg.date}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Top: <span className="text-slate-200 font-bold">{p(fvg.top)}</span></span>
                        <span className="text-slate-400">Bot: <span className="text-slate-200 font-bold">{p(fvg.bottom)}</span></span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ══ SECTION 5: Trader Flow + TradingView Chart ════════════════════════ */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-black tracking-widest uppercase text-slate-300">Live Chart Analysis</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Intraday / Swing toggle */}
            <div className="flex gap-1 bg-[#03050a] p-1 rounded-lg border border-slate-800">
              {(["INTRADAY", "SWING"] as const).map(m => (
                <button key={m} onClick={() => setTraderMode(m)}
                  className={`px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-md transition-all ${traderMode === m ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30" : "text-slate-500 hover:text-slate-300"}`}>
                  {m}
                </button>
              ))}
            </div>
            {/* Interval picker */}
            <div className="flex gap-1 bg-[#03050a] p-1 rounded-lg border border-slate-800">
              {(traderMode === "INTRADAY" ? ["5","15","30"] : ["60","240","D"]).map(iv => (
                <button key={iv} onClick={() => setInterval(iv)}
                  className={`px-3 py-1 text-[10px] font-mono font-black rounded-md transition-all ${interval === iv ? "bg-green-500/10 text-green-400 border border-green-500/20" : "text-slate-500 hover:text-slate-300"}`}>
                  {iv === "60" ? "1H" : iv === "240" ? "4H" : iv === "D" ? "1D" : `${iv}M`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#000001]" style={{ height: 460 }}>
          <TVChart symbol={marketAsset} interval={interval} />
        </div>
        <p className="text-[9px] text-slate-700 font-mono mt-1.5 text-right">
          Powered by TradingView · {marketAsset} · {interval === "60" ? "1H" : interval === "240" ? "4H" : interval === "D" ? "Daily" : `${interval}M`} chart (UTC)
        </p>
      </div>

      {/* ══ SECTION 6: Volume Profile ═════════════════════════════════════════ */}
      {marketData && !marketData.error && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-black tracking-widest uppercase text-slate-300">Volume Profile — Market Magnets</span>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "AVWAP",                  sub: "Anchored VWAP (5-day)",       val: p(marketData.avwap), color: "text-cyan-400",    desc: "Volume-weighted avg price. Price above = bullish bias." },
              { label: "POC",                    sub: "Point of Control",            val: p(marketData.poc),   color: "text-amber-400",   desc: "Highest volume price node. Acts as magnet / inflection zone." },
              { label: "VAH",                    sub: "Value Area High (70%)",        val: p(marketData.vah),   color: "text-emerald-400", desc: "Upper boundary of the 70% volume value area." },
              { label: "VAL",                    sub: "Value Area Low (70%)",         val: p(marketData.val),   color: "text-rose-400",    desc: "Lower boundary of the 70% volume value area." },
            ].map(({ label, sub, val, color, desc }) => (
              <Card key={label} className="bg-[#070b12]/60 border border-slate-800 shadow-xl">
                <CardContent className="p-4">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{label}</p>
                  <p className="text-[10px] text-slate-600 font-mono mb-1.5">{sub}</p>
                  <p className={`text-xl font-black font-mono ${color}`}>{val}</p>
                  <p className="text-[9px] text-slate-600 mt-1.5 leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ══ SECTION 7: Psychology & Risk Command Center ═════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-black tracking-widest uppercase text-slate-300">Psychology & Risk Command Center</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* R/R Calculator */}
          <Card className="bg-[#070b12]/60 border border-slate-800 shadow-xl">
            <CardHeader className="bg-[#000001] py-2.5 px-4 border-b border-slate-900 flex flex-row items-center gap-2">
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <CardTitle className="text-[10px] font-mono font-black tracking-widest text-slate-400 uppercase">R:R Calculator</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { label: "Entry Price",  val: rrEntry,  set: setRREntry, placeholder: marketData ? p(marketData.currentPrice) : "0.00" },
                { label: "Stop Loss",    val: rrSL,     set: setRRSL,    placeholder: "e.g. 3280.00" },
                { label: "Take Profit",  val: rrTP,     set: setRRTP,    placeholder: "e.g. 3400.00" },
              ].map(({ label, val, set, placeholder }) => (
                <div key={label}>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{label}</label>
                  <input type="number" value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                    className="w-full bg-[#03050a] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-700 focus:outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/20" />
                </div>
              ))}
              {rrCalc ? (
                <div className="mt-2 p-3 rounded-lg bg-black/30 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between"><span className="text-[9px] text-slate-500 uppercase">Risk</span><span className="text-sm font-black font-mono text-rose-400">{rrCalc.risk} pts</span></div>
                  <div className="flex justify-between"><span className="text-[9px] text-slate-500 uppercase">Reward</span><span className="text-sm font-black font-mono text-emerald-400">{rrCalc.reward} pts</span></div>
                  <div className="flex justify-between border-t border-slate-800 pt-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">R:R Ratio</span>
                    <span className={`text-lg font-black font-mono ${rrCalc.color}`}>1 : {rrCalc.ratio}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-black/20 border border-slate-800/50 text-center text-[10px] text-slate-600 font-mono italic">
                  Enter levels above to calculate
                </div>
              )}
            </CardContent>
          </Card>

          {/* ATR Stop Distances */}
          <Card className="bg-[#070b12]/60 border border-slate-800 shadow-xl">
            <CardHeader className="bg-[#000001] py-2.5 px-4 border-b border-slate-900 flex flex-row items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <CardTitle className="text-[10px] font-mono font-black tracking-widest text-slate-400 uppercase">ATR Stop Distances</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {atrStops ? (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider">ATR (14-day)</span>
                    <span className="text-base font-black font-mono text-cyan-400">{p(marketData!.atr)} pts</span>
                  </div>
                  {atrStops.map(s => (
                    <div key={s.mult} className={`p-2.5 rounded-lg border ${s.mult === 2.2 ? "border-green-500/30 bg-green-500/5" : "border-slate-800 bg-black/20"}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-black font-mono ${s.mult === 2.2 ? "text-green-400" : "text-slate-400"}`}>
                          {s.mult}× ATR {s.mult === 2.2 ? "← Locked Base" : ""}
                        </span>
                        <span className="text-[10px] font-mono text-slate-300">{s.dist} pts</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-mono">
                        <span className="text-emerald-400">⬆ {s.above}</span>
                        <span className="text-rose-400">⬇ {s.below}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-600 italic text-center py-4">Load market data to see ATR stops</p>
              )}
            </CardContent>
          </Card>

          {/* Rule Checklist */}
          <Card className="bg-[#070b12]/60 border shadow-xl transition-all"
            style={{ borderColor: allGreen ? "rgba(52,211,153,0.3)" : "rgba(30,41,59,1)", boxShadow: allGreen ? "0 0 20px rgba(52,211,153,0.08)" : undefined }}>
            <CardHeader className="bg-[#000001] py-2.5 px-4 border-b border-slate-900 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-3.5 h-3.5 ${allGreen ? "text-emerald-400" : "text-slate-500"}`} />
                <CardTitle className="text-[10px] font-mono font-black tracking-widest text-slate-400 uppercase">Trade Readiness Checklist</CardTitle>
              </div>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border font-mono ${allGreen ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-rose-400 border-rose-500/30 bg-rose-500/10"}`}>
                {allGreen ? "✓ GO" : "✗ HOLD"}
              </span>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {allChecks.map(c => (
                <div key={c.key}
                  onClick={() => !c.auto && toggleCheck(c.key as keyof typeof checks)}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${!c.auto ? "cursor-pointer hover:border-slate-700" : ""} ${c.value ? "border-emerald-900/40 bg-emerald-900/8" : "border-rose-900/40 bg-rose-900/8"}`}>
                  <div className="flex items-center gap-2">
                    {c.value
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                    <div>
                      <p className="text-[10px] font-bold text-slate-300">{c.label}</p>
                      <p className="text-[9px] text-slate-600 font-mono">{c.note}</p>
                    </div>
                  </div>
                  {!c.auto && (
                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">tap</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ══ SECTION 8: JEAFX Bias Notes ════════════════════════════════════════ */}
      <Card className="bg-[#070b12]/40 border border-slate-800 shadow-2xl">
        <CardHeader className="bg-[#000001] py-3 px-4 border-b border-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">JEAFX Institutional Bias Journal</CardTitle>
            </div>
            <div className="flex gap-1 bg-[#03050a] p-1 rounded-lg border border-slate-800">
              {(["XAUUSD", "USTEC"] as const).map(a => (
                <button key={a} onClick={() => setNotesAsset(a)}
                  className={`px-2.5 py-0.5 text-[9px] font-mono font-bold tracking-widest rounded transition-all ${notesAsset === a ? "bg-green-500/10 text-green-400 border border-green-500/20" : "text-slate-500 hover:text-slate-300"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
            Log your supply/demand zones, order block bias, and structural targets for <span className="text-slate-300 font-bold">{notesAsset}</span>. Saved locally per asset.
          </p>
          <textarea value={notes} onChange={e => saveNotes(e.target.value)}
            placeholder={`Enter structural notes for ${notesAsset}...\n\nE.g:\n· PDH: 3345.2 → resistance target above\n· OB Demand: 3290–3310 (4H bullish OB)\n· Bias: Bullish above AVWAP ${marketData ? p(marketData.avwap) : "—"}`}
            className="w-full min-h-[140px] bg-[#03050a] border border-slate-800 rounded-lg p-4 text-[11px] font-mono text-slate-300 placeholder-slate-700 focus:outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/20 transition-all resize-none" />
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] font-mono text-slate-700">Auto-saved · {notesAsset} workspace</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
