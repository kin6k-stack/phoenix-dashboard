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
  ticket?: string
  botName?: string
  status?: 'OPENED' | 'CLOSED'
  netProfit?: number
  openSide?: number
  openTimestamp?: string
  closedTimestamp?: string
  updatedAt?: string
}

export default function TradingDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [activeNavItem, setActiveNavItem] = useState("dashboard")

  // Safe Real-time onSnapshot Synchronization Pipeline
  useEffect(() => {
    const tradesQuery = query(collection(db, "trades"), orderBy("updatedAt", "desc"));
    
    const unsubscribe = onSnapshot(tradesQuery, (snapshot) => {
      const parsedTrades = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.date || (data.openTimestamp ? data.openTimestamp.split(' ')[0] : new Date().toISOString().split('T')[0]),
          symbol: data.symbol || "",
          setup: data.setup || data.botName || "Manual Execution",
          rMultiple: Number(data.rMultiple || 0),
          direction: data.direction || (data.openSide === 0 ? "BUY" : "SELL"),
          notes: data.notes || "",
          ...data
        } as Trade;
      });
      
      setTrades(parsedTrades);
    }, (error) => {
      console.error("🛑 Live terminal synchronization failed:", error);
    });

    return () => unsubscribe();
  }, []);

  // CRUD Operations Handlers
  const handleAddTrade = async (tradeData: Omit<Trade, "id">) => {
    try {
      await addDoc(collection(db, "trades"), {
        ...tradeData,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error adding trade: ", error)
    }
  }

  const handleUpdateTrade = async (id: string, tradeData: Partial<Trade>) => {
    try {
      const tradeRef = doc(db, "trades", id)
      await updateDoc(tradeRef, {
        ...tradeData,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error updating trade: ", error)
    }
  }

  const handleDeleteTrade = async (id: string) => {
    try {
      const tradeRef = doc(db, "trades", id)
      await deleteDoc(tradeRef)
    } catch (error) {
      console.error("Error deleting trade: ", error)
    }
  }

  const renderContent = () => {
    switch (activeNavItem) {
      case "dashboard":
        return <DashboardView trades={trades} />
        
      case "performance":
        return <PerformanceView trades={trades} />
        
      case "pnl-calendar":
        return (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-w-0">
            {/* Left Focus: Main Calendar Window Component Layer */}
            <div className="flex-1 p-4 md:p-8 overflow-auto border-r border-neutral-900 bg-black/20">
              <TradingCalendar trades={trades} onDateSelect={setSelectedDate} />
            </div>
            {/* Right Focus: Floating Side analytics wrapper framework block */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 border-neutral-900 p-4 md:p-6 bg-black/40 overflow-auto space-y-4">
              <SlimMonthlyPerformance trades={trades} />
              <SlimPnLChart trades={trades} />
              <SlimJournal trades={trades} />
              <ManualTradesCard 
                trades={trades} 
                selectedDate={selectedDate} 
                onAddTrade={() => setIsAddTradeOpen(true)}
                onEditTrade={(trade) => {
                  setEditingTrade(trade);
                  setIsAddTradeOpen(true);
                }}
                onDeleteTrade={handleDeleteTrade}
              />
            </div>
          </div>
        )
        
      case "session-intel":
        return (
          <div className="flex-1 p-4 md:p-8 overflow-auto">
            <SessionIntelligence trades={trades} />
          </div>
        )
        
      case "signals":
        return <SignalHistoryView trades={trades} />
        
      case "macro-calendar":
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
        selectedDate={selectedDate}
        editingTrade={editingTrade}
        onSave={editingTrade ? (data) => handleUpdateTrade(editingTrade.id, data) : handleAddTrade}
      />
    </div>
  )
}