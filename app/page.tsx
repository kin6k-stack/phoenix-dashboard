"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, collectionGroup, onSnapshot, query, orderBy, where, addDoc, updateDoc, deleteDoc, doc, getDoc, writeBatch } from "firebase/firestore"
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
import LifetimeLedgerView from "@/components/lifetime-ledger-view"
import BotHubView from "@/components/bot-hub-view"
import CSVImportView from "@/components/csv-import-view"
import { AccountFilterBar } from "@/components/account-filter-bar"
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
  const [copyDraft,         setCopyDraft]         = useState<Partial<Trade> | null>(null)
  const [trades,            setTrades]            = useState<Trade[]>([])
  const [botTrades,         setBotTrades]         = useState<Trade[]>([])
  const [accounts,          setAccounts]          = useState<{id:string; accountName:string; color:string; broker:string}[]>([])
  const [isOwner,           setIsOwner]           = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [activeNavItem,     setActiveNavItem]     = useState("dashboard")
  const [pnlView,           setPnlView]           = useState<"calendar" | "analytics">("calendar")
  const [symbolFilter,      setSymbolFilter]      = useState<string>("ALL")
  const [settingsOpen,      setSettingsOpen]      = useState(false)
  const [currentMonthYear,  setCurrentMonthYear]  = useState({
    month: new Date().getMonth(),
    year:  new Date().getFullYear(),
  })

  useEffect(() => {
    if (!authLoading && !user) router.push("/login")
  }, [user, authLoading, router])

  // ── Listen for custom nav events from child components ──
  useEffect(() => {
    const navHandler = (e: Event) => {
      const ev = e as CustomEvent<string>
      if (typeof ev.detail === "string") setActiveNavItem(ev.detail)
    }
    const settingsHandler = () => setSettingsOpen(true)
    const calendarNavHandler = (e: Event) => {
      const ev = e as CustomEvent<{ year: number; month: number }>
      if (ev.detail && typeof ev.detail.year === "number" && typeof ev.detail.month === "number") {
        setActiveNavItem("pnl-calendar")
        setPnlView("calendar")
        setCurrentMonthYear({ year: ev.detail.year, month: ev.detail.month })
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
  // Listener 1 — user's own trades
  //
  // Reads from: accounts/{accountId}/trades/{ticket}
  // All trades live in per-account subcollections (fresh start — no
  // flat trades/ collection). collectionGroup("trades") picks up every
  // subcollection named "trades" that belongs to this user.
  //
  // No orderBy here — collectionGroup + where + orderBy would need a
  // composite index. Sorting happens client-side instead.
  // ─────────────────────────────────────────────────────────────────
  //
  useEffect(() => {
    if (!user) return
    const q = query(
      collectionGroup(db, "trades"),
      where("userId", "==", user.uid)
    )
    return onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs.map(d => {
        const data = d.data()
        let tradeDate = new Date().toISOString()
        if (data.timestamp?.toDate)       tradeDate = data.timestamp.toDate().toISOString()
        else if (data.date)               tradeDate = new Date(data.date).toISOString()
        const rawBot = data.bot || data.botName || data.setup || null
        let openedAt: string | undefined
        if      (data.openedAt?.toDate)  openedAt = data.openedAt.toDate().toISOString()
        else if (data.openTime)          openedAt = new Date(data.openTime).toISOString()
        return {
          id:         d.id,
          date:       tradeDate,
          openedAt,
          symbol:     data.symbol || "Unknown",
          setup:      normalizeBotName(rawBot),
          rMultiple:  data.rMultiple !== undefined ? Number(data.rMultiple)
                    : data.profit    !== undefined ? Number(data.profit)
                    : 0,
          direction:  (data.direction || data.type || "BUY").toUpperCase(),
          entryPrice: data.openPrice  || data.entryPrice || 0,
          sl:         data.sl         || 0,
          lot:        data.lots       || data.lot || 0,
          notes:      data.notes      || "",
          accountId:  d.ref.parent?.parent?.id || data.accountId || "",
          screenshot: data.screenshot || "",
        }
      })
      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setTrades(mapped)
    }, err => {
      console.warn("[trades listener]", err.message)
      setTrades([])
    })
  }, [user])

  // ── Owner check — gates botTrades access ──
  useEffect(() => {
    if (!user) return
    getDoc(doc(db, "allowedUsers", user.uid)).then(snap => {
      setIsOwner(snap.exists() && snap.data()?.isPhoenixOwner === true)
    })
  }, [user])

  // ─────────────────────────────────────────────────────────────────
  // Listener 2 — bot trades (owner only)
  //
  // FIX: isOwner added to dependency array. Previously only [user] was
  // listed, so the effect ran before isOwner resolved (always false),
  // meaning botTrades never loaded after the owner check came back.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !isOwner) return
    const q = query(collection(db, "botTrades"), orderBy("closedAt", "desc"))
    return onSnapshot(q, (snapshot) => {
      setBotTrades(snapshot.docs.map(d => {
        const data = d.data()
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
  }, [user, isOwner]) // ← FIXED: was [user] only

  // ── Listener 3 — registered trading accounts ──
  useEffect(() => {
    if (!user) return
    const qAcc = query(
      collection(db, "accounts"),
      where("userId", "==", user.uid)
    )
    return onSnapshot(qAcc, snap => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
    })
  }, [user])

  useEffect(() => {
    if (selectedDate) { setEditingTrade(null); setIsAddTradeOpen(true) }
  }, [selectedDate])

  // ─────────────────────────────────────────────────────────────────
  // handleSaveTrade — ADD and UPDATE
  //
  // ALL trades now live under accounts/{accountId}/trades/{tradeId}.
  // No writes to the flat trades/ collection.
  //
  // ADD:    requires selectedAccountId from the filter bar.
  //         If no account is selected the user is prompted to pick one.
  //
  // UPDATE: looks up the trade's accountId from local state to build
  //         the correct subcollection path.
  // ─────────────────────────────────────────────────────────────────
  const handleSaveTrade = async (trade: any) => {
    if (!user) return
    try {
      if (trade.id) {
        // UPDATE — find the existing trade's accountId for the correct path
        const existing = trades.find(t => t.id === trade.id) as any
        const accountId = existing?.accountId
        if (!accountId) {
          console.error("Cannot update: trade has no accountId", trade.id)
          return
        }
        await updateDoc(
          doc(db, "accounts", accountId, "trades", trade.id),
          {
            symbol:     trade.symbol.toUpperCase(),
            profit:     Number(trade.rMultiple),
            rMultiple:  Number(trade.rMultiple),
            bot:        trade.setup,
            direction:  trade.direction,
            timestamp:  new Date(trade.date),
            notes:      trade.notes,
            screenshot: trade.screenshot || "",
          }
        )
      } else {
        // ADD — must have an account selected in the filter bar
        const accountId = selectedAccountId
        if (!accountId) {
          alert(
            "Please select an account from the filter bar before logging a trade.\n\n" +
            "Use the account selector at the top of the P&L Calendar page to pick which account this trade belongs to."
          )
          return
        }
        await addDoc(collection(db, "accounts", accountId, "trades"), {
          userId:     user.uid,
          accountId,
          symbol:     trade.symbol.toUpperCase(),
          profit:     Number(trade.rMultiple),
          rMultiple:  Number(trade.rMultiple),
          type:       "MANUAL",
          bot:        trade.setup || "Manual Execution",
          direction:  trade.direction || "BUY",
          timestamp:  new Date(trade.date),
          notes:      trade.notes || "",
          screenshot: trade.screenshot || "",
        })
      }
      setIsAddTradeOpen(false)
      setSelectedDate(null)
      setEditingTrade(null)
    } catch (e) { console.error(e) }
  }

  // ─────────────────────────────────────────────────────────────────
  // handleDeleteTrade
  //
  // Looks up the trade's accountId from local state to build the
  // correct subcollection path. Flat trades/ path is gone.
  // ─────────────────────────────────────────────────────────────────
  const handleDeleteTrade = async (id: string) => {
    try {
      const t = trades.find(tr => tr.id === id) as any
      const accountId = t?.accountId
      if (!accountId) {
        console.error("Cannot delete: trade has no accountId", id)
        return
      }
      await deleteDoc(doc(db, "accounts", accountId, "trades", id))
    } catch (e) { console.error(e) }
  }

  // ── Filtering pipeline ──
  const accountFilteredTrades = selectedAccountId
    ? trades.filter(t => (t as any).accountId === selectedAccountId)
    : trades

  const symbolFilteredTrades = symbolFilter === "ALL"
    ? accountFilteredTrades
    : accountFilteredTrades.filter(t => {
        const normalized = (t.symbol || "").toUpperCase().replace(/M$/, "")
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
  const tradeDates  = symbolFilteredTrades.map(t => new Date(t.date))
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
            <DashboardView trades={trades} botTrades={isOwner ? botTrades : []} />
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
                  {accounts.length > 0 && (
                    <AccountFilterBar
                      accounts={accounts}
                      selectedAccountId={selectedAccountId}
                      onSelect={setSelectedAccountId}
                    />
                  )}

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
                <>
                  {accounts.length > 0 && (
                    <AccountFilterBar
                      accounts={accounts}
                      selectedAccountId={selectedAccountId}
                      onSelect={setSelectedAccountId}
                    />
                  )}
                  <PnLAnalyticsView trades={symbolFilteredTrades} />
                </>
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
            <PerformanceView userTrades={trades} botTrades={isOwner ? botTrades : []} />
          </PageShell>
        )

      case "candle-analysis":
        return (
          <PageShell title="Candle Analysis" sub="Click any candle for OHLC, pattern, trend, RSI, and macro context">
            <CandleAnalysisView />
          </PageShell>
        )

      case "lifetime-ledger":
        return (
          <PageShell title="Lifetime Ledger" sub="Cross-broker trade history and account P&L overview">
            <LifetimeLedgerView trades={trades} accounts={accounts} />
          </PageShell>
        )

      case "bot-hub":
        return (
          <PageShell title="Bot Hub" sub="Live performance and version history for all deployed engines">
            <BotHubView />
          </PageShell>
        )

      case "csv-import":
        return (
          <PageShell title="CSV Import" sub="Import trade history from any broker into your Lifetime Ledger">
            <CSVImportView />
          </PageShell>
        )

      case "signal-history":
        return (
          <PageShell title="Execution Ledger" sub="Immutable history of all fired engine signals">
            <SignalHistoryView
              trades={trades}
              botTrades={botTrades}
              onCopyToJournal={(botTrade) => {
                const { id, ...draft } = botTrade as any
                setEditingTrade(null)
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
