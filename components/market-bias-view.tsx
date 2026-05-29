"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Wifi, Shield, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
interface AgentResult { signal: string; strength: number; weight: number; reasoning?: string }
interface BiasResult {
  verdict: string; conviction: number; consensus: number
  agents: { trend: AgentResult; priceAction: AgentResult; news: AgentResult; contrarian: AgentResult }
  marketPhase: string; paSetup: string; macroRegime: string
  supportingFactors: string[]; invalidationConditions: string[]
  riskGrade: string; maxRisk: string; volatilityScore: number; sessionScore: number
  warnings: string[]; keyLevels: { equilibrium: number; "52wHigh": number; "52wLow": number }
  rsi: number; volatilityPct: string; summary: string
}

const ASSETS = [
  { id: "XAUUSD", label: "XAU/USD", sub: "Gold Spot"    },
  { id: "USTEC",  label: "USTEC",   sub: "NQ100 Proxy"  },
]

function getSession() {
  const h = new Date().getUTCHours()
  if (h >= 22 || h < 8)  return "Asian"
  if (h >= 8  && h < 13) return "London"
  if (h >= 13 && h < 16) return "Overlap"
  return "New York"
}

function getKillZone() {
  const h = new Date().getUTCHours()
  if (h >= 7  && h < 10) return "London Kill Zone"
  if (h >= 12 && h < 14) return "NY AM Kill Zone"
  if (h >= 17 && h < 18) return "NY Lunch"
  if (h >= 18 && h < 21) return "NY PM Kill Zone"
  if (h >= 20 || h < 2)  return "Asian Kill Zone"
  return null
}

function AgentBar({ value, signal }: { value: number; signal: string }) {
  const color = signal === "BULLISH" ? "#5fc77a" : signal === "BEARISH" ? "#ef4444" : "#64748b"
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#1e2232" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

function SignalIcon({ signal, className = "" }: { signal: string; className?: string }) {
  if (signal === "BULLISH") return <TrendingUp  className={className} style={{ color: "#5fc77a" }} />
  if (signal === "BEARISH") return <TrendingDown className={className} style={{ color: "#ef4444" }} />
  return <Minus className={className} style={{ color: "#64748b" }} />
}

function ConvictionArc({ value }: { value: number }) {
  const r = 48; const circ = 2 * Math.PI * r * 0.75
  const offset = circ * (1 - Math.min(value, 100) / 100)
  const color  = value >= 65 ? "#5fc77a" : value >= 40 ? "#f59e0b" : "#ef4444"
  return (
    <svg width="120" height="90" viewBox="0 0 120 90">
      <path d="M 12 80 A 48 48 0 1 1 108 80" fill="none" stroke="#1e2232" strokeWidth="8" strokeLinecap="round" />
      <path d="M 12 80 A 48 48 0 1 1 108 80" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }} />
      <text x="60" y="68" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="monospace">{value}</text>
      <text x="60" y="82" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">% CONVICTION</text>
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MarketBiasView() {
  const [asset,     setAsset]     = useState("XAUUSD")
  const [bias,      setBias]      = useState<BiasResult | null>(null)
  const [mktData,   setMktData]   = useState<any>(null)
  const [loading,   setLoading]   = useState(false)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const [elapsed,   setElapsed]   = useState(0)
  const [expanded,  setExpanded]  = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const mdRes = await fetch(`/api/market-data?symbol=${asset}`)
      const md    = await mdRes.json()
      setMktData(md)

      const biasRes = await fetch("/api/market-bias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketData: md, session: getSession(), killZone: getKillZone() }),
      })
      const data = await biasRes.json()
      setBias(data)
      setFetchedAt(new Date())
      setElapsed(0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [asset])

  useEffect(() => { refresh() }, [refresh])

  // Elapsed timer + auto-refresh every 5 min
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(p => {
        if (p >= 300) { refresh(); return 0 }
        return p + 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [refresh])

  const freshPct   = Math.max(0, 100 - (elapsed / 300) * 100)
  const elapsedStr = elapsed < 60 ? `${elapsed}s ago`
    : elapsed < 3600 ? `${Math.floor(elapsed / 60)}m ago` : "stale"

  const verdictColor =
    bias?.verdict === "BUY"  ? "#5fc77a" :
    bias?.verdict === "SELL" ? "#ef4444" : "#94a3b8"

  const agentRows = bias ? [
    { key: "trend",       label: "Trend Agent",    ...bias.agents.trend },
    { key: "priceAction", label: "Price Action",   ...bias.agents.priceAction },
    { key: "news",        label: "News Agent",     ...bias.agents.news },
    { key: "contrarian",  label: "Contrarian",     ...bias.agents.contrarian },
  ] : []

  return (
    <div className="space-y-4 w-full">

      {/* ── Asset Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {ASSETS.map(a => (
          <button key={a.id} onClick={() => setAsset(a.id)}
            className="rounded-xl px-4 py-3 text-left transition-all"
            style={{
              background: asset === a.id ? "rgba(95,199,122,0.1)" : "#141720",
              border: `1px solid ${asset === a.id ? "rgba(95,199,122,0.35)" : "#1e2232"}`,
            }}>
            <p className={`text-sm font-black ${asset === a.id ? "text-[#5fc77a]" : "text-slate-300"}`}>{a.label}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{a.sub}</p>
            {mktData && asset === a.id && (
              <p className="text-[11px] font-mono font-bold mt-1"
                style={{ color: mktData.currentPrice > mktData.pdc ? "#5fc77a" : "#ef4444" }}>
                {((( mktData.currentPrice - mktData.pdc) / mktData.pdc) * 100).toFixed(2)}%
              </p>
            )}
          </button>
        ))}
      </div>

      {/* ── Freshness bar ────────────────────────────────────────────────────── */}
      <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "#141720", border: "1px solid #1e2232" }}>
        <RefreshCw className={`w-4 h-4 flex-shrink-0 ${loading ? "animate-spin text-[#5fc77a]" : "text-slate-500"}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#5fc77a]">
              {loading ? "Analyzing…" : `Analysis ${elapsedStr}`}
            </span>
            <span className="text-[10px] text-slate-600">
              {fetchedAt ? `Live · Generated ${fetchedAt.toLocaleTimeString()}` : "Fetching…"}
            </span>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "#1e2232" }}>
            <div className="h-full rounded-full transition-none" style={{ width: `${freshPct}%`, background: "#5fc77a" }} />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[9px] text-slate-600">Fresh</span>
            <span className="text-[9px] text-slate-600">Refreshes every 5 min</span>
            <span className="text-[9px] text-slate-600">Stale</span>
          </div>
        </div>
        <button onClick={refresh} disabled={loading}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black text-[#5fc77a] flex items-center gap-1.5 transition-all hover:bg-[#5fc77a]/10"
          style={{ border: "1px solid rgba(95,199,122,0.25)" }}>
          <RefreshCw className="w-3 h-3" /> REFRESH
        </button>
      </div>

      {/* ── Master Verdict ────────────────────────────────────────────────── */}
      {bias && (
        <div className="rounded-xl p-6" style={{ background: "#141720", border: "1px solid #1e2232" }}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Verdict badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e2232" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: verdictColor }} />
                <span className="text-xs font-bold text-slate-400">{bias.verdict}</span>
              </div>

              {/* Big verdict text */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">Master Verdict</p>
              <h2 className="text-5xl font-black tracking-tight mb-3" style={{ color: verdictColor }}>
                {bias.verdict}
              </h2>
              <p className="text-sm text-amber-400 font-medium max-w-md">{bias.summary}</p>
              <p className="text-xs text-slate-500 mt-1">{bias.paSetup}</p>

              {/* Consensus bar */}
              <div className="mt-5">
                <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1.5">
                  <span>BEARISH</span>
                  <span className="text-slate-400">Consensus {bias.consensus > 0 ? "+" : ""}{bias.consensus}</span>
                  <span>BULLISH</span>
                </div>
                <div className="w-full h-1.5 rounded-full relative overflow-hidden" style={{ background: "#1e2232" }}>
                  <div className="absolute top-0 h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.abs(bias.consensus / 2)}%`,
                      left: bias.consensus < 0 ? `${50 - Math.abs(bias.consensus / 2)}%` : "50%",
                      background: bias.consensus > 0 ? "#5fc77a" : "#ef4444",
                    }} />
                  <div className="absolute top-0 left-1/2 w-px h-full" style={{ background: "#2a3042" }} />
                </div>
              </div>
            </div>

            {/* Conviction arc */}
            <div className="ml-6 flex-shrink-0 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Conviction</p>
              <ConvictionArc value={bias.conviction} />
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mt-1">
                MULTI-AGENT · {asset} · H1
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Three columns ─────────────────────────────────────────────────── */}
      {bias && mktData && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Market Snapshot */}
          <div className="rounded-xl p-5 space-y-2" style={{ background: "#141720", border: "1px solid #1e2232" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#5fc77a]" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Market Snapshot</h3>
            </div>
            {[
              { label: "Price",    val: mktData.currentPrice?.toFixed(2), color: "text-slate-200" },
              { label: "Change",   val: `${((( mktData.currentPrice - mktData.pdc) / mktData.pdc) * 100).toFixed(2)}%`,
                color: mktData.currentPrice > mktData.pdc ? "text-[#5fc77a]" : "text-red-400" },
              { label: "Session",  val: getSession(),  color: "text-slate-300" },
              { label: "RSI",      val: String(bias.rsi), color: bias.rsi > 70 ? "text-red-400" : bias.rsi < 30 ? "text-[#5fc77a]" : "text-amber-400" },
              { label: "Volatility", val: bias.volatilityPct, color: "text-slate-300" },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-1.5"
                style={{ borderBottom: "1px solid #1e2232" }}>
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className={`text-xs font-bold font-mono ${row.color}`}>{row.val}</span>
              </div>
            ))}

            <div className="pt-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Key Levels</p>
              {[
                { label: "Equilibrium (POC)", val: mktData.poc?.toFixed(2) },
                { label: "Prev Week High",    val: mktData.pwh?.toFixed(2), color: "text-[#5fc77a]" },
                { label: "Prev Week Low",     val: mktData.pwl?.toFixed(2), color: "text-red-400" },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1">
                  <span className="text-[11px] text-slate-500">{row.label}</span>
                  <span className={`text-[11px] font-bold font-mono ${row.color || "text-slate-300"}`}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Consensus */}
          <div className="rounded-xl p-5" style={{ background: "#141720", border: "1px solid #1e2232" }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-indigo-400" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Agent Consensus</h3>
            </div>
            <div className="space-y-3">
              {agentRows.map(agent => {
                const sigColor = agent.signal === "BULLISH" ? "#5fc77a" : agent.signal === "BEARISH" ? "#ef4444" : "#64748b"
                return (
                  <div key={agent.key}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-300 w-24 flex-shrink-0">{agent.label}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ color: sigColor, background: `${sigColor}15` }}>
                        {agent.signal}
                      </span>
                      <AgentBar value={agent.strength} signal={agent.signal} />
                      <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{agent.strength}%</span>
                      <span className="text-[10px] text-slate-600 w-8 text-right">×{agent.weight}</span>
                    </div>
                    {agent.reasoning && (
                      <p className="text-[10px] text-slate-600 pl-1 leading-relaxed">{agent.reasoning}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {bias.marketPhase && (
              <div className="mt-4 pt-3" style={{ borderTop: "1px solid #1e2232" }}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Market Phase</p>
                <p className="text-sm font-black text-slate-200">{bias.marketPhase}</p>
                {bias.macroRegime && (
                  <>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mt-2 mb-1">Macro Regime</p>
                    <p className="text-sm font-black text-slate-200">{bias.macroRegime}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Risk Gate */}
          <div className="rounded-xl p-5" style={{ background: "#141720", border: "1px solid #1e2232" }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-amber-400" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Risk Gate</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Grade",      val: bias.riskGrade, color: { A: "text-[#5fc77a]", B: "text-blue-400", C: "text-amber-400", D: "text-red-400" }[bias.riskGrade] || "text-slate-300" },
                { label: "Status",     val: "VALID",         color: "text-[#5fc77a]" },
                { label: "Max Risk",   val: bias.maxRisk,    color: "text-slate-200" },
                { label: "Volatility", val: `${bias.volatilityScore}/100`, color: "text-slate-300" },
                { label: "Session",    val: `${bias.sessionScore}/100`,    color: "text-slate-300" },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1.5"
                  style={{ borderBottom: "1px solid #1e2232" }}>
                  <span className="text-xs text-slate-500">{row.label}</span>
                  <span className={`text-sm font-black ${row.color}`}>{row.val}</span>
                </div>
              ))}

              {bias.warnings.length > 0 && (
                <div className="mt-3 pt-2" style={{ borderTop: "1px solid #1e2232" }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Warnings</p>
                  {bias.warnings.map((w, i) => (
                    <div key={i} className="flex gap-2 mb-1.5">
                      <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 leading-relaxed">{w}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Supporting Factors + Invalidation ─────────────────────────────── */}
      {bias && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl p-5" style={{ background: "#141720", border: "1px solid #1e2232" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#5fc77a]" />
              <h3 className="text-sm font-black text-slate-200">Supporting Factors</h3>
            </div>
            <ul className="space-y-2">
              {bias.supportingFactors.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-[#5fc77a] font-bold mt-0.5 flex-shrink-0">›</span>
                  <span className="text-sm text-slate-400 leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl p-5" style={{ background: "#141720", border: "1px solid #1e2232" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-black text-slate-200">Invalidation Conditions</h3>
            </div>
            <ul className="space-y-2">
              {bias.invalidationConditions.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold mt-0.5 flex-shrink-0">›</span>
                  <span className="text-sm text-slate-400 leading-relaxed">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!bias && !loading && (
        <div className="h-32 flex items-center justify-center text-slate-500 text-sm italic">
          Click Refresh to run market analysis
        </div>
      )}
    </div>
  )
}
