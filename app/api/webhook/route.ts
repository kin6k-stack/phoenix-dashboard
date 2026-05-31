// ============================================================
// /api/webhook  (POST)
//
// Receives trade notifications from MT5 bots and writes them
// to the `botTrades` collection (shared demo feed visible to
// all signed-in users on the Performance tab).
//
// Bot trades NEVER write to `trades` — that collection is
// reserved for per-user manual entries.
//
// Auth: simple shared-secret header `x-api-key` matching WEBHOOK_API_KEY
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore"

// ── Init Admin SDK (once per cold start) ────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:    process.env.FIREBASE_PROJECT_ID!,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:   (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()

// ── Normalize incoming bot name to canonical form ──────
function normalizeBotName(raw?: string | null): string {
  if (!raw) return "Unknown Bot"
  const u = raw.toUpperCase().replace(/_/g, " ").trim()
  if (u.includes("PHOENIX NQ") || u.includes("NQ V1"))             return "Phoenix NQ v1.6"
  if (u.includes("GOLD SENTINEL") || u.includes("SENTINEL APEX"))  return "Gold Sentinel Apex"
  if (u.includes("PHOENIX GOLD") || u.includes("GOLD HYBRID") || u.includes("PHOENIX HYBRID"))
                                                                     return "Phoenix Gold Hybrid"
  if (u.includes("MANUAL"))                                         return "Manual Execution"
  return raw.trim()
}

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────
  const expectedKey = process.env.WEBHOOK_API_KEY
  if (!expectedKey) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }

  const providedKey =
    req.headers.get("x-api-key") ??
    (await req.json().then(b => b?.apiKey).catch(() => null))

  // ⚠ We've already consumed the body above; need to re-parse below if header missing
  // To avoid that complexity, re-read once cleanly:
  const body = await req.clone().json().catch(() => null)
  const headerKey = req.headers.get("x-api-key")
  const bodyKey   = body?.apiKey
  const key = headerKey ?? bodyKey

  if (!key || key !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    // ── Extract & normalize ─────────────────────────────
    const {
      ticket,
      symbol,
      profit,
      type,
      side,
      bot,
      botName,
      status,         // "OPENED" | "CLOSED"
      timestamp,
    } = body

    // Only persist CLOSED trades with realized P&L
    const tradeStatus = (status ?? "CLOSED").toString().toUpperCase()
    if (tradeStatus === "OPENED") {
      return NextResponse.json({ ok: true, skipped: "open trade" })
    }

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol" }, { status: 400 })
    }

    const profitNum = profit !== undefined ? Number(profit) : 0
    if (!Number.isFinite(profitNum)) {
      return NextResponse.json({ error: "Invalid profit value" }, { status: 400 })
    }

    const canonicalBot = normalizeBotName(bot ?? botName)
    const direction = (type ?? side ?? "BUY").toString().toUpperCase()
    const ts = timestamp ? new Date(timestamp) : new Date()

    // ── Idempotency: use ticket as doc ID if provided ───
    // Prevents duplicate writes if the bot retries
    const docRef = ticket
      ? db.collection("botTrades").doc(`ticket_${ticket}`)
      : db.collection("botTrades").doc()

    await docRef.set({
      ticket:    ticket ?? null,
      symbol:    String(symbol).toUpperCase(),
      profit:    profitNum,
      type:      "BOT",
      bot:       canonicalBot,
      direction,
      timestamp: Timestamp.fromDate(ts),
      source:    "bot",
      receivedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    return NextResponse.json({
      ok: true,
      collection: "botTrades",
      bot: canonicalBot,
      ticket: ticket ?? null,
    })

  } catch (err) {
    console.error("[webhook]", err)
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: "Internal error", details: msg }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "alive",
    target: "botTrades collection",
    auth: process.env.WEBHOOK_API_KEY ? "configured" : "MISSING",
  })
}
