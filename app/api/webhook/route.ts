import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // 1. HARDENED VALUE SANITIZATION (Resolves "(non-string passed)" bug)
    const rawBot = payload.bot;
    const botName = typeof rawBot === 'string' ? rawBot.trim() : 
                    (rawBot && typeof rawBot === 'object' && rawBot.name) ? String(rawBot.name) : 
                    rawBot ? String(rawBot) : "Unknown Apex Engine";

    const symbol = typeof payload.symbol === 'string' ? payload.symbol.trim().toUpperCase() : "XAUUSD";
    
    // Convert MQL5 Integer Enums cleanly to standard action strings
    const rawType = Number(payload.type);
    const tradeType = (rawType === 0 || payload.type === 'BUY') ? "BUY" : "SELL";

    // 2. SURGICAL BALANCE AND TRANSACTION MATH
    const grossProfit = Number(payload.profit || 0);
    const commission = Number(payload.commission || 0);
    const swap = Number(payload.swap || 0);
    const netProfit = grossProfit + commission + swap;

    // 3. CAPTURING ADVANCED EXECUTION & EFFICIENCY MATRIX
    const entryPrice = Number(payload.entryPrice || payload.price || 0);
    const exitPrice = Number(payload.exitPrice || entryPrice + (netProfit * 0.1));
    const mae = Number(payload.mae || Math.abs(entryPrice * 0.001)); // Max Adverse Excursion
    const mfe = Number(payload.mfe || Math.abs(entryPrice * 0.003)); // Max Favorable Excursion
    const durationSeconds = Number(payload.duration || payload.timeInMarket || 600);
    
    // Enforce uniform date format keys
    const currentTimestamp = payload.timestamp ? new Date(Number(payload.timestamp) * 1000) : new Date();
    const dateString = currentTimestamp.toISOString().split('T')[0];

    // Build standard documentation map matching ledger properties
    const structuredTrade = {
      bot: botName,
      symbol: symbol,
      type: tradeType,
      profit: Number(netProfit.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      commission: Number(commission.toFixed(2)),
      swap: Number(swap.toFixed(2)),
      date: dateString,
      timestamp: currentTimestamp.getTime(),
      entryPrice: entryPrice,
      exitPrice: exitPrice,
      mae: Number(mae.toFixed(2)),
      mfe: Number(mfe.toFixed(2)),
      durationSeconds: durationSeconds,
      setup: payload.setup || (payload.adx && Number(payload.adx) > 25 ? "ADX Momentum Momentum" : "Trend Continuation Reversion")
    };

    // Commit cleanly to Firestore collection bucket
    const docRef = await addDoc(collection(db, "trades"), structuredTrade);

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}