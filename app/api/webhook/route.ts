import { NextResponse } from 'next/server'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ─────────────────────────────────────────────────────────────────────────────
//  PHOENIX TRADING ECOSYSTEM — Vercel Webhook v3.1
//  Compatible with ALL MQL5 EA versions (body-key or header-key)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let rawBody = ''
  try {
    rawBody = await request.text()
    const data = JSON.parse(rawBody)

    // ── Auth: accept apiKey from BODY (correct) OR HEADER (old Gemini EAs) ──
    const receivedKey = data.apiKey || request.headers.get('x-api-key') || ''
    const expectedKey = process.env.BOT_API_KEY
    if (expectedKey && receivedKey !== expectedKey) {
      console.warn('[WEBHOOK] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Only write CLOSED trades to dashboard (OPENED = no P&L yet) ────────
    const status = String(data.status || 'CLOSED').toUpperCase()
    if (status === 'OPENED') {
      return NextResponse.json({ success: true, note: 'entry acknowledged, not logged' })
    }

    // ── Normalize payload (handles all EA field-name variants) ──────────────
    const botName   = String(data.bot || data.botName || 'Manual Execution')
    const symbol    = String(data.symbol || 'UNKNOWN').toUpperCase()
    const profit    = parseFloat(String(data.profit ?? 0)) || 0
    const rawType   = data.type ?? data.side  // EA sends "type" (int 0/1) or "side"
    const direction = (rawType === 0 || rawType === '0' || String(rawType).toUpperCase() === 'BUY')
      ? 'BUY' : 'SELL'

    const tradeDoc = {
      symbol, profit,
      type:      direction,
      bot:       botName,
      timestamp: new Date(),
      source:    'MT5 Webhook v3',
    }

    const docRef = await addDoc(collection(db, 'trades'), tradeDoc)
    console.log(`[WEBHOOK] ✅ ${botName} | ${symbol} | $${profit} | ID: ${docRef.id}`)
    return NextResponse.json({ success: true, id: docRef.id })

  } catch (error) {
    // NEVER return 500 — MT5 terminal hangs on anything but 200
    console.error('[WEBHOOK] Error:', error, '| Body:', rawBody.slice(0, 300))
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

export async function GET()    { return new Response(null, { status: 405 }) }
export async function PUT()    { return new Response(null, { status: 405 }) }
export async function DELETE() { return new Response(null, { status: 405 }) }
