import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// PHOENIX TRADING ECOSYSTEM — Vercel Webhook v5.2
// Added: BOT_INIT handler — bot registers itself on OnInit, dashboard auto-updates
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

let _cachedToken: string | null = null
let _tokenExpiry: number = 0

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (_cachedToken && now < _tokenExpiry - 60) return _cachedToken

  const email  = process.env.FIREBASE_CLIENT_EMAIL
  const rawKey = process.env.FIREBASE_PRIVATE_KEY
  if (!email || !rawKey) throw new Error('FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY env var missing')

  const pemKey = rawKey.replace(/\\n/g, '\n')
  const b64url = (str: string) =>
    Buffer.from(str).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')

  const iat = now, exp = now + 3600
  const header  = b64url(JSON.stringify({ alg:'RS256', typ:'JWT' }))
  const payload = b64url(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat, exp,
  }))
  const unsigned = `${header}.${payload}`

  const pemStripped = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g,'')
    .replace(/-----END PRIVATE KEY-----/g,'')
    .replace(/\s/g,'')

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', Buffer.from(pemStripped,'base64'),
    { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned))
  const signature = Buffer.from(sigBuffer).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const jwt = `${unsigned}.${signature}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  if (!tokenRes.ok) throw new Error(`Token exchange failed (${tokenRes.status})`)
  const tokenData = await tokenRes.json() as { access_token: string; expires_in: number }
  _cachedToken = tokenData.access_token
  _tokenExpiry  = now + (tokenData.expires_in ?? 3600)
  return _cachedToken
}

function toFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (v instanceof Date)      fields[k] = { timestampValue: v.toISOString() }
    else if (typeof v === 'string')  fields[k] = { stringValue: v }
    else if (typeof v === 'number')  fields[k] = { doubleValue: v }
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v }
  }
  return fields
}

async function firestorePatch(
  collection: string, docId: string,
  data: Record<string, unknown>, updateMask?: string[]
): Promise<boolean> {
  let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`
  if (updateMask?.length)
    url += '?' + updateMask.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')

  const token = await getAccessToken()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
      body: JSON.stringify({ fields: toFields(data) }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) console.error(`[WEBHOOK v5.2] Firestore ${res.status} on ${collection}/${docId}`)
    return res.ok
  } catch (err) {
    clearTimeout(timeout)
    console.error('[WEBHOOK v5.2] Fetch error:', err)
    return false
  }
}

export async function POST(request: NextRequest) {
  let rawBody = ''
  try {
    rawBody = await request.text()
    const data = JSON.parse(rawBody)

    // Auth
    const receivedKey = data.apiKey || request.headers.get('x-api-key') || ''
    const expectedKey = process.env.BOT_API_KEY
    if (expectedKey && receivedKey !== expectedKey) {
      console.warn('[WEBHOOK v5.2] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!PROJECT_ID) return NextResponse.json({ received: true }, { status: 200 })

    const rawType  = data.type ?? data.side
    const status   = String(data.status || rawType || 'CLOSED').toUpperCase()
    const symbol   = String(data.symbol || 'UNKNOWN').toUpperCase()
    const ticket   = String(data.ticket || `auto_${Date.now()}`)
    const botName  = String(data.bot || data.botName || 'Manual Execution')
    const direction = (rawType === 0 || rawType === '0' || String(rawType).toUpperCase() === 'BUY') ? 'BUY' : 'SELL'

    // ── BOT_INIT: bot registers version/mode on startup → auto-updates Bot Hub ─
    if (status === 'BOT_INIT') {
      const magic       = String(data.magic || '')
      const botVersion  = String(data.botVersion  || '')
      const botMode     = String(data.botMode     || '')
      const botStrategy = String(data.botStrategy || '')
      const timeframe   = String(data.timeframe   || '')

      if (!magic) return NextResponse.json({ received: true, note: 'BOT_INIT missing magic' })

      await firestorePatch(
        'botConfig', magic,
        { botVersion, botMode, botStrategy, botName, symbol, timeframe, lastSeenAt: new Date() },
        ['botVersion','botMode','botStrategy','botName','symbol','timeframe','lastSeenAt']
      )
      console.log(`[WEBHOOK v5.2] 🤖 BOT_INIT: ${botName} ${botVersion} | ${symbol} ${timeframe} | magic ${magic}`)
      return NextResponse.json({ success: true, action: 'bot_registered' })
    }

    // ── OPENED ────────────────────────────────────────────────────────────────
    if (status === 'OPENED') {
      const entryPrice = parseFloat(String(data.entryPrice ?? 0)) || 0
      const sl  = parseFloat(String(data.sl  ?? 0)) || 0
      const tp1 = parseFloat(String(data.tp1 ?? 0)) || 0
      const tp2 = parseFloat(String(data.tp2 ?? 0)) || 0
      const lot = parseFloat(String(data.lot ?? 0)) || 0
      if (entryPrice === 0 && sl === 0)
        return NextResponse.json({ received: true, note: 'OPENED skipped — no entry details' })
      await firestorePatch('botTrades', ticket, {
        symbol, bot: botName, direction, entryPrice, sl, tp1, tp2, lot,
        status: 'OPEN', outcome: 'PENDING', openedAt: new Date(), source: 'MT5 Bot Signal',
      })
      console.log(`[WEBHOOK v5.2] 📡 OPENED: ${botName} | ${symbol} | ${direction} @ ${entryPrice}`)
      return NextResponse.json({ success: true, action: 'signal_opened' })
    }

    // ── CLOSED ────────────────────────────────────────────────────────────────
    if (status === 'CLOSED') {
      const profit = parseFloat(String(data.profit ?? 0)) || 0
      await firestorePatch('botTrades', ticket, {
        profit, status: 'CLOSED',
        outcome: profit >= 0 ? 'WIN' : 'LOSS', closedAt: new Date(),
      }, ['profit','status','outcome','closedAt'])
      console.log(`[WEBHOOK v5.2] ✅ CLOSED: ${botName} | ${symbol} | $${profit}`)
      return NextResponse.json({ success: true, action: 'signal_closed', profit })
    }

    // ── MANUAL_TRADE ──────────────────────────────────────────────────────────
    if (status === 'MANUAL_TRADE') {
      const profit     = parseFloat(String(data.profit ?? 0)) || 0
      const openPrice  = parseFloat(String(data.openPrice  ?? 0)) || 0
      const closePrice = parseFloat(String(data.closePrice ?? 0)) || 0
      const lots       = parseFloat(String(data.lots ?? 0)) || 0
      const userId     = String(data.userId    || '')
      const accountId  = String(data.accountId || '')
      const openedAt   = data.openedAt  ? new Date(String(data.openedAt))  : new Date()
      const closedAt   = data.closedAt  ? new Date(String(data.closedAt))  : new Date()
      const setup      = String(data.setup  || 'Live Trade')
      const source     = String(data.source || 'MT5 Auto-Sync')
      const notes      = String(data.notes  || '')
      const importBatch= String(data.importBatch || '')

      if (!userId) return NextResponse.json({ received: true, note: 'missing userId' }, { status: 200 })

      const tradeDoc: Record<string, unknown> = {
        userId, symbol, direction, rMultiple: profit, profit, setup, source,
        date: closedAt, timestamp: closedAt, closedAt, openedAt,
        lots, lot: lots, openPrice, closePrice, ticket, notes,
        accountId: accountId || '',
        ...(importBatch ? { importBatch } : {}),
      }
      const col = accountId ? `accounts/${accountId}/trades` : 'trades'
      await firestorePatch(col, ticket, tradeDoc)
      console.log(`[WEBHOOK v5.2] 📝 MANUAL: ${userId} | ${symbol} | $${profit} → ${col}`)
      return NextResponse.json({ success: true, action: 'manual_trade_written', collection: col })
    }

    return NextResponse.json({ received: true, note: `Unknown status: ${status}` }, { status: 200 })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[WEBHOOK v5.2] Error:', msg)
    return NextResponse.json({ received: true }, { status: 200 }) // always 200 — MT5 must not hang
  }
}

export async function GET()    { return new Response(null, { status: 405 }) }
export async function PUT()    { return new Response(null, { status: 405 }) }
export async function DELETE() { return new Response(null, { status: 405 }) }