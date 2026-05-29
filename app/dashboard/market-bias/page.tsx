"use client";

import { useState } from "react";
import {
  RefreshCw, Radio, Shield, Target, AlertTriangle,
  Zap, TrendingUp, TrendingDown, Minus, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, LiveBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConvictionGauge } from "@/components/ui/conviction-gauge";
import { cn } from "@/lib/utils";
import { useAgentRun, useQuotes } from "@/lib/hooks";
import type { MarketQuote } from "@/types";

// The 4 instrument tabs shown by default
const DEFAULT_INSTRUMENTS = ["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD"];

const SYMBOL_LABELS: Record<string, string> = {
  XAUUSD: "Gold Spot",
  EURUSD: "DXY Proxy",
  GBPUSD: "Cable",
  BTCUSD: "Bitcoin",
};

const TIMEFRAMES = ["M15", "H1", "H4", "D1"];

// ── Sub-components ────────────────────────────────────────

function AgentVerdict({ verdict, pct }: { verdict: string; pct: number }) {
  const color =
    verdict === "BULLISH"
      ? "text-emerald-400"
      : verdict === "BEARISH"
      ? "text-red-400"
      : "text-zinc-400";
  const barColor =
    verdict === "BULLISH"
      ? "bg-emerald-500"
      : verdict === "BEARISH"
      ? "bg-red-500"
      : "bg-zinc-600";
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-[10px] font-bold tracking-wider w-14 shrink-0", color)}>
        {verdict}
      </span>
      <div className="flex-1 h-1 bg-zinc-800 rounded-full">
        <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-zinc-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function InstrumentTab({
  quote,
  active,
  onClick,
}: {
  quote: MarketQuote | undefined;
  symbol: string;
  active: boolean;
  onClick: () => void;
}) {
  const change = quote?.changePercent ?? 0;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start px-3 py-2.5 rounded-lg border transition-all text-left min-w-[100px]",
        active
          ? "bg-emerald-500/[0.07] border-emerald-500/30"
          : "bg-[var(--t-card)] border-[var(--t-border)] hover:bg-white/[0.02]"
      )}
    >
      <span className={cn("text-sm font-semibold", active ? "text-foreground" : "text-zinc-400")}>
        {quote?.symbol.replace("USD", "/USD").replace("XAUUSD", "XAU/USD") ?? "—"}
      </span>
      <span className="text-[10px] text-zinc-500 mt-0.5">
        {SYMBOL_LABELS[quote?.symbol ?? ""] ?? quote?.name ?? "—"}
      </span>
      <span
        className={cn(
          "text-xs font-mono mt-1",
          change > 0 ? "text-emerald-400" : change < 0 ? "text-red-400" : "text-zinc-500"
        )}
      >
        {change >= 0 ? "+" : ""}{change.toFixed(2)}%
      </span>
    </button>
  );
}

function FinalBiasDisplay({ bias, confidence }: { bias: string; confidence: number }) {
  if (bias === "no-trade") {
    return (
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
          NO TRADE
        </span>
      </div>
    );
  }
  if (bias === "bullish") {
    return (
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-sm font-semibold text-emerald-400">
          <TrendingUp className="h-3.5 w-3.5" />
          BULLISH
        </span>
        <span className="text-xs text-zinc-500">{confidence}% confidence</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-sm font-semibold text-red-400">
        <TrendingDown className="h-3.5 w-3.5" />
        BEARISH
      </span>
      <span className="text-xs text-zinc-500">{confidence}% confidence</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-1/3" />
          <div className="h-12 bg-zinc-800 rounded w-2/3" />
          <div className="h-3 bg-zinc-800 rounded w-full" />
          <div className="h-3 bg-zinc-800 rounded w-4/5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function MarketBiasPage() {
  const [activeSymbol, setActiveSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("H1");

  const { data: quotes, loading: quotesLoading } = useQuotes(30_000);
  const { data: agent, loading: agentLoading, error: agentError, refresh } = useAgentRun(activeSymbol, timeframe);

  const activeQuote = quotes.find((q) => q.symbol === activeSymbol);

  // Consensus bar position (score is -100 to +100, map to 0-100%)
  const barPos = agent
    ? Math.round(((agent.consensusScore + 100) / 200) * 100)
    : 50;

  const glowColor =
    agent?.finalBias === "bullish"
      ? "green"
      : agent?.finalBias === "bearish"
      ? "red"
      : undefined;

  const cacheAge = agent?.cachedAt
    ? Math.round((Date.now() - new Date(agent.cachedAt).getTime()) / 1000)
    : null;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Market Bias</h1>
          <p className="text-xs text-[var(--t-muted)] mt-0.5">
            Multi-agent consensus · same engine as AI Brain Terminal
          </p>
        </div>
        <div className="flex items-center gap-2">
          {agent?.cached ? (
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider">
              <Radio className="h-3 w-3" />
              CACHED {cacheAge !== null ? `· ${cacheAge}s ago` : ""}
            </span>
          ) : (
            <LiveBadge />
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={refresh}
            disabled={agentLoading}
          >
            <RefreshCw className={cn("h-3 w-3", agentLoading && "animate-spin")} />
            REFRESH
          </Button>
        </div>
      </div>

      {/* ── Instrument Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {DEFAULT_INSTRUMENTS.map((sym) => {
          const q = quotes.find((q) => q.symbol === sym);
          return (
            <InstrumentTab
              key={sym}
              quote={q ?? { symbol: sym, name: SYMBOL_LABELS[sym] ?? sym, price: 0, change: 0, changePercent: 0, bias: "neutral", class: "forex", momentum: "moderate" }}
              symbol={sym}
              active={activeSymbol === sym}
              onClick={() => setActiveSymbol(sym)}
            />
          );
        })}
      </div>

      {/* ── Timeframe Tabs ── */}
      <div className="flex items-center gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={cn(
              "px-3 py-1 rounded text-xs font-medium transition-colors",
              timeframe === tf
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
            )}
          >
            {tf}
          </button>
        ))}
        {activeQuote && (
          <span className="ml-auto text-sm font-mono text-foreground">
            {activeQuote.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* ── Cache Freshness ── */}
      {agent && (
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1 text-emerald-400">
            <RefreshCw className="h-2.5 w-2.5" />
            {agent.cached ? `Cached · generated ${new Date(agent.timestamp).toLocaleTimeString()}` : `Live · generated just now`}
          </span>
          <div className="flex-1 h-px bg-zinc-800 relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full bg-emerald-500/40 rounded-full" style={{ width: cacheAge ? `${Math.min((cacheAge / 300) * 100, 100)}%` : "5%" }} />
          </div>
          <span>
            {activeSymbol} · {timeframe}
          </span>
        </div>
      )}

      {/* ── Master Verdict ── */}
      {agentLoading ? (
        <SkeletonCard />
      ) : agentError ? (
        <Card>
          <CardContent className="p-5 text-center text-sm text-red-400">
            Agent error: {agentError}
          </CardContent>
        </Card>
      ) : agent ? (
        <Card glow={glowColor}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Badge row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    MULTI-AGENT · {activeSymbol} · {timeframe}
                  </span>
                </div>

                <FinalBiasDisplay bias={agent.finalBias} confidence={agent.confidence} />

                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">MASTER VERDICT</p>
                <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-3 leading-none">
                  {agent.finalBias === "no-trade"
                    ? "NO TRADE"
                    : agent.finalBias.toUpperCase()}
                </h2>

                {agent.noTradeReason && (
                  <p className="text-xs text-amber-400 mb-1 leading-relaxed">
                    {agent.noTradeReason}
                  </p>
                )}
                <p className="text-xs text-zinc-500 italic">{agent.strategyMatch}</p>

                {/* Trade Plan */}
                {agent.tradePlan && (
                  <div className="mt-3 p-3 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-lg grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">ENTRY</p>
                      <p className="text-sm font-mono font-semibold text-foreground">{agent.tradePlan.entry.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">SL</p>
                      <p className="text-sm font-mono font-semibold text-red-400">{agent.tradePlan.stopLoss.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">R:R</p>
                      <p className="text-sm font-mono font-semibold text-emerald-400">1:{agent.tradePlan.rrRatio}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">TP1</p>
                      <p className="text-sm font-mono font-semibold text-emerald-400">{agent.tradePlan.tp1.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">TP2</p>
                      <p className="text-sm font-mono font-semibold text-emerald-400">{agent.tradePlan.tp2.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">DIR</p>
                      <p className={cn("text-sm font-mono font-semibold uppercase", agent.tradePlan.direction === "long" ? "text-emerald-400" : "text-red-400")}>
                        {agent.tradePlan.direction}
                      </p>
                    </div>
                  </div>
                )}

                {/* Consensus Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
                    <span className="text-red-400/70">◀ BEARISH</span>
                    <span>
                      Consensus{" "}
                      <span className={cn("font-semibold", agent.consensusScore > 0 ? "text-emerald-400" : agent.consensusScore < 0 ? "text-red-400" : "text-zinc-400")}>
                        {agent.consensusScore > 0 ? "+" : ""}{Math.round(agent.consensusScore)}
                      </span>
                    </span>
                    <span className="text-emerald-400/70">BULLISH ▶</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full relative">
                    <div
                      className={cn(
                        "absolute h-full w-2.5 rounded-full transition-all duration-700",
                        agent.consensusScore > 0 ? "bg-emerald-500" : "bg-red-500"
                      )}
                      style={{ left: `${Math.max(2, Math.min(95, barPos))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <ConvictionGauge value={agent.confidence} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Agent Consensus ── */}
      {agent && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold">Agent Consensus</h3>
            </div>
            <div className="space-y-3">
              {[
                { name: "Trend Agent", key: "trend", weight: "×0.25", data: agent.agents.trend },
                { name: "Price Action", key: "priceAction", weight: "×0.30", data: agent.agents.priceAction },
                { name: "News Agent", key: "news", weight: "×0.15", data: agent.agents.news },
                { name: "Contrarian", key: "contrarian", weight: "×0.10", data: agent.agents.contrarian },
              ].map(({ name, weight, data: ad }) => (
                <div key={name}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs text-zinc-400 w-28 shrink-0">{name}</span>
                    <AgentVerdict verdict={ad.verdict} pct={ad.pct} />
                    <span className="text-[10px] text-zinc-600 w-10 text-right shrink-0">{weight}</span>
                  </div>
                  {ad.reasoning && (
                    <p className="text-[10px] text-zinc-600 ml-28 leading-relaxed">{ad.reasoning}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--t-border)] grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">MARKET PHASE</p>
                <p className="text-sm font-medium text-foreground">{agent.marketPhase}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">MACRO REGIME</p>
                <p className="text-sm font-medium text-foreground">{agent.macroRegime}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Risk Gate ── */}
      {agent && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold">Risk Gate</h3>
              <span
                className={cn(
                  "ml-auto text-[10px] font-bold tracking-wider px-2 py-0.5 rounded",
                  agent.riskGate.status === "CLEAR"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : agent.riskGate.status === "CAUTION"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-red-500/10 text-red-400"
                )}
              >
                {agent.riskGate.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Grade</p>
                <span
                  className={cn(
                    "w-8 h-8 rounded flex items-center justify-center text-sm font-bold border",
                    agent.riskGate.grade === "A"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : agent.riskGate.grade === "B"
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      : agent.riskGate.grade === "C"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                  )}
                >
                  {agent.riskGate.grade}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Max Risk</p>
                <p className="text-sm font-semibold font-mono text-foreground">{agent.riskGate.maxRiskPercent}%</p>
              </div>
            </div>
            {agent.riskGate.reasoning && (
              <p className="mt-3 text-xs text-zinc-500 leading-relaxed">{agent.riskGate.reasoning}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Supports & Invalidations ── */}
      {agent && (agent.supports.length > 0 || agent.invalidations.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agent.supports.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Supporting Factors</h3>
                </div>
                <ul className="space-y-2">
                  {agent.supports.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-zinc-400 leading-relaxed">
                      <ChevronRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {agent.invalidations.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Invalidation Conditions</h3>
                </div>
                <ul className="space-y-2">
                  {agent.invalidations.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-zinc-400 leading-relaxed">
                      <ChevronRight className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Execution Summary ── */}
      {agent?.executionSummary && (
        <Card glow={agent.tradePlan ? "green" : undefined}>
          <CardContent className="p-4">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">EXECUTION SUMMARY</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{agent.executionSummary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
