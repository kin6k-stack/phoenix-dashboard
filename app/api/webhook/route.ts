import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
//  PHOENIX TRADING ECOSYSTEM — Vercel Webhook v4
//
//  WHY THIS EXISTS:
//  v3 used firebase/firestore (Client SDK) which tries to maintain a gRPC
//  streaming connection. Vercel serverless functions are short-lived — they
//  open, execute, and close. gRPC needs persistent connections. The result:
//  the function spins in exponential-backoff retry for 300 seconds then 504.
//
//  This version calls the Firestore REST API directly — a single HTTP POST
//  that resolves in <500ms with no gRPC, no streaming, no connection pooling.
//  Works perfectly in every serverless/edge environment.
//
//  REQUIRED ENV VARS (already in your project — nothing new needed):
//  NEXT_PUBLIC_FIREBASE_PROJECT_ID  — your Firebase project ID
//  NEXT_PUBLIC_FIREBASE_API_KEY     — your Firebase Web API key
//  BOT_API_KEY                      — optional auth key (Kin6kizan4@)
// ─────────────────────────────────────────────────────────────────────────────

// Converts a plain JS object to Firestore REST API typed-field format
function toFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v instanceof Date)            fields[k] = { timestampValue: v.toISOString() }
    else if (typeof v === 'string')   fields[k] = { stringValue: v }
    else if (typeof v === 'number')   fields[k] = { doubleValue: v }
    else if (typeof v === 'boolean')  fields[k] = { booleanValue: v }
  }
  return fields
}

export async function POST(request: NextRequest) {
  let rawBody = ''
  try {
    rawBody = await request.text()
    const data = JSON.parse(rawBody)

    // ── Auth: accept from body OR header for backwards compatibility ──────────
    const receivedKey = data.apiKey || request.headers.get('x-api-key') || ''
    const expectedKey = process.env.BOT_API_KEY
    if (expectedKey && receivedKey !== expectedKey) {
      console.warn('[WEBHOOK v4] Auth failed — key mismatch')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── OPENED events: acknowledge only, no Firestore write ──────────────────
    const status = String(data.status || 'CLOSED').toUpperCase()
    if (status === 'OPENED') {
      return NextResponse.json({ success: true, note: 'entry acknowledged, not logged' })
    }

    // ── Normalise payload ─────────────────────────────────────────────────────
    const botName   = String(data.bot || data.botName || 'Manual Execution')
    const symbol    = String(data.symbol || 'UNKNOWN').toUpperCase()
    const profit    = parseFloat(String(data.profit ?? 0)) || 0
    const rawType   = data.type ?? data.side
    const direction = (
      rawType === 0 || rawType === '0' ||
      String(rawType).toUpperCase() === 'BUY'
    ) ? 'BUY' : 'SELL'

    // ── Firestore REST API write ──────────────────────────────────────────────
    // No gRPC, no SDK, no connection pooling — plain HTTP POST.
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

    if (!projectId || !apiKey) {
      console.error('[WEBHOOK v4] Missing Firebase env vars')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const firestoreUrl =
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/trades?key=${apiKey}`

    const doc = {
      fields: toFirestoreFields({
        symbol, profit,
        type:      direction,
        bot:       botName,
        timestamp: new Date(),
        source:    'MT5 Webhook v4',
      }),
    }

    // 10-second hard timeout — if Firestore is unreachable we still return 200
    // to the MT5 terminal so trades don't get blocked
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(firestoreUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(doc),
      signal:  controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[WEBHOOK v4] Firestore HTTP ${res.status}:`, errText.slice(0, 200))
      // Still return 200 — MT5 terminal must not be blocked by a write failure
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const result  = await res.json()
    const docId   = (result.name as string)?.split('/').pop() ?? 'unknown'
    console.log(`[WEBHOOK v4] ✅ ${botName} | ${symbol} | $${profit} | ${docId}`)
    return NextResponse.json({ success: true, id: docId })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[WEBHOOK v4] Error:', msg, '| Body:', rawBody.slice(0, 200))
    // Always 200 — MT5 must get a success response regardless
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

export async function GET()    { return new Response(null, { status: 405 }) }
export async function PUT()    { return new Response(null, { status: 405 }) }
export async function DELETE() { return new Response(null, { status: 405 }) }