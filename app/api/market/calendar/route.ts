// /api/market/calendar
import { NextRequest, NextResponse } from "next/server";
import { MOCK_CALENDAR } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const impact = searchParams.get("impact");
  const currency = searchParams.get("currency");

  let data = [...MOCK_CALENDAR].sort((a, b) => a.utcTimestamp - b.utcTimestamp);

  if (impact) data = data.filter((e) => e.impact === impact);
  if (currency) data = data.filter((e) => e.currency === currency);

  const goldBullish = data.filter((e) => e.goldImpact === "bullish").length;
  const goldBearish = data.filter((e) => e.goldImpact === "bearish").length;

  return NextResponse.json({
    data,
    summary: {
      goldBias: goldBearish > goldBullish ? "bearish" : goldBullish > goldBearish ? "bullish" : "neutral",
      bullishCount: goldBullish,
      bearishCount: goldBearish,
    },
    timestamp: new Date().toISOString(),
  });
}
