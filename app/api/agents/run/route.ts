// ============================================================
// /api/agents/run  (POST)
// FIXED: Uses claude-sonnet-4-6 + exposes errors to client for debugging
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  getKeyLevels,
  appendSignal,
  getCachedAgent,
  setCachedAgent,
} from "@/lib/store";
import {
  getMockKeyLevels,
  getMockAgentResult,
  MOCK_NEWS,
  MOCK_CALENDAR,
} from "@/lib/mock-data";
import {
  buildAgentSystemPrompt,
  buildAgentUserPrompt,
  computeLocalConsensus,
} from "@/lib/agent-prompt";
import type { AgentRunResult, AgentRunRequest, TradePlan } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: AgentRunRequest = await req.json();
    const { symbol, timeframe = "H1", forceRefresh = false } = body;

    if (!symbol) {
      return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    }

    const sym = symbol.toUpperCase();

    if (!forceRefresh) {
      const cached = getCachedAgent(sym, timeframe);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const keyLevels = getKeyLevels(sym) ?? getMockKeyLevels(sym);

    const systemPrompt = buildAgentSystemPrompt();
    const userPrompt = buildAgentUserPrompt({
      keyLevels,
      news: MOCK_NEWS,
      calendar: MOCK_CALENDAR,
      timeframe,
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    let agentResult: AgentRunResult;
    let debugInfo: { mode: string; error?: string; model?: string } = { mode: "unknown" };

    if (!apiKey) {
      debugInfo = { mode: "mock", error: "ANTHROPIC_API_KEY env var not set" };
      console.warn("[agents/run] No ANTHROPIC_API_KEY — using mock");
      agentResult = getMockAgentResult(sym, timeframe);
    } else {
      const MODEL = "claude-sonnet-4-6"; // ← FIXED: was "claude-opus-4-5"

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("[agents/run] Claude API error:", response.status, errText);
          debugInfo = {
            mode: "mock",
            error: `Claude API ${response.status}: ${errText.slice(0, 200)}`,
            model: MODEL,
          };
          agentResult = getMockAgentResult(sym, timeframe);
        } else {
          const data = await response.json();
          const rawText =
            data.content?.find((c: { type: string }) => c.type === "text")?.text ?? "{}";

          try {
            const cleaned = rawText
              .replace(/```json\s*/gi, "")
              .replace(/```\s*/g, "")
              .trim();

            const parsed = JSON.parse(cleaned);

            const consensusScore =
              parsed.consensusScore ??
              computeLocalConsensus(parsed.agents ?? {
                trend: { verdict: "NEUTRAL", pct: 0 },
                priceAction: { verdict: "NEUTRAL", pct: 0 },
                news: { verdict: "NEUTRAL", pct: 0 },
                contrarian: { verdict: "NEUTRAL", pct: 0 },
              });

            const tradePlan: TradePlan | null = parsed.tradePlan
              ? {
                  direction: parsed.tradePlan.direction,
                  entry: parsed.tradePlan.entry ?? keyLevels.entry,
                  stopLoss: parsed.tradePlan.stopLoss ?? keyLevels.stopLoss,
                  tp1: parsed.tradePlan.tp1 ?? keyLevels.tp1,
                  tp2: parsed.tradePlan.tp2 ?? keyLevels.tp2,
                  rrRatio: parsed.tradePlan.rrRatio ?? keyLevels.rrRatio,
                }
              : null;

            agentResult = {
              id: `${Date.now()}_${sym}_${timeframe}`,
              timestamp: new Date().toISOString(),
              symbol: sym,
              symbolDisplay: sym,
              timeframe,
              finalBias: parsed.finalBias ?? "no-trade",
              confidence: parsed.confidence ?? 50,
              consensusScore,
              strategyMatch: parsed.strategyMatch ?? "—",
              noTradeReason: parsed.noTradeReason ?? null,
              priceAtSignal: keyLevels.price,
              tradePlan,
              status: "open",
              outcome: null,
              supports: parsed.agents
                ? [
                    `Trend (${parsed.agents.trend?.verdict ?? "?"} ${parsed.agents.trend?.pct ?? 0}%): ${parsed.agents.trend?.reasoning ?? ""}`,
                    `Price Action (${parsed.agents.priceAction?.verdict ?? "?"} ${parsed.agents.priceAction?.pct ?? 0}%): ${parsed.agents.priceAction?.reasoning ?? ""}`,
                    `News (${parsed.agents.news?.verdict ?? "?"} ${parsed.agents.news?.pct ?? 0}%): ${parsed.agents.news?.reasoning ?? ""}`,
                    `Contrarian (${parsed.agents.contrarian?.verdict ?? "?"} ${parsed.agents.contrarian?.pct ?? 0}%): ${parsed.agents.contrarian?.reasoning ?? ""}`,
                  ]
                : [],
              invalidations: parsed.invalidationConditions ?? [],
              agents: parsed.agents ?? {
                trend:       { verdict: "NEUTRAL", pct: 0, reasoning: "" },
                priceAction: { verdict: "NEUTRAL", pct: 0, reasoning: "" },
                news:        { verdict: "NEUTRAL", pct: 0, reasoning: "" },
                contrarian:  { verdict: "NEUTRAL", pct: 0, reasoning: "" },
              },
              riskGate: parsed.riskGate ?? {
                grade: keyLevels.riskGateGrade,
                status: keyLevels.riskGateStatus,
                maxRiskPercent: keyLevels.maxRiskPercent,
              },
              marketPhase: parsed.marketPhase ?? "Unknown",
              macroRegime: parsed.macroRegime ?? "Unknown",
              invalidationConditions: parsed.invalidationConditions ?? [],
              executionSummary: parsed.executionSummary ?? "",
            };
            debugInfo = { mode: "live", model: MODEL };
          } catch (parseErr) {
            console.error("[agents/run] JSON parse failed:", parseErr);
            debugInfo = {
              mode: "mock",
              error: `LLM returned invalid JSON: ${rawText.slice(0, 200)}`,
              model: MODEL,
            };
            agentResult = getMockAgentResult(sym, timeframe);
          }
        }
      } catch (fetchErr) {
        const errMsg = fetchErr instanceof Error ? fetchErr.message : "Unknown fetch error";
        console.error("[agents/run] Fetch failed:", errMsg);
        debugInfo = { mode: "mock", error: `Network error: ${errMsg}`, model: MODEL };
        agentResult = getMockAgentResult(sym, timeframe);
      }
    }

    setCachedAgent(sym, timeframe, agentResult);

    if (agentResult.finalBias !== "no-trade" || agentResult.tradePlan) {
      appendSignal(agentResult);
    }

    // Attach debug info so the dashboard can show what mode we're in
    return NextResponse.json({ ...agentResult, _debug: debugInfo });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[agents/run] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error", details: errMsg }, { status: 500 });
  }
}
