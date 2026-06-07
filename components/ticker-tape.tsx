"use client"

// Pass D (updated) — added component-level fallback so ticker always shows
// even if /api/ticker is unreachable

import { useState, useEffect } from "react"

interface TickerItem {
  symbol: string; label: string; price: number
  change: number; changePct: number; isPos: boolean
}

// Fallback shown when API is unreachable — realistic prices
const FALLBACK: TickerItem[] = [
  { symbol:"GC=F",     label:"GOLD",    price:3142.50, change:12.30,   changePct: 0.39,  isPos:true  },
  { symbol:"NQ=F",     label:"NQ100",   price:19823,   change:-24.00,  changePct:-0.12,  isPos:false },
  { symbol:"BTC-USD",  label:"BTC",     price:67842,   change:831.00,  changePct: 1.24,  isPos:true  },
  { symbol:"EURUSD=X", label:"EUR/USD", price:1.0892,  change:0.0023,  changePct: 0.21,  isPos:true  },
  { symbol:"GBPUSD=X", label:"GBP/USD", price:1.2734,  change:-0.003,  changePct:-0.24,  isPos:false },
  { symbol:"USDJPY=X", label:"USD/JPY", price:149.52,  change:0.34,    changePct: 0.23,  isPos:true  },
  { symbol:"CL=F",     label:"WTI",     price:78.14,   change:-0.98,   changePct:-1.24,  isPos:false },
  { symbol:"DX-Y.NYB", label:"DXY",     price:104.23,  change:-0.18,   changePct:-0.17,  isPos:false },
  { symbol:"^TNX",     label:"US10Y",   price:4.31,    change:-0.04,   changePct:-0.92,  isPos:false },
  { symbol:"ETH-USD",  label:"ETH",     price:3341,    change:45.00,   changePct: 1.37,  isPos:true  },
]

function formatPrice(label: string, price: number): string {
  if (["EUR/USD","GBP/USD","AUD/USD"].includes(label)) return price.toFixed(4)
  if (["USD/JPY","DXY"].includes(label))               return price.toFixed(2)
  if (label === "US10Y")                               return price.toFixed(2) + "%"
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 })
  return price.toFixed(2)
}

function TickerItemEl({ item }: { item: TickerItem }) {
  const color = item.isPos ? "text-emerald-400"
    : item.changePct === 0 ? "text-muted-foreground" : "text-rose-400"
  return (
    <span className="inline-flex items-center gap-1.5 px-3 flex-shrink-0 select-none">
      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{item.label}</span>
      <span className="text-[10px] font-black font-mono text-foreground">{formatPrice(item.label, item.price)}</span>
      <span className={`text-[9px] font-bold font-mono ${color}`}>
        {item.isPos ? "+" : ""}{item.changePct.toFixed(2)}% {item.isPos ? "▲" : item.changePct === 0 ? "—" : "▼"}
      </span>
      <span className="text-muted-foreground/20 text-[10px] pl-1.5">|</span>
    </span>
  )
}

export function TickerTape() {
  const [items,   setItems]   = useState<TickerItem[]>(FALLBACK)  // start with fallback
  const [source,  setSource]  = useState("demo")
  const [visible, setVisible] = useState(true)

  const fetchTicker = async () => {
    try {
      const res  = await fetch("/api/ticker", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.items?.length) {
        setItems(data.items)
        setSource(data.source ?? "live")
      }
    } catch {
      // Keep existing items (fallback or last good fetch), just mark source
      setSource("demo")
    }
  }

  useEffect(() => {
    fetchTicker()
    const t = setInterval(fetchTicker, 60_000)
    return () => clearInterval(t)
  }, [])

  if (!visible) return null

  const doubled = [...items, ...items]
  const speed   = items.length * 4

  return (
    <>
      <style>{`
        @keyframes phoenix-ticker {
          0%   { transform: translateX(0) }
          100% { transform: translateX(-50%) }
        }
        .phx-ticker {
          animation: phoenix-ticker ${speed}s linear infinite;
          will-change: transform;
        }
        .phx-ticker:hover { animation-play-state: paused; }
      `}</style>

      <div className="hidden md:flex items-center border-b border-border/50 overflow-hidden flex-shrink-0 relative"
        style={{ height: 34, background: "hsl(var(--card)/0.6)", backdropFilter: "blur(8px)" }}>

        {/* LIVE/DEMO badge */}
        <div className="flex items-center gap-2 px-3 border-r border-border/40 flex-shrink-0 h-full bg-background/30">
          <span className="relative flex h-1.5 w-1.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${source === "demo" ? "bg-amber-400" : "bg-primary"}`} />
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${source === "demo" ? "bg-amber-400" : "bg-primary"}`} />
          </span>
          <span className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${source === "demo" ? "text-amber-400" : "text-primary"}`}>
            {source === "demo" ? "DEMO" : "LIVE"}
          </span>
        </div>

        {/* Scrolling strip */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
            style={{ background:"linear-gradient(to right,hsl(var(--card)/0.6),transparent)" }} />
          <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
            style={{ background:"linear-gradient(to left,hsl(var(--card)/0.6),transparent)" }} />
          <div className="phx-ticker flex items-center">
            {doubled.map((item, i) => <TickerItemEl key={`${item.symbol}-${i}`} item={item} />)}
          </div>
        </div>

        {/* Dismiss */}
        <button onClick={() => setVisible(false)} title="Hide ticker"
          className="px-2 h-full text-muted-foreground/30 hover:text-muted-foreground transition-colors text-xs flex-shrink-0 border-l border-border/30">
          ×
        </button>
      </div>
    </>
  )
}
