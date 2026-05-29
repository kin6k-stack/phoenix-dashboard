// ============================================================
// /api/webhook  (POST)
// THE endpoint your 3 bots are already calling.
//
// Accepts the exact payload format your bots send:
// {
//   ticket: "12345678",
//   symbol: "XAUUSD",
//   profit: 127.50,
//   type: 0 | 1,         // 0 = BUY, 1 = SELL  (DEAL_TYPE_BUY / DEAL_TYPE_SELL)
//   side: 0 | 1,         // Same as type — some bots use "side", some use "type"
//   bot: "Gold Sentinel Apex" | "Phoenix NQ" | "Phoenix Gold Hybrid" | "Manual Execution",
//   status: "OPENED" | "CLOSED",
//   timestamp: "2026-05-29 15:42:00" OR unix-seconds-number,
//   apiKey: "..."        // Some bots send in body
// }
// Headers may also contain x-api-key
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Normalize bot name to your dashboard's canonical labels
function normalizeBotName(raw: string | undefined | null): string {
  if (!raw) return "Manual Execution";
  const u = raw.toUpperCase().replace(/_/g, " ").trim();
  if (u.includes("PHOENIX NQ") || u.includes("NQ V1") || u.includes("NQ V2")) return "Phoenix NQ v1.6";
  if (u.includes("GOLD SENTINEL") || u.includes("SENTINEL APEX") || u.includes("APEX")) return "Gold Sentinel Apex";
  if (u.includes("PHOENIX GOLD") || u.includes("GOLD HYBRID") || u.includes("PHOENIX HYBRID") || u.includes("HYBRID")) return "Phoenix Gold Hybrid";
  if (u.includes("MANUAL")) return "Manual Execution";
  return raw.trim();
}

// Parse the timestamp — bots send either "2026-05-29 15:42:00" string OR unix seconds number
function parseTimestamp(ts: unknown): Date {
  if (!ts) return new Date();
  if (typeof ts === "number") {
    // Unix seconds (very small number — bot's `(long)TimeCurrent()`)
    if (ts < 10_000_000_000) return new Date(ts * 1000);
    return new Date(ts);
  }
  if (typeof ts === "string") {
    // MQL5 format: "2026-05-29 15:42:00" — JS Date accepts this
    const d = new Date(ts.replace(" ", "T") + "Z");
    if (!isNaN(d.getTime())) return d;
    const d2 = new Date(ts);
    if (!isNaN(d2.getTime())) return d2;
  }
  return new Date();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Auth (apiKey in header OR body) ───────────────────
    const headerKey = req.headers.get("x-api-key");
    const bodyKey = body.apiKey;
    const expectedKey = process.env.WEBHOOK_API_KEY;

    if (expectedKey && headerKey !== expectedKey && bodyKey !== expectedKey) {
      console.warn("[webhook] Auth failed", { headerKey, bodyKey });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Validate required fields ──────────────────────────
    if (!body.ticket || !body.symbol || !body.bot) {
      return NextResponse.json(
        { error: "Missing required fields: ticket, symbol, bot" },
        { status: 400 }
      );
    }

    // ── Normalize fields ──────────────────────────────────
    const ticket    = String(body.ticket);
    const symbol    = String(body.symbol).toUpperCase();
    const botName   = normalizeBotName(body.bot);
    const status    = String(body.status ?? "CLOSED").toUpperCase();
    const profit    = Number(body.profit ?? 0);
    const dealType  = Number(body.type ?? body.side ?? 0);
    const direction = dealType === 0 ? "BUY" : "SELL";
    const ts        = parseTimestamp(body.timestamp);

    const db = getAdminDb();

    // Doc ID uses ticket — same ticket from OPENED → CLOSED updates same doc
    const docId = `${botName}_${ticket}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (status === "OPENED") {
      // ── ENTRY ─────────────────────────────────────────────
      // Write to pending_orders + create stub in trades (with profit=0)
      await db.collection("pending_orders").doc(docId).set(
        {
          bot:       botName,
          botName:   botName,
          symbol:    symbol,
          ticket:    ticket,
          direction: direction,
          status:    "active",
          openedAt:  ts,
          timestamp: ts,
          updatedAt: FieldValue.serverTimestamp(),
          source:    "mt5_bot",
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        action: "opened",
        docId,
        bot: botName,
        ticket,
      });
    }

    // ── CLOSED ─────────────────────────────────────────────
    // Write to BOTH trades + pending_orders so the dashboard
    // (which uses Firestore onSnapshot on `trades`) picks it up
    const tradeDoc = {
      // Fields dashboard expects (match Firestore listener in app/page.tsx):
      bot:        botName,
      botName:    botName,
      symbol:     symbol,
      direction:  direction,
      type:       status === "OPENED" ? "OPEN" : "BOT",
      profit:     profit,                       // dashboard reads as rMultiple
      setup:      botName,
      timestamp:  ts,
      notes:      "",
      screenshot: "",

      // Extended fields:
      ticket:     ticket,
      status:     "closed",
      closedAt:   ts,
      source:     "mt5_bot",
      createdAt:  FieldValue.serverTimestamp(),
    };

    await db.collection("trades").doc(docId).set(tradeDoc, { merge: true });

    // Also mark pending order as closed (cleanup)
    await db.collection("pending_orders").doc(docId).set(
      {
        status:    "closed",
        profit:    profit,
        closedAt:  ts,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      action:  "closed",
      docId,
      bot:     botName,
      symbol,
      ticket,
      profit,
      direction,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook POST]", msg);
    return NextResponse.json(
      { error: "Internal server error", details: msg },
      { status: 500 }
    );
  }
}

// Lightweight health-check so you can sanity-test the route in a browser
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/webhook",
    method: "POST",
    status: "ok",
    expects: {
      ticket: "string",
      symbol: "string",
      profit: "number",
      type: "0=BUY 1=SELL",
      bot: "string",
      status: "OPENED | CLOSED",
      timestamp: "string OR unix-seconds",
      apiKey: "set WEBHOOK_API_KEY env var (or send in x-api-key header)",
    },
  });
}
