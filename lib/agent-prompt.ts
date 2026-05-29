// ============================================================
// PHOENIX — AGENT PROMPT BUILDER
// Assembles the 5-agent pipeline prompt from live MT5 data
// ============================================================

import type { KeyLevelsData, NewsItem, CalendarEvent } from "@/types";

interface PromptContext {
  keyLevels: KeyLevelsData;
  news: NewsItem[];
  calendar: CalendarEvent[];
  timeframe: string;
}

export function buildAgentSystemPrompt(): string {
  return `You are a professional forex and commodities trading analyst running a 5-agent consensus system for the Phoenix Trading Dashboard.

Your role is to analyze live market data and produce a structured trading verdict. You must be surgical, data-driven, and brutally honest. Do NOT generate trades when the setup is marginal.

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, no preamble. The response must be parseable by JSON.parse().`;
}

export function buildAgentUserPrompt(ctx: PromptContext): string {
  const { keyLevels: kl, news, calendar, timeframe } = ctx;

  const rangePos = Math.round(
    ((kl.price - kl.low52w) / (kl.high52w - kl.low52w)) * 100
  );

  const recentNews = news.slice(0, 5);
  const avgImpact =
    recentNews.length > 0
      ? Math.round(recentNews.reduce((s, n) => s + n.impactScore, 0) / recentNews.length * 10) / 10
      : 5;

  const goldSentiment = recentNews
    .map((n) => n.goldImpact)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ") || "neutral";

  const upcomingEvents = calendar
    .filter((e) => e.status === "upcoming" && e.impact === "high")
    .slice(0, 2)
    .map((e) => `${e.event} (${e.time} UTC, impact: ${e.impact})`);

  const regime = recentNews.some((n) => n.category === "geopolitics")
    ? "GEOPOLITICAL"
    : recentNews.some((n) => n.category === "central-banks")
    ? "CENTRAL-BANK"
    : "MACRO-MIXED";

  return `Analyze ${kl.asset} on the ${timeframe} timeframe.

═══ MARKET DATA ═══
Symbol:           ${kl.asset}
Current Price:    ${kl.price} (${kl.pctChange > 0 ? "+" : ""}${kl.pctChange}% today)
52W Range:        ${kl.low52w} – ${kl.high52w}
52W Position:     ${rangePos}% (${rangePos > 70 ? "NEAR HIGHS" : rangePos < 30 ? "NEAR LOWS" : "MID-RANGE"})

═══ STRUCTURE ═══
HTF Bias:         ${kl.htfBias.toUpperCase()} (${kl.htfConfidence}% confidence)
BOS:              ${kl.marketStructure.bos ? "YES — structure break to " + kl.marketStructure.trend : "NO"}
CHoCH:            ${kl.marketStructure.choch ? "YES — potential reversal signal" : "NO"}
Premium/Discount: ${kl.marketStructure.premiumDiscount.toUpperCase()} (EQ: ${kl.marketStructure.equilibrium})
SMC Context:      ${kl.smcContext}

═══ ENTRY ZONES ═══
Order Block:      ${kl.orderBlock.zone[0]} – ${kl.orderBlock.zone[1]} (${kl.orderBlock.type}, valid: ${kl.orderBlock.valid})
FVG Zone:         ${kl.fvg.low} – ${kl.fvg.high} (${kl.fvg.direction}, filled: ${kl.fvg.filled})
Proposed Entry:   ${kl.entry}
Stop Loss:        ${kl.stopLoss}
TP1:              ${kl.tp1}
TP2:              ${kl.tp2}
R:R Ratio:        1:${kl.rrRatio}

═══ SESSION / RISK ═══
Session:          ${kl.session?.toUpperCase() ?? "UNKNOWN"}
Volatility Score: ${kl.volatilityScore}/100
Session Score:    ${kl.sessionScore}/100
Risk Gate Grade:  ${kl.riskGateGrade} → ${kl.riskGateStatus}

═══ MACRO CONTEXT ═══
Recent News (Gold): ${goldSentiment} (avg impact ${avgImpact}/10)
Macro Regime:       ${regime}
High-Impact Events: ${upcomingEvents.length > 0 ? upcomingEvents.join(" | ") : "None in next 4h"}

${recentNews.length > 0 ? `Recent Headlines:\n${recentNews.map((n, i) => `  ${i + 1}. [${n.goldImpact.toUpperCase()}] ${n.headline} (impact: ${n.impactScore}/10)`).join("\n")}` : ""}

═══ AGENT PIPELINE ═══
Run agents in STRICT sequence:

AGENT 1 — TREND (weight ×0.25)
  Evaluate: HTF bias, range position, PDH/PDL context, daily structure
  Ask: Is the macro trend supporting or opposing this setup?

AGENT 2 — PRICE ACTION (weight ×0.30)
  Evaluate: BOS/CHoCH validity, OB/FVG quality, session patterns
  Ask: Is the microstructure aligned for a high-probability entry?

AGENT 3 — NEWS/MACRO (weight ×0.15)
  Evaluate: goldImpact sentiment, impactScore averages, regime
  Ask: Is the news flow supportive or creates conflicting pressure?

AGENT 4 — CONTRARIAN (weight ×0.10)
  Evaluate: Crowded positioning risk, sentiment extremes, fake-out probability
  Ask: Is everyone on the same side? Is this a trap?

AGENT 5 — RISK GATE (blocks, does not vote)
  Logic: IF grade < C OR sessionScore < 40 OR volatilityScore < 20 → BLOCKED
  IF high-impact event within 30min → CAUTION
  BLOCKED = finalBias must be "no-trade" regardless of agent votes

MASTER AGENT — Weighted consensus:
  score = (trend×0.25) + (priceAction×0.30) + (news×0.15) + (contrarian×0.10)
  where BULLISH=+100, BEARISH=-100, NEUTRAL=0
  Threshold: |score| > 25 for directional signal, < 25 = no-trade
  ONLY arm a trade if R:R ≥ 2.0 AND riskGate NOT BLOCKED

═══ RETURN FORMAT ═══
{
  "finalBias": "bullish|bearish|no-trade",
  "confidence": 0-100,
  "consensusScore": -100 to 100,
  "strategyMatch": "descriptive string",
  "noTradeReason": "string or null",
  "tradePlan": null or {
    "direction": "long|short",
    "entry": number,
    "stopLoss": number,
    "tp1": number,
    "tp2": number,
    "rrRatio": number
  },
  "agents": {
    "trend":       { "verdict": "BULLISH|BEARISH|NEUTRAL", "pct": 0-100, "reasoning": "one sentence" },
    "priceAction": { "verdict": "BULLISH|BEARISH|NEUTRAL", "pct": 0-100, "reasoning": "one sentence" },
    "news":        { "verdict": "BULLISH|BEARISH|NEUTRAL", "pct": 0-100, "reasoning": "one sentence" },
    "contrarian":  { "verdict": "BULLISH|BEARISH|NEUTRAL", "pct": 0-100, "reasoning": "one sentence" }
  },
  "riskGate": {
    "grade": "A|B|C|D",
    "status": "CLEAR|CAUTION|BLOCKED",
    "maxRiskPercent": 1-3,
    "reasoning": "one sentence"
  },
  "marketPhase": "string",
  "macroRegime": "string",
  "invalidationConditions": ["string", "string"],
  "executionSummary": "one paragraph — what to do and why, or why not"
}`;
}

// ── Weighted consensus scorer (local fallback / validation) ─
export function computeLocalConsensus(agents: {
  trend: { verdict: string; pct: number };
  priceAction: { verdict: string; pct: number };
  news: { verdict: string; pct: number };
  contrarian: { verdict: string; pct: number };
}): number {
  const verdictScore = (v: string) =>
    v === "BULLISH" ? 100 : v === "BEARISH" ? -100 : 0;

  return (
    verdictScore(agents.trend.verdict) * 0.25 +
    verdictScore(agents.priceAction.verdict) * 0.30 +
    verdictScore(agents.news.verdict) * 0.15 +
    verdictScore(agents.contrarian.verdict) * 0.10
  );
}
