"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import { db } from "../lib/firebase" 
import { Sidebar } from "@/components/sidebar"
import { TradingCalendar } from "@/components/trading-calendar"
import { ManualTradesCard } from "@/components/manual-trades-card"
import { AddTradeDialog } from "@/components/add-trade-dialog"
import { SessionIntelligence } from "@/components/session-intelligence"
import { PerformanceView } from "@/components/performance-view"
import { DashboardView } from "@/components/dashboard-view"
import { BotConfiguration } from "@/components/bot-configuration"
import { SignalHistoryView } from "@/components/signal-history" 

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
      setIsAddTradeOpen(true);
    }
  }, [selectedDate]);

  const handleSaveTrade = async (trade: any) => {
    try {
      if (trade.id) {
        await updateDoc(doc(db, "trades", trade.id), {
          symbol: trade.symbol.toUpperCase(),
          profit: Number(trade.rMultiple),
          bot: trade.setup,
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
    try { await deleteDoc(doc(db, "trades", id)); } catch (error) { console.error(error); }
  }

  const filteredTrades = trades.filter(t => {
    const tradeDateObj = new Date(t.date);
    return tradeDateObj.getMonth() === currentMonthYear.month && tradeDateObj.getFullYear() === currentMonthYear.year;
  });

  const renderContent = () => {
    switch (activeNavItem) {
      case "dashboard": return <DashboardView trades={trades} />
      case "pnl-calendar": return (
        <div className="flex flex-col lg:flex-row h-full gap-4 md:gap-6 p-4 md:p-6 lg:p-8 overflow-y-auto lg:overflow-hidden">
            <div className="flex-1 min-h-[400px] lg:min-h-0">
              <div className="glass-card p-4 md:p-6 h-full shadow-lg overflow-y-auto">
                <TradingCalendar 
                  selectedDate={selectedDate} 
                  onDateSelect={setSelectedDate} 
                  tradeDates={trades.map(t=>new Date(t.date))} 
                  totalTrades={filteredTrades.length} 
                  wins={filteredTrades.filter(t=>t.rMultiple>0).length} 
                  netPnL={filteredTrades.reduce((sum, t)=>sum+t.rMultiple, 0)} 
                  winRate={filteredTrades.length > 0 ? Math.round((filteredTrades.filter(t=>t.rMultiple>0).length/filteredTrades.length)*100) : 0} 
                  onMonthYearChange={setCurrentMonthYear} 
                />
              </div>
            </div>
            <div className="w-full lg:w-80 h-[400px] lg:h-auto shrink-0">
              <ManualTradesCard 
                trades={filteredTrades} 
                onAddTrade={() => { setEditingTrade(null); setIsAddTradeOpen(true); }} 
                onEditTrade={(t) => { setEditingTrade(t); setIsAddTradeOpen(true); }} 
                onDeleteTrade={handleDeleteTrade} 
              />
            </div>
        </div>
      )
      case "session-intelligence": return <div className="p-4 md:p-6 lg:p-8"><SessionIntelligence trades={trades} /></div>
      case "performance-metrics": return <div className="p-4 md:p-6 lg:p-8"><PerformanceView trades={trades} /></div>
      case "signal-history": return <div className="p-4 md:p-6 lg:p-8"><SignalHistoryView trades={trades} /></div>
      case "settings": return <div className="p-4 md:p-6 lg:p-8"><BotConfiguration /></div>
      default: return <div className="p-4 md:p-6 lg