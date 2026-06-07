"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  LayoutDashboard, Calendar, BarChart3, Clock, Globe,
  Target, CandlestickChart, ChevronLeft, Settings, Wifi,
  Menu, X, PanelLeftOpen, Wallet, Bot, FileUp, Network, Newspaper,
} from "lucide-react"

interface NavItem {
  id:     string
  label:  string
  icon:   React.ElementType
  badge?: { text: string; variant: "pro" | "live" | "open" }
}

// signal-history removed from HISTORY — merged into performance-metrics tab
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
      { id: "pnl-calendar", label: "P&L Calendar", icon: Calendar },
      // signal-history merged into performance-metrics → Trade Log tab
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

// ── Session clock helpers ─────────────────────────────────────────────────────
// FIX: Asia session (Sydney) opens at 22:00 UTC, not 23:00.
const SESSION_WINDOWS = {
  TYO: { open: 22 * 60, close:  8 * 60 },  // 22:00-08:00 UTC (includes Sydney)
  LDN: { open:  7 * 60, close: 16 * 60 },  // 07:00-16:00 UTC
  NYC: { open: 12 * 60, close: 21 * 60 },  // 12:00-21:00 UTC
}

function inWindow(utcMins: number, open: number, close: number): boolean {
  return open > close
    ? utcMins >= open || utcMins < close   // crosses midnight
    : utcMins >= open && utcMins < close
}

function minsUntil(utcMins: number, target: number): number {
  let d = target - utcMins
  if (d < 0) d += 24 * 60
  return d
}

function fmtCountdown(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = Math.floor(mins % 60)
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`
}

interface SessionState { id: string; open: boolean; soon: boolean; countdown: string }

function getSessions(): SessionState[] {
  const now      = new Date()
  const utcMins  = now.getUTCHours() * 60 + now.getUTCMinutes()
  return (Object.entries(SESSION_WINDOWS) as [string, {open:number;close:number}][]).map(([id, w]) => {
    const open  = inWindow(utcMins, w.open, w.close)
    const mOpen = minsUntil(utcMins, w.open)
    const mClose= minsUntil(utcMins, w.close)
    const soon  = !open && mOpen <= 30
    const countdown = open ? `${fmtCountdown(mClose)} →` : soon ? `${fmtCountdown(mOpen)} ▸` : `${fmtCountdown(mOpen)} →`
    return { id, open, soon, countdown }
  })
}

function getActiveLabel(ss: SessionState[]): string {
  const active = ss.filter(s => s.open).map(s => s.id)
  if (!active.length) return "Off Hours"
  if (active.length === 3) return "All Sessions"
  return active.join("+")
}

function SessionClocks({ collapsed }: { collapsed: boolean }) {
  const [sessions, setSessions] = useState<SessionState[]>(getSessions)
  useEffect(() => {
    const t = setInterval(() => setSessions(getSessions()), 30_000)
    return () => clearInterval(t)
  }, [])

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        {sessions.map(s => (
          <div key={s.id} title={`${s.id}: ${s.open ? "OPEN" : s.countdown}`}
            className={`w-1.5 h-1.5 rounded-full ${
              s.open ? "bg-primary animate-pulse" : s.soon ? "bg-amber-400 animate-pulse" : "bg-muted-foreground/25"
            }`} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Sessions</p>
      <div className="grid grid-cols-3 gap-1">
        {sessions.map(s => (
          <div key={s.id}
            className={`rounded-lg px-1.5 py-1.5 border text-center transition-colors ${
              s.open ? "border-primary/30 bg-primary/8" :
              s.soon ? "border-amber-500/30 bg-amber-500/8" : "border-border/20 bg-transparent"
            }`}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <div className={`w-1 h-1 rounded-full ${
                s.open ? "bg-primary animate-pulse" : s.soon ? "bg-amber-400 animate-pulse" : "bg-muted-foreground/20"
              }`} />
              <span className={`text-[9px] font-black ${
                s.open ? "text-primary" : s.soon ? "text-amber-400" : "text-muted-foreground/40"
              }`}>{s.id}</span>
            </div>
            <p className={`text-[8px] font-mono leading-none ${
              s.open ? "text-primary/70" : s.soon ? "text-amber-400/70" : "text-muted-foreground/25"
            }`}>{s.open ? "OPEN" : s.soon ? "SOON" : s.countdown.split(" ")[0]}</p>
          </div>
        ))}
      </div>
      <p className="text-[8px] text-muted-foreground/35 text-center font-bold">
        {getActiveLabel(sessions)} ACTIVE
      </p>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
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

  // 7-day stats
  const cutoff   = Date.now() - 7 * 86_400_000
  const recent   = trades.filter(t => new Date(t.date).getTime() > cutoff)
  const wins     = recent.filter(t => t.rMultiple > 0)
  const losses   = recent.filter(t => t.rMultiple < 0)
  const winRate  = recent.length > 0 ? Math.round((wins.length / recent.length) * 100) : 0
  const dayPnl   = recent.reduce((s, t) => s + Number(t.rMultiple), 0)
  const avgWin   = wins.length   > 0 ? wins.reduce((s,t)   => s + t.rMultiple, 0) / wins.length : 0
  const avgLoss  = losses.length > 0 ? Math.abs(losses.reduce((s,t) => s + t.rMultiple, 0)) / losses.length : 0
  const avgRR    = avgLoss > 0 ? (avgWin / avgLoss).toFixed(1) : wins.length > 0 ? "MAX" : "—"

  const sorted = [...recent].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  let streak = 0; let streakType: "W"|"L"|null = null
  for (const t of sorted) {
    const isW = t.rMultiple > 0
    if (!streakType) streakType = isW ? "W" : "L"
    if ((streakType === "W") === isW) streak++; else break
  }
  const streakLabel = streak > 0 && streakType ? `${streak}${streakType}` : "—"
  const streakColor = streakType === "W" ? "text-primary" : streakType === "L" ? "text-rose-400" : "text-muted-foreground"

  const badgeStyles: Record<string, string> = {
    pro:  "bg-muted text-muted-foreground text-[9px] font-black tracking-wider",
    live: "bg-primary/10 text-primary text-[9px] font-black tracking-wider border border-primary/25",
    open: "bg-amber-500/10 text-amber-400 text-[9px] font-black tracking-wider",
  }

  const desktopW = collapsed ? 56 : 240

  const renderContent = (isMobile: boolean) => {
    const show = !collapsed || isMobile
    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-4 border-b border-border" style={{ minHeight: 56 }}>
          {collapsed && !isMobile ? (
            <button onClick={toggleCollapse}
              className="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors group">
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
                ? <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors ml-1"><X className="w-5 h-5" /></button>
                : <button onClick={toggleCollapse} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors ml-1"><ChevronLeft className="w-4 h-4" /></button>
              }
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4 custom-scrollbar">
          {SECTIONS.map(section => (
            <div key={section.label}>
              {show && (
                <div className="px-4 mb-1">
                  <span className="text-[9px] font-black tracking-widest text-muted-foreground/70 uppercase">{section.label}</span>
                </div>
              )}
              {!show && <div className="mx-3 my-1.5 border-t border-border" />}
              {section.items.map(item => {
                const Icon = item.icon
                const isActive = activeItem === item.id
                return (
                  <button key={item.id} onClick={() => handleItemClick(item.id)}
                    title={!show ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 transition-all group min-h-[40px] ${isActive ? "gradient-active" : "hover:bg-white/[0.03]"}`}
                    style={{
                      padding:        show ? "8px 12px" : "8px 0",
                      justifyContent: show ? "flex-start" : "center",
                      borderLeft:     isActive && show ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                      paddingLeft:    show ? (isActive ? "10px" : "12px") : undefined,
                    }}>
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    {show && (
                      <>
                        <span className={`text-[13px] flex-1 text-left whitespace-nowrap ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
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

        {/* Footer */}
        <div className="border-t border-border flex-shrink-0">
          {show ? (
            <div className="p-3 space-y-3">
              {/* 4-stat performance widget */}
              <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Performance</span>
                  <span className="text-[9px] text-muted-foreground/40 font-mono">7D</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wide mb-0.5">P&L</p>
                    <p className={`text-[11px] font-black font-mono ${dayPnl >= 0 ? "text-primary" : "text-rose-400"}`}>
                      {dayPnl >= 0 ? "+" : ""}${dayPnl.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wide mb-0.5">Win Rate</p>
                    <p className={`text-[11px] font-black font-mono ${winRate >= 50 ? "text-primary" : "text-rose-400"}`}>{winRate}%</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wide mb-0.5">Avg R:R</p>
                    <p className={`text-[11px] font-black font-mono ${avgRR !== "—" ? "text-primary" : "text-muted-foreground"}`}>{avgRR}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wide mb-0.5">Streak</p>
                    <p className={`text-[11px] font-black font-mono ${streakColor}`}>{streakLabel}</p>
                  </div>
                </div>
                {recent.length > 0 && (
                  <div className="h-0.5 rounded-full bg-muted/30 overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${winRate}%` }} />
                  </div>
                )}
              </div>
              {/* Session clocks */}
              <div className="rounded-xl border border-border/40 bg-card/40 p-2.5">
                <SessionClocks collapsed={false} />
              </div>
            </div>
          ) : (
            <div className="py-2 flex flex-col items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${dayPnl >= 0 ? "bg-primary" : "bg-rose-400"}`} title={`7D P&L: ${dayPnl >= 0 ? "+" : ""}$${dayPnl.toFixed(2)}`} />
              <SessionClocks collapsed />
            </div>
          )}

          <button onClick={openSettings}
            title={!show ? "Settings" : undefined}
            className="w-full flex items-center gap-2.5 p-3 text-muted-foreground hover:text-primary hover:bg-primary/[0.06] transition-colors min-h-[44px]"
            style={{ justifyContent: show ? "flex-start" : "center", paddingLeft: show ? "16px" : undefined }}>
            <Settings className="w-4 h-4 flex-shrink-0" />
            {show && <span className="text-xs">Settings</span>}
          </button>

          {show && (
            <div className="px-4 pb-3 flex items-center gap-2">
              <Wifi className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-muted-foreground/60 font-mono">LIVE TERMINAL</span>
              <span className="ml-auto text-[9px] text-primary font-bold">ACTIVE</span>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-2.5 border-b border-border backdrop-blur-md bg-background/90">
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-1 rounded-md text-foreground hover:bg-white/5 transition-colors"><Menu className="w-5 h-5" /></button>
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

      <aside className="hidden md:flex relative flex-shrink-0 h-screen flex-col border-r border-border bg-background transition-all duration-300" style={{ width: desktopW }}>
        {renderContent(false)}
      </aside>

      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <aside className="md:hidden fixed top-0 left-0 z-50 h-full w-[280px] flex flex-col border-r border-border bg-background shadow-2xl">
            {renderContent(true)}
          </aside>
        </>
      )}
    </>
  )
}
