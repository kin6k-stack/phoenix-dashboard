// ============================================================
// /api/agents/market-intelligence (POST)
// Pass C — Unified Market Intelligence Feed
//
// Returns 4 sections powered by Claude:
//   1. Economic Events — high-impact macro events this week
//   2. Market Catalysts — current key market drivers
//   3. Policy Monitor — geopolitical / central bank impacts
//   4. High-Signal News — market-moving headlines
//
// Cache: 15 minutes (news moves faster than correlations)
// Fallback: realistic mock data when ANTHROPIC_API_KEY absent
// ============================================================

import { NextRequest, NextResponse } from "next/server"

const CACHE_TTL_MS = 15 * 60 * 1000

interface CacheEntry { data: IntelResult; expiresAt: number }
let _cache: CacheEntry | null = null

function getCached(): IntelResult | null {
  if (_cache && Date.now() < _cache.expiresAt) return _cache.data
  return null
}
function setCache(d: IntelResult) {
  _cache = { data: d, expiresAt: Date.now() + CACHE_TTL_MS }
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface IntelItem {
  id:        string
  category:  "events" | "catalysts" | "policy" | "news"
  headline:  string
  detail:    string
  sentiment: "bullish" | "bearish" | "neutral"
  priority:  "high" | "medium" | "low"
  time:      string
  tags:      string[]
  impact:    string
}

export interface IntelResult {
  items:     IntelItem[]
  counts: { events: number; catalysts: number; policy: number; news: number }
  timestamp: string
  cached:    boolean
  _debug?:   { mode: string; error?: string; model?: string }
}

// ── Mock ──────────────────────────────────────────────────────────────────

const MOCK: IntelResult = {
  items: [
    { id:"e1", category:"events",   headline:"FOMC Meeting Minutes",              detail:"Federal Reserve releases minutes from the last policy meeting — key for forward guidance on rate trajectory and balance sheet.",   sentiment:"bearish",  priority:"high",   time:"Wed 14:00 ET", tags:["USD","Gold","Rate"],      impact:"High impact on XAU/USD — hawkish tone pressures gold" },
    { id:"e2", category:"events",   headline:"US Non-Farm Payrolls",               detail:"Monthly employment report — headline jobs number and unemployment rate will set near-term Fed narrative.",                          sentiment:"neutral",  priority:"high",   time:"Fri 08:30 ET", tags:["USD","NFP","Rate"],       impact:"Binary risk event — watch USD/Gold reaction" },
    { id:"e3", category:"events",   headline:"US Core CPI (YoY)",                  detail:"Inflation print — core CPI excluding food and energy. Key for real yield trajectory and gold direction.",                            sentiment:"bearish",  priority:"high",   time:"Thu 08:30 ET", tags:["USD","Gold","Inflation"], impact:"Above-consensus print pressures gold via real yields" },
    { id:"c1", category:"catalysts",headline:"Gold Supply Squeeze at COMEX",       detail:"Physical delivery demand at COMEX creating a structural tightness. Spot-futures basis widening signals real buying pressure.",       sentiment:"bullish",  priority:"high",   time:"Ongoing",      tags:["Gold","COMEX","Supply"],  impact:"Direct bullish catalyst for XAU/USD" },
    { id:"c2", category:"catalysts",headline:"Central Bank Accumulation Continues", detail:"Multiple central banks increasing gold reserves — China, India, Poland. Structural bid under the market.",                          sentiment:"bullish",  priority:"medium", time:"This week",    tags:["Gold","CB","Demand"],     impact:"Long-term structural support for gold prices" },
    { id:"c3", category:"catalysts",headline:"NQ Tech Earnings Season",            detail:"Mega-cap tech earnings this week. Results will drive NDX direction — strong beats could restore risk appetite.",                     sentiment:"bullish",  priority:"medium", time:"This week",    tags:["NDX","Tech","Earnings"], impact:"Key driver for NQ direction" },
    { id:"c4", category:"catalysts",headline:"VIX Elevated Above 20",              detail:"Implied volatility staying elevated — risk-off rotation benefiting defensive assets including gold.",                                 sentiment:"bullish",  priority:"medium", time:"Now",          tags:["VIX","Gold","Risk"],     impact:"Tailwind for gold as risk-off hedge" },
    { id:"p1", category:"policy",   headline:"Fed Chair Powell Congressional Testimony", detail:"Semi-annual Humphrey-Hawkins testimony — Powell will field questions on inflation, employment, and rate path.",               sentiment:"neutral",  priority:"high",   time:"Tue–Wed",      tags:["Fed","USD","Rate"],       impact:"High-volatility event for all USD pairs" },
    { id:"p2", category:"policy",   headline:"US-China Trade Policy Update",       detail:"Treasury reviewing tariff structure on Chinese goods — any escalation risks risk-off, any easing lifts equities and risk assets.",  sentiment:"neutral",  priority:"medium", time:"This week",    tags:["Trade","USD","NDX"],     impact:"Tariff escalation bearish for equities" },
    { id:"n1", category:"news",     headline:"Gold Hits New ATH Above $3,100",     detail:"XAU/USD prints fresh all-time high driven by central bank demand, geopolitical risk, and dollar weakness narrative.",                sentiment:"bullish",  priority:"high",   time:"2h ago",       tags:["Gold","ATH","Breakout"], impact:"Momentum accelerating — watch for extension" },
    { id:"n2", category:"news",     headline:"US 10Y Yield Dips Below 4.3%",       detail:"Treasury yields pulling back — reducing opportunity cost of holding gold and supporting equity valuations.",                         sentiment:"bullish",  priority:"medium", time:"4h ago",       tags:["Yield","Gold","Bond"],   impact:"Yield decline supports both gold and growth stocks" },
    { id:"n3", category:"news",     headline:"ISM Services PMI Misses Estimates",  detail:"Service sector activity below consensus — soft landing narrative gaining traction, dovish Fed expectations rise.",                   sentiment:"bullish",  priority:"medium", time:"Yesterday",    tags:["PMI","USD","Economy"],   impact:"Dollar weakening on dovish repricing" },
  ],
  counts:    { events: 3, catalysts: 4, policy: 2, news: 3 },
  timestamp: new Date().toISOString(),
  cached:    false,
  _debug:    { mode: "mock" },
}

// ── Prompts ───────────────────────────────────────────────────────────────

const SYSTEM = `You are an institutional market intelligence analyst. Your job is to generate a structured, real-time market intelligence feed for a professional trading dashboard. Focus on XAU/USD (Gold) and USTEC (NQ/Nasdaq 100) traders. Return ONLY valid JSON — no preamble, no markdown, no code fences.`

const USER = `Generate a current market intelligence feed with exactly this JSON structure:

{
  "items": [
    {
      "id": "e1",
      "category": "events",
      "headline": "<concise headline>",
      "detail": "<1-2 sentence explanation of relevance>",
      "sentiment": "bullish" | "bearish" | "neutral",
      "priority": "high" | "medium" | "low",
      "time": "<when: e.g. 'Today 14:30 ET', 'This week', '2h ago'>",
      "tags": ["<tag1>", "<tag2>"],
      "impact": "<1 sentence specific market impact>"
    }
  ],
  "counts": { "events": 3, "catalysts": 4, "policy": 2, "news": 3 }
}

Generate exactly:
- 3 items with category "events" — upcoming high-impact macro events (Fed, CPI, NFP, PMI etc.)
- 4 items with category "catalysts" — current market catalysts driving Gold and NQ
- 2 items with category "policy" — central bank / geopolitical / trade policy developments
- 3 items with category "news" — recent market-moving headlines (hours/days old)

Be specific, current, and actionable. Every item must be relevant to Gold (XAU/USD) or NQ (USTEC) traders. Tags should be 2-3 short strings like ["USD","Gold","Rate"].`

// ── Handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body         = await req.json().catch(() => ({}))
    const forceRefresh = body.forceRefresh === true

    if (!forceRefresh) {
      const cached = getCached()
      if (cached) return NextResponse.json({ ...cached, cached: true })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    const MODEL  = "claude-sonnet-4-6"

    let result: IntelResult
    let debug:  { mode: string; error?: string; model?: string }

    if (!apiKey) {
      debug  = { mode: "mock", error: "ANTHROPIC_API_KEY not set" }
      result = { ...MOCK, timestamp: new Date().toISOString(), _debug: debug }
    } else {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method:  "POST",
          headers: {
            "Content-Type":      "application/json",
            "x-api-key":         apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model:      MODEL,
            max_tokens: 2048,
            system:     SYSTEM,
            messages:   [{ role: "user", content: USER }],
          }),
        })

        if (!res.ok) {
          const err = await res.text()
          debug  = { mode: "mock", error: `Claude ${res.status}: ${err.slice(0, 100)}`, model: MODEL }
          result = { ...MOCK, timestamp: new Date().toISOString(), _debug: debug }
        } else {
          const data    = await res.json()
          const rawText = data.content?.find((c: any) => c.type === "text")?.text ?? "{}"
          const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
          const parsed  = JSON.parse(cleaned)

          result = {
            items:     parsed.items     ?? MOCK.items,
            counts:    parsed.counts    ?? MOCK.counts,
            timestamp: new Date().toISOString(),
            cached:    false,
            _debug:    { mode: "live", model: MODEL },
          }
          debug = { mode: "live", model: MODEL }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown"
        debug  = { mode: "mock", error: msg, model: MODEL }
        result = { ...MOCK, timestamp: new Date().toISOString(), _debug: debug }
      }
    }

    setCache(result)
    return NextResponse.json({ ...result, _debug: debug })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown"
    return NextResponse.json({ error: "Internal server error", details: msg }, { status: 500 })
  }
}

export async function GET() { return new Response(null, { status: 405 }) }