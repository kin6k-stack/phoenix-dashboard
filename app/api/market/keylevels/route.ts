// ============================================================
// /api/market/keylevels
// GET  → All key levels for all tracked assets
// POST → MT5 bot pushes SMC data after each candle close
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  getKeyLevels,
  getAllKeyLevels,
  setKeyLevels,
} from "@/lib/store";
import { getMockKeyLevels, ASSETS } from "@/lib/mock-data";
import type { MT5KeyLevelsPush, KeyLevelsData, OrderBlock, FVG } from "@/types";

// ── GET ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  try {
    if (symbol) {
      const stored = getKeyLevels(symbol.toUpperCase());
      const data = stored ?? getMockKeyLevels(symbol.toUpperCase());
      return NextResponse.json({ data: [data], timestamp: new Date().toISOString() });
    }

    // Return all assets — use stored if available, fallback to mock
    const all: KeyLevelsData[] = ASSETS.map((a) => {
      return getKeyLevels(a.symbol) ?? getMockKeyLevels(a.symbol);
    });

    return NextResponse.json({
      data: all,
      timestamp: new Date().toISOString(),
      source: getAllKeyLevels().length > 0 ? "mt5" : "mock",
    });
  } catch (err) {
    console.error("[keylevels GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST (MT5 bot → Phoenix) ──────────────────────────────
// Your MQL5 EA calls this after each H1 candle close
// Required headers: Content-Type: application/json
// Optional header:  X-Phoenix-Secret: <your secret>
export async function POST(req: NextRequest) {
  try {
    // ── Auth (optional shared secret) ──────────────────
    const secret = req.headers.get("x-phoenix-secret");
    const expectedSecret = process.env.MT5_PUSH_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: MT5KeyLevelsPush = await req.json();

    // ── Validate required fields ────────────────────────
    if (!body.asset || !body.price) {
      return NextResponse.json(
        { error: "Missing required fields: asset, price" },
        { status: 400 }
      );
    }

    const symbol = body.asset.toUpperCase();

    // ── Compute derived fields ──────────────────────────
    const rangePos =
      body.high52w && body.low52w
        ? (body.price - body.low52w) / (body.high52w - body.low52w)
        : 0.5;

    const pctChange =
      body.price && body.high52w
        ? ((body.price - body.high52w) / body.high52w) * 100
        : 0;

    // Risk gate computation
    const vol = body.volatilityScore ?? 50;
    const ses = body.sessionScore ?? 50;
    const riskScore = vol * 0.5 + ses * 0.5;
    const grade =
      riskScore >= 70 ? "A" : riskScore >= 55 ? "B" : riskScore >= 40 ? "C" : "D";
    const gateStatus =
      grade === "A" || grade === "B"
        ? "CLEAR"
        : grade === "C"
        ? "CAUTION"
        : "BLOCKED";

    // Compute basic entry/SL/TP from OB zone
    const ob = body.orderBlock;
    const fvg = body.fvg;
    const entry = ob ? ob.zone[1] : body.price;
    const sl = ob ? ob.zone[0] * 0.998 : body.price * 0.99;
    const range = Math.abs(entry - sl);
    const tp1 = body.htfBias === "bullish" ? entry + range * 2 : entry - range * 2;
    const tp2 = body.htfBias === "bullish" ? entry + range * 3.5 : entry - range * 3.5;
    const rrRatio = range > 0 ? Math.round((Math.abs(tp1 - entry) / range) * 10) / 10 : 0;

    const tradeArmed = gateStatus !== "BLOCKED" && rrRatio >= 2.0;

    const orderBlockData: OrderBlock = ob
      ? { price: ob.price, zone: ob.zone, type: ob.type, valid: true }
      : { price: body.price, zone: [body.price * 0.998, body.price], type: "bullish", valid: false };

    const fvgData: FVG = fvg
      ? {
          high: fvg.high,
          low: fvg.low,
          midpoint: (fvg.high + fvg.low) / 2,
          direction: fvg.direction,
          filled: fvg.filled,
        }
      : {
          high: body.price * 1.003,
          low: body.price * 0.997,
          midpoint: body.price,
          direction: "bullish",
          filled: false,
        };

    const bias =
      rangePos > 0.6 && body.htfBias === "bullish"
        ? "bullish"
        : rangePos < 0.4 && body.htfBias === "bearish"
        ? "bearish"
        : "neutral";

    const keyLevels: KeyLevelsData = {
      asset: symbol,
      price: body.price,
      pctChange: Math.round(pctChange * 1000) / 1000,
      high52w: body.high52w,
      low52w: body.low52w,
      bias,
      htfBias: body.htfBias,
      htfConfidence: body.htfConfidence,
      smcContext: `BOS ${body.bos ? "confirmed" : "pending"} | CHoCH ${body.choch ? "detected" : "clear"} | Zone: ${body.premiumDiscount} | 52w pos: ${Math.round(rangePos * 100)}%`,
      alignment: {
        type: body.bos ? "continuation" : "counter-trend",
        phase: body.premiumDiscount,
        explanation: `LTF ${body.bos ? "aligns with" : "opposing"} HTF ${body.htfBias} trend.`,
        riskMultiplier: grade === "A" ? 1.2 : grade === "B" ? 1.0 : 0.8,
        confidenceAdjustment: body.htfConfidence > 70 ? 5 : -5,
      },
      tradeStatus: tradeArmed ? "ARMED" : "NO TRADE",
      tradeStatusReason: !tradeArmed
        ? gateStatus === "BLOCKED"
          ? "Risk gate blocked — low volatility or off-session"
          : `R:R ${rrRatio} below minimum 1:2 threshold`
        : "Setup armed — confirmation entry",
      setupQuality: tradeArmed ? (grade === "A" ? "A+" : "B+") : "NO TRADE",
      marketStructure: {
        trend: body.htfBias as "bullish" | "bearish" | "ranging",
        bos: body.bos,
        choch: body.choch,
        premiumDiscount: body.premiumDiscount,
        equilibrium: body.equilibrium,
      },
      orderBlock: orderBlockData,
      fvg: fvgData,
      entry: Math.round(entry * 100) / 100,
      stopLoss: Math.round(sl * 100) / 100,
      tp1: Math.round(tp1 * 100) / 100,
      tp2: Math.round(tp2 * 100) / 100,
      rrRatio,
      riskGateGrade: grade,
      riskGateStatus: gateStatus,
      maxRiskPercent: grade === "A" ? 2 : grade === "B" ? 1.5 : 1,
      volatilityScore: vol,
      sessionScore: ses,
      session: body.session,
    };

    // ── Persist to store ────────────────────────────────
    setKeyLevels(symbol, keyLevels);

    return NextResponse.json({
      success: true,
      symbol,
      tradeStatus: keyLevels.tradeStatus,
      riskGateStatus: gateStatus,
      grade,
      rrRatio,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[keylevels POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
