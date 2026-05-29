// ============================================================
// PHOENIX TRADING DASHBOARD — SHARED TYPE DEFINITIONS
// ============================================================

// ── Asset & Bias ──────────────────────────────────────────
export type BiasDirection = "bullish" | "bearish" | "neutral" | "no-trade";
export type MomentumStrength = "strong" | "moderate" | "weak";
export type AssetClass = "commodity" | "forex" | "crypto";
export type RiskGateStatus = "CLEAR" | "CAUTION" | "BLOCKED";
export type TradeStatus = "NO TRADE" | "ARMED" | "ACTIVE";
export type SignalOutcome = "win_tp1" | "win_tp2" | "loss" | "open" | "informational" | "breakeven";
export type SessionName = "sydney" | "asia" | "london" | "new-york";
export type SessionStatus = "active" | "closed" | "opening" | "closing";
export type ImpactLevel = "low" | "medium" | "high";
export type AgentVerdict = "BULLISH" | "BEARISH" | "NEUTRAL";

// ── Market Quote ──────────────────────────────────────────
export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  bias: BiasDirection;
  class: AssetClass;
  momentum: MomentumStrength;
}

export interface QuotesResponse {
  data: MarketQuote[];
  timestamp: string;
}

// ── Key Levels / SMC ──────────────────────────────────────
export interface OrderBlock {
  price: number;
  zone: [number, number];
  type: "bullish" | "bearish";
  valid: boolean;
}

export interface FVG {
  high: number;
  low: number;
  midpoint: number;
  direction: "bullish" | "bearish";
  filled: boolean;
}

export interface MarketStructure {
  trend: "bullish" | "bearish" | "ranging";
  bos: boolean;
  choch: boolean;
  premiumDiscount: "premium" | "equilibrium" | "discount";
  equilibrium: number;
}

export interface AlignmentData {
  type: "continuation" | "reversal" | "counter-trend";
  phase: string;
  explanation: string;
  riskMultiplier: number;
  confidenceAdjustment: number;
}

export interface KeyLevelsData {
  asset: string;
  price: number;
  pctChange: number;
  high52w: number;
  low52w: number;
  bias: BiasDirection;
  htfBias: BiasDirection;
  htfConfidence: number;
  smcContext: string;
  alignment: AlignmentData;
  tradeStatus: TradeStatus;
  tradeStatusReason: string;
  setupQuality: string;
  marketStructure: MarketStructure;
  orderBlock: OrderBlock;
  fvg: FVG;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  rrRatio: number;
  riskGateGrade: "A" | "B" | "C" | "D";
  riskGateStatus: RiskGateStatus;
  maxRiskPercent: number;
  volatilityScore: number;
  sessionScore: number;
  session?: SessionName;
}

export interface KeyLevelsResponse {
  data: KeyLevelsData[];
  timestamp: string;
}

// ── MT5 Push Payload (from bot → Phoenix) ─────────────────
export interface MT5KeyLevelsPush {
  asset: string;
  price: number;
  high52w: number;
  low52w: number;
  bos: boolean;
  choch: boolean;
  premiumDiscount: "premium" | "equilibrium" | "discount";
  equilibrium: number;
  orderBlock: {
    price: number;
    zone: [number, number];
    type: "bullish" | "bearish";
  };
  fvg: {
    high: number;
    low: number;
    direction: "bullish" | "bearish";
    filled: boolean;
  };
  htfBias: BiasDirection;
  htfConfidence: number;
  session: SessionName;
  volatilityScore: number;
  sessionScore?: number;
  timeframe?: string;
}

// ── Agent System ──────────────────────────────────────────
export interface AgentResult {
  verdict: AgentVerdict;
  pct: number;
  reasoning: string;
}

export interface RiskGate {
  grade: "A" | "B" | "C" | "D";
  status: RiskGateStatus;
  maxRiskPercent: number;
  reasoning?: string;
}

export interface TradePlan {
  direction: "long" | "short";
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  rrRatio: number;
}

export interface SignalOutcomeData {
  resolvedAt: string;
  priceAtResolution: number;
  pnlPercent: number;
  pnlR: number;
}

export interface AgentRunResult {
  id: string;
  timestamp: string;
  symbol: string;
  symbolDisplay: string;
  timeframe: string;
  finalBias: BiasDirection;
  confidence: number;
  consensusScore: number;
  strategyMatch: string;
  noTradeReason: string | null;
  priceAtSignal: number;
  tradePlan: TradePlan | null;
  status: SignalOutcome;
  outcome: SignalOutcomeData | null;
  supports: string[];
  invalidations: string[];
  agents: {
    trend: AgentResult;
    priceAction: AgentResult;
    news: AgentResult;
    contrarian: AgentResult;
  };
  riskGate: RiskGate;
  marketPhase: string;
  macroRegime: string;
  invalidationConditions: string[];
  executionSummary: string;
  cached?: boolean;
  cachedAt?: string;
}

export interface AgentRunRequest {
  symbol: string;
  timeframe: string;
  forceRefresh?: boolean;
}

// ── News ──────────────────────────────────────────────────
export type NewsCategory =
  | "general"
  | "central-banks"
  | "inflation"
  | "geopolitics"
  | "economy"
  | "tariffs"
  | "crypto"
  | "commodities";

export interface NewsItem {
  id: string;
  timestamp: string;
  headline: string;
  category: NewsCategory;
  sentiment: "bullish" | "bearish" | "neutral";
  impactScore: number;
  source: string;
  url: string;
  goldImpact: "bullish" | "bearish" | "neutral";
  goldReasoning: string;
  usdImpact: "bullish" | "bearish" | "neutral";
  usdReasoning: string;
}

export interface NewsResponse {
  data: NewsItem[];
  timestamp: string;
}

// ── Economic Calendar ─────────────────────────────────────
export interface CalendarEvent {
  id: string;
  time: string;
  date: string;
  utcTimestamp: number;
  currency: string;
  country: string;
  event: string;
  impact: ImpactLevel;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  status: "upcoming" | "completed";
  affectedAssets: string[];
  goldImpact: "bullish" | "bearish" | "neutral";
  goldReasoning: string;
  usdImpact: "bullish" | "bearish" | "neutral";
  usdReasoning: string;
  tradeImplication: string;
}

export interface CalendarResponse {
  data: CalendarEvent[];
  timestamp: string;
}

// ── Trump Monitor ─────────────────────────────────────────
export type TrumpPolicyCategory =
  | "Iran"
  | "Tariffs"
  | "China"
  | "Fed"
  | "Crypto"
  | "Oil"
  | "Trade-Policy"
  | "Geopolitics"
  | "Politics"
  | "Diplomacy"
  | "Government";

export interface TrumpPost {
  id: string;
  timestamp: string;
  content: string;
  source: string;
  sentimentClassification: "bullish" | "bearish" | "neutral";
  impactScore: number;
  affectedAssets: string[];
  policyCategory: TrumpPolicyCategory;
  whyItMatters: string;
  potentialReaction: string;
  tags: string[];
}

export interface TrumpResponse {
  data: TrumpPost[];
  timestamp: string;
}

// ── Sessions ──────────────────────────────────────────────
export interface SessionData {
  session: SessionName;
  status: SessionStatus;
  keyMoves: string[];
  volatilityTone: "low" | "moderate" | "high" | "extreme";
  liquidityNotes: string;
  keyLevels: string[];
  whatChanged: string;
  carriesForward: string;
  open: string;  // UTC time HH:MM
  close: string; // UTC time HH:MM
}

export interface SessionsResponse {
  data: SessionData[];
  currentSession: SessionName;
  nextSession: SessionName;
  timestamp: string;
}

// ── Signals ───────────────────────────────────────────────
export interface SymbolStats {
  total: number;
  wins: number;
  losses: number;
  breakeven: number;
  hitRate: number;
  avgRR?: number;
}

export interface SignalStats {
  symbol: string;
  period: string;
  totalSignals: number;
  directionalSignals: number;
  armedSignals: number;
  wins: number;
  losses: number;
  breakeven: number;
  stillOpen: number;
  hitRate: number;
  avgRR: number;
  totalPnlR: number;
  bySymbol: Record<string, SymbolStats>;
}

export interface SignalsResponse {
  stats: SignalStats;
  recent: AgentRunResult[];
}

// ── Catalysts ─────────────────────────────────────────────
export interface CatalystEvent {
  id: string;
  timestamp: string;
  headline: string;
  type: "breaking" | "scheduled" | "completed";
  impactScore: number;
  affectedAssets: string[];
  summary: string;
  source: string;
}

export interface CatalystsResponse {
  data: CatalystEvent[];
  timestamp: string;
}

// ── Market Analysis ───────────────────────────────────────
export interface MacroRegimeData {
  riskSentiment: { label: string; value: string; color: string };
  rateRegime: { label: string; value: string; color: string };
  inflation: { label: string; value: string; color: string };
  usdRegime: { label: string; value: string; color: string };
  volatility: { label: string; value: string; color: string };
}

export interface MarketAnalysis {
  narrative: string;
  regime: string;
  dominantTheme: string;
  conviction: number;
  cautionFactors: string[];
  macroRegime: MacroRegimeData;
  timestamp: string;
}

// ── PnL ───────────────────────────────────────────────────
export interface TradeEntry {
  id: string;
  date: string;
  symbol: string;
  direction: "long" | "short";
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  rMultiple: number;
  notes?: string;
  source: "bot" | "manual";
  botName?: string;
}

export interface PnLResponse {
  trades: TradeEntry[];
  stats: {
    totalTrades: number;
    wins: number;
    losses: number;
    breakeven: number;
    totalPnl: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    maxDrawdown: number;
  };
}

// ── Bias ──────────────────────────────────────────────────
export interface AssetBias {
  symbol: string;
  bias: BiasDirection;
  confidence: number;
  htfBias: BiasDirection;
  reasoning: string;
  updatedAt: string;
}

export interface BiasResponse {
  data: AssetBias[];
  timestamp: string;
}
