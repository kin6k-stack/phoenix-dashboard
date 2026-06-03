"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, onSnapshot, query, orderBy, where, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Sidebar } from "@/components/sidebar"
import { AmbientBackdrop } from "@/components/ambient-backdrop"
import { TradingCalendar } from "@/components/trading-calendar"
import { SlimMonthlyPerformance } from "@/components/slim-monthly-performance"
import { SlimPnLChart } from "@/components/slim-pnl-chart"
import { SlimJournal } from "@/components/slim-journal"
import { ManualTradesCard } from "@/components/manual-trades-card"
import { AddTradeDialog } from "@/components/add-trade-dialog"
import { SessionIntelligence } from "@/components/session-intelligence"
import { PerformanceView } from "@/components/performance-view"
import { DashboardView } from "@/components/dashboard-view"
import { SignalHistoryView } from "@/components/signal-history"
import { EconomicCalendar } from "@/components/economic-calendar"
import { MarketBiasView } from "@/components/market-bias-view"
import { PnLHeader } from "@/components/pnl-header"
import { YearlyPerformanceTable } from "@/components/yearly-performance-table"
import { PnLAnalyticsView } from "@/components/pnl-analytics-view"
import { CandleAnalysisView } from "@/components/candle-analysis-view"
import { SettingsPanel } from "@/components/settings-panel"

interface Trade {
  id: string; date: string; symbol: string; setup: string
  rMultiple: number; direction: string; notes: string; screenshot?: string
}

function normalizeBotName(raw: string | undefined | null): string {
  if (!raw) return "Manual Execution"
  const u = raw.toUpperCase().replace(/_/g, " ").trim()
  if (u.includes("PHOENIX NQ") || u.includes("NQ V1"))             return "Phoenix NQ v1.6"
  if (u.includes("GOLD SENTINEL") || u.includes("SENTINEL APEX"))  return "Gold Sentinel Apex"
  if (u.includes("PHOENIX GOLD") || u.includes("GOLD HYBRID") || u.includes("PHOENIX HYBRID"))
                                                                     return "Phoenix Gold Hybrid"
  if (u.includes("MANUAL"))                                         return "Manual Execution"
  return raw.trim()
}

function PageShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 p-3 sm:p-4 md:p-8 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col gap-1 mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-black text-foreground uppercase tracking-widest">{title}</h1>
          <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-widest">{sub}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function TradingDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [selectedDate,      setSelectedDate]      = useState<Date | null>(null)
  const [isAddTradeOpen,    setIsAddTradeOpen]    = useState(false)
  const [editingTrade,      setEditingTrade]      = useState<Trade | null>(null)
  const [copyDraft,         setCopyDraft]         = useState<Partial<Trade> | null>(null)  // Pass G: bot trade copy-to-journal pre-fill
  const [trades,            setTrades]            = useState<Trade[]>([])      // USER's manual trades
  const [botTrades,         setBotTrades]         = useState<Trade[]>([])      // SHARED bot demo feed
  const [activeNavItem,     setActiveNavItem]     = useState("dashboard")
  const [pnlView,           setPnlView]           = useState<"calendar" | "analytics">("calendar")
  const [symbolFilter,      setSymbolFilter]      = useState<string>("ALL")        // Pass F2: PnL symbol filter
  const [settingsOpen,      setSettingsOpen]      = useState(false)
  const [currentMonthYear,  setCurrentMonthYear]  = useState({
    month: new Date().getMonth(),
    year:  new Date().getFullYear(),
  })

  useEffect(() => {
    if (!authLoading && !user) router.push("/login")
  }, [user, authLoading, router])

  // ── Listen for custom nav events from child components ──
  // (CandleAnalysisView dispatches `phoenix:nav` when its
  //  "View Economic Events" link is clicked.
  //  Sidebar dispatches `phoenix:settings` to open the panel.
  //  YearlyPerformanceTable dispatches `phoenix:calendar:nav` when
  //  the "View in Calendar" button is clicked in the month modal.)
  useEffect(() => {
    const navHandler = (e: Event) => {
      const ev = e as CustomEvent<string>
      if (typeof ev.detail === "string") setActiveNavItem(ev.detail)
    }
    const settingsHandler = () => setSettingsOpen(true)
    const calendarNavHandler = (e: Event) => {
      const ev = e as CustomEvent<{ year: number; month: number }>
      if (ev.detail && typeof ev.detail.year === "number" && typeof ev.detail.month === "number") {
        // Switch to the PnL Calendar page if we're not already there
        setActiveNavItem("pnl-calendar")
        // Switch back to calendar view (not analytics)
        setPnlView("calendar")
        // Update which month the calendar is showing
        setCurrentMonthYear({ year: ev.detail.year, month: ev.detail.month })
        // Scroll the calendar into view after a short delay so it has time to render
        setTimeout(() => {
          document.getElementById("pnl-calendar-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)
      }
    }
    window.addEventListener("phoenix:nav", navHandler)
    window.addEventListener("phoenix:settings", settingsHandler)
    window.addEventListener("phoenix:calendar:nav", calendarNavHandler)
    return () => {
      window.removeEventListener("phoenix:nav", navHandler)
      window.removeEventListener("phoenix:settings", settingsHandler)
      window.removeEventListener("phoenix:calendar:nav", calendarNavHandler)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────
  // Trade listeners — two separate Firestore subscriptions:
  //
  //   trades/      → user's manual entries only (filtered by userId)
  //                  feeds: PnL Calendar, Analytics, Journal, Dashboard
  //
  //   botTrades/   → shared bot demo feed (NQ, Sentinel, Hybrid)
  //                  feeds: Performance/Engine Telemetry ONLY
  //                  every user sees the same bot history
  // ─────────────────────────────────────────────────────────────────

  // Listener 1: user's own trades
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, "trades"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    )
    return onSnapshot(q, (snapshot) => {
      setTrades(snapshot.docs.map(d => {
        const data = d.data()
        let tradeDate = new Date().toISOString()
        if (data.timestamp?.toDate)       tradeDate = data.timestamp.toDate().toISOString()
        else if (data.date)               tradeDate = new Date(data.date).toISOString()
        const rawBot = data.bot || data.botName || data.setup || null
        // openedAt — written by Manual Sync v1.1 as openedAt field
        let openedAt: string | undefined
        if      (data.openedAt?.toDate)  openedAt = data.openedAt.toDate().toISOString()
        else if (data.openTime)          openedAt = new Date(data.openTime).toISOString()
        return {
          id:         d.id,
          date:       tradeDate,
          openedAt,
          symbol:     data.symbol || "Unknown",
          setup:      normalizeBotName(rawBot),
          // Pass O: schema fallback. Sync script writes `rMultiple`, legacy
          // historical sync wrote `profit`. Read whichever exists.
          rMultiple:  data.rMultiple !== undefined ? Number(data.rMultiple)
                    : data.profit    !== undefined ? Number(data.profit)
                    : 0,
          direction:  (data.direction || data.type || "BUY").toUpperCase(),
          entryPrice: data.openPrice  || data.entryPrice || 0,
          sl:         data.sl         || 0,
          lot:        data.lots       || data.lot || 0,
          notes:      data.notes      || "",
          screenshot: data.screenshot || "",
        }
      }))
    }, err => {
      // If we hit a permission error (e.g. before the user is on allowedUsers),
      // log it but don't crash the UI
      console.warn("[trades listener]", err.message)
      setTrades([])
    })
  }, [user])

  // Listener 2: shared bot trades (read-only signal feed)
  // orderBy closedAt — webhook v5.1 writes closedAt, not timestamp
  useEffect(() => {
    if (!user) return
    const q = query(collection(db, "botTrades"), orderBy("closedAt", "desc"))
    return onSnapshot(q, (snapshot) => {
      setBotTrades(snapshot.docs.map(d => {
        const data = d.data()
        // Date resolution — v5.1 writes closedAt/openedAt, legacy writes timestamp/date
        let tradeDate = new Date().toISOString()
        if      (data.closedAt?.toDate)   tradeDate = data.closedAt.toDate().toISOString()
        else if (data.openedAt?.toDate)   tradeDate = data.openedAt.toDate().toISOString()
        else if (data.timestamp?.toDate)  tradeDate = data.timestamp.toDate().toISOString()
        else if (data.date)               tradeDate = new Date(data.date).toISOString()
        const rawBot = data.bot || data.botName || data.setup || null
        return {
          id:         d.id,
          date:       tradeDate,
          symbol:     (data.symbol || "Unknown").toUpperCase(),
          setup:      normalizeBotName(rawBot),
          // profit field — webhook v5.1 writes profit, legacy writes rMultiple
          rMultiple:  data.rMultiple !== undefined ? Number(data.rMultiple)
                    : data.profit    !== undefined ? Number(data.profit)
                    : 0,
          direction:  (data.direction || data.type || "BUY").toUpperCase(),
          entryPrice: data.entryPrice || 0,
          sl:         data.sl         || 0,
          tp1:        data.tp1        || 0,
          lot:        data.lot        || 0,
          outcome:    data.outcome    || (data.profit >= 0 ? "WIN" : "LOSS"),
          bot:        normalizeBotName(rawBot),
          notes:      "",
          screenshot: "",
        }
      }))
    }, err => {
      console.warn("[botTrades listener]", err.message)
      setBotTrades([])
    })
  }, [user])

  useEffect(() => {
    if (selectedDate) { setEditingTrade(null); setIsAddTradeOpen(true) }
  }, [selectedDate])

  const handleSaveTrade = async (trade: any) => {
    if (!user) return
    try {
      if (trade.id) {
        await updateDoc(doc(db, "trades", trade.id), {
          symbol: trade.symbol.toUpperCase(), profit: Number(trade.rMultiple),
          bot: trade.setup, direction: trade.direction,
          timestamp: new Date(trade.date), notes: trade.notes, screenshot: trade.screenshot || "",
        })
      } else {
        await addDoc(collection(db, "trades"), {
          userId: user.uid,                                     // ← per-user scoping
          symbol: trade.symbol.toUpperCase(), profit: Number(trade.rMultiple), type: "MANUAL",
          bot: trade.setup || "Manual Execution", direction: trade.direction || "BUY",
          timestamp: new Date(trade.date), notes: trade.notes || "", screenshot: trade.screenshot || "",
        })
      }
      setIsAddTradeOpen(false); setSelectedDate(null); setEditingTrade(null)
    } catch (e) { console.error(e) }
  }

  const handleDeleteTrade = async (id: string) => {
    try { await deleteDoc(doc(db, "trades", id)) } catch (e) { console.error(e) }
  }

  // ── Pass F2: Symbol filter (from PnLHeader dropdown) ──
  // Applied BEFORE the month filter so calendar/analytics/yearly-table
  // all respect the user's selected symbol. "ALL" passes everything through.
  // Symbol comparison is case-insensitive and ignores broker suffixes (e.g. "XAUUSDm" → "XAUUSD").
  const symbolFilteredTrades = symbolFilter === "ALL"
    ? trades
    : trades.filter(t => {
        const normalized = (t.symbol || "").toUpperCase().replace(/M$/, "")  // strip trailing 'm' broker suffix
        return normalized === symbolFilter.toUpperCase()
      })

  const filteredTrades = symbolFilteredTrades.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === currentMonthYear.month && d.getFullYear() === currentMonthYear.year
  })

  const totalTrades = filteredTrades.length
  const wins        = filteredTrades.filter(t => t.rMultiple > 0).length
  const losses      = filteredTrades.filter(t => t.rMultiple < 0).length
  const winRate     = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0
  const netPnL      = filteredTrades.reduce((s, t) => s + t.rMultiple, 0)
  const tradeDates  = symbolFilteredTrades.map(t => new Date(t.date))  // calendar dots also respect symbol filter
  const manualTradesList = filteredTrades.filter(t => t.setup.toUpperCase().includes("MANUAL"))

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Authenticating…</p>
        </div>
      </div>
    )
  }
  if (!user) return null

  const renderContent = () => {
    switch (activeNavItem) {
      case "dashboard":
        return (
          <div className="flex-1 overflow-auto">
            <DashboardView trades={trades} />
          </div>
        )

      case "pnl-calendar":
        return (
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 space-y-4">

              <PnLHeader
                totalTrades={totalTrades}
                view={pnlView}
                onViewChange={setPnlView}
                onLogTrade={() => { setEditingTrade(null); setIsAddTradeOpen(true) }}
                symbolFilter={symbolFilter}
                onSymbolFilterChange={setSymbolFilter}
              />

              {pnlView === "calendar" ? (
                <>
                  {/* anchor target for "View in Calendar" scroll-to-section */}
                  <div id="pnl-calendar-section" className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 xl:auto-rows-min">
                    <div className="min-w-0">
                      <TradingCalendar
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        tradeDates={tradeDates}
                        trades={filteredTrades}
                        totalTrades={totalTrades}
                        wins={wins}
                        netPnL={netPnL}
                        winRate={winRate}
                        onMonthYearChange={setCurrentMonthYear}
                      />
                    </div>
                    <div className="space-y-3 xl:max-h-[580px] xl:overflow-y-auto xl:pr-1 custom-scrollbar">
                      <SlimMonthlyPerformance
                        winRate={winRate} trades={totalTrades} wins={wins} losses={losses}
                        netPnL={netPnL} fees={0} />
                      <SlimPnLChart trades={filteredTrades} />
                      <SlimJournal
                        entriesThisMonth={filteredTrades.length}
                        screenshots={filteredTrades.filter(t => t.screenshot).length} />
                      <ManualTradesCard
                        trades={manualTradesList}
                        onAddTrade={() => { setEditingTrade(null); setIsAddTradeOpen(true) }}
                        onEditTrade={t => { setEditingTrade(t); setIsAddTradeOpen(true) }}
                        onDeleteTrade={handleDeleteTrade} />
                    </div>
                  </div>
                  <YearlyPerformanceTable trades={symbolFilteredTrades} />
                </>
              ) : (
                <PnLAnalyticsView trades={symbolFilteredTrades} />
              )}
            </div>
          </div>
        )

      case "market-bias":
        return (
          <PageShell title="Market Bias" sub="Multi-agent AI consensus · Institutional market context engine">
            <MarketBiasView />
          </PageShell>
        )

      case "session-intelligence":
        return (
          <PageShell title="Session Intelligence" sub="Real-time institutional liquidity alignment matrix">
            <SessionIntelligence trades={trades} />
          </PageShell>
        )

      case "performance-metrics":
        return (
          <PageShell title="Engine Telemetry" sub="Segmented algorithmic strategy and execution history">
            <PerformanceView userTrades={trades} botTrades={botTrades} />
          </PageShell>
        )

      // ─────────────────────────────────────────────────────────────────
      // CANDLE ANALYSIS — Round 3 rebuild
      // Replaced TradingView iframe with custom lightweight-charts
      // candlestick chart + click-to-explain side panel.
      // ─────────────────────────────────────────────────────────────────
      case "candle-analysis":
        return (
          <PageShell title="Candle Analysis" sub="Click any candle for OHLC, pattern, trend, RSI, and macro context">
            <CandleAnalysisView />
          </PageShell>
        )

      case "signal-history":
        return (
          <PageShell title="Execution Ledger" sub="Immutable history of all fired engine signals">
            <SignalHistoryView
              trades={trades}
              botTrades={botTrades}
              onCopyToJournal={(botTrade) => {
                // Strip the bot trade's ID so the dialog treats this as a NEW
                // entry (otherwise existingTrade !== null would overwrite the bot record).
                // Keep date/symbol/setup/direction/rMultiple/notes as a pre-filled draft.
                const { id, ...draft } = botTrade as any
                setEditingTrade(null)
                // Open the dialog with this draft as the initial form state
                setCopyDraft(draft)
                setIsAddTradeOpen(true)
              }}
            />
          </PageShell>
        )

      case "economic-calendar":
        return (
          <PageShell title="Economic Calendar" sub="Live macro volatility timeline alerts">
            <EconomicCalendar />
          </PageShell>
        )

      default:
        return (
          <div className="flex-1 p-8 flex items-center justify-center text-muted-foreground text-sm italic font-mono">
            Section coming soon.
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-background relative">
      <AmbientBackdrop />
      <Sidebar activeItem={activeNavItem} onItemClick={setActiveNavItem} trades={trades} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {renderContent()}
      </div>
      <AddTradeDialog
        open={isAddTradeOpen}
        onOpenChange={(open: boolean) => {
          setIsAddTradeOpen(open)
          if (!open) { setSelectedDate(null); setEditingTrade(null); setCopyDraft(null) }
        }}
        onSubmit={handleSaveTrade}
        initialDate={selectedDate}
        existingTrade={editingTrade}
        initialDraft={copyDraft}
        trades={trades}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
