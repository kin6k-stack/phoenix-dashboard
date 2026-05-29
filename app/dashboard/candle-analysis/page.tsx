"use client";

import { useState, useEffect, useRef } from "react";
import { Lightbulb, RefreshCw, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LiveBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuotes } from "@/lib/hooks";

const SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "USOIL", "XAGUSD"];

interface CandleAnalysis {
  pattern: string;
  type: "bullish" | "bearish" | "neutral";
  strength: number;
  description: string;
  implication: string;
  keySMCTag: string;
}

// Local candle pattern detection (client-side, no API needed)
function detectCandlePattern(
  open: number,
  high: number,
  low: number,
  close: number,
  prevOpen?: number,
  prevClose?: number
): CandleAnalysis {
  const body = Math.abs(close - open);
  const range = high - low;
  const upperWick = high - Math.max(open, close);
  const lowerWick = Math.min(open, close) - low;
  const bodyRatio = range > 0 ? body / range : 0;
  const isBull = close > open;

  // Doji
  if (bodyRatio < 0.1) {
    return {
      pattern: "Doji",
      type: "neutral",
      strength: 45,
      description: "Open and close virtually equal — extreme indecision between buyers and sellers.",
      implication: "Potential reversal signal after a trend. Wait for confirmation on the next candle.",
      keySMCTag: "Equilibrium / Decision Candle",
    };
  }

  // Hammer / Inverted Hammer
  if (lowerWick > body * 2 && upperWick < body * 0.3) {
    return {
      pattern: "Hammer",
      type: "bullish",
      strength: 72,
      description: "Long lower wick with small body at the top. Buyers aggressively rejected lower prices.",
      implication: "Strong bullish reversal candidate at support zones or OB mitigation.",
      keySMCTag: "OB Mitigation / Liquidity Sweep",
    };
  }

  if (upperWick > body * 2 && lowerWick < body * 0.3) {
    return {
      pattern: isBull ? "Shooting Star" : "Inverted Hammer",
      type: isBull ? "bearish" : "bullish",
      strength: 68,
      description: isBull
        ? "Long upper wick — sellers rejected higher prices. Often marks premium zone exhaustion."
        : "Long upper wick on a down-close. Buyers tried to push but failed — often a continuation signal.",
      implication: isBull
        ? "Bearish reversal signal at resistance/premium zones. Confirm with next candle close."
        : "Continuation of bearish trend likely. No reversal signal — avoid counter-trend longs.",
      keySMCTag: isBull ? "Premium Rejection / FVG Fill" : "Bearish Continuation",
    };
  }

  // Marubozu (strong trend candle)
  if (bodyRatio > 0.85) {
    return {
      pattern: isBull ? "Bullish Marubozu" : "Bearish Marubozu",
      type: isBull ? "bullish" : "bearish",
      strength: 85,
      description: isBull
        ? "Near-perfect bullish candle — opened at low, closed at high. Buyers dominated entire session."
        : "Near-perfect bearish candle — opened at high, closed at low. Sellers dominated entire session.",
      implication: isBull
        ? "Strong BOS confirmation. Continuation likely. New OB formed — this candle's body IS the block."
        : "Strong BOS to downside. Bearish OB formed. Use this candle as entry zone on retest.",
      keySMCTag: isBull ? "Bullish OB Formation / BOS" : "Bearish OB Formation / BOS",
    };
  }

  // Engulfing (requires previous candle)
  if (prevOpen !== undefined && prevClose !== undefined) {
    const prevIsBull = prevClose > prevOpen;
    if (
      isBull &&
      !prevIsBull &&
      close > prevOpen &&
      open < prevClose
    ) {
      return {
        pattern: "Bullish Engulfing",
        type: "bullish",
        strength: 78,
        description: "Current bullish candle completely engulfs the previous bearish candle. Strong buyer takeover.",
        implication: "High-probability reversal signal. Especially powerful at OB zones or after liquidity sweeps.",
        keySMCTag: "CHoCH Confirmation / OB Entry",
      };
    }
    if (
      !isBull &&
      prevIsBull &&
      open > prevClose &&
      close < prevOpen
    ) {
      return {
        pattern: "Bearish Engulfing",
        type: "bearish",
        strength: 78,
        description: "Current bearish candle completely engulfs the previous bullish candle. Sellers overwhelmed buyers.",
        implication: "Strong reversal signal at resistance. Often marks the beginning of a bearish leg.",
        keySMCTag: "Distribution / Supply Zone Rejection",
      };
    }
  }

  // Default: regular candle
  return {
    pattern: isBull ? "Bullish Candle" : "Bearish Candle",
    type: isBull ? "bullish" : "bearish",
    strength: 50,
    description: isBull
      ? "Standard bullish close. Buyers maintained control for the session."
      : "Standard bearish close. Sellers maintained control for the session.",
    implication: "No special pattern. Assess in the context of the broader market structure.",
    keySMCTag: isBull ? "Demand-side pressure" : "Supply-side pressure",
  };
}

// Generate mock OHLC data seeded to symbol
function generateOHLC(symbol: string, count = 60) {
  const basePrices: Record<string, number> = {
    XAUUSD: 3328,
    EURUSD: 1.1385,
    GBPUSD: 1.3442,
    BTCUSD: 105420,
    USOIL: 61.2,
    XAGUSD: 32.85,
  };
  const base = basePrices[symbol] ?? 1.0;
  const volatility = base * 0.003;

  let price = base;
  const candles = [];
  const now = Date.now();

  for (let i = count; i >= 0; i--) {
    const seed = (i * 9301 + symbol.charCodeAt(0) * 49297) % 233280;
    const r = seed / 233280;
    const move = (r - 0.48) * volatility;
    const open = price;
    price = price + move;
    const high = Math.max(open, price) + Math.abs(move) * (0.3 + r * 0.7);
    const low = Math.min(open, price) - Math.abs(move) * (0.3 + r * 0.5);
    candles.push({
      time: now - i * 3600 * 1000,
      open: Math.round(open * 10000) / 10000,
      high: Math.round(high * 10000) / 10000,
      low: Math.round(low * 10000) / 10000,
      close: Math.round(price * 10000) / 10000,
    });
  }
  return candles;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

function CandleChart({
  candles,
  selectedIdx,
  onSelect,
}: {
  candles: Candle[];
  selectedIdx: number | null;
  onSelect: (i: number) => void;
}) {
  const displayCandles = candles.slice(-40);
  const prices = displayCandles.flatMap((c) => [c.high, c.low]);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const W = 580;
  const H = 200;
  const PAD = 8;
  const candleW = Math.floor((W - PAD * 2) / displayCandles.length) - 1;

  function toY(price: number) {
    return PAD + ((maxP - price) / range) * (H - PAD * 2);
  }

  return (
    <div className="overflow-x-auto">
      <svg
        width={W}
        height={H}
        className="block"
        style={{ minWidth: W }}
        onClick={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = e.clientX - rect.left - PAD;
          const idx = Math.floor(x / (candleW + 1));
          if (idx >= 0 && idx < displayCandles.length) onSelect(idx);
        }}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + frac * (H - PAD * 2)}
            y2={PAD + frac * (H - PAD * 2)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}

        {displayCandles.map((c, i) => {
          const x = PAD + i * (candleW + 1);
          const isBull = c.close >= c.open;
          const bodyTop = toY(Math.max(c.open, c.close));
          const bodyBot = toY(Math.min(c.open, c.close));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          const midX = x + candleW / 2;
          const isSelected = selectedIdx === i;

          return (
            <g key={i} style={{ cursor: "pointer" }}>
              {/* Hover highlight */}
              {isSelected && (
                <rect
                  x={x - 1}
                  y={PAD}
                  width={candleW + 2}
                  height={H - PAD * 2}
                  fill="rgba(255,255,255,0.03)"
                  rx={1}
                />
              )}
              {/* Wick */}
              <line
                x1={midX}
                x2={midX}
                y1={toY(c.high)}
                y2={toY(c.low)}
                stroke={isBull ? "#10b981" : "#ef4444"}
                strokeWidth={1}
                opacity={0.7}
              />
              {/* Body */}
              <rect
                x={x}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={isBull ? "#10b981" : "#ef4444"}
                opacity={isSelected ? 1 : 0.75}
                rx={0.5}
              />
              {/* Selected border */}
              {isSelected && (
                <rect
                  x={x}
                  y={bodyTop}
                  width={candleW}
                  height={bodyH}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={0.5}
                  rx={0.5}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function CandleAnalysisPage() {
  const [activeSymbol, setActiveSymbol] = useState("XAUUSD");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<CandleAnalysis | null>(null);

  const { data: quotes } = useQuotes(30_000);
  const activeQuote = quotes.find((q) => q.symbol === activeSymbol);

  const candles = generateOHLC(activeSymbol, 60);
  const displayCandles = candles.slice(-40);

  function handleSelect(i: number) {
    setSelectedIdx(i);
    const c = displayCandles[i];
    const prev = i > 0 ? displayCandles[i - 1] : undefined;
    setAnalysis(detectCandlePattern(c.open, c.high, c.low, c.close, prev?.open, prev?.close));
  }

  // Auto-select last candle on symbol change
  useEffect(() => {
    setSelectedIdx(null);
    setAnalysis(null);
  }, [activeSymbol]);

  const selectedCandle = selectedIdx !== null ? displayCandles[selectedIdx] : null;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Candle Analysis</h1>
          <p className="text-xs text-[var(--t-muted)] mt-0.5">
            Click any candle — AI identifies pattern, SMC context, and trade implication
          </p>
        </div>
        <LiveBadge label="H1 CHART" />
      </div>

      {/* Symbol Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {SYMBOLS.map((sym) => {
          const q = quotes.find((q) => q.symbol === sym);
          const chg = q?.changePercent ?? 0;
          return (
            <button
              key={sym}
              onClick={() => setActiveSymbol(sym)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all",
                activeSymbol === sym
                  ? "bg-emerald-500/[0.07] border-emerald-500/30 text-foreground"
                  : "bg-[var(--t-card)] border-[var(--t-border)] text-zinc-400 hover:bg-white/[0.02]"
              )}
            >
              <span className="font-semibold font-mono">{sym}</span>
              <span className={cn("font-mono text-[10px]", chg > 0 ? "text-emerald-400" : chg < 0 ? "text-red-400" : "text-zinc-500")}>
                {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold font-mono">{activeSymbol}</span>
              {activeQuote && (
                <span className="text-sm font-mono text-zinc-300">
                  {activeQuote.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              )}
              <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">H1</span>
            </div>
            <p className="text-[10px] text-zinc-500">← Click candle to analyze</p>
          </div>

          <CandleChart
            candles={candles}
            selectedIdx={selectedIdx}
            onSelect={handleSelect}
          />

          {/* Price axis hint */}
          <div className="flex items-center justify-between mt-2 text-[9px] text-zinc-700">
            <span>←40 H1 candles</span>
            <span>Latest →</span>
          </div>
        </CardContent>
      </Card>

      {/* Selected Candle Info + Analysis */}
      {selectedCandle ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OHLC Details */}
          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">
                Selected Candle · {new Date(selectedCandle.time).toLocaleString()}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Open",  value: selectedCandle.open },
                  { label: "High",  value: selectedCandle.high },
                  { label: "Low",   value: selectedCandle.low },
                  { label: "Close", value: selectedCandle.close },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] text-zinc-600 uppercase">{label}</p>
                    <p className="text-sm font-mono font-semibold text-foreground mt-0.5">
                      {value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--t-border)] grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase">Body Size</p>
                  <p className="text-xs font-mono text-foreground">
                    {Math.abs(selectedCandle.close - selectedCandle.open).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase">Direction</p>
                  <p className={cn("text-xs font-bold flex items-center gap-1", selectedCandle.close >= selectedCandle.open ? "text-emerald-400" : "text-red-400")}>
                    {selectedCandle.close >= selectedCandle.open
                      ? <><TrendingUp className="h-3 w-3" /> BULLISH</>
                      : <><TrendingDown className="h-3 w-3" /> BEARISH</>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pattern Analysis */}
          {analysis && (
            <Card className={cn(
              "border",
              analysis.type === "bullish" ? "border-emerald-500/20" :
              analysis.type === "bearish" ? "border-red-500/20" :
              "border-[var(--t-border)]"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className={cn("h-4 w-4", analysis.type === "bullish" ? "text-emerald-400" : analysis.type === "bearish" ? "text-red-400" : "text-zinc-400")} />
                    <span className="text-sm font-semibold">{analysis.pattern}</span>
                  </div>
                  {/* Strength bar */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1 bg-zinc-800 rounded-full">
                      <div
                        className={cn("h-full rounded-full", analysis.type === "bullish" ? "bg-emerald-500" : analysis.type === "bearish" ? "bg-red-500" : "bg-zinc-600")}
                        style={{ width: `${analysis.strength}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">{analysis.strength}%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">What This Means</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{analysis.description}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Trade Implication</p>
                    <p className={cn("text-xs leading-relaxed", analysis.type === "bullish" ? "text-emerald-400/80" : analysis.type === "bearish" ? "text-red-400/80" : "text-amber-400/80")}>
                      {analysis.implication}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[9px] text-zinc-600 uppercase">SMC Tag:</span>
                    <span className="text-[10px] text-blue-400/80 bg-blue-500/10 px-2 py-0.5 rounded">
                      {analysis.keySMCTag}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Lightbulb className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Click any candle on the chart above</p>
            <p className="text-xs text-zinc-600 mt-1">
              Pattern recognition, SMC context, and trade implication will appear here
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Pattern Reference</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { name: "Hammer", signal: "bullish", note: "Sweep + rejection" },
              { name: "Marubozu", signal: "strong", note: "OB formation" },
              { name: "Engulfing", signal: "reversal", note: "CHoCH signal" },
              { name: "Shooting Star", signal: "bearish", note: "Premium rejection" },
              { name: "Doji", signal: "neutral", note: "Decision candle" },
              { name: "Inside Bar", signal: "neutral", note: "Accumulation" },
            ].map(({ name, signal, note }) => (
              <div key={name} className="flex items-center gap-2 p-2 bg-zinc-900/50 rounded">
                <div className={cn("h-3 w-1 rounded-full shrink-0",
                  signal === "bullish" ? "bg-emerald-500" :
                  signal === "bearish" ? "bg-red-500" :
                  signal === "strong" ? "bg-blue-500" : "bg-zinc-600"
                )} />
                <div>
                  <p className="text-[10px] font-semibold text-zinc-300">{name}</p>
                  <p className="text-[9px] text-zinc-600">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
