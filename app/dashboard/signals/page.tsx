"use client";

import { useState } from "react";
import { History, TrendingUp, TrendingDown, Minus, Clock, BarChart2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSignals } from "@/lib/hooks";
import type { AgentRunResult } from "@/types";

const SYMBOLS = ["ALL", "XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "USOIL"];
const PERIODS = [
  { label: "24h", value: "1d" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "All time", value: "all" },
];

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
        <p className={cn("text-2xl font-bold font-mono", color ?? "text-foreground")}>{value}</p>
        {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SignalRow({ signal }: { signal: AgentRunResult }) {
  const isWin = signal.status === "win_tp1" || signal.status === "win_tp2";
  const isLoss = signal.status === "loss";
  const isOpen = signal.status === "open";

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
      isWin  ? "bg-emerald-500/[0.04] border-emerald-500/10" :
      isLoss ? "bg-red-500/[0.04] border-red-500/10" :
               "bg-[var(--t-card)] border-[var(--t-border)]"
    )}>
      <div className={cn(
        "h-8 w-1 rounded-full shrink-0",
        signal.finalBias === "bullish" ? "bg-emerald-500" :
        signal.finalBias === "bearish" ? "bg-red-500" : "bg-zinc-600"
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold font-mono text-foreground">{signal.symbol}</span>
          <span className="text-[10px] text-zinc-500">{signal.timeframe}</span>
          {signal.tradePlan && (
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              signal.tradePlan.direction === "long" ? "text-emerald-400" : "text-red-400"
            )}>
              {signal.tradePlan.direction}
            </span>
          )}
        </div>
        <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{signal.strategyMatch}</p>
      </div>

      {signal.tradePlan && (
        <div className="text-right shrink-0">
          <p className="text-[10px] text-zinc-500">R:R</p>
          <p className="text-xs font-mono font-semibold text-foreground">1:{signal.tradePlan.rrRatio}</p>
        </div>
      )}

      <div className="shrink-0">
        {isWin ? (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            {signal.status === "win_tp1" ? "WIN TP1" : "WIN TP2"}
          </span>
        ) : isLoss ? (
          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">LOSS</span>
        ) : isOpen ? (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            OPEN
          </span>
        ) : (
          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
            {signal.status.toUpperCase()}
          </span>
        )}
      </div>

      <div className="text-right shrink-0 text-[10px] text-zinc-600">
        {new Date(signal.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}

export default function SignalsPage() {
  const [activeSymbol, setActiveSymbol] = useState("ALL");
  const [activePeriod, setActivePeriod] = useState("30d");
  const { data, loading } = useSignals(activeSymbol, activePeriod);

  const stats = data?.stats;

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Signal History</h1>
        <p className="text-xs text-[var(--t-muted)] mt-0.5">
          Full transparency. Every agent decision is logged, tracked to outcome, and stored.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {SYMBOLS.map((sym) => (
            <button
              key={sym}
              onClick={() => setActiveSymbol(sym)}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-colors",
                activeSymbol === sym
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
              )}
            >
              {sym}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setActivePeriod(p.value)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                activePeriod === p.value
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-2.5 bg-zinc-800 rounded w-2/3" />
                  <div className="h-7 bg-zinc-800 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <StatCard
            label="Hit Rate"
            value={stats.armedSignals > 0 ? `${stats.hitRate}%` : "—"}
            sub={`${stats.wins}W · ${stats.losses}L · ${stats.breakeven}BE`}
            color={stats.hitRate >= 55 ? "text-emerald-400" : stats.hitRate >= 45 ? "text-amber-400" : "text-red-400"}
          />
          <StatCard
            label="Total R"
            value={stats.totalPnlR !== 0 ? `${stats.totalPnlR > 0 ? "+" : ""}${stats.totalPnlR}R` : "—"}
            sub={`${stats.armedSignals} armed signals`}
            color={stats.totalPnlR > 0 ? "text-emerald-400" : stats.totalPnlR < 0 ? "text-red-400" : undefined}
          />
          <StatCard label="Avg R:R" value={stats.avgRR > 0 ? `1:${stats.avgRR}` : "—"} sub="Target RR per signal" />
          <StatCard label="Still Open" value={stats.stillOpen} sub="Active positions" />
          <StatCard
            label="Total Signals"
            value={stats.totalSignals}
            sub={`${stats.directionalSignals} directional`}
          />
        </div>
      ) : null}

      {/* Signal Log */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-400">Recent Signals</h2>
          {data?.recent && (
            <span className="text-[10px] text-zinc-600">{data.recent.length} logged</span>
          )}
        </div>

        {data?.recent && data.recent.length > 0 ? (
          <div className="space-y-2">
            {data.recent.map((signal) => (
              <SignalRow key={signal.id} signal={signal} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <History className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No signals logged yet</p>
              <p className="text-xs text-zinc-600 mt-1">
                Run an agent analysis from Market Bias to start logging signals
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
