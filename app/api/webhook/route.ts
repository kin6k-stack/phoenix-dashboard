import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

function initFirebaseAdmin() {
  if (getApps().length === 0) {
    // These must be defined in your Vercel Environment Variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('FIREBASE_CONFIG_ERROR', { 
        projectIdExists: !!projectId, 
        clientEmailExists: !!clientEmail, 
        privateKeyExists: !!privateKey 
      });
      throw new Error('Firebase Admin environment variables are missing.');
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
  return getFirestore();
}

export async function POST(request: Request) {
  try {
    const db = initFirebaseAdmin();
    const apiKey = request.headers.get('x-api-key');
    const secureKey = process.env.BOT_API_KEY;

    if (!apiKey || apiKey !== secureKey) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticket, symbol, profit, type, bot, status, timestamp } = body;

    const tradeRef = db.collection('trades').doc(String(ticket));

    if (status === "OPENED") {
      await tradeRef.set({
        ticket: String(ticket),
        symbol: String(symbol),
        botName: String(bot),
        status: "OPENED",
        netProfit: 0.00,
        openTimestamp: String(timestamp),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } else if (status === "CLOSED") {
      await tradeRef.set({
        status: "CLOSED",
        netProfit: Number(profit),
        closedTimestamp: String(timestamp),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('PIPELINE_ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}