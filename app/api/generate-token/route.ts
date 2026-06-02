// app/api/generate-token/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// MT5 Connect — Token Generator
//
// POST /api/generate-token
// Body: { uid: string }
// Auth: Firebase ID token in Authorization header
//
// Creates a single-use sync token in Firestore:
//   syncTokens/{token} = { uid, createdAt, expiresAt (+48h), status: "pending", tradesImported: 0 }
//
// Returns: { token: string, expiresAt: string }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID!
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!

// ── Firestore REST helper ────────────────────────────────────────────────────
async function firestoreSet(collection: string, docId: string, fields: Record<string, unknown>) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}?key=${FIREBASE_API_KEY}`

  // Convert plain JS object to Firestore field format
  const firestoreFields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string")  firestoreFields[key] = { stringValue: value }
    else if (typeof value === "number") firestoreFields[key] = { integerValue: value }
    else if (typeof value === "boolean") firestoreFields[key] = { booleanValue: value }
    else if (value instanceof Date) firestoreFields[key] = { timestampValue: value.toISOString() }
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: firestoreFields }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Firestore write failed: ${res.status} ${err}`)
  }
  return res.json()
}

// ── Verify Firebase ID token via REST ───────────────────────────────────────
async function verifyIdToken(idToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.users?.[0]?.localId ?? null
  } catch {
    return null
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 1. Verify auth token from header
    const authHeader = req.headers.get("Authorization") ?? ""
    const idToken = authHeader.replace("Bearer ", "").trim()
    if (!idToken) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 })
    }

    const verifiedUid = await verifyIdToken(idToken)
    if (!verifiedUid) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 })
    }

    // 2. Generate a cryptographically random token (32 bytes = 64 hex chars)
    const token = randomBytes(32).toString("hex")

    // 3. Set expiry to 48 hours from now
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    // 4. Write to Firestore syncTokens collection
    await firestoreSet("syncTokens", token, {
      uid:            verifiedUid,
      createdAt:      now,
      expiresAt:      expiresAt,
      status:         "pending",
      tradesImported: 0,
    })

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
    })

  } catch (err) {
    console.error("[generate-token] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
