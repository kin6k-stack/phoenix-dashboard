// ============================================================
// PHOENIX — MOCK DATA (fallback until MT5 bot pushes live data)
// ============================================================

import type {
  MarketQuote,
  KeyLevelsData,
  NewsItem,
  CalendarEvent,
  TrumpPost,
  SessionData,
  AgentRunResult,
  CatalystEvent,
  AssetBias,
} from "@/types";

// ── Asset Metadata ────────────────────────────────────────
export const ASSETS = [
  { symbol: "XAUUSD", name: "Gold Spot",      class: "commodity" as const, basePrice: 3328.50 },
  { symbol: "XAGUSD", name: "Silver",         class: "commodity" as const, basePrice: 32.85   },
  { symbol: "USOIL",  name: "Crude Oil WTI",  class: "commodity" as const, basePrice: 61.20   },
  { symbol: "EURUSD", name: "DXY Proxy",      class: "forex"     as const, basePrice: 1.1385  },
  { symbol: "GBPUSD", name: "Cable",          class: "forex"     as const, basePrice: 1.3442  },
  { symbol: "USDJPY", name: "USD/JPY",        class: "forex"     as const, basePrice: 142.60  },
  { symbol: "USDCAD", name: "USD/CAD",        class: "forex"     as const, basePrice: 1.3791  },
  { symbol: "USDCHF", name: "USD/CHF",        class: "forex"     as const, basePrice: 0.8842  },
  { symbol: "AUDUSD", name: "AUD/USD",        class: "forex"     as const, basePrice: 0.6453  },
  { symbol: "NZDUSD", name: "NZD/USD",        class: "forex"     as const, basePrice: 0.5985  },
  { symbol: "EURGBP", name: "EUR/GBP",        class: "forex"     as const, basePrice: 0.8467  },
  { symbol: "GBPJPY", name: "GBP/JPY",        class: "forex"     as const, basePrice: 191.62  },
  { symbol: "BTCUSD", name: "Bitcoin",        class: "crypto"    as const, basePrice: 105420  },
  { symbol: "ETHUSD", name: "Ethereum",       class: "crypto"    as const, basePrice: 2540.80 },
  { symbol: "LTCUSD", name: "Litecoin",       class: "crypto"    as const, basePrice: 87.40   },
] as const;

const BIASES = ["bullish", "bearish", "neutral"] as const;
const MOMENTUMS = ["strong", "moderate", "weak"] as const;

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// refresh seed every minute so prices feel live
const SEED = Math.floor(Date.now() / 60000);

export function getMockQuotes(): MarketQuote[] {
  const rand = seededRand(SEED);
  return ASSETS.map((a) => {
    const changePct = (rand() - 0.45) * 2.5;
    const price = a.basePrice * (1 + changePct / 100);
    const biasSeed = rand();
    const bias = biasSeed > 0.6 ? "bullish" : biasSeed > 0.35 ? "neutral" : "bearish";
    const momSeed = rand();
    const momentum = momSeed > 0.65 ? "strong" : momSeed > 0.33 ? "moderate" : "weak";
    return {
      symbol: a.symbol,
      name: a.name,
      price: Math.round(price * 10000) / 10000,
      change: Math.round(a.basePrice * changePct / 100 * 100) / 100,
      changePercent: Math.round(changePct * 1000) / 1000,
      bias,
      class: a.class,
      momentum,
    };
  });
}

export function getMockKeyLevels(symbol = "XAUUSD"): KeyLevelsData {
  const asset = ASSETS.find((a) => a.symbol === symbol) ?? ASSETS[0];
  const rand = seededRand(SEED + symbol.charCodeAt(0));
  const price = asset.basePrice * (1 + (rand() - 0.5) * 0.02);
  const pct = (rand() - 0.5) * 2;
  const high52w = price * (1 + rand() * 0.18 + 0.05);
  const low52w  = price * (1 - rand() * 0.18 - 0.05);
  const eq = (high52w + low52w) / 2;
  const rangePos = ((price - low52w) / (high52w - low52w)) * 100;
  const obLow   = price * (1 - 0.005);
  const obHigh  = price * (1 - 0.002);
  const fvgLow  = price * (1 - 0.008);
  const fvgHigh = price * (1 - 0.003);
  const entry   = obHigh;
  const sl      = obLow * 0.998;
  const tp1     = price + (entry - sl) * 2;
  const tp2     = price + (entry - sl) * 3.5;
  const rr      = Math.round(((tp1 - entry) / (entry - sl)) * 10) / 10;
  const vol     = Math.round(rand() * 60 + 10);
  const ses     = Math.round(rand() * 70 + 20);
  const gradeIdx = Math.floor(rand() * 4);
  const grades = ["A", "B", "C", "D"] as const;
  const grade = grades[gradeIdx];
  const gateStatus = grade === "A" || grade === "B" ? "CLEAR" : grade === "C" ? "CAUTION" : "BLOCKED";

  return {
    asset: symbol,
    price: Math.round(price * 100) / 100,
    pctChange: Math.round(pct * 1000) / 1000,
    high52w: Math.round(high52w * 100) / 100,
    low52w: Math.round(low52w * 100) / 100,
    bias: rangePos > 55 ? "bullish" : rangePos < 45 ? "bearish" : "neutral",
    htfBias: "bullish",
    htfConfidence: Math.round(rand() * 40 + 40),
    smcContext: `BOS to upside | Price in ${rangePos > 60 ? "premium" : "equilibrium"} zone | 52w pos: ${Math.round(rangePos)}%`,
    alignment: {
      type: "continuation",
      phase: "continuation",
      explanation: "LTF setup aligns with HTF bullish trend.",
      riskMultiplier: 1,
      confidenceAdjustment: 5,
    },
    tradeStatus: gateStatus === "BLOCKED" ? "NO TRADE" : rr >= 2 ? "ARMED" : "NO TRADE",
    tradeStatusReason: rr < 2 ? `R:R is 1:${rr} — below 1:2 minimum threshold` : "Setup armed — awaiting entry confirmation",
    setupQuality: gateStatus === "BLOCKED" ? "NO TRADE" : "B+",
    marketStructure: {
      trend: "bullish",
      bos: true,
      choch: false,
      premiumDiscount: rangePos > 55 ? "premium" : rangePos < 45 ? "discount" : "equilibrium",
      equilibrium: Math.round(eq * 100) / 100,
    },
    orderBlock: {
      price: Math.round(obLow * 100) / 100,
      zone: [Math.round(obLow * 100) / 100, Math.round(obHigh * 100) / 100],
      type: "bullish",
      valid: true,
    },
    fvg: {
      high: Math.round(fvgHigh * 100) / 100,
      low: Math.round(fvgLow * 100) / 100,
      midpoint: Math.round(((fvgHigh + fvgLow) / 2) * 100) / 100,
      direction: "bullish",
      filled: false,
    },
    entry: Math.round(entry * 100) / 100,
    stopLoss: Math.round(sl * 100) / 100,
    tp1: Math.round(tp1 * 100) / 100,
    tp2: Math.round(tp2 * 100) / 100,
    rrRatio: rr,
    riskGateGrade: grade,
    riskGateStatus: gateStatus,
    maxRiskPercent: grade === "A" ? 2 : grade === "B" ? 1.5 : 1,
    volatilityScore: vol,
    sessionScore: ses,
    session: "london",
  };
}

export const MOCK_NEWS: NewsItem[] = [
  {
    id: "news-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    headline: "Fed's Powell signals patience on rate cuts amid inflation stickiness",
    category: "central-banks",
    sentiment: "bearish",
    impactScore: 8,
    source: "Reuters",
    url: "https://reuters.com",
    goldImpact: "bullish",
    goldReasoning: "Persistent rates = dollar pressure medium-term, gold supported",
    usdImpact: "bearish",
    usdReasoning: "Delayed cuts reduce USD yield advantage vs majors",
  },
  {
    id: "news-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    headline: "US-China trade talks resume in Geneva, officials cautiously optimistic",
    category: "geopolitics",
    sentiment: "neutral",
    impactScore: 6,
    source: "Bloomberg",
    url: "https://bloomberg.com",
    goldImpact: "bearish",
    goldReasoning: "De-escalation reduces safe-haven demand premium",
    usdImpact: "bullish",
    usdReasoning: "Risk-on environment supports USD via equity inflows",
  },
  {
    id: "news-003",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    headline: "CPI prints hotter than expected at 3.4% — third consecutive miss",
    category: "inflation",
    sentiment: "bearish",
    impactScore: 9,
    source: "ForexLive",
    url: "https://forexlive.com",
    goldImpact: "bullish",
    goldReasoning: "Inflation surprise = real rate compression = gold bid",
    usdImpact: "bullish",
    usdReasoning: "Hot CPI reprices cut expectations higher, USD strengthens",
  },
  {
    id: "news-004",
    timestamp: new Date(Date.now() - 1000 * 60 * 195).toISOString(),
    headline: "Middle East tensions escalate after drone strikes on oil infrastructure",
    category: "geopolitics",
    sentiment: "bullish",
    impactScore: 7,
    source: "Al Jazeera",
    url: "https://aljazeera.com",
    goldImpact: "bullish",
    goldReasoning: "Geopolitical risk premium spikes safe-haven demand",
    usdImpact: "bullish",
    usdReasoning: "Risk-off flight to USD as global reserve currency",
  },
  {
    id: "news-005",
    timestamp: new Date(Date.now() - 1000 * 60 * 270).toISOString(),
    headline: "ECB holds rates at 3.25%, Lagarde hints at September cut possible",
    category: "central-banks",
    sentiment: "bearish",
    impactScore: 7,
    source: "CNBC",
    url: "https://cnbc.com",
    goldImpact: "neutral",
    goldReasoning: "EUR weakness offsets; mixed gold signal near term",
    usdImpact: "bullish",
    usdReasoning: "ECB dovish lean widens rate differential, USD strengthens",
  },
  {
    id: "news-006",
    timestamp: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
    headline: "BTC surges past $105K as institutional ETF inflows hit weekly record",
    category: "crypto",
    sentiment: "bullish",
    impactScore: 5,
    source: "CoinDesk",
    url: "https://coindesk.com",
    goldImpact: "bearish",
    goldReasoning: "Risk-on rotation out of defensive assets into crypto",
    usdImpact: "neutral",
    usdReasoning: "Crypto rally is asset-specific, limited USD FX impact",
  },
];

export const MOCK_CALENDAR: CalendarEvent[] = [
  {
    id: "ec-001",
    time: "13:30",
    date: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString().split("T")[0],
    utcTimestamp: Date.now() + 1000 * 60 * 60 * 4,
    currency: "USD",
    country: "US",
    event: "Non-Farm Payrolls",
    impact: "high",
    forecast: "180K",
    previous: "165K",
    actual: null,
    status: "upcoming",
    affectedAssets: ["XAUUSD", "DXY", "EURUSD", "GBPUSD"],
    goldImpact: "bearish",
    goldReasoning: "Strong jobs data → Fed hawkish → USD strength → gold pressure",
    usdImpact: "bullish",
    usdReasoning: "Beat = rate cut repricing delayed, USD bid",
    tradeImplication: "Wait for dust to settle 15–30 min post-release before entry",
  },
  {
    id: "ec-002",
    time: "13:30",
    date: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString().split("T")[0],
    utcTimestamp: Date.now() + 1000 * 60 * 60 * 4 + 60000,
    currency: "USD",
    country: "US",
    event: "Unemployment Rate",
    impact: "high",
    forecast: "3.9%",
    previous: "4.1%",
    actual: null,
    status: "upcoming",
    affectedAssets: ["XAUUSD", "DXY", "USDJPY"],
    goldImpact: "neutral",
    goldReasoning: "Companion to NFP — confirms or contradicts the headline",
    usdImpact: "bullish",
    usdReasoning: "Drop in unemployment confirms labour market resilience",
    tradeImplication: "Read alongside NFP for full picture",
  },
  {
    id: "ec-003",
    time: "08:30",
    date: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString().split("T")[0],
    utcTimestamp: Date.now() + 1000 * 60 * 60 * 26,
    currency: "USD",
    country: "US",
    event: "Core PCE Price Index m/m",
    impact: "high",
    forecast: "0.2%",
    previous: "0.3%",
    actual: null,
    status: "upcoming",
    affectedAssets: ["XAUUSD", "DXY", "EURUSD", "BTCUSD"],
    goldImpact: "bullish",
    goldReasoning: "PCE is Fed's preferred metric — hot print spikes gold on stagflation fears",
    usdImpact: "bullish",
    usdReasoning: "Hot PCE = fewer cuts = USD strength",
    tradeImplication: "Key risk event — reduce exposure before release",
  },
  {
    id: "ec-004",
    time: "10:00",
    date: new Date(Date.now() + 1000 * 60 * 60 * 50).toISOString().split("T")[0],
    utcTimestamp: Date.now() + 1000 * 60 * 60 * 50,
    currency: "USD",
    country: "US",
    event: "ISM Manufacturing PMI",
    impact: "medium",
    forecast: "48.8",
    previous: "47.8",
    actual: null,
    status: "upcoming",
    affectedAssets: ["XAUUSD", "USOIL", "DXY"],
    goldImpact: "neutral",
    goldReasoning: "Manufacturing weakness is priced; below 50 = muted gold reaction",
    usdImpact: "bearish",
    usdReasoning: "Sub-50 = contraction = growth concerns = USD softness",
    tradeImplication: "Below 47 could accelerate USD selloff",
  },
];

export const MOCK_TRUMP_POSTS: TrumpPost[] = [
  {
    id: "trump-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    content: "The European Union has been ripping off the United States for years with massive trade surpluses. Either they fix the deficit IMMEDIATELY, or 25% tariffs go into effect on ALL European goods. No exceptions!",
    source: "Truth Social",
    sentimentClassification: "bearish",
    impactScore: 9,
    affectedAssets: ["EURUSD", "XAUUSD", "DXY", "GBPUSD"],
    policyCategory: "Tariffs",
    whyItMatters: "Escalation of EU trade war threat — EUR is most liquid tariff target",
    potentialReaction: "EUR selloff, gold bid on trade war risk premium, USD knee-jerk higher",
    tags: ["tariffs", "eu", "trade"],
  },
  {
    id: "trump-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    content: "Just had a very productive call with President Xi. China wants to do a DEAL. We want to do a DEAL. The 90-day pause gives us time to work something out that is GREAT for both countries. Details soon!",
    source: "Reuters",
    sentimentClassification: "bullish",
    impactScore: 7,
    affectedAssets: ["XAUUSD", "DXY", "USOIL", "BTCUSD"],
    policyCategory: "China",
    whyItMatters: "Positive US-China signals reduce geopolitical risk premium",
    potentialReaction: "Risk-on tone, gold eases from safe-haven bid, equities rally",
    tags: ["china", "trade", "diplomacy"],
  },
  {
    id: "trump-003",
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    content: "Jerome Powell is TERRIBLE. ZERO RATE CUT while the economy is clearly slowing. The Fed is a disaster. I will fix this situation when the time is right — interest rates MUST come down!",
    source: "CNBC",
    sentimentClassification: "bearish",
    impactScore: 8,
    affectedAssets: ["XAUUSD", "DXY", "USDJPY"],
    policyCategory: "Fed",
    whyItMatters: "Fed independence pressure from executive — market pricing uncertainty spike",
    potentialReaction: "USD weakness on institutional credibility concerns, gold bid",
    tags: ["fed", "rates", "powell"],
  },
];

export const MOCK_SESSIONS: SessionData[] = [
  {
    session: "sydney",
    status: "closed",
    keyMoves: ["AUD/USD down 0.15% on RBA minutes", "Gold flat at $3327"],
    volatilityTone: "low",
    liquidityNotes: "Thin liquidity typical for Sydney open. AUD/NZD crosses most active.",
    keyLevels: ["Gold $3320 support", "AUD/USD 0.6440 key level"],
    whatChanged: "Minimal price action. Asian equities mixed.",
    carriesForward: "Watch AUD reaction to China PMI data.",
    open: "22:00",
    close: "07:00",
  },
  {
    session: "asia",
    status: "closed",
    keyMoves: ["Gold up 0.6% to $3338 — safe-haven bid on ME tensions", "JPY strengthened 0.4%"],
    volatilityTone: "moderate",
    liquidityNotes: "Better liquidity during Tokyo overlap. JPY crosses, Gold, and Oil most active.",
    keyLevels: ["Gold $3340 resistance", "USD/JPY 142.00 key support"],
    whatChanged: "Risk-off tone dominated. Middle East headlines drove gold bid.",
    carriesForward: "Gold momentum carries; watch London's reaction to overnight highs.",
    open: "00:00",
    close: "09:00",
  },
  {
    session: "london",
    status: "active",
    keyMoves: ["EUR/USD +0.25% on ECB speakers", "Gold consolidated $3328–$3342 range"],
    volatilityTone: "moderate",
    liquidityNotes: "Full institutional liquidity. EUR/GBP pairs, Gold, and EU indices driving volume.",
    keyLevels: ["Gold $3350 key resistance", "EUR/USD 1.1400 breakout watch"],
    whatChanged: "EUR bid after hawkish ECB commentary. Gold holding overnight gains.",
    carriesForward: "NY open will be key — NFP positioning may create squeeze.",
    open: "08:00",
    close: "17:00",
  },
  {
    session: "new-york",
    status: "opening",
    keyMoves: [],
    volatilityTone: "high",
    liquidityNotes: "Highest volume session. USD pairs, Gold, Oil, and US indices dominate.",
    keyLevels: ["DXY 104.50 critical level", "Gold $3360 key resistance"],
    whatChanged: "Session just opening — awaiting US data.",
    carriesForward: "NFP data will set the tone for weekly close.",
    open: "13:00",
    close: "22:00",
  },
];

export const MOCK_CATALYSTS: CatalystEvent[] = [
  {
    id: "cat-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    headline: "BREAKING: US Treasury yields spike 8bps on strong jobs preview",
    type: "breaking",
    impactScore: 8,
    affectedAssets: ["XAUUSD", "DXY", "USDJPY"],
    summary: "10-year yield back above 4.50% — rate pressure building ahead of NFP",
    source: "Bloomberg",
  },
  {
    id: "cat-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    headline: "Gold extends gains for 3rd session — geopolitical premium elevated",
    type: "breaking",
    impactScore: 6,
    affectedAssets: ["XAUUSD", "XAGUSD"],
    summary: "Spot gold testing $3340 resistance. Physical demand from EM central banks supportive.",
    source: "Reuters",
  },
];

export function getMockAgentResult(symbol: string, timeframe = "H1"): AgentRunResult {
  const rand = seededRand(SEED + symbol.charCodeAt(0) + timeframe.charCodeAt(0));
  const kl = getMockKeyLevels(symbol);
  const confidence = Math.round(rand() * 60 + 20);
  const cscore = (rand() - 0.5) * 60;
  const bias = Math.abs(cscore) < 10 ? "no-trade" : cscore > 0 ? "bullish" : "bearish";
  const isBlocked = kl.riskGateStatus === "BLOCKED";
  const finalBias = isBlocked ? "no-trade" : bias;

  return {
    id: `${Math.round(rand() * 999999)}_${symbol}_${timeframe}`,
    timestamp: new Date().toISOString(),
    symbol,
    symbolDisplay: `${kl.asset.replace("USD", "/USD").replace("XAUUSD", "Gold (XAUUSD)")}`,
    timeframe,
    finalBias,
    confidence,
    consensusScore: Math.round(cscore * 100) / 100,
    strategyMatch:
      finalBias === "bullish"
        ? "OB Sweep + BOS Retest — Continuation Long"
        : finalBias === "bearish"
        ? "Premium Short — Price at HTF Resistance"
        : "No Setup — Accumulation Phase",
    noTradeReason: finalBias === "no-trade"
      ? isBlocked
        ? "Risk gate: volatility elevated — wait for session reset"
        : "Consensus insufficient — agents split, no high-confidence edge"
      : null,
    priceAtSignal: kl.price,
    tradePlan: finalBias !== "no-trade" && kl.rrRatio >= 2
      ? {
          direction: finalBias as "long" | "short",
          entry: kl.entry,
          stopLoss: kl.stopLoss,
          tp1: kl.tp1,
          tp2: kl.tp2,
          rrRatio: kl.rrRatio,
        }
      : null,
    status: "open",
    outcome: null,
    supports: [
      `Trend (${kl.htfBias.toUpperCase()} ${kl.htfConfidence}%): HTF bias confirmed — ${kl.smcContext}`,
      `Price Action (BULLISH 65%): BOS to upside on H1 — OB zone holding as support`,
      `News/Macro (NEUTRAL 40%): Mixed macro backdrop — geopolitical premium elevated`,
      `Market phase: ${kl.marketStructure.premiumDiscount} — ${kl.marketStructure.bos ? "BOS confirmed" : "structure unclear"}`,
    ],
    invalidations: [
      `Break below ${kl.stopLoss} invalidates OB — hard stop`,
      `News event within 30min — avoid entries before release`,
    ],
    agents: {
      trend: { verdict: kl.htfBias === "bullish" ? "BULLISH" : "BEARISH", pct: kl.htfConfidence, reasoning: "HTF structure bullish, price above EQ" },
      priceAction: { verdict: kl.marketStructure.bos ? "BULLISH" : "NEUTRAL", pct: 65, reasoning: "BOS detected, OB holding as support" },
      news: { verdict: "NEUTRAL", pct: 40, reasoning: "Mixed sentiment — geopolitical bid vs rate pressure" },
      contrarian: { verdict: "NEUTRAL", pct: 30, reasoning: "No extreme positioning detected" },
    },
    riskGate: {
      grade: kl.riskGateGrade,
      status: kl.riskGateStatus,
      maxRiskPercent: kl.maxRiskPercent,
      reasoning: kl.riskGateStatus === "BLOCKED"
        ? "Volatility score below threshold — accumulation phase"
        : "Session active, volatility within parameters",
    },
    marketPhase: kl.marketStructure.premiumDiscount === "equilibrium" ? "Accumulation" : "Trending",
    macroRegime: "Geopolitical",
    invalidationConditions: [`Close below ${kl.stopLoss}`, "Fundamental regime shift"],
    executionSummary: finalBias !== "no-trade" && kl.rrRatio >= 2
      ? `${finalBias.toUpperCase()} setup armed at ${kl.entry} — SL ${kl.stopLoss} / TP1 ${kl.tp1} (R:R ${kl.rrRatio})`
      : "No executable setup at current price — waiting for structure.",
  };
}

export function getMockBias(): AssetBias[] {
  return ASSETS.map((a) => {
    const kl = getMockKeyLevels(a.symbol);
    return {
      symbol: a.symbol,
      bias: kl.bias,
      confidence: kl.htfConfidence,
      htfBias: kl.htfBias,
      reasoning: kl.smcContext,
      updatedAt: new Date().toISOString(),
    };
  });
}
