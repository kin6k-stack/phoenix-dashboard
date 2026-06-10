// app/api/generate-token/route.ts
// FIX: Switched Firestore write from user ID token to service account JWT
// (same pattern as webhook v5.2). User token still used to VERIFY identity,
// service account used to WRITE — bypasses security rules restriction.

import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"

const PROJECT_ID     = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!

// ── Service account JWT (same helper as webhook) ──────────────────────────────
let _cachedToken: string | null = null
let _tokenExpiry: number = 0

async function getServiceToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (_cachedToken && now < _tokenExpiry - 60) return _cachedToken

  const email  = process.env.FIREBASE_CLIENT_EMAIL
  const rawKey = process.env.FIREBASE_PRIVATE_KEY
  if (!email || !rawKey) throw new Error("Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY")

  const pemKey = rawKey.replace(/\\n/g, "\n")
  const b64url = (s: string) =>
    Buffer.from(s).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")

  const iat = now, exp = now + 3600
  const header  = b64url(JSON.stringify({ alg:"RS256", typ:"JWT" }))
  const payload = b64url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat, exp,
  }))
  const unsigned = `${header}.${payload}`

  const pemStripped = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g,"")
    .replace(/-----END PRIVATE KEY-----/g,"")
    .replace(/\s/g,"")

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", Buffer.from(pemStripped,"base64"),
    { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["sign"]
  )
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsigned))
  const signature = Buffer.from(sig).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")
  const jwt = `${unsigned}.${signature}`

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type":"application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  const d = await res.json() as { access_token: string; expires_in: number }
  _cachedToken = d.access_token
  _tokenExpiry  = now + (d.expires_in ?? 3600)
  return _cachedToken
}

// ── Verify user's Firebase ID token via REST ──────────────────────────────────
async function verifyIdToken(idToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${FIREBASE_API_KEY}`,
      { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ idToken }) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.users?.[0]?.localId ?? null
  } catch { return null }
}

// ── Firestore write using service account ─────────────────────────────────────
async function firestoreSet(collection: string, docId: string, fields: Record<string, unknown>) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`
  const token = await getServiceToken()

  const fsFields: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) continue
    if (typeof v === "string")  fsFields[k] = { stringValue: v }
    else if (typeof v === "number")  fsFields[k] = { integerValue: v }
    else if (typeof v === "boolean") fsFields[k] = { booleanValue: v }
    else if (v instanceof Date)      fsFields[k] = { timestampValue: v.toISOString() }
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${token}` },
    body: JSON.stringify({ fields: fsFields }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Firestore write failed: ${res.status} ${err.slice(0,200)}`)
  }
  return res.json()
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") ?? ""
    const idToken    = authHeader.replace("Bearer ", "").trim()
    if (!idToken) return NextResponse.json({ error:"Missing auth token" }, { status: 401 })

    const uid = await verifyIdToken(idToken)
    if (!uid)  return NextResponse.json({ error:"Invalid auth token" }, { status: 401 })

    const token     = randomBytes(32).toString("hex")
    const now       = new Date()
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    // Service account write — no security rules restriction
    await firestoreSet("syncTokens", token, {
      uid, createdAt: now, expiresAt, status:"pending", tradesImported: 0,
    })

    console.log(`[generate-token] Token created for uid ${uid}`)
    return NextResponse.json({ token, expiresAt: expiresAt.toISOString() })

  } catch (err) {
    console.error("[generate-token] Error:", err)
    return NextResponse.json({ error:"Internal server error" }, { status: 500 })
  }
}