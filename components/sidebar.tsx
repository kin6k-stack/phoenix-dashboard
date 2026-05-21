"use client"

import { useState } from "react"
import { Calendar, LayoutDashboard, Clock, Settings, Shield, TrendingUp, History, Globe, Menu } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

interface SidebarProps {
  activeItem: string
  onItemClick: (item: string) => void
}

export function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const [connectionState] = useState<"ok" | "issue" | "offline">("ok")
  const [mobileOpen, setMobileOpen] = useState(false)

  const statusConfig = {
    ok: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse",
    issue: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
    offline: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
  }

  const menuItems = [
    { id: "dashboard", name: "Executive Overview", icon: LayoutDashboard },
    { id: "pnl-calendar", name: "P&L Calendar", icon: Calendar },
    { id: "session-intelligence", name: "Session Intelligence", icon: Clock },
    { id: "performance-metrics", name: "Performance", icon: TrendingUp },      
    { id: "signal-history", name: "Signal History", icon: History },          
    { id: "economic-calendar", name: "Economic Calendar", icon: Globe },       
    { id: "settings", name: "Bot Configurations", icon: Settings }
  ]

  const NavigationContent = () => (
    <div className="flex flex-col justify-between h-full p-4 bg-slate-950/60 md:bg-transparent text-foreground">
      <div className="space-y-6">
        <div className="flex items-center gap-2.5 px-2 py-1.5 border-b border-border/40 pb-4">
          <Shield className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          <span className="text-sm font-black uppercase tracking-widest text-foreground">
            Phoenix <span className="text-primary font-medium text-xs drop-shadow-sm">Command</span>
          </span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const IconComponent = item.icon
            const isSelected = activeItem === item.id
            return (
              <button 
                key={item.id} 
                onClick={() => {
                  onItemClick(item.id)
                  setMobileOpen(false) // Automatically close trigger menu on mobile interaction
                }} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all rounded-lg ${isSelected ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}
              >
                <IconComponent className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <span>{item.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="p-4 bg-background/40 border border-border/40 rounded-xl shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
          <span>Broker Terminal</span>
          <span className={`w-2 h-2 rounded-full ${statusConfig[connectionState]}`} />
        </div>
        <p className="text-xs font-black text-foreground tracking-tight font-mono">Exness MT5 Real</p>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Top Navbar Trigger HUD */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card/60 backdrop-blur-md border-b border-border/40 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-black uppercase tracking-widest text-foreground">Phoenix Cmd</span>
        </div>
        
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="p-2 text-muted-foreground hover:text-foreground rounded-md border border-border/40 bg-background/50">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-background border-r border-border/30">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Command Menu</SheetTitle>
              <SheetDescription>Access real-time intelligence feeds, bots configurations and execution performance metrics.</SheetDescription>
            </SheetHeader>
            <NavigationContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Persistent Sidebar Display */}
      <div className="hidden md:flex w-64 h-full bg-card/40 backdrop-blur-xl border-r border-border/40 flex-col justify-between p-0 flex-shrink-0 z-10">
        <NavigationContent />
      </div>
    </>
  )
}