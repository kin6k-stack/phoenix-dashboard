import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
//  PHOENIX TRADING ECOSYSTEM — Vercel Webhook v5
//
//  DATA ROUTING:
//  ┌─────────────────────────────────────────────────────┐
//  │  OPENED event → botTrades/{ticket}                  │
//  │    Creates: symbol, direction, entryPrice, sl,      │
//  │             tp1, tp2, lot, bot, status="OPEN"       │
//  │                                                     │
//  │  CLOSED event → PATCH botTrades/{ticket}            │
//  │    Updates: profit, status="CLOSED", outcome        │
//  │    (preserves entry details already written)        │
//  │                                                     │
//  │  trades collection → untouched by webhook           │
//  │    (populated via "Add to Calendar" user action)    │
//  └─────────────────────────────────────────────────────┘
//
//  REQUIRED ENV VARS (already set):
//  NEXT_PUBLIC_FIREBASE_PROJECT_ID
//  NEXT_PUBLIC_FIREBASE_API_KEY
//  BOT_API_KEY (optional auth)
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const FS_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

function toFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (v instanceof Date)           fields[k] = { timestampValue: v.toISOString() }
    else if (typeof v === 'string')  fields[k] = { stringValue: v }
    else if (typeof v === 'number')  fields[k] = { doubleValue: v }
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v }
  }
  return fields
}

async function firestorePatch(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
  updateMask?: string[]   // if provided, only these fields are written (rest preserved)
): Promise<boolean> {
  let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}?key=${FS_API_KEY}`
  if (updateMask?.length) {
    url += updateMask.map(f => `&updateMask.fieldPaths=${encodeURIComponent(f)}`).join('')
  }
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(url, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fields: toFields(data) }),
      signal:  controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error(`[WEBHOOK v5] Firestore ${res.status} on ${collection}/${docId}:`, err.slice(0, 150))
    }
    return res.ok
  } catch (err) {
    clearTimeout(timeout)
    console.error(`[WEBHOOK v5] Fetch error:`, err)
    return false
  }
}

export async function POST(request: NextRequest) {
  let rawBody = ''
  try {
    rawBody = await request.text()
    const data = JSON.parse(rawBody)

    // ── Auth ────────────────────────────────────────────────────────────────
    const receivedKey = data.apiKey || request.headers.get('x-api-key') || ''
    const expectedKey = process.env.BOT_API_KEY
    if (expectedKey && receivedKey !== expectedKey) {
      console.warn('[WEBHOOK v5] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!PROJECT_ID || !FS_API_KEY) {
      console.error('[WEBHOOK v5] Missing Firebase env vars')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // ── Parse common fields ──────────────────────────────────────────────────
    const botName   = String(data.bot || data.botName || 'Manual Execution')
    const symbol    = String(data.symbol || 'UNKNOWN').toUpperCase()
    const rawType   = data.type ?? data.side
    const direction = (
      rawType === 0 || rawType === '0' || String(rawType).toUpperCase() === 'BUY'
    ) ? 'BUY' : 'SELL'
    const ticket = String(data.ticket || `auto_${Date.now()}`)
    const status = String(data.status || 'CLOSED').toUpperCase()

    // ── OPENED → write full signal entry to botTrades ──────────────────────
    if (status === 'OPENED') {
      const entryPrice = parseFloat(String(data.entryPrice ?? 0)) || 0
      const sl         = parseFloat(String(data.sl  ?? 0)) || 0
      const tp1        = parseFloat(String(data.tp1 ?? 0)) || 0
      const tp2        = parseFloat(String(data.tp2 ?? 0)) || 0
      const lot        = parseFloat(String(data.lot ?? 0)) || 0

      // Skip if no meaningful entry data (old-format bots sending empty OPENED)
      if (entryPrice === 0 && sl === 0) {
        return NextResponse.json({ received: true, note: 'OPENED skipped — no entry details' })
      }

      await firestorePatch('botTrades', ticket, {
        symbol, bot: botName, direction,
        entryPrice, sl, tp1, tp2, lot,
        status:   'OPEN',
        outcome:  'PENDING',
        openedAt: new Date(),
        source:   'MT5 Bot Signal',
      })

      console.log(`[WEBHOOK v5] 📡 OPENED: ${botName} | ${symbol} | ${direction} @ ${entryPrice} | #${ticket}`)
      return NextResponse.json({ success: true, action: 'signal_opened' })
    }

    // ── CLOSED → patch outcome onto existing botTrades document ─────────────
    if (status === 'CLOSED') {
      const profit = parseFloat(String(data.profit ?? 0)) || 0

      // updateMask: only write these fields — entry details are preserved intact
      await firestorePatch(
        'botTrades', ticket,
        {
          profit,
          status:   'CLOSED',
          outcome:  profit >= 0 ? 'WIN' : 'LOSS',
          closedAt: new Date(),
        },
        ['profit', 'status', 'outcome', 'closedAt']
      )

      console.log(`[WEBHOOK v5] ✅ CLOSED: ${botName} | ${symbol} | $${profit} | #${ticket}`)
      return NextResponse.json({ success: true, action: 'signal_closed', profit })
    }

    // Unknown status
    return NextResponse.json({ received: true, note: `Unknown status: ${status}` }, { status: 200 })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[WEBHOOK v5] Error:', msg, '| Body:', rawBody.slice(0, 200))
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

export async function GET()    { return new Response(null, { status: 405 }) }
export async function PUT()    { return new Response(null, { status: 405 }) }
export async function DELETE() { return new Response(null, { status: 405 }) }