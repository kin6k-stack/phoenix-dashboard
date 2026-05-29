// ============================================================
// /api/pnl
// GET  → P&L calendar data, stats, trade history
// POST → Add a new trade entry (manual or bot-reported)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import type { TradeEntry, PnLResponse } from "@/types";

// In-memory trade store (swap for Firebase in prod)
const tradeLog: TradeEntry[] = [];

function computeStats(trades: TradeEntry[]) {
  const wins      = trades.filter((t) => t.pnl > 0);
  const losses    = trades.filter((t) => t.pnl < 0);
  const breakeven = trades.filter((t) => t.pnl === 0);
  const totalPnl  = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate   = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const avgWin    = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss   = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const profitFactor =
    losses.length > 0 && Math.abs(avgLoss) > 0
      ? Math.abs(avgWin * wins.length) / Math.abs(avgLoss * losses.length)
      : 0;

  // Max drawdown (running equity)
  let peak = 0;
  let equity = 0;
  let maxDD = 0;
  for (const t of trades) {
    equity += t.pnl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;
  }

  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    totalPnl: Math.round(totalPnl * 100) / 100,
    winRate: Math.round(winRate * 10) / 10,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    maxDrawdown: Math.round(maxDD * 100) / 100,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const month  = searchParams.get("month"); // YYYY-MM
  const source = searchParams.get("source") as "bot" | "manual" | null;

  let trades = [...tradeLog].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (symbol) trades = trades.filter((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
  if (month)  trades = trades.filter((t) => t.date.startsWith(month));
  if (source) trades = trades.filter((t) => t.source === source);

  const stats = computeStats(trades);

  return NextResponse.json({
    trades,
    stats,
    timestamp: new Date().toISOString(),
  } satisfies PnLResponse);
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-phoenix-secret");
    if (process.env.MT5_PUSH_SECRET && secret !== process.env.MT5_PUSH_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const trade: TradeEntry = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: body.date ?? new Date().toISOString().split("T")[0],
      symbol: body.symbol,
      direction: body.direction,
      entry: body.entry,
      exit: body.exit,
      size: body.size ?? 0.01,
      pnl: body.pnl ?? 0,
      pnlPercent: body.pnlPercent ?? 0,
      rMultiple: body.rMultiple ?? 0,
      notes: body.notes,
      source: body.source ?? "manual",
      botName: body.botName,
    };

    // Validate required fields
    if (!trade.symbol || !trade.direction || !trade.entry || !trade.exit) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, direction, entry, exit" },
        { status: 400 }
      );
    }

    tradeLog.unshift(trade);

    return NextResponse.json({ success: true, trade });
  } catch (err) {
    console.error("[pnl POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
