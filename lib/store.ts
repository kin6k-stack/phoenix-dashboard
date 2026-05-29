// ============================================================
// PHOENIX — IN-MEMORY STORE (swap for Firebase/Redis in prod)
// ============================================================
// This module provides a lightweight in-process cache that
// mirrors the shape Phoenix will use when Firebase is wired.
// Keys: keylevels:{SYMBOL}, signals:recent, agent:{SYMBOL}:{TF}

import type {
  KeyLevelsData,
  AgentRunResult,
  SignalStats,
  SymbolStats,
} from "@/types";

// ── Key-Levels Store ─────────────────────────────────────
const keyLevelsStore = new Map<string, KeyLevelsData>();

export function setKeyLevels(symbol: string, data: KeyLevelsData) {
  keyLevelsStore.set(symbol.toUpperCase(), data);
}

export function getKeyLevels(symbol: string): KeyLevelsData | undefined {
  return keyLevelsStore.get(symbol.toUpperCase());
}

export function getAllKeyLevels(): KeyLevelsData[] {
  return Array.from(keyLevelsStore.values());
}

// ── Signal Log ────────────────────────────────────────────
const MAX_SIGNALS = 500;
const signalLog: AgentRunResult[] = [];

export function appendSignal(result: AgentRunResult) {
  signalLog.unshift(result); // newest first
  if (signalLog.length > MAX_SIGNALS) signalLog.pop();
}

export function getSignals(
  symbol?: string,
  period?: string
): AgentRunResult[] {
  let results = [...signalLog];

  if (symbol && symbol !== "ALL") {
    results = results.filter(
      (s) => s.symbol.toUpperCase() === symbol.toUpperCase()
    );
  }

  if (period) {
    const now = Date.now();
    const days = parseInt(period.replace("d", ""), 10);
    if (!isNaN(days)) {
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      results = results.filter(
        (s) => new Date(s.timestamp).getTime() > cutoff
      );
    }
  }

  return results;
}

export function computeSignalStats(
  signals: AgentRunResult[],
  symbol = "ALL",
  period = "30d"
): SignalStats {
  const directional = signals.filter(
    (s) => s.finalBias === "bullish" || s.finalBias === "bearish"
  );
  const armed = directional.filter((s) => s.tradePlan !== null);
  const wins = armed.filter(
    (s) => s.status === "win_tp1" || s.status === "win_tp2"
  );
  const losses = armed.filter((s) => s.status === "loss");
  const breakeven = armed.filter((s) => s.status === "breakeven");
  const open = armed.filter((s) => s.status === "open");

  const hitRate =
    wins.length + losses.length > 0
      ? (wins.length / (wins.length + losses.length)) * 100
      : 0;

  const avgRR =
    armed.length > 0
      ? armed.reduce((sum, s) => sum + (s.tradePlan?.rrRatio ?? 0), 0) /
        armed.length
      : 0;

  const totalPnlR = armed
    .filter((s) => s.outcome)
    .reduce((sum, s) => sum + (s.outcome?.pnlR ?? 0), 0);

  // per-symbol breakdown
  const symbolMap: Record<string, SymbolStats> = {};
  for (const sig of armed) {
    const sym = sig.symbol;
    if (!symbolMap[sym]) {
      symbolMap[sym] = {
        total: 0,
        wins: 0,
        losses: 0,
        breakeven: 0,
        hitRate: 0,
      };
    }
    symbolMap[sym].total++;
    if (sig.status === "win_tp1" || sig.status === "win_tp2")
      symbolMap[sym].wins++;
    if (sig.status === "loss") symbolMap[sym].losses++;
    if (sig.status === "breakeven") symbolMap[sym].breakeven++;
  }
  for (const sym of Object.keys(symbolMap)) {
    const s = symbolMap[sym];
    s.hitRate =
      s.wins + s.losses > 0
        ? Math.round((s.wins / (s.wins + s.losses)) * 100)
        : 0;
  }

  return {
    symbol,
    period,
    totalSignals: signals.length,
    directionalSignals: directional.length,
    armedSignals: armed.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    stillOpen: open.length,
    hitRate: Math.round(hitRate * 10) / 10,
    avgRR: Math.round(avgRR * 100) / 100,
    totalPnlR: Math.round(totalPnlR * 100) / 100,
    bySymbol: symbolMap,
  };
}

// ── Agent Cache (per symbol+timeframe) ───────────────────
const agentCache = new Map<string, { result: AgentRunResult; at: number }>();
const AGENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedAgent(
  symbol: string,
  timeframe: string
): AgentRunResult | null {
  const key = `${symbol.toUpperCase()}:${timeframe}`;
  const entry = agentCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > AGENT_CACHE_TTL) {
    agentCache.delete(key);
    return null;
  }
  return { ...entry.result, cached: true, cachedAt: new Date(entry.at).toISOString() };
}

export function setCachedAgent(
  symbol: string,
  timeframe: string,
  result: AgentRunResult
) {
  const key = `${symbol.toUpperCase()}:${timeframe}`;
  agentCache.set(key, { result, at: Date.now() });
}
