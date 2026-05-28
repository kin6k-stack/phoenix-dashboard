import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Explicitly instruct Next.js compiler to bypass static pre-generation optimizations for this telemetry node
export const dynamic = 'force-dynamic';

function initFirebaseAdmin() {
  if (getApps().length === 0) {
    // High-Availability Fallback: Check both private and public environment variables to eliminate naming discrepancies
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('CRITICAL CONFIG ERROR: Firebase Admin environment variables are missing or incorrectly configured in the Vercel console.');
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
  return getFirestore();
}

export async function POST(request: Request) {
  try {
    // Lazy-initialize connection precisely inside execution space to shield Next.js static build checks
    const db = initFirebaseAdmin();

    // 1. Security Gatekeeper Check
    const apiKey = request.headers.get('x-api-key');
    const secureKey = process.env.BOT_API_KEY || "Kin6kizan4@";

    if (!apiKey || apiKey !== secureKey) {
      console.warn(`🛑 [SECURITY ALERT] Unauthorized telemetry attempt rejected.`);
      return NextResponse.json({ error: 'Unauthorized gateway handshake denied.' }, { status: 401 });
    }

    // 2. Parse Payload Stream
    const body = await request.json();
    const { ticket, symbol, profit, side, bot, status, timestamp } = body;

    // Rigid structural validation barrier
    if (!ticket || !symbol || !bot || !status) {
      return NextResponse.json({ error: 'Malformed telemetry payload layout rejected.' }, { status: 400 });
    }

    console.log(`📡 [INCOMING PIPELINE] Processing ${bot} | Ticket #${ticket} | Status: ${status}`);

    // 3. Structural Routing Matrix (Unifying Trade Lifecycles)
    const tradeRef = db.collection('trades').doc(String(ticket));

    if (status === "OPENED") {
      await tradeRef.set({
        ticket: String(ticket),
        symbol: String(symbol),
        openSide: Number(side), // 0 = BUY, 1 = SELL (Standard MT5 convention)
        botName: String(bot),
        status: "OPENED",
        openProfit: 0.00,
        netProfit: 0.00,
        openTimestamp: String(timestamp),
        closedTimestamp: null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } 
    else if (status === "CLOSED") {
      await tradeRef.set({
        ticket: String(ticket),
        symbol: String(symbol),
        botName: String(bot),
        status: "CLOSED",
        netProfit: Number(profit), // Includes commission + swap modifications handled by MT5 engine
        closedTimestamp: String(timestamp),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    return NextResponse.json({ success: true, message: `Ticket ${ticket} successfully synced.` }, { status: 200 });

  } catch (error: any) {
    console.error('❌ [CRITICAL PIPELINE EXCEPTION]:', error);
    return NextResponse.json({ error: 'Internal serverless data pipeline break.', details: error.message }, { status: 500 });
  }
}