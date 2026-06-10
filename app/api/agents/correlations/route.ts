// ============================================================
// /api/agents/correlations (POST)
// Pass B — Cross-Asset Correlation Matrix + Macro Regime
//
// Calls Claude to generate:
//   1. 5 macro regime status indicators
//   2. 8 cross-asset correlation pairs with coefficients
//
// Cache: 30 minutes (correlations shift slower than bias)
// Fallback: realistic mock data when ANTHROPIC_API_KEY is absent
// ============================================================

import { NextRequest, NextResponse } from "next/server"

// ── In-memory cache (resets on cold start) ───────────────────────────────
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface CacheEntry {
  data:      CorrelationResult
  expiresAt: number
}

let _cache: CacheEntry | null = null

function getCached(): CorrelationResult | null {
  if (_cache && Date.now() < _cache.expiresAt) return _cache.data
  return null
}

function setCache(data: CorrelationResult) {
  _cache = { data, expiresAt: Date.now() + CACHE_TTL_MS }
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface MacroCard {
  key:       string
  label:     string
  value:     string
  sentiment: "bullish" | "bearish" | "neutral" | "high" | "moderate" | "low" | "elevated" | "declining"
}

export interface CorrelationPair {
  assetA:      string   // "Gold"
  assetB:      string   // "DXY"
  coeff:       number   // -0.82 (–1 to +1)
  description: string   // "Strong inverse"
  explanation: string   // one sentence
  regime:      "inverse" | "positive" | "decorrelated"
}

export interface CorrelationResult {
  macroRegime: MacroCard[]
  pairs:       CorrelationPair[]
  timestamp:   string
  cached:      boolean
  _debug?:     { mode: string; error?: string; model?: string }
}

// ── Mock fallback ─────────────────────────────────────────────────────────
const MOCK_RESULT: CorrelationResult = {
  macroRegime: [
    { key: "riskSentiment", label: "Risk Sentiment",  value: "Risk-Off Lean",          sentiment: "bearish"  },
    { key: "rateRegime",    label: "Rate Regime",      value: "Dovish Pivot Phase",      sentiment: "bullish"  },
    { key: "inflation",     label: "Inflation",         value: "Disinflation Trend",      sentiment: "declining" },
    { key: "usdRegime",     label: "USD Regime",        value: "Weakening Bias",          sentiment: "bearish"  },
    { key: "volatility",    label: "Volatility",        value: "Elevated (VIX > 20)",     sentiment: "elevated" },
  ],
  pairs: [
    { assetA: "Gold",  assetB: "Silver", coeff:  0.88, description: "Strong positive",    explanation: "Precious metals move together — Silver amplifies Gold moves with higher beta.", regime: "positive"    },
    { assetA: "Gold",  assetB: "EUR/USD",coeff:  0.65, description: "Moderate positive",  explanation: "Both inversely correlated with DXY — USD weakness simultaneously lifts gold and EUR/USD.", regime: "positive"    },
    { assetA: "USTEC", assetB: "BTC",    coeff:  0.64, description: "Risk asset proxy",   explanation: "BTC increasingly tracks high-growth tech — risk appetite flows hit both simultaneously.", regime: "positive"    },
    { assetA: "USTEC", assetB: "EUR/USD",coeff:  0.42, description: "Moderate positive",  explanation: "Weak USD supports both NQ valuations and EUR/USD — dollar direction drives the link.", regime: "positive"    },
    { assetA: "Gold",  assetB: "USTEC",  coeff: -0.22, description: "Weak inverse",       explanation: "Weak and regime-dependent — flight to safety during equity drops can briefly align them.", regime: "decorrelated" },
    { assetA: "BTC",   assetB: "Silver", coeff:  0.38, description: "Weak positive",      explanation: "Alternative asset narratives occasionally align — correlation rises during macro stress events.", regime: "positive"    },
  ],
  timestamp: new Date().toISOString(),
  cached:    false,
  _debug:    { mode: "mock" },
}

// ── Prompt builders ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a cross-asset macro analyst specialising in real-time correlation analysis for institutional traders. Your job is to return a JSON object describing the current macro regime and key cross-asset correlations. Be specific, data-driven, and current. Return ONLY valid JSON — no preamble, no markdown, no code fences.`

const USER_PROMPT = `Analyse the current market environment and return a JSON object with this exact structure:

{
  "macroRegime": [
    { "key": "riskSentiment", "label": "Risk Sentiment",  "value": "<2-4 word description>", "sentiment": "<bearish|bullish|neutral>" },
    { "key": "rateRegime",    "label": "Rate Regime",      "value": "<2-4 word description>", "sentiment": "<bullish|bearish|neutral>" },
    { "key": "inflation",     "label": "Inflation",         "value": "<2-4 word description>", "sentiment": "<elevated|declining|neutral>" },
    { "key": "usdRegime",     "label": "USD Regime",        "value": "<2-4 word description>", "sentiment": "<bullish|bearish|neutral>" },
    { "key": "volatility",    "label": "Volatility",        "value": "<2-4 word description>", "sentiment": "<elevated|moderate|low>" }
  ],
  "pairs": [
    { "assetA": "Gold",  "assetB": "Silver",  "coeff": <-1 to 1>, "description": "<2-4 words>", "explanation": "<1 sentence>", "regime": "<inverse|positive|decorrelated>" },
    { "assetA": "Gold",  "assetB": "EUR/USD", "coeff": <-1 to 1>, "description": "<2-4 words>", "explanation": "<1 sentence>", "regime": "<inverse|positive|decorrelated>" },
    { "assetA": "USTEC", "assetB": "BTC",     "coeff": <-1 to 1>, "description": "<2-4 words>", "explanation": "<1 sentence>", "regime": "<inverse|positive|decorrelated>" },
    { "assetA": "USTEC", "assetB": "EUR/USD", "coeff": <-1 to 1>, "description": "<2-4 words>", "explanation": "<1 sentence>", "regime": "<inverse|positive|decorrelated>" },
    { "assetA": "Gold",  "assetB": "USTEC",   "coeff": <-1 to 1>, "description": "<2-4 words>", "explanation": "<1 sentence>", "regime": "<inverse|positive|decorrelated>" },
    { "assetA": "BTC",   "assetB": "Silver",  "coeff": <-1 to 1>, "description": "<2-4 words>", "explanation": "<1 sentence>", "regime": "<inverse|positive|decorrelated>" }
  ]
}

Provide coefficients as real numbers (e.g. -0.82 not "-0.82").
Base your analysis on the most current macroeconomic environment you know.`

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const forceRefresh: boolean = body.forceRefresh === true

    // Return cached result if fresh
    if (!forceRefresh) {
      const cached = getCached()
      if (cached) {
        return NextResponse.json({ ...cached, cached: true })
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    const MODEL  = "claude-sonnet-4-6"

    let result: CorrelationResult
    let debug:  { mode: string; error?: string; model?: string }

    if (!apiKey) {
      debug  = { mode: "mock", error: "ANTHROPIC_API_KEY not set" }
      result = { ...MOCK_RESULT, timestamp: new Date().toISOString(), _debug: debug }
    } else {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method:  "POST",
          headers: {
            "Content-Type":      "application/json",
            "x-api-key":         apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model:      MODEL,
            max_tokens: 1024,
            system:     SYSTEM_PROMPT,
            messages:   [{ role: "user", content: USER_PROMPT }],
          }),
        })

        if (!response.ok) {
          const errText = await response.text()
          console.error("[correlations] Claude error:", response.status, errText.slice(0, 200))
          debug  = { mode: "mock", error: `Claude API ${response.status}`, model: MODEL }
          result = { ...MOCK_RESULT, timestamp: new Date().toISOString(), _debug: debug }
        } else {
          const data    = await response.json()
          const rawText = data.content?.find((c: { type: string }) => c.type === "text")?.text ?? "{}"
          const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
          const parsed  = JSON.parse(cleaned)

          result = {
            macroRegime: parsed.macroRegime ?? MOCK_RESULT.macroRegime,
            pairs:       parsed.pairs       ?? MOCK_RESULT.pairs,
            timestamp:   new Date().toISOString(),
            cached:      false,
            _debug:      { mode: "live", model: MODEL },
          }
          debug = { mode: "live", model: MODEL }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown"
        console.error("[correlations] Error:", msg)
        debug  = { mode: "mock", error: msg, model: MODEL }
        result = { ...MOCK_RESULT, timestamp: new Date().toISOString(), _debug: debug }
      }
    }

    setCache(result)
    return NextResponse.json({ ...result, _debug: debug })

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown"
    console.error("[correlations] Unhandled:", msg)
    return NextResponse.json({ error: "Internal server error", details: msg }, { status: 500 })
  }
}

export async function GET() { return new Response(null, { status: 405 }) }