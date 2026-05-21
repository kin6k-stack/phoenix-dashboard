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
import { AssetMatrix } from "@/components/asset-matrix" 
import { DashboardView } from "@/components/dashboard-view"
import { BotConfiguration } from "@/components/bot-configuration"

interface Trade {
  id: string
  date: string
  symbol: string
  setup: string
  rMultiple: number
  notes: string
  screenshot?: string 
}

export default function TradingDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null) // NEW STATE
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
          notes: data.notes || "No context notes recorded.",
          screenshot: data.screenshot || "" 
        };
      });
      setTrades(liveTrades);
    });
    return () => unsubscribe();
  }, []);

  // When a calendar date is clicked, open dialog for that date
  useEffect(() => {
    if (selectedDate) {
      setEditingTrade(null);
      setIsAddTradeOpen(true);
    }
  }, [selectedDate]);

  // When edit is clicked on a row
  const openEditDialog = (trade: Trade) => {
    setEditingTrade(trade);
    setIsAddTradeOpen(true);
  }

  const handleSaveTrade = async (trade: any) => {
    try {
      if (trade.id) {
        // UPDATE EXISTING TRADE
        await updateDoc(doc(db, "trades", trade.id), {
          symbol: trade.symbol.toUpperCase(),
          profit: Number(trade.rMultiple),
          bot: trade.setup,
          timestamp: new Date(trade.date),
          notes: trade.notes,
          screenshot: trade.screenshot || ""
        });
      } else {
        // ADD NEW TRADE
        await addDoc(collection(db, "trades"), {
          symbol: trade.symbol.toUpperCase(),
          profit: Number(trade.rMultiple), 
          type: "MANUAL",
          bot: trade.setup || "Manual Entry",
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
          <div className="flex flex-1 overflow-hidden h-full w-full">
            <div className="flex-1 p-6 overflow-auto">
              <div className="bg-card rounded-xl border border-border p-6 h-full">
                <TradingCalendar 
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  tradeDates={tradeDates}
                  totalTrades={totalTrades}
                  wins={wins}
                  netPnL={netPnL}
                  winRate={winRate}
                  onMonthYearChange={setCurrentMonthYear}
                />
              </div>
            </div>
            <div className="w-80 border-l border-border p-4 overflow-auto space-y-4 bg-background/50">
              <SlimMonthlyPerformance winRate={winRate} trades={totalTrades} wins={wins} losses={losses} netPnL={netPnL} fees={0} />
              <SlimPnLChart trades={filteredTrades} /> 
              <SlimJournal entriesThisMonth={filteredTrades.length} screenshots={filteredTrades.filter(t => t.screenshot).length} />
              
              {/* Added onEditTrade handler */}
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
          <div className="flex-1 p-6 overflow-auto bg-background">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-black text-foreground uppercase tracking-wider">Session Intelligence HUD</h1>
                <p className="text-xs text-muted-foreground font-medium">Real-time institutional liquidity alignment matrix data feeds.</p>
              </div>
              <SessionIntelligence />
            </div>
          </div>
        )

      case "performance-metrics":
        return (
          <div className="flex-1 p-6 overflow-auto bg-background">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-black text-foreground uppercase tracking-wider">Performance Statistics</h1>
                <p className="text-xs text-muted-foreground font-medium">Segmented algorithmic strategy and execution history breakdowns.</p>
              </div>
              <PerformanceView trades={trades} />
            </div>
          </div>
        )

      case "asset-matrix":
        return (
          <div className="flex-1 p-6 overflow-auto bg-background">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-black text-foreground uppercase tracking-wider">Asset Matrix Terminal</h1>
                <p className="text-xs text-muted-foreground font-medium">Cross-market relationships, macro correlation vectors, and asset weights.</p>
              </div>
              <AssetMatrix trades={trades} />
            </div>
          </div>
        )

      case "economic-calendar":
        return <div className="flex-1 p-6 overflow-auto text-muted-foreground text-sm italic">Economic Calendar stream initializing...</div>
      case "signal-history":
        return <div className="flex-1 p-6 overflow-auto text-muted-foreground text-sm italic">Signal History database pipeline linking...</div>
      case "settings": 
        return <div className="flex-1 p-6 overflow-auto"><BotConfiguration /></div>
      default: 
        return <div className="flex-1 p-6 overflow-auto text-muted-foreground text-sm italic">Section coming soon.</div>
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar activeItem={activeNavItem} onItemClick={setActiveNavItem} />
      {renderContent()}
      
      <AddTradeDialog 
        open={isAddTradeOpen}
        onOpenChange={(open) => { 
          setIsAddTradeOpen(open); 
          if (!open) { setSelectedDate(null); setEditingTrade(null); } 
        }}
        onSubmit={handleSaveTrade}
        initialDate={selectedDate}
        existingTrade={editingTrade}
      />
    </div>
  )
}