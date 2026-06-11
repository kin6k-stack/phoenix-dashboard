// ============================================================
// /api/ticker (GET) — v4.0  (TwelveData + Firestore last-good fallback)
// ============================================================
// DATA SOURCE: TwelveData (https://twelvedata.com) — free tier, 800 credits/day.
//   Serves gold (XAU/USD), crypto, and forex on the free tier — verified working
//   (same provider/key the signal-study scripts use). A 45-min ticker uses ~6
//   credits/refresh = ~190/day, well under the 800 cap.
//
// FALLBACK PHILOSOPHY (unchanged from v3):
//   Every SUCCESSFUL fetch is saved to Firestore (tickerCache/latest). If a
//   symbol fails, we serve the LAST-GOOD value from Firestore — never fake mock.
//   Mock (price 0 → "—") only before Firestore has ever been written.
//
// REQUIRED ENV VARS (set in Vercel):
//   TWELVEDATA_API_KEY           — your TwelveData key
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID (or FIREBASE_PROJECT_ID)
//   FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
// ============================================================
import { NextResponse } from "next/server"

const CACHE_TTL = 45 * 60 * 1000        // 45 min in-memory cache (per warm instance)
let _cache: { data: TickerItem[]; expiresAt: number } | null = null

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
const TICKER_DOC = "tickerCache/latest" // Firestore doc holding last-good values

export interface TickerItem {
  symbol: string; label: string; price: number
  change: number; changePct: number; isPos: boolean
}

// ── TwelveData symbol map (Path B — all-live, 6 symbols) ──────────────────
const TD_SYMBOLS: { td: string; label: string }[] = [
  { td: "XAU/USD",  label: "GOLD"    },
  { td: "BTC/USD",  label: "BTC"     },
  { td: "ETH/USD",  label: "ETH"     },
  { td: "EUR/USD",  label: "EUR/USD" },
  { td: "GBP/USD",  label: "GBP/USD" },
  { td: "USD/JPY",  label: "USD/JPY" },
]

// ── Mock — ONLY used on the very first run before Firestore is populated ──
const MOCK: TickerItem[] = [
  { symbol:"XAU/USD",  label:"GOLD",    price:0, change:0, changePct:0, isPos:true },
  { symbol:"BTC/USD",  label:"BTC",     price:0, change:0, changePct:0, isPos:true },
  { symbol:"ETH/USD",  label:"ETH",     price:0, change:0, changePct:0, isPos:true },
  { symbol:"EUR/USD",  label:"EUR/USD", price:0, change:0, changePct:0, isPos:true },
  { symbol:"GBP/USD",  label:"GBP/USD", price:0, change:0, changePct:0, isPos:true },
  { symbol:"USD/JPY",  label:"USD/JPY", price:0, change:0, changePct:0, isPos:true },
]

// ════════════════════════════════════════════════════════════════════════
//  FIRESTORE REST PLUMBING (service-account auth — matches webhook route)
// ════════════════════════════════════════════════════════════════════════
let _cachedToken: string | null = null
let _tokenExpiry = 0

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (_cachedToken && now < _tokenExpiry - 60) return _cachedToken

  const email  = process.env.FIREBASE_CLIENT_EMAIL
  const rawKey = process.env.FIREBASE_PRIVATE_KEY
  if (!email || !rawKey) throw new Error("FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY missing")

  const pemKey = rawKey.replace(/\\n/g, "\n")
  const b64url = (str: string) =>
    Buffer.from(str).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")

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
  const sigBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsigned))
  const signature = Buffer.from(sigBuffer).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")
  const jwt = `${unsigned}.${signature}`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  if (!tokenRes.ok) throw new Error(`Token exchange failed (${tokenRes.status})`)
  const tokenData = await tokenRes.json() as { access_token: string; expires_in: number }
  _cachedToken = tokenData.access_token
  _tokenExpiry  = now + (tokenData.expires_in ?? 3600)
  return _cachedToken
}

// Save the full live snapshot to Firestore (one doc, array of items as JSON).
async function saveLastGood(items: TickerItem[]): Promise<void> {
  if (!PROJECT_ID) return
  try {
    const token = await getAccessToken()
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${TICKER_DOC}`
    // Store as a single JSON string field — simplest durable shape.
    const body = {
      fields: {
        items:     { stringValue: JSON.stringify(items) },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(t)
  } catch (err) {
    console.warn("[ticker v3] saveLastGood failed:", err)
  }
}

// Read the last-good snapshot from Firestore. Returns null if never written.
async function readLastGood(): Promise<TickerItem[] | null> {
  if (!PROJECT_ID) return null
  try {
    const token = await getAccessToken()
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${TICKER_DOC}`
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      headers: { "Authorization":`Bearer ${token}` },
      signal: controller.signal,
    })
    clearTimeout(t)
    if (!res.ok) return null
    const json = await res.json()
    const raw = json?.fields?.items?.stringValue
    if (!raw) return null
    return JSON.parse(raw) as TickerItem[]
  } catch (err) {
    console.warn("[ticker v3] readLastGood failed:", err)
    return null
  }
}

// ════════════════════════════════════════════════════════════════════════
//  TWELVEDATA FETCH (one batched /quote call for all symbols)
// ════════════════════════════════════════════════════════════════════════
// TwelveData /quote with comma-separated symbols returns an object keyed by
// symbol: { "XAU/USD": { close, change, percent_change, ... }, ... }
// A single symbol returns the quote object directly (no outer key), so handle both.
async function fetchTwelveData(apiKey: string): Promise<Map<string, { price:number; change:number; changePct:number }>> {
  const out = new Map<string, { price:number; change:number; changePct:number }>()
  const syms = TD_SYMBOLS.map(s => s.td).join(",")
  const url  = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms)}&apikey=${apiKey}&dp=5`

  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`TwelveData HTTP ${res.status}`)
  const json = await res.json()

  // Whole-batch error (bad key, out of credits, etc.)
  if (json?.status === "error") throw new Error(`TwelveData: ${json?.message ?? "error"}`)

  const readQuote = (q: any) => {
    if (!q || q.status === "error") return null
    const price = parseFloat(q.close ?? q.price ?? "0")
    if (!price || isNaN(price)) return null
    const change = parseFloat(q.change ?? "0")
    return {
      price,
      change: isNaN(change) ? 0 : change,
      changePct: parseFloat(q.percent_change ?? "0") || 0,
    }
  }

  for (const { td } of TD_SYMBOLS) {
    // batched response is keyed by symbol; single-symbol response is flat
    const q = (json && json[td] !== undefined) ? json[td] : (TD_SYMBOLS.length === 1 ? json : null)
    const parsed = readQuote(q)
    if (parsed) out.set(td, parsed)
  }
  return out
}

// Build the full ticker. Try TwelveData (one batched call); on per-symbol
// failure use last-good from Firestore. Never fake mock if avoidable.
async function buildTicker(): Promise<{ items: TickerItem[]; source: string; allLive: boolean }> {
  const apiKey = process.env.TWELVEDATA_API_KEY
  const lastGood = await readLastGood()
  const lastGoodByLabel = new Map((lastGood ?? []).map(i => [i.label, i]))

  if (!apiKey) {
    return { items: lastGood ?? MOCK, source: lastGood ? "last-good" : "mock", allLive: false }
  }

  let quotes: Map<string, { price:number; change:number; changePct:number }>
  try {
    quotes = await fetchTwelveData(apiKey)
  } catch (err) {
    console.warn("[ticker v4] TwelveData failed:", err)
    quotes = new Map()
  }

  let liveCount = 0
  const items: TickerItem[] = []
  for (const { td, label } of TD_SYMBOLS) {
    const live = quotes.get(td)
    if (live) {
      liveCount++
      items.push({ symbol: td, label, price: live.price, change: live.change, changePct: live.changePct, isPos: live.change >= 0 })
    } else {
      const prev = lastGoodByLabel.get(label)
      items.push(prev ?? { symbol: td, label, price: 0, change: 0, changePct: 0, isPos: true })
    }
  }

  if (liveCount > 0) await saveLastGood(items)

  const allLive = liveCount === TD_SYMBOLS.length
  const source =
    liveCount === 0 ? (lastGood ? "last-good" : "mock")
    : allLive       ? "twelvedata"
    :                 "twelvedata-partial"
  return { items, source, allLive }
}

// ════════════════════════════════════════════════════════════════════════
//  HANDLER
// ════════════════════════════════════════════════════════════════════════
export async function GET() {
  try {
    // Serve warm in-memory cache if fresh (saves Finnhub calls on bursts)
    if (_cache && Date.now() < _cache.expiresAt)
      return NextResponse.json({ items: _cache.data, cached: true, source: "cache" })

    const { items, source } = await buildTicker()

    // Only cache in-memory if we actually have usable prices
    if (items.some(i => i.price > 0))
      _cache = { data: items, expiresAt: Date.now() + CACHE_TTL }

    return NextResponse.json({ items, cached: false, source })
  } catch (err) {
    console.error("[ticker v3] Unhandled:", err)
    // Last resort: stale in-memory cache, then mock
    const items = _cache?.data ?? MOCK
    return NextResponse.json({ items, cached: false, source: "mock" })
  }
}
