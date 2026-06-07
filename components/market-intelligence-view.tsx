"use client"

// ─────────────────────────────────────────────────────────────────────────────
// Pass C — Market Intelligence View
//
// Unified feed combining 4 live intelligence sections:
//   1. Economic Events  — high-impact macro calendar events
//   2. Market Catalysts — current key market drivers
//   3. Policy Monitor   — geopolitical / central bank impacts
//   4. High-Signal News — market-moving headlines
//
// API: POST /api/agents/market-intelligence — 15-min cache, mock fallback
// Layout: stat pills → tab bar → 2×2 grid (All) or full list (filtered)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw, Radio, Calendar, Zap, Shield, Newspaper,
  TrendingUp, TrendingDown, Minus, ChevronRight, Clock,
  AlertCircle,
} from "lucide-react"
import type { IntelResult, IntelItem } from "@/app/api/agents/market-intelligence/route"

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "all" | "events" | "catalysts" | "policy" | "news"

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  events:    { label: "Economic Events",  icon: Calendar,  color: "text-sky-400"     },
  catalysts: { label: "Market Catalysts", icon: Zap,       color: "text-amber-400"   },
  policy:    { label: "Policy Monitor",   icon: Shield,    color: "text-violet-400"  },
  news:      { label: "High-Signal News", icon: Newspaper, color: "text-emerald-400" },
}

const SENTIMENT_META = {
  bullish: { label: "BULLISH", icon: TrendingUp,   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
  bearish: { label: "BEARISH", icon: TrendingDown, cls: "text-rose-400 bg-rose-500/10 border-rose-500/25"         },
  neutral: { label: "NEUTRAL", icon: Minus,        cls: "text-muted-foreground bg-muted/20 border-border/40"      },
}

const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]",
  medium: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]",
  low:    "bg-muted-foreground/40",
}

// ─── Single item card ─────────────────────────────────────────────────────────
function IntelCard({ item, compact = false }: { item: IntelItem; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const sm = SENTIMENT_META[item.sentiment]
  const SentIcon = sm.icon

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      className="rounded-xl border border-border/40 bg-card/60 p-3.5 cursor-pointer hover:border-primary/20 hover:bg-card/80 transition-all group">
      {/* Top row */}
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${PRIORITY_DOT[item.priority]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[12px] font-black text-foreground leading-snug font-mono uppercase tracking-tight">
              {item.headline}
            </p>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-black flex-shrink-0 ${sm.cls}`}>
              <SentIcon size={9} />
              {sm.label}
            </span>
          </div>
          {/* Tags + time */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.tags.map(tag => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-background/60 border border-border/40 text-muted-foreground font-mono font-bold">
                {tag}
              </span>
            ))}
            <span className="text-[9px] text-muted-foreground/50 font-mono ml-auto flex items-center gap-1">
              <Clock size={9} />
              {item.time}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {(expanded || !compact) && (
        <div className="mt-2.5 ml-5 space-y-1.5">
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

// ─── Section panel (used in 2×2 grid) ────────────────────────────────────────
function SectionPanel({
  category, items, count, onViewAll,
}: {
  category: string
  items:    IntelItem[]
  count:    number
  onViewAll:() => void
}) {
  const meta = CATEGORY_META[category]
  const Icon = meta.icon

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Icon size={13} className={meta.color} />
          <span className="text-[11px] font-black text-foreground uppercase tracking-wider">{meta.label}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{count}</span>
        </div>
        <button onClick={onViewAll}
          className="flex items-center gap-1 text-[10px] font-bold text-primary hover:opacity-80 transition-opacity">
          View All <ChevronRight size={11} />
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-64 custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle size={22} className="text-muted-foreground/30 mb-2" />
            <p className="text-[10px] text-muted-foreground/50">
              {category === "events"    ? "No high-impact events found"    :
               category === "catalysts" ? "No catalysts at the moment"     :
               category === "policy"    ? "No policy alerts"               :
                                          "No news available"}
            </p>
          </div>
        ) : (
          items.slice(0, 3).map(item => (
            <IntelCard key={item.id} item={item} compact />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Full list (single-tab view) ──────────────────────────────────────────────
function FullList({ category, items }: { category: string; items: IntelItem[] }) {
  const meta = CATEGORY_META[category]
  const Icon = meta.icon

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={14} className={meta.color} />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{meta.label}</h3>
        <span className="text-[10px] text-muted-foreground/50 font-mono">{items.length} items</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-border/40 bg-card/40 flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle size={28} className="text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground/40">No items in this category</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => <IntelCard key={item.id} item={item} compact={false} />)}
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function MarketIntelligenceView() {
  const [data,      setData]     = useState<IntelResult | null>(null)
  const [loading,   setLoading]  = useState(true)
  const [error,     setError]    = useState<string | null>(null)
  const [activeTab, setActiveTab]= useState<Tab>("all")

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/agents/market-intelligence", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ forceRefresh }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(false)
    const t = setInterval(() => fetchData(false), 15 * 60_000)
    return () => clearInterval(t)
  }, [fetchData])

  // Derived
  const usingMock  = data?._debug?.mode === "mock"
  const items      = data?.items ?? []
  const counts     = data?.counts ?? { events: 0, catalysts: 0, policy: 0, news: 0 }
  const totalCount = counts.events + counts.catalysts + counts.policy + counts.news

  const byCategory = (cat: string) => items.filter(i => i.category === cat)

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "all",       label: "All",       count: totalCount          },
    { id: "events",    label: "Events",    count: counts.events       },
    { id: "catalysts", label: "Catalysts", count: counts.catalysts    },
    { id: "policy",    label: "Policy",    count: counts.policy       },
    { id: "news",      label: "News",      count: counts.news         },
  ]

  return (
    <div className="space-y-5">

      {/* ── Header row ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        {/* Stat pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { icon: Calendar,  count: counts.events,    label: "events today",        color: "text-sky-400    border-sky-500/25    bg-sky-500/8"     },
            { icon: Zap,       count: counts.catalysts, label: "live catalysts",       color: "text-amber-400  border-amber-500/25  bg-amber-500/8"   },
            { icon: Shield,    count: counts.policy,    label: "policy alerts",        color: "text-violet-400 border-violet-500/25 bg-violet-500/8"  },
            { icon: Newspaper, count: counts.news,      label: "high-signal headlines",color: "text-emerald-400 border-emerald-500/25 bg-emerald-500/8"},
          ].map(p => {
            const Icon = p.icon
            return (
              <div key={p.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold ${p.color}`}>
                <Icon size={11} />
                <span className="font-black">{p.count}</span>
                <span className="text-muted-foreground font-normal">{p.label}</span>
              </div>
            )
          })}
        </div>

        {/* Status + Refresh */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {data && (
            usingMock ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/25">
                <Radio size={9} /> DEMO
              </span>
            ) : data.cached ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/25">
                <Radio size={9} /> CACHED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                LIVE
              </span>
            )
          )}
          <button onClick={() => fetchData(true)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            REFRESH
          </button>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border/40 pb-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-[11px] font-bold transition-all relative flex items-center gap-1.5
              ${activeTab === tab.id
                ? "text-foreground border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px"}`}>
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[9px] font-black px-1 rounded ${
                activeTab === tab.id
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-bold">
          Error: {error}
        </div>
      )}

      {/* ── Skeleton ────────────────────────────────────────────────── */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-card/40 border border-border/30" />
          ))}
        </div>
      )}

      {/* ── ALL — 2×2 grid ──────────────────────────────────────────── */}
      {!loading && data && activeTab === "all" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["events","catalysts","policy","news"] as const).map(cat => (
            <SectionPanel
              key={cat}
              category={cat}
              items={byCategory(cat)}
              count={counts[cat]}
              onViewAll={() => setActiveTab(cat)}
            />
          ))}
        </div>
      )}

      {/* ── Individual tabs — full-width list ──────────────────────── */}
      {!loading && data && activeTab !== "all" && (
        <FullList category={activeTab} items={byCategory(activeTab)} />
      )}

    </div>
  )
}
