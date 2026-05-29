// ============================================================
// /api/market/news  (GET)
// Returns news with gold/USD impact scoring
// Production: wire to ForexLive RSS, Polygon.io, or NewsAPI
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { MOCK_NEWS } from "@/lib/mock-data";
import type { NewsCategory } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as NewsCategory | null;
  const impact = searchParams.get("impact");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  try {
    let data = [...MOCK_NEWS];

    if (category && category !== "general") {
      data = data.filter((n) => n.category === category);
    }

    if (impact) {
      const minScore = impact === "high" ? 7 : impact === "medium" ? 4 : 1;
      data = data.filter((n) => n.impactScore >= minScore);
    }

    data = data.slice(0, limit);

    return NextResponse.json({
      data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[news GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
