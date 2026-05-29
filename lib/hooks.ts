// ============================================================
// PHOENIX — DATA HOOKS
// Client-side hooks for all API routes with polling + refresh
// ============================================================
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  AgentRunResult,
  MarketQuote,
  KeyLevelsData,
  NewsItem,
  CalendarEvent,
  TrumpPost,
  SessionData,
  CatalystEvent,
  SignalsResponse,
  MarketAnalysis,
} from "@/types";

// ── Generic fetcher ───────────────────────────────────────
async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${url} returned ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Agent Run ─────────────────────────────────────────────
export function useAgentRun(symbol: string, timeframe = "H1") {
  const [data, setData] = useState<AgentRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetch("/api/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, timeframe, forceRefresh }),
        });
        if (!result.ok) throw new Error(`Agent API error: ${result.status}`);
        const json: AgentRunResult = await result.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [symbol, timeframe]
  );

  useEffect(() => {
    run(false);
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => run(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [run]);

  return { data, loading, error, refresh: () => run(true) };
}

// ── Market Quotes ─────────────────────────────────────────
export function useQuotes(pollMs = 30_000) {
  const [data, setData] = useState<MarketQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: MarketQuote[] }>("/api/market/quotes");
      setData(res.data);
    } catch {
      // silently keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, pollMs);
    return () => clearInterval(interval);
  }, [fetch_, pollMs]);

  return { data, loading };
}

// ── Key Levels ────────────────────────────────────────────
export function useKeyLevels(symbol?: string) {
  const [data, setData] = useState<KeyLevelsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = symbol
      ? `/api/market/keylevels?symbol=${symbol}`
      : "/api/market/keylevels";
    apiFetch<{ data: KeyLevelsData[] }>(url)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  return { data, loading };
}

// ── News ──────────────────────────────────────────────────
export function useNews(category?: string, pollMs = 60_000) {
  const [data, setData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    const url = category
      ? `/api/market/news?category=${category}`
      : "/api/market/news";
    try {
      const res = await apiFetch<{ data: NewsItem[] }>(url);
      setData(res.data);
    } catch {}
    finally { setLoading(false); }
  }, [category]);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, pollMs);
    return () => clearInterval(interval);
  }, [fetch_, pollMs]);

  return { data, loading };
}

// ── Calendar ──────────────────────────────────────────────
export function useCalendar() {
  const [data, setData] = useState<CalendarEvent[]>([]);
  const [summary, setSummary] = useState<{ goldBias: string; bullishCount: number; bearishCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: CalendarEvent[]; summary: typeof summary }>("/api/market/calendar")
      .then((res) => { setData(res.data); setSummary(res.summary); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, summary, loading };
}

// ── Trump Monitor ─────────────────────────────────────────
export function useTrump(pollMs = 120_000) {
  const [data, setData] = useState<TrumpPost[]>([]);
  const [meta, setMeta] = useState<{ avgImpact: number; themeCounts: Record<string, number>; totalPosts: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: TrumpPost[]; meta: typeof meta }>("/api/market/trump");
      setData(res.data);
      setMeta(res.meta);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, pollMs);
    return () => clearInterval(interval);
  }, [fetch_, pollMs]);

  return { data, meta, loading };
}

// ── Sessions ──────────────────────────────────────────────
export function useSessions() {
  const [data, setData] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: SessionData[]; currentSession: string }>("/api/market/sessions")
      .then((res) => { setData(res.data); setCurrentSession(res.currentSession); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, currentSession, loading };
}

// ── Signals ───────────────────────────────────────────────
export function useSignals(symbol = "ALL", period = "30d") {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<SignalsResponse>(`/api/signals?symbol=${symbol}&period=${period}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol, period]);

  return { data, loading };
}

// ── Analysis ──────────────────────────────────────────────
export function useAnalysis() {
  const [data, setData] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MarketAnalysis>("/api/market/analysis")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

// ── Catalysts ─────────────────────────────────────────────
export function useCatalysts(pollMs = 60_000) {
  const [data, setData] = useState<CatalystEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: CatalystEvent[] }>("/api/market/catalysts");
      setData(res.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, pollMs);
    return () => clearInterval(interval);
  }, [fetch_, pollMs]);

  return { data, loading };
}
