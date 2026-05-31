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
  if (u.includes("GOLD SENTINEL") || u.includes("APEX"))           return "Gold Sentinel Apex v4.2"
  if (u.includes("PHOENIX HYBRID") || u.includes("PHX"))           return "Phoenix Hybrid Engine v11.12"
  return raw.trim()
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request via Shared Secret
    const authHeader = req.headers.get("x-api-key") || req.headers.get("Authorization")
    const secretKey = process.env.WEBHOOK_API_KEY || "Kin6kizan4@"

    if (!authHeader || authHeader.replace("Bearer ", "").trim() !== secretKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Safely Extract Payload Parameters
    const body = await req.json()
    const { ticket, symbol, profit, type, side, bot, botName, timestamp } = body

    if (!symbol) {
      return NextResponse.json({ error: "Missing required symbol parameter" }, { status: 400 })
    }

    // 3. Handle Type Conversions and Boundary Normalizations
    const profitNum = profit !== null && profit !== undefined ? Number(profit) : 0
    if (!Number.isFinite(profitNum)) {
      return NextResponse.json({ error: "Invalid profit value type" }, { status: 400 })
    }

    const canonicalBot = normalizeBotName(bot ?? botName)
    const direction = (type ?? side ?? "BUY").toString().toUpperCase()
    const ts = timestamp ? new Date(timestamp) : new Date()

    // 4. Construct Idempotent Document Reference 
    const docRef = ticket
      ? db.collection("botTrades").doc(`ticket_${ticket}`)
      : db.collection("botTrades").doc()

    // 5. NON-BLOCKING TELEMETRY PIPELINE (CRITICAL 503 PATCH)
    // We intentionally do NOT use 'await' here. We dispatch this async write 
    // to the event loop background and immediately return an immediate 200 OK success matrix.
    docRef.set({
      ticket:    ticket ? Number(ticket) : null,
      symbol:    String(symbol).toUpperCase(),
      profit:    profitNum,
      type:      "BOT",
      bot:       canonicalBot,
      direction,
      timestamp: Timestamp.fromDate(ts),
      source:    "bot",
      receivedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    .then(() => {
      console.log(`[TELEMETRY SUCCESS] Persistent document locked for ticket: ${ticket ?? 'auto-gen'}`)
    })
    .catch((err) => {
      console.error(`[TELEMETRY BACKEND CRASH] Firestore storage failed for ticket ${ticket}:`, err)
    })

    // 6. Instant Handshake Return (Acknowledges MetaTrader 5 immediately inside <3ms)
    return NextResponse.json({
      ok: true,
      status: "Telemetry delegated to background queue",
      bot: canonicalBot,
      ticket: ticket ?? null,
    }, { status: 200 })

  } catch (err) {
    console.error("[CRITICAL WEBHOOK API FAILURE]", err)
    const msg = err instanceof Error ? err.message : "Unknown error context"
    return NextResponse.json({ error: "Internal Server Parse Error", details: msg }, { status: 500 })
  }
}

// Global System Health Route
export async function GET() {
  return NextResponse.json({
    status: "online",
    system: "Phoenix Telemetry Core Gateway",
    timestamp: new Date().toISOString()
  })
}