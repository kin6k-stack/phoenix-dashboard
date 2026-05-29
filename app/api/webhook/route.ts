import { NextRequest, NextResponse } from 'next/server'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const API_KEY = process.env.WEBHOOK_API_KEY ?? 'Kin6kizan4@'

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  if (apiKey !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    ticket?: string | number
    symbol?: string
    profit?: number
    side?: number
    bot?: string
    status?: string
    timestamp?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { ticket, symbol, profit, side, bot, status, timestamp } = body

  // Skip entry events — they carry zero profit and would pollute the ledger
  if (status === 'OPENED') {
    return NextResponse.json({ ok: true, skipped: 'entry event' }, { status: 200 })
  }

  if (!symbol) {
    return NextResponse.json({ error: 'Missing required field: symbol' }, { status: 400 })
  }

  // MT5 DEAL_TYPE: 0 = BUY, 1 = SELL
  const direction = Number(side) === 0 ? 'BUY' : 'SELL'

  try {
    await addDoc(collection(db, 'trades'), {
      ticket: String(ticket ?? ''),
      symbol: String(symbol).toUpperCase(),
      profit: Number(profit ?? 0),
      direction,
      bot: String(bot ?? 'Unknown'),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      notes: `Webhook auto-log · Ticket ${ticket ?? 'N/A'}`,
      screenshot: '',
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('[webhook] Firestore write failed:', err)
    return NextResponse.json({ error: 'Database write failed' }, { status: 500 })
  }
}
