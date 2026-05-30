"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Sidebar } from "@/components/sidebar"
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
  const [trades,            setTrades]            = useState<Trade[]>([])
  const [activeNavItem,     setActiveNavItem]     = useState("dashboard")
  const [pnlView,           setPnlView]           = useState<"calendar" | "analytics">("calendar")
  const [currentMonthYear,  setCurrentMonthYear]  = useState({
    month: new Date().getMonth(),
    year:  new Date().getFullYear(),
  })

  useEffect(() => {
    if (!authLoading && !user) router.push("/login")
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, "trades"), orderBy("timestamp", "desc"))
    return onSnapshot(q, (snapshot) => {
      setTrades(snapshot.docs.map(d => {
        const data = d.data()
        let tradeDate = new Date().toISOString()
        if (data.timestamp?.toDate)       tradeDate = data.timestamp.toDate().toISOString()
        else if (data.date)               tradeDate = new Date(data.date).toISOString()
        const rawBot = data.bot || data.botName || data.setup || null
        return {
          id:         d.id,
          date:       tradeDate,
          symbol:     data.symbol || "Unknown",
          setup:      normalizeBotName(rawBot),
          rMultiple:  data.profit !== undefined ? Number(data.profit) : 0,
          direction:  (data.direction || data.type || "BUY").toUpperCase(),
          notes:      data.notes || "",
          screenshot: data.screenshot || "",
        }
      }))
    })
  }, [user])

  useEffect(() => {
    if (selectedDate) { setEditingTrade(null); setIsAddTradeOpen(true) }
  }, [selectedDate])

  const handleSaveTrade = async (trade: any) => {
    try {
      if (trade.id) {
        await updateDoc(doc(db, "trades", trade.id), {
          symbol: trade.symbol.toUpperCase(), profit: Number(trade.rMultiple),
          bot: trade.setup, direction: trade.direction,
          timestamp: new Date(trade.date), notes: trade.notes, screenshot: trade.screenshot || "",
        })
      } else {
        await addDoc(collection(db, "trades"), {
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

  const filteredTrades = trades.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === currentMonthYear.month && d.getFullYear() === currentMonthYear.year
  })

  const totalTrades = filteredTrades.length
  const wins        = filteredTrades.filter(t => t.rMultiple > 0).length
  const losses      = filteredTrades.filter(t => t.rMultiple < 0).length
  const winRate     = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0
  const netPnL      = filteredTrades.reduce((s, t) => s + t.rMultiple, 0)
  const tradeDates  = trades.map(t => new Date(t.date))
  const manualTradesList = filteredTrades.filter(t => t.setup.toUpperCase().includes("MANUAL"))

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0f14" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#5fc77a] border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-slate-500 tracking-widest uppercase">Authenticating…</p>
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

      // ═══════════════════════════════════════════════════════════════
      // PNL CALENDAR — Gap eliminated via scrollable side column
      //
      // The right column now has a max-height matching the viewport
      // and overflows internally with auto-scroll. The grid row's height
      // is anchored to the calendar (~600px) instead of the panels stack.
      // Yearly Performance now sits directly below the calendar height.
      // ═══════════════════════════════════════════════════════════════
      case "pnl-calendar":
        return (
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 space-y-4">

              <PnLHeader
                totalTrades={totalTrades}
                view={pnlView}
                onViewChange={setPnlView}
                onLogTrade={() => { setEditingTrade(null); setIsAddTradeOpen(true) }}
              />

              {pnlView === "calendar" ? (
                <>
                  {/*
                    On xl+: grid with auto-rows-min so calendar row sizes to calendar.
                    Right column gets a max-height equal to a viewport-relative value
                    and overflow-y-auto so it scrolls within itself.
                    On smaller screens: stacks normally, no max-height (panels show fully).
                  */}
                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 xl:auto-rows-min">

                    {/* LEFT — calendar */}
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

                    {/*
                      RIGHT — slim panels, scrollable on xl+
                      Max-height: 600px (~calendar height). pr-1 leaves room for scrollbar.
                      Custom-scrollbar class assumes you have it in globals.css; if not
                      it just uses default scrollbar styling (still works).
                    */}
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

                  <YearlyPerformanceTable trades={trades} />
                </>
              ) : (
                <PnLAnalyticsView trades={trades} />
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
            <PerformanceView trades={trades} />
          </PageShell>
        )

      case "candle-analysis":
        return (
          <PageShell title="Candle Analysis" sub="Click any candle on the TradingView chart for context">
            <div className="rounded-xl overflow-hidden border border-border/40" style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>
              <iframe
                src="https://www.tradingview.com/widgetembed/?hidesidetoolbar=0&symbol=TVC:GOLD&interval=60&theme=dark&style=1&locale=en&allow_symbol_change=1&save_image=0&calendar=0&backgroundColor=%230d0f14&gridColor=rgba(255%2C255%2C255%2C0.03)"
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Candle Analysis Chart"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </PageShell>
        )

      case "signal-history":
        return (
          <PageShell title="Execution Ledger" sub="Immutable history of all fired engine signals">
            <SignalHistoryView trades={trades} />
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
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden" style={{ background: "#0d0f14" }}>
      <Sidebar activeItem={activeNavItem} onItemClick={setActiveNavItem} trades={trades} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {renderContent()}
      </div>
      <AddTradeDialog
        open={isAddTradeOpen}
        onOpenChange={(open: boolean) => { setIsAddTradeOpen(open); if (!open) { setSelectedDate(null); setEditingTrade(null) } }}
        onSubmit={handleSaveTrade} initialDate={selectedDate} existingTrade={editingTrade} trades={trades}
      />
    </div>
  )
}
