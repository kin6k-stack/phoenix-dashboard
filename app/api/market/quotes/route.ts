// ============================================================
// /api/market/quotes  (GET)
// Live prices for all 15 tracked assets
// POST: MT5 bot can push a single price update
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getKeyLevels } from "@/lib/store";
import { getMockQuotes, ASSETS } from "@/lib/mock-data";
import type { MarketQuote } from "@/types";

// In-memory price map — MT5 can push updates here
const priceStore = new Map<string, { price: number; change: number; changePercent: number; updatedAt: number }>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  try {
    const mockQuotes = getMockQuotes();
    const quotes: MarketQuote[] = mockQuotes.map((q) => {
      // Layer in live price if MT5 pushed one
      const live = priceStore.get(q.symbol);
      const stored = getKeyLevels(q.symbol);
      if (live && Date.now() - live.updatedAt < 5 * 60 * 1000) {
        return {
          ...q,
          price: live.price,
          change: live.change,
          changePercent: live.changePercent,
          bias: stored?.bias ?? q.bias,
          momentum: q.momentum,
        };
      }
      return stored
        ? { ...q, price: stored.price, bias: stored.bias }
        : q;
    });

    const result = symbol
      ? quotes.filter((q) => q.symbol.toUpperCase() === symbol.toUpperCase())
      : quotes;

    return NextResponse.json({
      data: result,
      timestamp: new Date().toISOString(),
      source: priceStore.size > 0 ? "mt5" : "mock",
    });
  } catch (err) {
    console.error("[quotes GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// MT5 bot pushes individual price ticks
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-phoenix-secret");
    if (process.env.MT5_PUSH_SECRET && secret !== process.env.MT5_PUSH_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { symbol, price, change, changePercent } = body;

    if (!symbol || !price) {
      return NextResponse.json({ error: "symbol and price required" }, { status: 400 });
    }

    priceStore.set(symbol.toUpperCase(), {
      price,
      change: change ?? 0,
      changePercent: changePercent ?? 0,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ success: true, symbol: symbol.toUpperCase() });
  } catch (err) {
    console.error("[quotes POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
