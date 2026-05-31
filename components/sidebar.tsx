"use client"

import { useState, useEffect } from "react"
import {
  LayoutDashboard, Calendar, BarChart3, History, Clock,
  Globe, Target, CandlestickChart, ChevronLeft,
  Settings, Wifi, TrendingUp, Menu, X, PanelLeftOpen,
} from "lucide-react"

interface NavItem {
  id:      string
  label:   string
  icon:    React.ElementType
  badge?:  { text: string; variant: "pro" | "live" | "open" }
}

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "OVERVIEW",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "ANALYSIS",
    items: [
      { id: "market-bias",          label: "Market Bias",          icon: Target,           badge: { text: "AI", variant: "live" } },
      { id: "session-intelligence", label: "Session Intelligence", icon: Clock             },
      { id: "performance-metrics",  label: "Performance",          icon: BarChart3         },
      { id: "candle-analysis",      label: "Candle Analysis",      icon: CandlestickChart  },
    ],
  },
  {
    label: "HISTORY",
    items: [
      { id: "pnl-calendar",   label: "P&L Calendar",   icon: Calendar },
      { id: "signal-history", label: "Signal History", icon: History  },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { id: "economic-calendar", label: "Economic Calendar", icon: Globe },
    ],
  },
]

interface SidebarProps {
  activeItem:  string
  onItemClick: (id: string) => void
  trades?:     { rMultiple: number; date: string }[]
}

function getSessionLabel(): { label: string; abbr: string } {
  const h = new Date().getUTCHours()
  if (h >= 22 || h < 8)  return { label: "Asian",   abbr: "TYO" }
  if (h >= 8  && h < 13) return { label: "London",  abbr: "LDN" }
  if (h >= 13 && h < 16) return { label: "Overlap", abbr: "OVL" }
  return { label: "New York", abbr: "NYO" }
}

export function Sidebar({ activeItem, onItemClick, trades = [] }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [session, setSession] = useState(getSessionLabel())

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
    const t = setInterval(() => setSession(getSessionLabel()), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleItemClick = (id: string) => {
    onItemClick(id)
    setMobileOpen(false)
  }

  // Open the settings panel (defined in app/page.tsx via custom event)
  const openSettings = () => {
    window.dispatchEvent(new CustomEvent("phoenix:settings"))
    setMobileOpen(false)
  }

  const sevenDaysAgo = Date.now() - 7 * 86_400_000
  const recentTrades = trades.filter(t => new Date(t.date).getTime() > sevenDaysAgo)
  const wins         = recentTrades.filter(t => t.rMultiple > 0).length
  const dayPnl       = recentTrades.reduce((s, t) => s + Number(t.rMultiple), 0)
  const winRate      = recentTrades.length > 0 ? Math.round((wins / recentTrades.length) * 100) : 0

  // Theme-aware badge styles — resolve via CSS tokens, not hardcoded hex
  const badgeStyles: Record<string, string> = {
    pro:  "bg-muted text-muted-foreground text-[9px] font-black tracking-wider",
    live: "bg-primary/10 text-primary text-[9px] font-black tracking-wider border border-primary/25",
    open: "bg-amber-500/10 text-amber-400 text-[9px] font-black tracking-wider",
  }

  const desktopW = collapsed ? 56 : 240

  const renderSidebarContent = (isMobile: boolean) => (
    <>
      {/* ── Header bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-4 border-b border-border" style={{ minHeight: 56 }}>

        {collapsed && !isMobile ? (
          <button
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors group"
            aria-label="Expand sidebar"
            title="Expand sidebar">
            <PanelLeftOpen className="w-4 h-4 transition-transform group-hover:scale-110" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center bg-primary">
                <TrendingUp className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="flex flex-col leading-none overflow-hidden">
                <span className="text-foreground text-[13px] font-black tracking-widest uppercase whitespace-nowrap">
                  Phoenix
                </span>
                <span className="text-muted-foreground text-[9px] font-bold tracking-[0.25em] uppercase whitespace-nowrap mt-0.5">
                  Command
                </span>
              </div>
            </div>

            {isMobile ? (
              <button onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors ml-1"
                aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={toggleCollapse}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors ml-1"
                aria-label="Collapse sidebar"
                title="Collapse sidebar">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4">
        {SECTIONS.map(section => (
          <div key={section.label}>
            {(!collapsed || isMobile) && (
              <div className="px-4 mb-1">
                <span className="text-[9px] font-black tracking-widest text-muted-foreground/70 uppercase">
                  {section.label}
                </span>
              </div>
            )}
            {collapsed && !isMobile && <div className="mx-3 my-1.5 border-t border-border" />}

            {section.items.map(item => {
              const Icon     = item.icon
              const isActive = activeItem === item.id
              const showText = !collapsed || isMobile

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  title={!showText ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 transition-all group min-h-[40px] ${
                    isActive ? "bg-primary/[0.08]" : "hover:bg-white/[0.03]"
                  }`}
                  style={{
                    padding: showText ? "8px 12px" : "8px 0",
                    justifyContent: showText ? "flex-start" : "center",
                    borderLeft: isActive && showText ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                    paddingLeft: showText ? (isActive ? "10px" : "12px") : undefined,
                  }}>
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`} />
                  {showText && (
                    <>
                      <span className={`text-[13px] flex-1 text-left transition-colors whitespace-nowrap ${
                        isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                      }`}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded ${badgeStyles[item.badge.variant]}`}>
                          {item.badge.text}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer: perf summary + session + Settings ─────── */}
      <div className="border-t border-border">
        {(!collapsed || isMobile) && (
          <div className="p-3 space-y-2">
            <div className="rounded-lg p-2.5 bg-card border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Performance</span>
                <span className="text-[9px] text-muted-foreground/70">7 DAY</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <p className="text-[9px] text-muted-foreground/70 uppercase">Daily P&L</p>
                  <p className={`text-xs font-black font-mono ${dayPnl >= 0 ? "text-primary" : "text-rose-400"}`}>
                    {dayPnl >= 0 ? "+" : ""}${dayPnl.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground/70 uppercase">Win Rate</p>
                  <p className="text-xs font-black font-mono text-foreground">{winRate}%</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[11px] font-black text-muted-foreground">{session.abbr}</span>
              </div>
              <span className="text-[9px] text-muted-foreground/70 uppercase">ACTIVE</span>
            </div>
          </div>
        )}

        {/* SETTINGS button — replaces Sign Out (Sign Out lives in the panel) */}
        <button onClick={openSettings}
          title={!(!collapsed || isMobile) ? "Settings" : undefined}
          className="w-full flex items-center gap-2.5 p-3 text-muted-foreground hover:text-primary hover:bg-primary/[0.06] transition-colors min-h-[44px]"
          style={{ justifyContent: (!collapsed || isMobile) ? "flex-start" : "center", paddingLeft: (!collapsed || isMobile) ? "16px" : undefined }}>
          <Settings className="w-4 h-4 flex-shrink-0" />
          {(!collapsed || isMobile) && <span className="text-xs">Settings</span>}
        </button>

        {(!collapsed || isMobile) && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <Wifi className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground/70 font-mono">LIVE TERMINAL</span>
            <span className="ml-auto text-[9px] text-primary font-bold">ACTIVE</span>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-2.5 border-b border-border backdrop-blur-md bg-background/90">
        <button onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 rounded-md text-foreground hover:bg-white/5 transition-colors"
          aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-primary">
            <TrendingUp className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-foreground text-xs font-black tracking-widest uppercase">Phoenix Cmd</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black text-primary">{session.abbr}</span>
        </div>
      </div>

      <div className="md:hidden h-12 flex-shrink-0" />

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex relative flex-shrink-0 h-screen flex-col border-r border-border bg-background transition-all duration-300"
        style={{ width: desktopW }}>
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <aside className="md:hidden fixed top-0 left-0 z-50 h-full w-[280px] flex flex-col border-r border-border bg-background shadow-2xl">
            {renderSidebarContent(true)}
          </aside>
        </>
      )}
    </>
  )
}
