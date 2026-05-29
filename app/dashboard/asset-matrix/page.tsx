"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuotes, useAnalysis } from "@/lib/hooks";
import type { MarketQuote } from "@/types";

const CLASS_LABELS: Record<string, string> = {
  commodity: "Commodity",
  forex: "Forex",
  crypto: "Crypto",
};

const REGIME_COLORS: Record<string, string> = {
  green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  red: "text-red-400 bg-red-500/10 border-red-500/20",
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

function AssetCard({ q }: { q: MarketQuote }) {
  const positive = q.changePercent > 0;
  const negative = q.changePercent < 0;

  return (
    <Card className="hover:bg-white/[0.01] transition-colors">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-1.5">
          <div>
            <span className="text-xs font-bold font-mono text-foreground">{q.symbol}</span>
            <p className="text-[10px] text-zinc-500">{q.name}</p>
          </div>
          <Badge variant={q.bias === "bullish" ? "bullish" : q.bias === "bearish" ? "bearish" : "neutral"}>
            {q.bias.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-sm font-mono font-semibold text-foreground">
            {q.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <div className="flex items-center gap-1">
            {positive ? (
              <TrendingUp className="h-3 w-3 text-emerald-400" />
            ) : negative ? (
              <TrendingDown className="h-3 w-3 text-red-400" />
            ) : (
              <Minus className="h-3 w-3 text-zinc-500" />
            )}
            <span className={cn(
              "text-xs font-mono",
              positive ? "text-emerald-400" : negative ? "text-red-400" : "text-zinc-500"
            )}>
              {q.changePercent >= 0 ? "+" : ""}{q.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">{CLASS_LABELS[q.class]}</span>
          <span className={cn(
            "text-[10px]",
            q.momentum === "strong" ? "text-emerald-400/60" :
            q.momentum === "weak"   ? "text-red-400/60" : "text-zinc-600"
          )}>
            {q.momentum}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AssetMatrixPage() {
  const { data: quotes, loading } = useQuotes(30_000);
  const { data: analysis } = useAnalysis();

  const grouped = {
    commodity: quotes.filter((q) => q.class === "commodity"),
    forex: quotes.filter((q) => q.class === "forex"),
    crypto: quotes.filter((q) => q.class === "crypto"),
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold">Asset Matrix</h1>
        <p className="text-xs text-[var(--t-muted)] mt-0.5">
          Cross-market relationships, correlations, and macro regime
        </p>
      </div>

      {/* Macro Regime Cards */}
      {analysis?.macroRegime && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.values(analysis.macroRegime).map((regime: { label: string; value: string; color: string }) => (
            <div
              key={regime.label}
              className={cn(
                "p-3 rounded-lg border",
                REGIME_COLORS[regime.color] ?? REGIME_COLORS.blue
              )}
            >
              <p className="text-[9px] uppercase tracking-wider opacity-70 mb-1">{regime.label}</p>
              <p className="text-xs font-semibold leading-tight">{regime.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Asset Grids */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-zinc-800 rounded w-2/3" />
                  <div className="h-5 bg-zinc-800 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {(["commodity", "forex", "crypto"] as const).map((cls) => (
            <div key={cls}>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                {CLASS_LABELS[cls]}s
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {grouped[cls].map((q) => (
                  <AssetCard key={q.symbol} q={q} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Correlation Matrix */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Key Correlations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { a: "Gold", b: "DXY", corr: -0.82, note: "Strong inverse — dollar up, gold down" },
              { a: "Gold", b: "US10Y", corr: -0.65, note: "Inverse via real yields" },
              { a: "BTC", b: "NASDAQ", corr: 0.71, note: "Risk-on correlation" },
              { a: "Oil", b: "CAD", corr: 0.68, note: "Petrodollar link" },
              { a: "Gold", b: "JPY", corr: 0.58, note: "Safe-haven co-movement" },
              { a: "EUR", b: "Gold", corr: 0.45, note: "USD inverse proxy" },
            ].map(({ a, b, corr, note }) => (
              <div key={`${a}-${b}`} className="flex items-center justify-between p-2.5 bg-[var(--t-card-2)] rounded-lg border border-[var(--t-border-sub)]">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {a} ↔ {b}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{note}</p>
                </div>
                <span className={cn(
                  "text-sm font-bold font-mono ml-3 shrink-0",
                  corr > 0.5 ? "text-emerald-400" : corr < -0.5 ? "text-red-400" : "text-amber-400"
                )}>
                  {corr > 0 ? "+" : ""}{corr.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
