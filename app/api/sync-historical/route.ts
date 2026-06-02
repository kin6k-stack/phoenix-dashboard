// app/api/sync-historical/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// MT5 Connect — Historical Trade Sync Endpoint
//
// POST /api/sync-historical
// Body: {
//   syncToken: string,
//   trades: Array<{
//     ticket:      string,
//     symbol:      string,
//     profit:      number,
//     commission:  number,
//     swap:        number,
//     direction:   "BUY" | "SELL",
//     entryPrice:  number,
//     closePrice:  number,
//     lotSize:     number,
//     openTime:    string,   // ISO timestamp
//     closeTime:   string,   // ISO timestamp
//   }>
// }
//
// Flow:
//   1. Validate syncToken → resolve uid → check not expired / not already used
//   2. Bulk PATCH each trade to importedTrades/{uid}/trades/{ticket}
//   3. Update syncTokens/{token}.status = "completed", .tradesImported = N
//   4. Return { imported, skipped, errors }
//
// Idempotent: PATCH with updateMask — re-running never creates duplicates.
// Always returns HTTP 200 so MT5 terminal thread never freezes.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server"

const PROJECT_ID    = process.env.FIREBASE_PROJECT_ID!
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!
const BASE_URL      = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

// ── Firestore field encoder ──────────────────────────────────────────────────
type FSValue =
  | { stringValue: string }
  | { doubleValue: number }
  | { integerValue: number }
  | { timestampValue: string }
  | { booleanValue: boolean }

function toFSField(value: unknown): FSValue {
  if (typeof value === "string") {
    // Detect ISO timestamp strings
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return { timestampValue: value }
    return { stringValue: value }
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: value } : { doubleValue: value }
  }
  if (typeof value === "boolean") return { booleanValue: value }
  return { stringValue: String(value) }
}

function encodeFields(obj: Record<string, unknown>): Record<string, FSValue> {
  const out: Record<string, FSValue> = {}
  for (const [k, v] of Object.entries(obj)) out[k] = toFSField(v)
  return out
}

// ── Firestore GET ────────────────────────────────────────────────────────────
async function firestoreGet(path: string): Promise<Record<string, unknown> | null> {
  const url = `${BASE_URL}/${path}?key=${FIREBASE_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  if (!data.fields) return null

  // Decode fields back to plain values
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data.fields as Record<string, FSValue>)) {
    const fv = v as Record<string, unknown>
    out[k] = fv.stringValue ?? fv.doubleValue ?? fv.integerValue ?? fv.timestampValue ?? fv.booleanValue ?? null
  }
  return out
}

// ── Firestore PATCH (single doc, updateMask) ─────────────────────────────────
async function firestorePatch(path: string, fields: Record<string, unknown>): Promise<boolean> {
  const fieldNames = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&")
  const url = `${BASE_URL}/${path}?key=${FIREBASE_API_KEY}&${fieldNames}`

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(fields) }),
  })
  return res.ok
}

// ── Trade shape from MT5 script ───────────────────────────────────────────────
interface MT5Trade {
  ticket:     string
  symbol:     string
  profit:     number
  commission: number
  swap:       number
  direction:  "BUY" | "SELL"
  entryPrice: number
  closePrice: number
  lotSize:    number
  openTime:   string
  closeTime:  string
}

// ── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Always return 200 — MT5 thread must never freeze on a non-200
  const respond = (body: object, status = 200) => NextResponse.json(body, { status })

  let syncToken: string
  let trades: MT5Trade[]

  try {
    const body = await req.json()
    syncToken = body.syncToken
    trades    = body.trades ?? []
  } catch {
    return respond({ error: "Invalid JSON body", imported: 0, skipped: 0 })
  }

  if (!syncToken) return respond({ error: "Missing syncToken", imported: 0, skipped: 0 })
  if (!Array.isArray(trades) || trades.length === 0) {
    return respond({ error: "No trades provided", imported: 0, skipped: 0 })
  }

  // 1. Validate token
  const tokenDoc = await firestoreGet(`syncTokens/${syncToken}`)
  if (!tokenDoc) return respond({ error: "Invalid sync token", imported: 0, skipped: 0 })

  const uid       = tokenDoc.uid as string
  const status    = tokenDoc.status as string
  const expiresAt = tokenDoc.expiresAt as string

  if (status === "completed") {
    return respond({ error: "Token already used", imported: 0, skipped: 0 })
  }
  if (status === "expired" || new Date(expiresAt) < new Date()) {
    await firestorePatch(`syncTokens/${syncToken}`, { status: "expired" })
    return respond({ error: "Token expired", imported: 0, skipped: 0 })
  }
  if (!uid) return respond({ error: "Token has no associated user", imported: 0, skipped: 0 })

  // 2. Write trades to importedTrades/{uid}/trades/{ticket}
  let imported = 0
  let skipped  = 0
  const errors: string[] = []
  const syncedAt = new Date().toISOString()

  for (const trade of trades) {
    if (!trade.ticket || !trade.symbol) { skipped++; continue }

    const netProfit = (trade.profit ?? 0) + (trade.commission ?? 0) + (trade.swap ?? 0)
    const outcome   = netProfit >= 0 ? "WIN" : "LOSS"

    const doc = {
      symbol:      trade.symbol,
      profit:      netProfit,
      grossProfit: trade.profit ?? 0,
      commission:  trade.commission ?? 0,
      swap:        trade.swap ?? 0,
      direction:   trade.direction ?? "BUY",
      entryPrice:  trade.entryPrice ?? 0,
      closePrice:  trade.closePrice ?? 0,
      lotSize:     trade.lotSize ?? 0,
      openTime:    trade.openTime ?? syncedAt,
      closeTime:   trade.closeTime ?? syncedAt,
      outcome,
      bot:         "Manual",
      source:      "MT5 Universal Sync v1",
      syncedAt,
      status:      "CLOSED",
    }

    // Path: importedTrades/{uid}/trades/{ticket}
    const ok = await firestorePatch(
      `importedTrades/${uid}/trades/${trade.ticket}`,
      doc
    )

    if (ok) imported++
    else {
      skipped++
      errors.push(trade.ticket)
    }

    // Small delay to stay within Firestore rate limits
    await new Promise(r => setTimeout(r, 30))
  }

  // 3. Mark token completed
  await firestorePatch(`syncTokens/${syncToken}`, {
    status:         "completed",
    tradesImported: imported,
    completedAt:    syncedAt,
  })

  return respond({ imported, skipped, errors, uid })
}