"use client"

import { Calendar, LayoutDashboard, Clock, Settings, Shield, TrendingUp, Globe, History } from "lucide-react"

interface SidebarProps {
  activeItem: string
  onItemClick: (item: string) => void
}

export function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", name: "Executive Overview", icon: LayoutDashboard },
    { id: "pnl-calendar", name: "P&L Calendar", icon: Calendar },
    { id: "session-intelligence", name: "Session Intelligence", icon: Clock },
    { id: "performance-metrics", name: "Performance", icon: TrendingUp },      
    { id: "signal-history", name: "Signal History", icon: History },          
    { id: "economic-calendar", name: "Economic Calendar", icon: Globe },       
    { id: "settings", name: "Bot Configurations", icon: Settings }
  ]

  return (
    <div className="w-64 h-full bg-card/40 backdrop-blur-xl border-r border-border/40 flex flex-col justify-between p-4 flex-shrink-0 z-10">
      <div className="space-y-6">
        
        {/* Core Project Banner */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 border-b border-border/40 pb-4">
          <Shield className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          <span className="text-sm font-black uppercase tracking-widest text-foreground">
            Phoenix <span className="text-primary font-medium text-xs drop-shadow-sm">Command</span>
          </span>
        </div>

        {/* Sidebar Nav links */}
        <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] custom-scrollbar pr-1">
          {menuItems.map((item) => {
            const IconComponent = item.icon
            const isSelected = activeItem === item.id

            return (
              <button
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all rounded-lg
                  ${isSelected 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                  }
                `}
              >
                <IconComponent className={`h-4 w-4 transition-colors ${isSelected ? "text-primary drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" : "text-muted-foreground"}`} />
                <span>{item.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Account Terminal Feed Card Node */}
      <div className="p-3 bg-background/40 border border-border/40 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.2)] backdrop-blur-md">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
          <span>Broker Terminal</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
        </div>
        <p className="text-xs font-black text-foreground mt-1 tracking-tight font-mono">Exness MT5 Real</p>
      </div>
    </div>
  )
}