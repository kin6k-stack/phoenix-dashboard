// ============================================================
// /api/signals
// GET  → Signal history with stats
// POST → MT5 bot updates signal outcome (win/loss)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSignals, computeSignalStats } from "@/lib/store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "ALL";
  const period = searchParams.get("period") ?? "30d";
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  try {
    const signals = getSignals(symbol, period);
    const stats = computeSignalStats(signals, symbol, period);
    const recent = signals.slice(0, limit);

    return NextResponse.json({ stats, recent, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[signals GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// MT5 bot reports trade outcome
// Body: { signalId: string, status: "win_tp1"|"win_tp2"|"loss"|"breakeven", priceAtResolution: number }
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-phoenix-secret");
    if (process.env.MT5_PUSH_SECRET && secret !== process.env.MT5_PUSH_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { signalId, status, priceAtResolution } = body;

    if (!signalId || !status) {
      return NextResponse.json({ error: "signalId and status required" }, { status: 400 });
    }

    // Find and update the signal in the store
    const signals = getSignals();
    const signal = signals.find((s) => s.id === signalId);

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    signal.status = status;
    if (priceAtResolution && signal.tradePlan) {
      const entry = signal.tradePlan.entry;
      const sl = signal.tradePlan.stopLoss;
      const riskAmount = Math.abs(entry - sl);
      const pnlR =
        status === "win_tp1"
          ? signal.tradePlan.rrRatio
          : status === "win_tp2"
          ? signal.tradePlan.rrRatio * 1.5
          : status === "loss"
          ? -1
          : 0;

      signal.outcome = {
        resolvedAt: new Date().toISOString(),
        priceAtResolution,
        pnlPercent: Math.round(pnlR * riskAmount / entry * 100 * 100) / 100,
        pnlR,
      };
    }

    return NextResponse.json({ success: true, signalId, status });
  } catch (err) {
    console.error("[signals POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
