"use client"

// ─────────────────────────────────────────────────────────────────────────────
// Pass E — Sidebar Upgrade
//
// Additions vs Pass D sidebar:
//   1. Performance widget → 4 stats: P&L · Win Rate · Avg R:R · Streak
//   2. Session clocks    → 3 live countdowns: TYO · LDN · NYC
//      Each shows current session status + time to open/close
//   3. Live Terminal     → upgraded to show session clock row
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  LayoutDashboard, Calendar, BarChart3, History, Clock,
  Globe, Target, CandlestickChart, ChevronLeft,
  Settings, Wifi, Menu, X, PanelLeftOpen, Wallet, Bot, FileUp,
  Network, Newspaper,
} from "lucide-react"

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  id:     string
  label:  string
  icon:   React.ElementType
  badge?: { text: string; variant: "pro" | "live" | "open" }
}

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "OVERVIEW",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "ANALYSIS",
    items: [
      { id: "market-bias",          label: "Market Bias",   icon: Target,           badge: { text: "AI", variant: "live" } },
      { id: "market-intelligence",  label: "Market Intel",  icon: Newspaper,        badge: { text: "AI", variant: "live" } },
      { id: "asset-matrix",         label: "Asset Matrix",  icon: Network,          badge: { text: "AI", variant: "live" } },
      { id: "session-intelligence", label: "Session Intel", icon: Clock                                                    },
      { id: "performance-metrics",  label: "Performance",   icon: BarChart3                                                },
      { id: "candle-analysis",      label: "Candle Analysis",icon: CandlestickChart                                        },
    ],
  },
  {
    label: "HISTORY",
    items: [
      { id: "pnl-calendar",   label: "P&L Calendar",    icon: Calendar },
      { id: "signal-history", label: "Execution Ledger", icon: History  },
    ],
  },
  {
    label: "LEDGER",
    items: [
      { id: "lifetime-ledger", label: "Lifetime Ledger", icon: Wallet },
      { id: "bot-hub",         label: "Bot Hub",          icon: Bot    },
      { id: "csv-import",      label: "CSV Import",       icon: FileUp },
    ],
  },
  {
    label: "TOOLS",
    items: [{ id: "economic-calendar", label: "Economic Calendar", icon: Globe }],
  },
]

// ─── Session clock helpers ────────────────────────────────────────────────────

interface SessionState {
  id:     "TYO" | "LDN" | "NYC"
  open:   boolean
  soon:   boolean            // opens within 30 min
  countdown: string          // "02:14:35" or "OPEN"
}

// All times in UTC minutes from midnight
const SESSION_WINDOWS = {
  TYO: { open: 23 * 60, close: 8  * 60 },  // 23:00-08:00 UTC (crosses midnight)
  LDN: { open:  7 * 60, close: 16 * 60 },  // 07:00-16:00 UTC
  NYC: { open: 12 * 60, close: 21 * 60 },  // 12:00-21:00 UTC
}

function isInWindow(utcMins: number, open: number, close: number): boolean {
  if (open > close) {
    // Crosses midnight (TYO)
    return utcMins >= open || utcMins < close
  }
  return utcMins >= open && utcMins < close
}

function minsUntil(utcMins: number, target: number): number {
  let diff = target - utcMins
  if (diff < 0) diff += 24 * 60
  return diff
}

function formatCountdown(mins: number): string {
  const h  = Math.floor(mins / 60)
  const m  = Math.floor(mins % 60)
  const s  = 0 // seconds aren't tracked at this level
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`
}

function getSessions(now: Date): SessionState[] {
  const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes()

  return (Object.entries(SESSION_WINDOWS) as [keyof typeof SESSION_WINDOWS, {open:number;close:number}][]).map(([id, w]) => {
    const open   = isInWindow(utcMins, w.open, w.close)
    const mUntilOpen  = minsUntil(utcMins, w.open)
    const mUntilClose = minsUntil(utcMins, w.close)
    const soon   = !open && mUntilOpen <= 30

    let countdown: string
    if (open)       countdown = `${formatCountdown(mUntilClose)} →`
    else if (soon)  countdown = `${formatCountdown(mUntilOpen)} ▸`
    else            countdown = `${formatCountdown(mUntilOpen)} →`

    return { id, open, soon, countdown }
  })
}

function getActiveLabel(sessions: SessionState[]): string {
  const active = sessions.filter(s => s.open).map(s => s.id)
  if (active.length === 0) return "Off Hours"
  if (active.length === 3) return "All Sessions"
  return active.join("+")
}

// ─── Session clock row ────────────────────────────────────────────────────────

function SessionClocks({ collapsed }: { collapsed: boolean }) {
  const [sessions, setSessions] = useState<SessionState[]>(() => getSessions(new Date()))

  useEffect(() => {
    const t = setInterval(() => setSessions(getSessions(new Date())), 30_000)
    return () => clearInterval(t)
  }, [])

  if (collapsed) {
    // Just show a colored dot per session
    return (
      <div className="flex flex-col items-center gap-1 py-2">
        {sessions.map(s => (
          <div key={s.id} className="flex items-center gap-1"
            title={`${s.id}: ${s.open ? "OPEN" : "CLOSED"} — ${s.countdown}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              s.open ? "bg-primary animate-pulse" :
              s.soon ? "bg-amber-400 animate-pulse" : "bg-muted-foreground/30"
            }`} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Sessions</p>
      <div className="grid grid-cols-3 gap-1">
        {sessions.map(s => (
          <div key={s.id}
            className={`rounded-lg px-1.5 py-1.5 border text-center transition-colors ${
              s.open
                ? "border-primary/30 bg-primary/8"
                : s.soon
                  ? "border-amber-500/30 bg-amber-500/8"
                  : "border-border/30 bg-transparent"
            }`}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
                s.open ? "bg-primary animate-pulse" :
                s.soon ? "bg-amber-400 animate-pulse" : "bg-muted-foreground/20"
              }`} />
              <span className={`text-[9px] font-black ${
                s.open ? "text-primary" :
                s.soon ? "text-amber-400" : "text-muted-foreground/50"
              }`}>{s.id}</span>
            </div>
            <p className={`text-[8px] font-mono leading-none ${
              s.open ? "text-primary/70" :
              s.soon ? "text-amber-400/70" : "text-muted-foreground/30"
            }`}>
              {s.open ? "OPEN" : s.soon ? "SOON" : s.countdown.split(" ")[0]}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[8px] font-bold text-muted-foreground/40 text-center pt-0.5">
        {getActiveLabel(sessions)} ACTIVE
      </p>
    </div>
  )
}

// ─── Sidebar props + component ────────────────────────────────────────────────

interface SidebarProps {
  activeItem:  string
  onItemClick: (id: string) => void
  trades?:     { rMultiple: number; date: string }[]
}

export function Sidebar({ activeItem, onItemClick, trades = [] }: SidebarProps) {
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("phx_sidebar_collapsed")
    if (saved === "true") setCollapsed(true)
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("phx_sidebar_collapsed", String(next))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleItemClick = (id: string) => { onItemClick(id); setMobileOpen(false) }
  const openSettings = () => { window.dispatchEvent(new CustomEvent("phoenix:settings")); setMobileOpen(false) }

  // ── 7-day performance stats ───────────────────────────────────────────────
  const sevenDaysAgo = Date.now() - 7 * 86_400_000
  const recent   = trades.filter(t => new Date(t.date).getTime() > sevenDaysAgo)
  const wins     = recent.filter(t => t.rMultiple > 0)
  const losses   = recent.filter(t => t.rMultiple < 0)
  const winRate  = recent.length > 0 ? Math.round((wins.length / recent.length) * 100) : 0
  const dayPnl   = recent.reduce((s, t) => s + Number(t.rMultiple), 0)

  // AVG R:R — average win / average |loss|
  const avgWin  = wins.length   > 0 ? wins.reduce((s,t) => s + t.rMultiple, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s,t) => s + t.rMultiple, 0)) / losses.length : 0
  const avgRR   = avgLoss > 0 ? (avgWin / avgLoss).toFixed(1) : wins.length > 0 ? "MAX" : "—"

  // Current streak — consecutive W or L from most recent trade
  const sorted  = [...recent].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  let streak = 0
  let streakType: "W" | "L" | null = null
  for (const t of sorted) {
    const isW = t.rMultiple > 0
    if (streakType === null) streakType = isW ? "W" : "L"
    if ((streakType === "W") === isW) streak++
    else break
  }
  const streakLabel = streak > 0 && streakType ? `${streak}${streakType}` : "—"
  const streakColor = streakType === "W" ? "text-primary" : streakType === "L" ? "text-rose-400" : "text-muted-foreground"

  const badgeStyles: Record<string, string> = {
    pro:  "bg-muted text-muted-foreground text-[9px] font-black tracking-wider",
    live: "bg-primary/10 text-primary text-[9px] font-black tracking-wider border border-primary/25",
    open: "bg-amber-500/10 text-amber-400 text-[9px] font-black tracking-wider",
  }

  const desktopW = collapsed ? 56 : 240

  // ─────────────────────────────────────────────────────────────────────────
  const renderSidebarContent = (isMobile: boolean) => {
    const showText = !collapsed || isMobile

    return (
      <>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3.5 py-4 border-b border-border" style={{ minHeight: 56 }}>
          {collapsed && !isMobile ? (
            <button onClick={toggleCollapse}
              className="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors group"
              aria-label="Expand sidebar">
              <PanelLeftOpen className="w-4 h-4 transition-transform group-hover:scale-110" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-7 h-7 rounded-lg flex-shrink-0 overflow-hidden border border-border/50">
                  <Image src="/phoenix-logo.jpg" alt="Phoenix" width={28} height={28} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col leading-none overflow-hidden">
                  <span className="text-foreground text-[13px] font-black tracking-widest uppercase whitespace-nowrap">Phoenix</span>
                  <span className="text-muted-foreground text-[9px] font-bold tracking-[0.25em] uppercase whitespace-nowrap mt-0.5">Command</span>
                </div>
              </div>
              {isMobile
                ? <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors ml-1" aria-label="Close"><X className="w-5 h-5" /></button>
                : <button onClick={toggleCollapse} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors ml-1" aria-label="Collapse"><ChevronLeft className="w-4 h-4" /></button>
              }
            </>
          )}
        </div>

        {/* ── Nav ─────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4 custom-scrollbar">
          {SECTIONS.map(section => (
            <div key={section.label}>
              {showText && (
                <div className="px-4 mb-1">
                  <span className="text-[9px] font-black tracking-widest text-muted-foreground/70 uppercase">{section.label}</span>
                </div>
              )}
              {!showText && <div className="mx-3 my-1.5 border-t border-border" />}

              {section.items.map(item => {
                const Icon = item.icon
                const isActive = activeItem === item.id
                return (
                  <button key={item.id} onClick={() => handleItemClick(item.id)}
                    title={!showText ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 transition-all group min-h-[40px] ${isActive ? "gradient-active" : "hover:bg-white/[0.03]"}`}
                    style={{
                      padding:       showText ? "8px 12px" : "8px 0",
                      justifyContent:showText ? "flex-start" : "center",
                      borderLeft:    isActive && showText ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                      paddingLeft:   showText ? (isActive ? "10px" : "12px") : undefined,
                    }}>
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    {showText && (
                      <>
                        <span className={`text-[13px] flex-1 text-left transition-colors whitespace-nowrap ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className={`px-1.5 py-0.5 rounded ${badgeStyles[item.badge.variant]}`}>{item.badge.text}</span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="border-t border-border flex-shrink-0">

          {showText ? (
            <div className="p-3 space-y-3">

              {/* ── Performance widget — 4 stats ─────────────────────── */}
              <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Performance</span>
                  <span className="text-[9px] text-muted-foreground/50 font-mono">7D</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Daily P&L */}
                  <div>
                    <p className="text-[8px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">P&L</p>
                    <p className={`text-[11px] font-black font-mono ${dayPnl >= 0 ? "text-primary" : "text-rose-400"}`}>
                      {dayPnl >= 0 ? "+" : ""}${dayPnl.toFixed(2)}
                    </p>
                  </div>
                  {/* Win Rate */}
                  <div>
                    <p className="text-[8px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">Win Rate</p>
                    <p className={`text-[11px] font-black font-mono ${winRate >= 50 ? "text-primary" : "text-rose-400"}`}>
                      {winRate}%
                    </p>
                  </div>
                  {/* Avg R:R */}
                  <div>
                    <p className="text-[8px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">Avg R:R</p>
                    <p className={`text-[11px] font-black font-mono ${typeof avgRR === "string" && avgRR !== "—" ? "text-primary" : "text-muted-foreground"}`}>
                      {avgRR}
                    </p>
                  </div>
                  {/* Streak */}
                  <div>
                    <p className="text-[8px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">Streak</p>
                    <p className={`text-[11px] font-black font-mono ${streakColor}`}>
                      {streakLabel}
                    </p>
                  </div>
                </div>
                {/* Win rate bar */}
                {recent.length > 0 && (
                  <div className="h-0.5 rounded-full bg-muted/30 overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${winRate}%` }} />
                  </div>
                )}
              </div>

              {/* ── Session clocks ───────────────────────────────────── */}
              <div className="rounded-xl border border-border bg-card/40 p-2.5">
                <SessionClocks collapsed={false} />
              </div>

            </div>
          ) : (
            /* Collapsed footer — just icons */
            <div className="py-2 flex flex-col items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${dayPnl >= 0 ? "bg-primary" : "bg-rose-400"}`}
                title={`P&L: ${dayPnl >= 0 ? "+" : ""}$${dayPnl.toFixed(2)}`} />
              <SessionClocks collapsed={true} />
            </div>
          )}

          {/* Settings button */}
          <button onClick={openSettings}
            title={!showText ? "Settings" : undefined}
            className="w-full flex items-center gap-2.5 p-3 text-muted-foreground hover:text-primary hover:bg-primary/[0.06] transition-colors min-h-[44px]"
            style={{ justifyContent: showText ? "flex-start" : "center", paddingLeft: showText ? "16px" : undefined }}>
            <Settings className="w-4 h-4 flex-shrink-0" />
            {showText && <span className="text-xs">Settings</span>}
          </button>

          {/* Live Terminal */}
          {showText && (
            <div className="px-4 pb-3 flex items-center gap-2">
              <Wifi className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-muted-foreground/70 font-mono">LIVE TERMINAL</span>
              <span className="ml-auto text-[9px] text-primary font-bold">ACTIVE</span>
            </div>
          )}
        </div>
      </>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-2.5 border-b border-border backdrop-blur-md bg-background/90">
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-1 rounded-md text-foreground hover:bg-white/5 transition-colors" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded overflow-hidden border border-border/50">
            <Image src="/phoenix-logo.jpg" alt="Phoenix" width={24} height={24} className="w-full h-full object-cover" />
          </div>
          <span className="text-foreground text-xs font-black tracking-widest uppercase">Phoenix Cmd</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black text-primary">LIVE</span>
        </div>
      </div>

      <div className="md:hidden h-12 flex-shrink-0" />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex relative flex-shrink-0 h-screen flex-col border-r border-border bg-background transition-all duration-300"
        style={{ width: desktopW }}>
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <aside className="md:hidden fixed top-0 left-0 z-50 h-full w-[280px] flex flex-col border-r border-border bg-background shadow-2xl">
            {renderSidebarContent(true)}
          </aside>
        </>
      )}
    </>
  )
}
