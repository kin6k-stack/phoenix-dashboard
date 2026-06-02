// app/api/generate-token/route.ts
import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"

const PROJECT_ID     = process.env.FIREBASE_PROJECT_ID!
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!

// ── Verify Firebase ID token via REST ────────────────────────────────────────
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

// ── Firestore REST write — passes ID token as Bearer for auth ────────────────
async function firestoreSet(
  collection: string,
  docId: string,
  fields: Record<string, unknown>,
  idToken: string
) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`

  const firestoreFields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string")       firestoreFields[key] = { stringValue: value }
    else if (typeof value === "number")  firestoreFields[key] = { integerValue: value }
    else if (typeof value === "boolean") firestoreFields[key] = { booleanValue: value }
    else if (value instanceof Date)      firestoreFields[key] = { timestampValue: value.toISOString() }
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${idToken}`,   // ← user's token satisfies Firestore rules
    },
    body: JSON.stringify({ fields: firestoreFields }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Firestore write failed: ${res.status} ${err}`)
  }
  return res.json()
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") ?? ""
    const idToken    = authHeader.replace("Bearer ", "").trim()
    if (!idToken) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 })
    }

    const verifiedUid = await verifyIdToken(idToken)
    if (!verifiedUid) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 })
    }

    const token     = randomBytes(32).toString("hex")
    const now       = new Date()
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    await firestoreSet("syncTokens", token, {
      uid:            verifiedUid,
      createdAt:      now,
      expiresAt:      expiresAt,
      status:         "pending",
      tradesImported: 0,
    }, idToken)   // ← pass the user's ID token through

    return NextResponse.json({ token, expiresAt: expiresAt.toISOString() })

  } catch (err) {
    console.error("[generate-token] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}