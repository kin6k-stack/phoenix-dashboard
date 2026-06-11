// ============================================================
// /api/ticker (GET) — v3.0  (Finnhub + Firestore last-good fallback)
// ============================================================
// DATA SOURCE: Finnhub (https://finnhub.io) — free tier, 60 calls/min.
//   - Gold via OANDA forex feed (OANDA:XAU_USD)
//   - Crypto via Binance (BINANCE:BTCUSDT / ETHUSDT)
//   - Forex via OANDA (OANDA:EUR_USD etc.)
//
// FALLBACK PHILOSOPHY (per your design):
//   Every SUCCESSFUL fetch is saved to Firestore (tickerCache/latest).
//   If a symbol fails (premium-locked, rate-limited, network), we serve the
//   LAST-GOOD value from Firestore instead of fake mock numbers. Mock only
//   appears on the very first run before Firestore has ever been written.
//
// WHY FIRESTORE (not an in-memory var): Vercel is serverless — memory is wiped
// between cold starts, so last-good values must live somewhere durable.
//   - Uses the Firestore REST API (NOT the Client SDK — gRPC causes 504s on
//     Vercel serverless; this matches the proven webhook route pattern).
//
// REQUIRED ENV VARS (set in Vercel):
//   FINNHUB_API_KEY              — your Finnhub free key
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL        — service account email
//   FIREBASE_PRIVATE_KEY         — service account private key
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

// ── Finnhub symbol map (Path B — all-live, 6 symbols) ─────────────────────
const FINNHUB_SYMBOLS: { fh: string; label: string }[] = [
  { fh: "OANDA:XAU_USD",   label: "GOLD"    },
  { fh: "BINANCE:BTCUSDT", label: "BTC"     },
  { fh: "BINANCE:ETHUSDT", label: "ETH"     },
  { fh: "OANDA:EUR_USD",   label: "EUR/USD" },
  { fh: "OANDA:GBP_USD",   label: "GBP/USD" },
  { fh: "OANDA:USD_JPY",   label: "USD/JPY" },
]

// ── Mock — ONLY used on the very first run before Firestore is populated ──
// After the first successful fetch, last-good Firestore values replace these.
const MOCK: TickerItem[] = [
  { symbol:"OANDA:XAU_USD",   label:"GOLD",    price:0, change:0, changePct:0, isPos:true },
  { symbol:"BINANCE:BTCUSDT", label:"BTC",     price:0, change:0, changePct:0, isPos:true },
  { symbol:"BINANCE:ETHUSDT", label:"ETH",     price:0, change:0, changePct:0, isPos:true },
  { symbol:"OANDA:EUR_USD",   label:"EUR/USD", price:0, change:0, changePct:0, isPos:true },
  { symbol:"OANDA:GBP_USD",   label:"GBP/USD", price:0, change:0, changePct:0, isPos:true },
  { symbol:"OANDA:USD_JPY",   label:"USD/JPY", price:0, change:0, changePct:0, isPos:true },
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
//  FINNHUB FETCH (one /quote call per symbol; resilient per-symbol)
// ════════════════════════════════════════════════════════════════════════
// Finnhub /quote returns: { c: current, d: change, dp: percentChange, pc: prevClose }
async function fetchFinnhubSymbol(fh: string, apiKey: string): Promise<{ price:number; change:number; changePct:number } | null> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(fh)}&token=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const q = await res.json()
    // c===0 means no data / not available on this tier
    if (!q || typeof q.c !== "number" || q.c === 0) return null
    return {
      price:     q.c,
      change:    typeof q.d  === "number" ? q.d  : 0,
      changePct: typeof q.dp === "number" ? q.dp : 0,
    }
  } catch {
    return null
  }
}

// Build the full ticker. For each symbol: try Finnhub; on failure use last-good.
async function buildTicker(): Promise<{ items: TickerItem[]; source: string; allLive: boolean }> {
  const apiKey = process.env.FINNHUB_API_KEY
  const lastGood = await readLastGood()
  const lastGoodByLabel = new Map((lastGood ?? []).map(i => [i.label, i]))

  if (!apiKey) {
    // No key at all — serve last-good if we have it, else mock.
    return { items: lastGood ?? MOCK, source: lastGood ? "last-good" : "mock", allLive: false }
  }

  let liveCount = 0
  const items: TickerItem[] = []

  for (const { fh, label } of FINNHUB_SYMBOLS) {
    const live = await fetchFinnhubSymbol(fh, apiKey)
    if (live) {
      liveCount++
      items.push({
        symbol: fh, label,
        price: live.price, change: live.change, changePct: live.changePct,
        isPos: live.change >= 0,
      })
    } else {
      // Fall back to this symbol's last-good value (never fake mock if avoidable)
      const prev = lastGoodByLabel.get(label)
      items.push(prev ?? { symbol: fh, label, price: 0, change: 0, changePct: 0, isPos: true })
    }
  }

  // If we got at least one live price, persist the fresh snapshot for next time.
  if (liveCount > 0) await saveLastGood(items)

  const allLive = liveCount === FINNHUB_SYMBOLS.length
  const source =
    liveCount === 0          ? (lastGood ? "last-good" : "mock")
    : allLive                ? "finnhub"
    :                          "finnhub-partial"
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
