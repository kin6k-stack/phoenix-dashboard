import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // ──────────────────────────────────────────────────────────────────
        // 1. API Key authentication  (matches the MQL5 bots' payload format)
        //    Bots send: { "apiKey": "...", "symbol": "...", "profit": ..., "type": 0/1, "bot": "..." }
        // ──────────────────────────────────────────────────────────────────
        if (data.apiKey !== process.env.BOT_API_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ──────────────────────────────────────────────────────────────────
        // 2. Normalize the incoming payload
        // ──────────────────────────────────────────────────────────────────
        const profitValue = parseFloat(data.profit) || 0;
        const typeString  = data.type === 0 ? "BUY" : "SELL";
        const botName     = data.bot || "Manual Execution";
        const symbol      = data.symbol || "UNKNOWN";

        // ──────────────────────────────────────────────────────────────────
        // 3. Write to Firestore via the REST API
        //    This is the ORIGINAL approach that bypasses gRPC stream hangs
        //    and does NOT require a Firebase Admin Service Account.
        // ──────────────────────────────────────────────────────────────────
        const firestorePayload = {
            fields: {
                symbol:    { stringValue:    symbol },
                profit:    { doubleValue:    profitValue },
                type:      { stringValue:    typeString },
                bot:       { stringValue:    botName },
                timestamp: { timestampValue: new Date().toISOString() },
                source:    { stringValue:    "MT5 REST Engine" },
            },
        };

        const projectId  = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tradingecosystem-f6a4c";
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/trades`;

        const response = await fetch(firestoreUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(firestorePayload),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Firestore REST API error:", errText);
            // Still return 200 so MT5 terminal doesn't hang or crash
            return NextResponse.json({ success: false, warning: "REST write fallback activated" }, { status: 200 });
        }

        const resData = await response.json();
        console.log("✅ Firestore Write OK — Doc:", resData.name?.split('/').pop());

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("WEBHOOK CATCH ERROR:", error);
        // Safety: always return 200 to keep MT5 terminal stable
        return NextResponse.json({ error: 'Payload received, processing delayed' }, { status: 200 });
    }
}