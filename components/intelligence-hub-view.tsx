"use client"

// ─────────────────────────────────────────────────────────────────────────────
// Intelligence Hub — merged replacement for Market Intelligence + Economic Calendar
//
// Tabs:
//   1. Events     — Economic Calendar (/api/calendar) — filterable macro table
//   2. Catalysts  — Market drivers from /api/agents/market-intelligence
//   3. Policy     — Central bank / geopolitical items
//   4. News       — High-signal headlines
//
// Mobile-first: tabs scroll horizontally, cards single-column, table scrolls.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react"
import {
  RefreshCw, Radio, Calendar, Zap, Shield, Newspaper,
  TrendingUp, TrendingDown, Minus, Clock, AlertTriangle,
  Filter, Layers,
} from "lucide-react"
import type { IntelResult, IntelItem } from "@/app/api/agents/market-intelligence/route"

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "events" | "catalysts" | "policy" | "news"

interface MacroEvent {
  id: string; time: string; date: string; currency: string
  event: string; importance: "HIGH" | "MEDIUM" | "LOW"
  impactAsset: string; previous: string; forecast: string; liveStatus: string
}

// ─── Sentiment helpers ────────────────────────────────────────────────────────
const SENTIMENT = {
  bullish: { icon: TrendingUp,   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
  bearish: { icon: TrendingDown, cls: "text-rose-400 bg-rose-500/10 border-rose-500/25"         },
  neutral: { icon: Minus,        cls: "text-muted-foreground bg-muted/20 border-border/40"      },
}
const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-rose-500 shadow-[0_0_5px_rgba(239,68,68,0.7)]",
  medium: "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.6)]",
  low:    "bg-muted-foreground/30",
}

// ─── Intel card (Catalysts / Policy / News) ───────────────────────────────────
function IntelCard({ item }: { item: IntelItem }) {
  const [open, setOpen] = useState(false)
  const sm = SENTIMENT[item.sentiment]
  const SentIcon = sm.icon
  return (
    <div onClick={() => setOpen(o => !o)}
      className="rounded-xl border border-border/40 bg-card/60 p-3.5 cursor-pointer hover:border-primary/20 transition-all">
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${PRIORITY_DOT[item.priority]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-[12px] font-black text-foreground leading-snug font-mono uppercase tracking-tight">
              {item.headline}
            </p>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-black flex-shrink-0 ${sm.cls}`}>
              <SentIcon size={9} />{sm.cls.includes("emerald") ? "BULL" : sm.cls.includes("rose") ? "BEAR" : "NEUT"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.tags.map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-background/60 border border-border/40 text-muted-foreground font-mono font-bold">{t}</span>
            ))}
            <span className="text-[9px] text-muted-foreground/50 font-mono ml-auto flex items-center gap-1">
              <Clock size={9}/>{item.time}
            </span>
          </div>
        </div>
      </div>
      {open && (
        <div className="mt-2.5 ml-5 space-y-1">
          <p className="text-[10px] text-muted-foreground leading-relaxed">{item.detail}</p>
          {item.impact && (
            <p className="text-[10px] font-bold" style={{ color: item.sentiment === "bullish" ? "#34d399" : item.sentiment === "bearish" ? "#f87171" : undefined }}>
              → {item.impact}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Events table (Economic Calendar) ────────────────────────────────────────
function EventsTab() {
  const [events,  setEvents]  = useState<MacroEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [imp,     setImp]     = useState("ALL")
  const [asset,   setAsset]   = useState("ALL")
  const fetched = useRef(false)

  const fetchData = useCallback(async (force = false) => {
    if (!force && fetched.current) return
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/calendar")
      const r   = await res.json()
      if (r.success) { setEvents(r.data); fetched.current = true }
      else setError("Macro data retrieval failed.")
    } catch { setError("Server connection disrupted.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = events.filter(e =>
    (imp   === "ALL" || e.importance  === imp) &&
    (asset === "ALL" || e.impactAsset.includes(asset) || e.impactAsset === "GLOBAL DESK")
  )

  return (
    <div className="space-y-4">
      {/* Filters — stack on mobile */}
      <div className="flex flex-col sm:flex-row gap-3 p-3 bg-card/40 rounded-xl border border-border/40">
        {/* Importance */}
        <div className="flex-1">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 mb-1.5">
            <Filter size={10} className="text-primary"/> Impact Level
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {["ALL","HIGH","MEDIUM"].map(l => (
              <button key={l} onClick={() => setImp(l)}
                className={`px-3 py-1.5 text-[10px] rounded-lg font-bold border transition-all ${
                  imp === l ? "bg-primary/10 text-primary border-primary/30" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                {l === "ALL" ? "All" : l}
              </button>
            ))}
          </div>
        </div>
        {/* Asset */}
        <div className="flex-1">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 mb-1.5">
            <Layers size={10} className="text-primary"/> Asset Filter
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {["ALL","XAUUSD","USTEC","USD"].map(a => (
              <button key={a} onClick={() => setAsset(a)}
                className={`px-3 py-1.5 text-[10px] rounded-lg font-bold border transition-all ${
                  asset === a ? "bg-primary/10 text-primary border-primary/30" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        {/* Refresh */}
        <div className="flex items-end">
          <button onClick={() => fetchData(true)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 disabled:opacity-50">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""}/> REFRESH
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex flex-col items-center justify-center gap-2 bg-card/20 border border-border rounded-xl animate-pulse">
          <RefreshCw size={20} className="animate-spin text-primary"/>
          <p className="text-[10px] text-muted-foreground font-mono uppercase">Synchronizing feeds…</p>
        </div>
      ) : error ? (
        <div className="p-3 flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl">
          <AlertTriangle size={14}/><p className="text-xs">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center bg-card/20 border border-border rounded-xl">
          <p className="text-xs text-muted-foreground italic">No events match the selected filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card/40">
          {/* Scrollable table on mobile */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-background/60 border-b border-border">
                  {["TIME","ZONE","EVENT","TARGETS","IMPACT","FORECAST","PREV"].map(h => (
                    <th key={h} className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-xs">
                {filtered.map(evt => (
                  <tr key={evt.id} className="hover:bg-foreground/[0.03] transition-colors">
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span className="text-[11px] font-bold text-foreground block">{evt.date}</span>
                      <span className="text-[10px] text-muted-foreground">{evt.time} ET</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-background/50 px-2 py-0.5 border border-border rounded text-[10px] font-bold text-muted-foreground">{evt.currency}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground text-[11px]">{evt.event}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-primary font-medium whitespace-nowrap">{evt.impactAsset}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black border ${
                        evt.importance === "HIGH"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/25"}`}>
                        <Zap size={9} className="fill-current"/>{evt.importance}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-foreground">{evt.forecast}</td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{evt.previous}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Intel tab content (Catalysts / Policy / News) ───────────────────────────
function IntelTab({ category, data, loading, error }: {
  category: "catalysts" | "policy" | "news"
  data:     IntelResult | null
  loading:  boolean
  error:    string | null
}) {
  if (loading && !data) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({length:4}).map((_,i) => (
          <div key={i} className="h-20 rounded-xl bg-card/40 border border-border/30"/>
        ))}
      </div>
    )
  }
  if (error) {
    return <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs rounded-xl font-bold">Error: {error}</div>
  }
  const items = data?.items.filter(i => i.category === category) ?? []
  const count = data?.counts[category] ?? 0

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
        {count} item{count !== 1 ? "s" : ""} · tap to expand
      </p>
      {items.length === 0 ? (
        <div className="py-12 text-center bg-card/20 border border-border rounded-xl">
          <p className="text-sm text-muted-foreground/50 italic">No items in this category right now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => <IntelCard key={item.id} item={item}/>)}
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function IntelligenceHub() {
  const [tab,     setTab]     = useState<Tab>("events")
  const [intel,   setIntel]   = useState<IntelResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const fetched = useRef(false)

  const fetchIntel = useCallback(async (force = false) => {
    if (!force && fetched.current) return
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/agents/market-intelligence", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ forceRefresh: force }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setIntel(await res.json())
      fetched.current = true
    } catch(e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally { setLoading(false) }
  }, [])

  // Fetch intel when leaving events tab
  useEffect(() => {
    if (tab !== "events") fetchIntel()
  }, [tab, fetchIntel])

  const usingMock  = intel?._debug?.mode === "mock"
  const totalItems = intel ? Object.values(intel.counts).reduce((s,n)=>s+n,0) : 0

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id:"events",    label:"Events Schedule", icon:Calendar,  count: undefined       },
    { id:"catalysts", label:"Catalysts",       icon:Zap,       count: intel?.counts.catalysts },
    { id:"policy",    label:"Policy",          icon:Shield,    count: intel?.counts.policy    },
    { id:"news",      label:"News",            icon:Newspaper, count: intel?.counts.news      },
  ]

  return (
    <div className="space-y-4">

      {/* ── Header — compressed on mobile ─────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          {/* Only show intel counts when not on events tab */}
          {tab !== "events" && intel && (
            <>
              {[
                { icon:Zap,      n:intel.counts.catalysts, cls:"text-amber-400 bg-amber-500/10 border-amber-500/25"   },
                { icon:Shield,   n:intel.counts.policy,    cls:"text-violet-400 bg-violet-500/10 border-violet-500/25" },
                { icon:Newspaper,n:intel.counts.news,      cls:"text-emerald-400 bg-emerald-500/10 border-emerald-500/25"},
              ].map(({icon:Icon, n, cls}, i) => (
                <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${cls}`}>
                  <Icon size={10}/><span className="font-black">{n}</span>
                </div>
              ))}
              {usingMock && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/25">
                  <Radio size={9}/> DEMO
                </span>
              )}
              {!usingMock && intel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"/>
                  </span>
                  LIVE
                </span>
              )}
            </>
          )}
        </div>
        {tab !== "events" && (
          <button onClick={() => fetchIntel(true)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""}/>
            <span className="hidden sm:inline">REFRESH</span>
          </button>
        )}
      </div>

      {/* ── Tab bar — horizontal scroll on mobile ─────────────────── */}
      <div className="flex border-b border-border/40 overflow-x-auto scrollbar-none -mb-px pb-0">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold whitespace-nowrap flex-shrink-0 border-b-2 transition-all -mb-px ${
                tab === t.id
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"}`}>
              <Icon size={12}/>
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-[9px] font-black px-1 rounded ${tab===t.id ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      {tab === "events" && <EventsTab/>}
      {tab === "catalysts" && <IntelTab category="catalysts" data={intel} loading={loading} error={error}/>}
      {tab === "policy"    && <IntelTab category="policy"    data={intel} loading={loading} error={error}/>}
      {tab === "news"      && <IntelTab category="news"      data={intel} loading={loading} error={error}/>}

    </div>
  )
}
