"use client"

// Updated: localStorage persistence for visible state + restore pill when hidden

import { useState, useEffect } from "react"

interface TickerItem {
  symbol: string; label: string; price: number
  change: number; changePct: number; isPos: boolean
}

// Neutral placeholder until the first /api/ticker response arrives.
// price 0 renders as "—"; the badge shows the true source from the API.
const FALLBACK: TickerItem[] = [
  { symbol:"OANDA:XAU_USD",   label:"GOLD",    price:0, change:0, changePct:0, isPos:true },
  { symbol:"BINANCE:BTCUSDT", label:"BTC",     price:0, change:0, changePct:0, isPos:true },
  { symbol:"BINANCE:ETHUSDT", label:"ETH",     price:0, change:0, changePct:0, isPos:true },
  { symbol:"OANDA:EUR_USD",   label:"EUR/USD", price:0, change:0, changePct:0, isPos:true },
  { symbol:"OANDA:GBP_USD",   label:"GBP/USD", price:0, change:0, changePct:0, isPos:true },
  { symbol:"OANDA:USD_JPY",   label:"USD/JPY", price:0, change:0, changePct:0, isPos:true },
]

const VISIBLE_KEY = "phx_ticker_visible"

// Map API source → badge appearance.
// green LIVE: fresh Finnhub data (or warm cache of it)
// amber STALE: serving last-good saved values, or only some symbols live
// amber DEMO: no data ever fetched yet
function badgeFor(source: string): { text: string; stale: boolean } {
  if (source === "finnhub" || source === "cache")      return { text: "LIVE",  stale: false }
  if (source === "finnhub-partial")                    return { text: "LIVE*", stale: true  }
  if (source === "last-good")                          return { text: "STALE", stale: true  }
  return { text: "DEMO", stale: true }   // mock / demo / unknown
}

function formatPrice(label: string, price: number): string {
  if (!price || price === 0) return "—"   // no data yet / fetch failed
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
  const [items,   setItems]   = useState<TickerItem[]>(FALLBACK)
  const [source,  setSource]  = useState("demo")
  // Persist visibility in localStorage so refresh/reopen respects user preference
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem(VISIBLE_KEY) !== "false"
  })

  const hide = () => {
    setVisible(false)
    localStorage.setItem(VISIBLE_KEY, "false")
  }
  const show = () => {
    setVisible(true)
    localStorage.setItem(VISIBLE_KEY, "true")
  }

  const fetchTicker = async () => {
    try {
      const res  = await fetch("/api/ticker", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.items?.length) { setItems(data.items); setSource(data.source ?? "live") }
    } catch { setSource("demo") }
  }

  useEffect(() => {
    fetchTicker()
    const t = setInterval(fetchTicker, 45 * 60_000)  // 45 min
    return () => clearInterval(t)
  }, [])

  const doubled = [...items, ...items]
  const speed   = items.length * 4

  // When hidden → show a slim restore pill at the top
  if (!visible) {
    return (
      <div className="hidden md:flex items-center justify-end border-b border-border/30 flex-shrink-0"
        style={{ height: 22, background: "hsl(var(--background))" }}>
        <button onClick={show}
          className="flex items-center gap-1.5 px-3 h-full text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-all border-l border-border/20">
          <span className="relative flex h-1 w-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
            <span className="relative inline-flex rounded-full h-1 w-1 bg-primary/50" />
          </span>
          TICKER
        </button>
      </div>
    )
  }

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

        {/* LIVE / STALE / DEMO badge — reflects real API source */}
        <div className="flex items-center gap-2 px-3 border-r border-border/40 flex-shrink-0 h-full bg-background/30">
          <span className="relative flex h-1.5 w-1.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${badgeFor(source).stale ? "bg-amber-400" : "bg-primary"}`} />
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${badgeFor(source).stale ? "bg-amber-400" : "bg-primary"}`} />
          </span>
          <span className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${badgeFor(source).stale ? "text-amber-400" : "text-primary"}`}>
            {badgeFor(source).text}
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
        <button onClick={hide} title="Hide ticker (click TICKER to restore)"
          className="px-2 h-full text-muted-foreground/30 hover:text-muted-foreground transition-colors text-xs flex-shrink-0 border-l border-border/30">
          ×
        </button>
      </div>
    </>
  )
}
