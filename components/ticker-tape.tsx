"use client"

// ─────────────────────────────────────────────────────────────────────────────
// Pass D — Ticker Tape
//
// Continuous Bloomberg-style price ticker at the top of the content area.
// CSS keyframe animation: items scroll left seamlessly (content duplicated
// to create an infinite loop — no JS required for the movement).
//
// Assets: GOLD · NQ100 · BTC · EUR/USD · GBP/USD · USD/JPY
//         WTI · DXY · US10Y · ETH
//
// Data:   GET /api/ticker — Yahoo Finance proxy, 60s cache, mock fallback
// Refresh: every 60 seconds (matches server cache TTL)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react"
import type { TickerItem } from "@/app/api/ticker/route"

// ── Price formatting helpers ──────────────────────────────────────────────

function formatPrice(label: string, price: number): string {
  // Forex pairs — 4 decimal places
  if (["EUR/USD","GBP/USD","AUD/USD"].includes(label)) return price.toFixed(4)
  // USD/JPY, DXY — 2 decimal places
  if (["USD/JPY","DXY"].includes(label)) return price.toFixed(2)
  // Yields (US10Y) — 2 decimal places
  if (label === "US10Y") return price.toFixed(2) + "%"
  // Crypto and indices — no decimals for large numbers
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 })
  return price.toFixed(2)
}

function formatChange(label: string, changePct: number): string {
  return `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`
}

// ── Single ticker item ────────────────────────────────────────────────────

function TickerItem({ item }: { item: TickerItem }) {
  const color = item.isPos
    ? "text-emerald-400"
    : item.changePct === 0 ? "text-muted-foreground" : "text-rose-400"

  return (
    <span className="inline-flex items-center gap-1.5 px-3 flex-shrink-0 select-none">
      {/* Label */}
      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        {item.label}
      </span>
      {/* Price */}
      <span className="text-[10px] font-black font-mono text-foreground">
        {formatPrice(item.label, item.price)}
      </span>
      {/* Change */}
      <span className={`text-[9px] font-bold font-mono ${color}`}>
        {formatChange(item.label, item.changePct)}
        {" "}{item.isPos ? "▲" : item.changePct === 0 ? "—" : "▼"}
      </span>
      {/* Separator */}
      <span className="text-muted-foreground/20 text-[10px] pl-1.5">|</span>
    </span>
  )
}

// ── Main export ───────────────────────────────────────────────────────────

export function TickerTape() {
  const [items,   setItems]   = useState<TickerItem[]>([])
  const [source,  setSource]  = useState<string>("loading")
  const [visible, setVisible] = useState(true)
  const animRef = useRef<Animation | null>(null)

  const fetchTicker = async () => {
    try {
      const res  = await fetch("/api/ticker", { cache: "no-store" })
      const data = await res.json()
      if (data.items?.length) {
        setItems(data.items)
        setSource(data.source ?? "live")
      }
    } catch {
      setSource("error")
    }
  }

  useEffect(() => {
    fetchTicker()
    const t = setInterval(fetchTicker, 60_000)
    return () => clearInterval(t)
  }, [])

  if (!visible || items.length === 0) return null

  // Duplicate items for seamless loop
  const doubled = [...items, ...items]

  return (
    <>
      {/* Inject keyframe animation once */}
      <style>{`
        @keyframes phoenix-ticker {
          0%   { transform: translateX(0) }
          100% { transform: translateX(-50%) }
        }
        .phoenix-ticker-inner {
          animation: phoenix-ticker ${items.length * 4}s linear infinite;
          will-change: transform;
        }
        .phoenix-ticker-inner:hover { animation-play-state: paused; }
      `}</style>

      <div
        className="hidden md:flex items-center border-b border-border/50 overflow-hidden flex-shrink-0 relative"
        style={{ height: 34, background: "hsl(var(--card)/0.6)", backdropFilter: "blur(8px)" }}
      >
        {/* Left: LIVE indicator + source badge */}
        <div className="flex items-center gap-2 px-3 border-r border-border/40 flex-shrink-0 h-full bg-background/30">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-primary whitespace-nowrap">
            {source === "mock" ? "DEMO" : "LIVE"}
          </span>
        </div>

        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden relative">
          {/* Fade masks on edges */}
          <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, hsl(var(--card)/0.6), transparent)" }} />
          <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left, hsl(var(--card)/0.6), transparent)" }} />

          <div className="phoenix-ticker-inner flex items-center">
            {doubled.map((item, i) => (
              <TickerItem key={`${item.symbol}-${i}`} item={item} />
            ))}
          </div>
        </div>

        {/* Right: close button */}
        <button
          onClick={() => setVisible(false)}
          title="Hide ticker"
          className="px-2 h-full text-muted-foreground/30 hover:text-muted-foreground transition-colors text-xs flex-shrink-0 border-l border-border/30">
          ×
        </button>
      </div>
    </>
  )
}
