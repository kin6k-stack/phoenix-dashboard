"use client"

import { useState, useEffect } from "react"
import { Clock, Circle, Wifi } from "lucide-react"
import { cn } from "@/lib/utils"

interface EconomicEvent {
  id: string
  time: string
  name: string
  impact: "HIGH" | "MED" | "LOW"
  forecast: string | null
  previous: string | null
  actual: string | null
  goldImpact: "BULLISH" | "BEARISH" | "NEUTRAL"
  usdImpact: "BULLISH" | "BEARISH" | "NEUTRAL"
  goldAnalysis: string
  usdAnalysis: string
  tradeRecommendation: string
  date: Date
  countdownMs: number
}

// Sample economic calendar data - In production, this would come from an API
const generateSampleEvents = (): EconomicEvent[] => {
  const now = new Date()
  const events: EconomicEvent[] = [
    {
      id: "1",
      time: "22:00",
      name: "CB Consumer Confidence",
      impact: "MED",
      forecast: null,
      previous: null,
      actual: null,
      goldImpact: "NEUTRAL",
      usdImpact: "NEUTRAL",
      goldAnalysis: "Retail Sales is the pulse of consumer spending, the largest component of U.S. GDP. A beat above forecast reduces rate-cut urgency and pressures Gold; a miss raises recession fears and lifts safe-haven demand for Gold.",
      usdAnalysis: "Consumer spending accounts for roughly 70% of U.S. GDP. A stronger-than-expected print reduces rate-cut urgency and lifts the Dollar; a miss accelerates cut bets and drives USD lower across the board.",
      tradeRecommendation: "Trade the deviation: beat = sell Gold, buy USD. Miss = buy Gold on risk-off. In-line = minimal reaction, wait for next major catalyst.",
      date: new Date(now.getTime() + 111 * 60 * 60 * 1000),
      countdownMs: 111 * 60 * 60 * 1000 + 54 * 60 * 1000,
    },
    {
      id: "2",
      time: "22:00",
      name: "JOLTS Job Openings",
      impact: "HIGH",
      forecast: null,
      previous: null,
      actual: null,
      goldImpact: "NEUTRAL",
      usdImpact: "NEUTRAL",
      goldAnalysis: "Monitor for USD-moving surprise. Weak USD data = bullish gold. Strong USD data = bearish gold.",
      usdAnalysis: "Watch actual vs forecast deviation for direction.",
      tradeRecommendation: "Trade only on significant deviation from forecast. Bigger surprise = bigger opportunity.",
      date: new Date(now.getTime() + 111 * 60 * 60 * 1000),
      countdownMs: 111 * 60 * 60 * 1000 + 54 * 60 * 1000,
    },
    {
      id: "3",
      time: "20:30",
      name: "Core PCE Price Index m/m",
      impact: "HIGH",
      forecast: "0.2%",
      previous: "0.3%",
      actual: null,
      goldImpact: "BULLISH",
      usdImpact: "BEARISH",
      goldAnalysis: "The Fed's preferred inflation gauge. A cooling print supports rate cuts, weakening USD and boosting Gold. Hot data delays cuts and pressures Gold lower.",
      usdAnalysis: "Core PCE directly influences Fed policy. Lower inflation = dovish Fed = weaker USD. Higher inflation = hawkish Fed = stronger USD.",
      tradeRecommendation: "High conviction trade: Below forecast = long Gold, short USD. Above forecast = short Gold, long USD.",
      date: new Date(now.getTime() + 87 * 60 * 60 * 1000),
      countdownMs: 87 * 60 * 60 * 1000 + 30 * 60 * 1000,
    },
    {
      id: "4",
      time: "20:30",
      name: "Initial Jobless Claims",
      impact: "MED",
      forecast: "220K",
      previous: "215K",
      actual: null,
      goldImpact: "NEUTRAL",
      usdImpact: "NEUTRAL",
      goldAnalysis: "Weekly labor data. Rising claims signal labor market weakness, supporting Gold. Falling claims show strength, pressuring Gold.",
      usdAnalysis: "Higher claims = weaker USD as Fed cut expectations rise. Lower claims = stronger USD.",
      tradeRecommendation: "React to significant deviation from forecast (>20K). Minor beats/misses usually absorbed quickly.",
      date: new Date(now.getTime() + 63 * 60 * 60 * 1000),
      countdownMs: 63 * 60 * 60 * 1000 + 15 * 60 * 1000,
    },
    {
      id: "5",
      time: "22:00",
      name: "ISM Manufacturing PMI",
      impact: "HIGH",
      forecast: "48.5",
      previous: "47.8",
      actual: null,
      goldImpact: "BEARISH",
      usdImpact: "BULLISH",
      goldAnalysis: "Manufacturing expansion signals economic strength, reducing safe-haven demand for Gold. Contraction supports Gold.",
      usdAnalysis: "Above 50 = expansion = stronger USD. Below 50 = contraction = weaker USD. Direction of change also matters.",
      tradeRecommendation: "Focus on the 50 threshold and direction. Beat above 50 = strong USD, weak Gold. Miss below 50 = weak USD, strong Gold.",
      date: new Date(now.getTime() + 135 * 60 * 60 * 1000),
      countdownMs: 135 * 60 * 60 * 1000 + 45 * 60 * 1000,
    },
    {
      id: "6",
      time: "20:30",
      name: "Non-Farm Payrolls",
      impact: "HIGH",
      forecast: "180K",
      previous: "175K",
      actual: null,
      goldImpact: "BEARISH",
      usdImpact: "BULLISH",
      goldAnalysis: "The king of economic data. Strong jobs = Fed stays hawkish = Gold sells off. Weak jobs = dovish pivot = Gold rallies.",
      usdAnalysis: "Strong NFP = USD strength as rate cut expectations pushed back. Weak NFP = USD weakness as cuts priced in.",
      tradeRecommendation: "Wait for initial spike to settle (2-3 min), then trade the trend. NFP often sees reversals after knee-jerk reactions.",
      date: new Date(now.getTime() + 159 * 60 * 60 * 1000),
      countdownMs: 159 * 60 * 60 * 1000 + 20 * 60 * 1000,
    },
    {
      id: "7",
      time: "20:30",
      name: "Unemployment Rate",
      impact: "HIGH",
      forecast: "3.9%",
      previous: "3.8%",
      actual: null,
      goldImpact: "BULLISH",
      usdImpact: "BEARISH",
      goldAnalysis: "Rising unemployment supports Gold as it signals economic weakness and potential Fed easing.",
      usdAnalysis: "Higher unemployment = weaker USD. Lower unemployment = stronger USD.",
      tradeRecommendation: "Trade alongside NFP. Divergence between NFP and unemployment rate can cause choppy price action.",
      date: new Date(now.getTime() + 159 * 60 * 60 * 1000),
      countdownMs: 159 * 60 * 60 * 1000 + 20 * 60 * 1000,
    },
    {
      id: "8",
      time: "02:00",
      name: "FOMC Meeting Minutes",
      impact: "HIGH",
      forecast: null,
      previous: null,
      actual: null,
      goldImpact: "NEUTRAL",
      usdImpact: "NEUTRAL",
      goldAnalysis: "Look for any hints on rate path. Dovish language = Gold bullish. Hawkish language = Gold bearish.",
      usdAnalysis: "Minutes can shift rate expectations. Dovish = USD weakness. Hawkish = USD strength.",
      tradeRecommendation: "Parse for key phrases: 'patient', 'data-dependent', 'restrictive'. Wait for market interpretation before trading.",
      date: new Date(now.getTime() + 183 * 60 * 60 * 1000),
      countdownMs: 183 * 60 * 60 * 1000 + 10 * 60 * 1000,
    },
    {
      id: "9",
      time: "20:30",
      name: "CPI m/m",
      impact: "HIGH",
      forecast: "0.3%",
      previous: "0.4%",
      actual: null,
      goldImpact: "BULLISH",
      usdImpact: "BEARISH",
      goldAnalysis: "Cooling inflation = Fed pivot = Gold rally. Hot inflation = hawkish Fed = Gold selloff.",
      usdAnalysis: "Lower CPI = dovish Fed = weaker USD. Higher CPI = hawkish Fed = stronger USD.",
      tradeRecommendation: "One of the highest-impact releases. Trade with conviction on clear deviation. Wait for dust to settle on mixed data.",
      date: new Date(now.getTime() + 207 * 60 * 60 * 1000),
      countdownMs: 207 * 60 * 60 * 1000 + 45 * 60 * 1000,
    },
  ]
  return events
}

const formatCountdown = (ms: number): string => {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

const getDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

export function EconomicCalendarView() {
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [activeFilter, setActiveFilter] = useState("all")
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set(["1", "2"]))

  useEffect(() => {
    setEvents(generateSampleEvents())
  }, [])

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const key = getDateKey(event.date)
    if (!acc[key]) acc[key] = []
    acc[key].push(event)
    return acc
  }, {} as Record<string, EconomicEvent[]>)

  // Generate date filters
  const today = new Date()
  const dateFilters = [
    { id: "all", label: "ALL", count: events.length },
    ...Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const key = getDateKey(date)
      const count = eventsByDate[key]?.length || 0
      const isToday = i === 0
      const label = isToday ? "TODAY" : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
      return { id: key, label, count, hasEvents: count > 0 }
    })
  ]

  // Filter events
  const filteredEvents = activeFilter === "all" 
    ? events 
    : events.filter(e => getDateKey(e.date) === activeFilter)

  const toggleEvent = (id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Economic Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            High-impact USD events only — auto-analyzed for Gold & USD impact
          </p>
        </div>
        <div className="flex items-center gap-2 text-emerald-500 border border-emerald-500/30 rounded-full px-3 py-1">
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">LIVE</span>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {dateFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
              activeFilter === filter.id
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            )}
          >
            {filter.label}
            {filter.count > 0 && (
              <>
                {'hasEvents' in filter && filter.hasEvents && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
                <span className="text-xs opacity-70">({filter.count})</span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Upcoming Events */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">Upcoming</span>
          </div>
          <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
            {filteredEvents.length}
          </span>
        </div>

        <div className="divide-y divide-border">
          {filteredEvents.map((event) => (
            <div key={event.id} className="p-4">
              {/* Event Header */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleEvent(event.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{event.time}</span>
                    <span className="text-xs">PHT</span>
                  </div>
                  <span className="font-semibold text-foreground">{event.name}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-emerald-500 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{formatCountdown(event.countdownMs)}</span>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded font-medium",
                    event.impact === "HIGH" && "bg-red-500/20 text-red-400",
                    event.impact === "MED" && "bg-amber-500/20 text-amber-400",
                    event.impact === "LOW" && "bg-blue-500/20 text-blue-400"
                  )}>
                    {event.impact}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    F: {event.forecast || "–"} | P: {event.previous || "–"}
                  </span>
                </div>
              </div>

              {/* Impact Badges */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded border",
                    event.goldImpact === "BULLISH" && "border-emerald-500/30 text-emerald-500",
                    event.goldImpact === "BEARISH" && "border-red-500/30 text-red-500",
                    event.goldImpact === "NEUTRAL" && "border-border text-muted-foreground"
                  )}>
                    {event.goldImpact === "NEUTRAL" ? "–" : event.goldImpact === "BULLISH" ? "↑" : "↓"} GOLD {event.goldImpact}
                  </span>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded border",
                    event.usdImpact === "BULLISH" && "border-emerald-500/30 text-emerald-500",
                    event.usdImpact === "BEARISH" && "border-red-500/30 text-red-500",
                    event.usdImpact === "NEUTRAL" && "border-border text-muted-foreground"
                  )}>
                    {event.usdImpact === "NEUTRAL" ? "–" : event.usdImpact === "BULLISH" ? "↑" : "↓"} USD {event.usdImpact}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
                  <span>XAUUSD</span>
                  <span>DXY</span>
                  <span>EURUSD</span>
                </div>
              </div>

              {/* Expanded Analysis */}
              {expandedEvents.has(event.id) && (
                <div className="mt-4 space-y-3">
                  {/* Gold Analysis */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Circle className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-semibold text-amber-500">GOLD ANALYSIS</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-5">
                      {event.goldAnalysis}
                    </p>
                  </div>

                  {/* USD Analysis */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Circle className="h-3 w-3 text-slate-400 fill-slate-400/20" />
                      <span className="text-xs font-semibold text-slate-400">USD ANALYSIS</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-5">
                      {event.usdAnalysis}
                    </p>
                  </div>

                  {/* Trade Recommendation */}
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mt-3">
                    <p className="text-sm text-blue-400">
                      {event.tradeRecommendation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
