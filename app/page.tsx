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
          /* Responsive Layout Flex direction switches on lg break-points to handle vertical screen layouts */
          <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden h-full w-full">
            <div className="flex-1 p-4 md:p-8 overflow-visible lg:overflow-auto">
              <div className="bg-card/40 backdrop-blur-md rounded-xl border border-border/40 p-4 md:p-6 h-full shadow-[0_0_20px_rgba(0,0,0,0.15)]">
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
            {/* Sidebar utility panel adjusts from fixed-width side layout into dynamic full-width block below main component */}
            <div className