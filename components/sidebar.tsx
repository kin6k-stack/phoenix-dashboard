"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  LayoutDashboard, Calendar, BarChart3, History, Clock,
  Globe, Target, CandlestickChart, ChevronLeft, ChevronRight,
  LogOut, Wifi, TrendingUp, Menu, X,
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
  const { signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)        // desktop collapsed state
  const [mobileOpen, setMobileOpen] = useState(false)      // mobile drawer state
  const [session, setSession] = useState(getSessionLabel())

  // ── Persist desktop collapse state ───────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("phx_sidebar_collapsed")
    if (saved === "true") setCollapsed(true)
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("phx_sidebar_collapsed", String(next))
  }

  // ── Live session clock ───────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setSession(getSessionLabel()), 60_000)
    return () => clearInterval(t)
  }, [])

  // ── Close mobile drawer when nav item clicked or on Escape ───────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleItemClick = (id: string) => {
    onItemClick(id)
    setMobileOpen(false)
  }

  // ── 7-day stats for bottom panel ─────────────────────────────────────
  const sevenDaysAgo = Date.now() - 7 * 86_400_000
  const recentTrades = trades.filter(t => new Date(t.date).getTime() > sevenDaysAgo)
  const wins         = recentTrades.filter(t => t.rMultiple > 0).length
  const dayPnl       = recentTrades.reduce((s, t) => s + Number(t.rMultiple), 0)
  const winRate      = recentTrades.length > 0 ? Math.round((wins / recentTrades.length) * 100) : 0

  const badgeStyles: Record<string, string> = {
    pro:  "bg-[#1a1f2e] text-[#64748b] text-[9px] font-black tracking-wider",
    live: "bg-[#5fc77a]/10 text-[#5fc77a] text-[9px] font-black tracking-wider border border-[#5fc77a]/25",
    open: "bg-amber-500/10 text-amber-400 text-[9px] font-black tracking-wider",
  }

  // Desktop width (mobile is fixed full-overlay)
  const desktopW = collapsed ? 56 : 240

  // ── Renders the full sidebar contents (shared between desktop + mobile drawer) ──
  const renderSidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo + collapse/close toggle */}
      <div
        className="flex items-center justify-between px-3.5 py-4 border-b"
        style={{ borderColor: "#1e2232", minHeight: 56 }}>
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#5fc77a,#3da85a)" }}>
              <TrendingUp className="w-3.5 h-3.5 text-[#0d0f14]" />
            </div>
            <span className="text-white text-[13px] font-black tracking-widest uppercase whitespace-nowrap">
              Phoenix
            </span>
          </div>
        )}
        {collapsed && !isMobile && (
          <div className="w-7 h-7 mx-auto rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#5fc77a,#3da85a)" }}>
            <TrendingUp className="w-3.5 h-3.5 text-[#0d0f14]" />
          </div>
        )}

        {isMobile ? (
          <button onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors ml-1">
            <X className="w-5 h-5" />
          </button>
        ) : !collapsed && (
          <button onClick={toggleCollapse}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors ml-1">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when desktop collapsed */}
      {collapsed && !isMobile && (
        <button onClick={toggleCollapse}
          className="absolute -right-3 top-14 z-10 w-6 h-6 rounded-full flex items-center justify-center border shadow-lg"
          style={{ background: "#141720", borderColor: "#1e2232" }}>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4">
        {SECTIONS.map(section => (
          <div key={section.label}>
            {(!collapsed || isMobile) && (
              <div className="px-4 mb-1">
                <span className="text-[9px] font-black tracking-widest text-slate-600 uppercase">
                  {section.label}
                </span>
              </div>
            )}
            {collapsed && !isMobile && <div className="mx-3 my-1.5" style={{ borderTop: "1px solid #1e2232" }} />}

            {section.items.map(item => {
              const Icon     = item.icon
              const isActive = activeItem === item.id
              const showText = !collapsed || isMobile

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className="w-full flex items-center gap-2.5 transition-all group min-h-[40px]"
                  style={{
                    padding: showText ? "8px 12px" : "8px 0",
                    justifyContent: showText ? "flex-start" : "center",
                    background: isActive ? "rgba(95,199,122,0.08)" : "transparent",
                    borderLeft: isActive && showText ? "2px solid #5fc77a" : "2px solid transparent",
                    paddingLeft: showText ? (isActive ? "10px" : "12px") : undefined,
                  }}>
                  <Icon className="w-4 h-4 flex-shrink-0 transition-colors"
                    style={{ color: isActive ? "#5fc77a" : "#64748b" }} />
                  {showText && (
                    <>
                      <span className="text-[13px] flex-1 text-left transition-colors whitespace-nowrap"
                        style={{ color: isActive ? "#e2e8f0" : "#94a3b8", fontWeight: isActive ? 600 : 400 }}>
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

      {/* Bottom stats + session */}
      <div className="border-t" style={{ borderColor: "#1e2232" }}>
        {(!collapsed || isMobile) && (
          <div className="p-3 space-y-2">
            <div className="rounded-lg p-2.5" style={{ background: "#141720", border: "1px solid #1e2232" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Performance</span>
                <span className="text-[9px] text-slate-600">7 DAY</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <p className="text-[9px] text-slate-600 uppercase">Daily P&L</p>
                  <p className={`text-xs font-black font-mono ${dayPnl >= 0 ? "text-[#5fc77a]" : "text-red-400"}`}>
                    {dayPnl >= 0 ? "+" : ""}${dayPnl.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-600 uppercase">Win Rate</p>
                  <p className="text-xs font-black font-mono text-slate-200">{winRate}%</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#5fc77a] animate-pulse" />
                <span className="text-[11px] font-black text-slate-400">{session.abbr}</span>
              </div>
              <span className="text-[9px] text-slate-600 uppercase">ACTIVE</span>
            </div>
          </div>
        )}

        <button onClick={signOut}
          className="w-full flex items-center gap-2.5 p-3 text-slate-600 hover:text-red-400 hover:bg-red-400/5 transition-colors min-h-[44px]"
          style={{ justifyContent: (!collapsed || isMobile) ? "flex-start" : "center", paddingLeft: (!collapsed || isMobile) ? "16px" : undefined }}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(!collapsed || isMobile) && <span className="text-xs">Sign Out</span>}
        </button>

        {(!collapsed || isMobile) && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <Wifi className="w-3 h-3 text-[#5fc77a]" />
            <span className="text-[10px] text-slate-600 font-mono">LIVE TERMINAL</span>
            <span className="ml-auto text-[9px] text-[#5fc77a] font-bold">ACTIVE</span>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* ── Mobile top bar (hamburger trigger) — visible <md only ──────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-2.5 border-b backdrop-blur-md"
        style={{ background: "rgba(13,16,23,0.92)", borderColor: "#1e2232" }}>
        <button onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 rounded-md text-slate-300 hover:bg-white/5 transition-colors"
          aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#5fc77a,#3da85a)" }}>
            <TrendingUp className="w-3 h-3 text-[#0d0f14]" />
          </div>
          <span className="text-white text-xs font-black tracking-widest uppercase">Phoenix</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: "rgba(95,199,122,0.08)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#5fc77a] animate-pulse" />
          <span className="text-[10px] font-black text-[#5fc77a]">{session.abbr}</span>
        </div>
      </div>

      {/* Spacer to push content below fixed top bar on mobile */}
      <div className="md:hidden h-12 flex-shrink-0" />

      {/* ── Desktop sidebar — visible md+ ─────────────────────────────── */}
      <aside
        className="hidden md:flex sidebar-transition relative flex-shrink-0 h-screen flex-col border-r"
        style={{ width: desktopW, background: "#0d1017", borderColor: "#1e2232" }}>
        {renderSidebarContent(false)}
      </aside>

      {/* ── Mobile drawer + backdrop — visible <md only ───────────────── */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <aside
            className="md:hidden fixed top-0 left-0 z-50 h-full w-[280px] flex flex-col border-r shadow-2xl"
            style={{ background: "#0d1017", borderColor: "#1e2232" }}>
            {renderSidebarContent(true)}
          </aside>
        </>
      )}
    </>
  )
}
