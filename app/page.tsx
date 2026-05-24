"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import { db } from "../lib/firebase" 
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
import { BotConfiguration } from "@/components/bot-configuration"
import { SignalHistoryView } from "@/components/signal-history" 
import { EconomicCalendar } from "@/components/economic-calendar"

interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
  direction: string
  notes: string
  screenshot?: string 
}

export default function TradingDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [activeNavItem, setActiveNavItem] = useState("dashboard")
  const [currentMonthYear, setCurrentMonthYear] = useState<{ month: number; year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  })

  useEffect(() => {
    const q = query(collection(db, "trades"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveTrades = snapshot.docs.map(doc => {
        const data = doc.data();
        let tradeDate = new Date().toISOString(); 
        if (data.timestamp?.toDate) {
            tradeDate = data.timestamp.toDate().toISOString(); 
        } else if (data.date) {
            tradeDate = new Date(data.date).toISOString(); 
        }

        return {
          id: doc.id,
          date: tradeDate,
          symbol: data.symbol || "Unknown",
          setup: data.bot || data.setup || "Manual Entry",
          rMultiple: data.profit !== undefined ? Number(data.profit) : 0, 
          direction: (data.direction || data.type || data.action || "BUY").toUpperCase(),
          notes: data.notes || "No context notes recorded.",
          screenshot: data.screenshot || "" 
        };
      });
      setTrades(liveTrades);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setEditingTrade(null);
      setIsAddTradeOpen(true);
    }
  }, [selectedDate]);

  const openEditDialog = (trade: Trade) => {
    setEditingTrade(trade);
    setIsAddTradeOpen(true);
  }

  const handleSaveTrade = async (trade: any) => {
    try {
      if (trade.id) {
        await updateDoc(doc(db, "trades", trade.id), {
          symbol: trade.symbol.toUpperCase(),
          profit: Number(trade.rMultiple),
          bot: trade.setup,
          direction: trade.direction,
          timestamp: new Date(trade.date),
          notes: trade.notes,
          screenshot: trade.screenshot || ""
        });
      } else {
        await addDoc(collection(db, "trades"), {
          symbol: trade.symbol.toUpperCase(),
          profit: Number(trade.rMultiple), 
          type: "MANUAL",
          bot: trade.setup || "Manual Entry",
          direction: trade.direction || "BUY",
          timestamp: new Date(trade.date),
          notes: trade.notes || "Historical trade added via web dashboard",
          screenshot: trade.screenshot || ""
        });
      }
      setIsAddTradeOpen(false);
      setSelectedDate(null); 
      setEditingTrade(null);
    } catch (error) {
      console.error("Firebase write error:", error);
    }
  }

  const handleDeleteTrade = async (id: string) => {
    try {
      await deleteDoc(doc(db, "trades", id));
    } catch (error) {
      console.error("Firebase deletion error:", error);
    }
  }

  const filteredTrades = trades.filter(t => {
    const tradeDateObj = new Date(t.date);
    return tradeDateObj.getMonth() === currentMonthYear.month && tradeDateObj.getFullYear() === currentMonthYear.year;
  });

  const totalTrades = filteredTrades.length
  const wins = filteredTrades.filter(t => t.rMultiple > 0).length
  const losses = filteredTrades.filter(t => t.rMultiple < 0).length
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0
  const netPnL = filteredTrades.reduce((sum, t) => sum + t.rMultiple, 0)
  const tradeDates = trades.map(t => new Date(t.date))

  const renderContent = () => {
    switch (activeNavItem) {
      case "dashboard": 
        return <div className="flex-1 overflow-auto"><DashboardView trades={trades} /></div>
      case "pnl-calendar":
        return (
          <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden h-full w-full">
            <div className="flex-1 p-4 md:p-8 overflow-visible lg:overflow-auto">
              {/* THEME ALIGNMENT: Inherits true ultra-dark glass tone matching the layout panels */}
              <div className="bg-[#090d16]/90 backdrop-blur-xl rounded-xl border border-border/40 p-4 md:p-6 h-full shadow-[0_0_30px_rgba(0,0,0,0.6)]">
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
            </div>
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/40 p-4 overflow-visible lg:overflow-auto space-y-4 bg-card/20 backdrop-blur-md">
              <SlimMonthlyPerformance winRate={winRate} trades={totalTrades} wins={wins} losses={losses} netPnL={netPnL} fees={0} />
              <SlimPnLChart trades={filteredTrades} /> 
              <SlimJournal entriesThisMonth={filteredTrades.length} screenshots={filteredTrades.filter(t => t.screenshot).length} />
              <ManualTradesCard 
                trades={filteredTrades} 
                onAddTrade={() => { setEditingTrade(null); setIsAddTradeOpen(true); }} 
                onEditTrade={openEditDialog}
                onDeleteTrade={handleDeleteTrade} 
              />
            </div>
          </div>
        )
      case "session-intelligence":
        return (
          <div className="flex-1 p-4 md:p-8 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-col gap-1 mb-6">
                <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-widest drop-shadow-sm">Session Intelligence HUD</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-widest">Real-time institutional liquidity alignment matrix data feeds.</p>
              </div>
              <SessionIntelligence trades={trades} />
            </div>
          </div>
        )
      case "performance-metrics":
        return (
          <div className="flex-1 p-4 md:p-8 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-col gap-1 mb-6">
                <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-widest drop-shadow-sm">Engine Telemetry</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-widest">Segmented algorithmic strategy and execution history breakdowns.</p>
              </div>
              <PerformanceView trades={trades} />
            </div>
          </div>
        )
      case "signal-history":
        return (
          <div className="flex-1 p-4 md:p-8 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-col gap-1 mb-6">
                <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-widest drop-shadow-sm">Global Execution Ledger</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-widest">Immutable history of all fired engine signals and resulting outcomes.</p>
              </div>
              <SignalHistoryView trades={trades} />
            </div>
          </div>
        )
      case "economic-calendar":
        return (
          <div className="flex-1 p-4 md:p-8 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-col gap-1 mb-6">
                <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-widest drop-shadow-sm">Economic Calendar</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-widest">Live FXMacroData Institutional Volatility Timeline Alerts.</p>
              </div>
              <EconomicCalendar />
            </div>
          </div>
        )
      default: 
        return <div className="flex-1 p-4 md:p-8 overflow-auto text-muted-foreground text-sm italic font-mono">Section coming soon.</div>
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#030712] via-[#090c11] to-black overflow-hidden font-sans">
      <Sidebar activeItem={activeNavItem} onItemClick={setActiveNavItem} />
      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0 overflow-hidden">
        {renderContent()}
      </div>
      <AddTradeDialog 
        open={isAddTradeOpen}
        onOpenChange={(open: boolean) => { 
          setIsAddTradeOpen(open); 
          if (!open) { setSelectedDate(null); setEditingTrade(null); } 
        }}
        onSubmit={handleSaveTrade}
        initialDate={selectedDate}
        existingTrade={editingTrade}
        trades={trades}
      />
    </div>
  )
}