// ============================================================
// /api/market/bias  (GET)
// HTF directional bias per asset — derived from keylevels store
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getKeyLevels } from "@/lib/store";
import { getMockBias, ASSETS } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  try {
    // Try stored key levels first; fall back to mock
    const hasMT5Data = ASSETS.some((a) => !!getKeyLevels(a.symbol));
    const data = hasMT5Data
      ? ASSETS.map((a) => {
          const kl = getKeyLevels(a.symbol);
          return kl
            ? {
                symbol: a.symbol,
                bias: kl.bias,
                confidence: kl.htfConfidence,
                htfBias: kl.htfBias,
                reasoning: kl.smcContext,
                updatedAt: new Date().toISOString(),
              }
            : null;
        }).filter(Boolean)
      : getMockBias();

    return NextResponse.json({ data, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[bias GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
