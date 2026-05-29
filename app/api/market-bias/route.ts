import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

interface MarketData {
  symbol: string
  currentPrice: number
  pdh: number; pdl: number; pdc: number
  pwh: number; pwl: number
  atr: number
  fvgs: { direction: 'bull' | 'bear'; top: number; bottom: number; date: string }[]
  eqhs: number[]; eqls: number[]
  poc: number; vah: number; val: number; avwap: number
  todayHigh: number; todayLow: number
}

const DEMO_RESPONSE = {
  verdict: "NO TRADE",
  conviction: 32,
  consensus: -12,
  agents: {
    trend:       { signal: "NEUTRAL",  strength: 20, weight: 0.25 },
    priceAction: { signal: "BEARISH",  strength: 60, weight: 0.30 },
    news:        { signal: "BULLISH",  strength: 72, weight: 0.15 },
    contrarian:  { signal: "NEUTRAL",  strength: 60, weight: 0.10 },
  },
  marketPhase: "Reversal",
  paSetup: "FVG · BOS · ChoCH · Sweep",
  macroRegime: "Geopolitical",
  supportingFactors: [
    "Price trading above AVWAP — mild bullish bias on volume profile",
    "FVG zones identified at key structural levels",
    "ATR within normal range — manageable volatility environment",
  ],
  invalidationConditions: [
    "Break and close below PDL invalidates bullish structure",
    "ADX < 25 — trend not yet confirmed, avoid trend entries",
  ],
  riskGrade: "C",
  maxRisk: "1%",
  volatilityScore: 38,
  sessionScore: 40,
  warnings: ["Demo mode — add ANTHROPIC_API_KEY to Vercel env vars for live AI analysis"],
  keyLevels: { equilibrium: 0, "52wHigh": 0, "52wLow": 0 },
  rsi: 54,
  volatilityPct: "0.53%",
  summary: "Insufficient directional agreement. Wait for clearer setup.",
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  try {
    const { marketData, session, killZone }: {
      marketData: MarketData; session: string; killZone: string | null
    } = await req.json()

    // No API key → return demo data
    if (!apiKey) {
      const demo = {
        ...DEMO_RESPONSE,
        supportingFactors: [
          `${marketData.symbol} price at ${marketData.currentPrice?.toFixed(2)} — above PDC ${marketData.pdc?.toFixed(2)}`,
          `ATR: ${marketData.atr?.toFixed(2)} pts — ${marketData.atr > 20 ? "elevated" : "normal"} volatility`,
          `Session: ${session}${killZone ? ` · ${killZone}` : ""}`,
        ],
        keyLevels: {
          equilibrium: marketData.poc,
          "52wHigh": marketData.pwh,
          "52wLow": marketData.pwl,
        },
        warnings: ["⚠️ Demo mode — add ANTHROPIC_API_KEY to Vercel env vars for live AI analysis"],
      }
      return NextResponse.json(demo)
    }

    const pctChange = marketData.currentPrice && marketData.pdc
      ? (((marketData.currentPrice - marketData.pdc) / marketData.pdc) * 100).toFixed(2)
      : "0.00"

    const prompt = `You are a multi-agent trading analysis system for institutional traders. Analyze this market data and return ONLY a valid JSON object with no extra text.

MARKET DATA:
Symbol: ${marketData.symbol}
Current Price: ${marketData.currentPrice}
Change vs PDC: ${pctChange}%
Previous Day: High=${marketData.pdh} Low=${marketData.pdl} Close=${marketData.pdc}
Previous Week: High=${marketData.pwh} Low=${marketData.pwl}
Today's Range: High=${marketData.todayHigh} Low=${marketData.todayLow}
ATR (14-day): ${marketData.atr?.toFixed(2)}
Volume Profile: POC=${marketData.poc?.toFixed(2)} VAH=${marketData.vah?.toFixed(2)} VAL=${marketData.val?.toFixed(2)} AVWAP=${marketData.avwap?.toFixed(2)}
Equal Highs: ${marketData.eqhs?.map((v: number) => v.toFixed(2)).join(', ') || 'none'}
Equal Lows: ${marketData.eqls?.map((v: number) => v.toFixed(2)).join(', ') || 'none'}
FVGs: ${marketData.fvgs?.map((f: any) => `${f.direction} ${f.bottom?.toFixed(2)}-${f.top?.toFixed(2)}`).join(', ') || 'none'}
Active Session: ${session}
Kill Zone: ${killZone || 'none'}

Analyze using these four trading agents:
1. TREND AGENT: Multi-timeframe bias using AVWAP, PDH/PDL position, price vs POC
2. PRICE ACTION AGENT: Structure (BOS/ChoCH), FVG fills, EQH/EQL sweeps, session highs/lows
3. NEWS/MACRO AGENT: Market regime from price behavior, volatility, geopolitical indicators
4. CONTRARIAN AGENT: Overextension, reversal signs, counter-trend opportunities

Return ONLY this JSON (no markdown, no explanation):
{
  "verdict": "BUY" or "SELL" or "NO TRADE",
  "conviction": integer 0-100,
  "consensus": integer -100 to 100 (negative=bearish, positive=bullish),
  "agents": {
    "trend":       {"signal":"BULLISH"|"BEARISH"|"NEUTRAL","strength":0-100,"weight":0.25,"reasoning":"1 sentence"},
    "priceAction": {"signal":"BULLISH"|"BEARISH"|"NEUTRAL","strength":0-100,"weight":0.30,"reasoning":"1 sentence"},
    "news":        {"signal":"BULLISH"|"BEARISH"|"NEUTRAL","strength":0-100,"weight":0.15,"reasoning":"1 sentence"},
    "contrarian":  {"signal":"BULLISH"|"BEARISH"|"NEUTRAL","strength":0-100,"weight":0.10,"reasoning":"1 sentence"}
  },
  "marketPhase": "Trending"|"Reversal"|"Ranging"|"Breakout"|"Consolidation",
  "paSetup": "brief PA context string",
  "macroRegime": "brief macro context string",
  "supportingFactors": ["factor 1","factor 2","factor 3"],
  "invalidationConditions": ["condition 1","condition 2"],
  "riskGrade": "A"|"B"|"C"|"D",
  "maxRisk": "0.5%"|"1%"|"2%"|"0%",
  "volatilityScore": integer 0-100,
  "sessionScore": integer 0-100,
  "warnings": ["warning if any"],
  "keyLevels": {"equilibrium": number, "52wHigh": number, "52wLow": number},
  "rsi": integer 0-100,
  "volatilityPct": "X.XX%",
  "summary": "2 sentence max explanation of the verdict"
}`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ""
    const clean = text.replace(/```json|```/g, "").trim()
    const analysis = JSON.parse(clean)

    return NextResponse.json(analysis)
  } catch (err) {
    console.error("[market-bias]", err)
    return NextResponse.json(DEMO_RESPONSE)
  }
}
