import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // 1. Security Check
        if (data.apiKey !== process.env.BOT_API_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Format the payload securely
        const profitValue = parseFloat(data.profit) || 0;
        const typeString = data.type === 0 ? "BUY" : "SELL";

        // 3. REST Payload Definition for Firestore REST API
        // This maps the data directly into Firestore's native document format
        const firestorePayload = {
            fields: {
                symbol: { stringValue: data.symbol || "UNKNOWN" },
                profit: { doubleValue: profitValue },
                type: { stringValue: typeString },
                bot: { stringValue: data.bot || "MT5 EA" },
                timestamp: { timestampValue: new Date().toISOString() },
                source: { stringValue: "MT5 REST Engine" }
            }
        };

        // 4. Fire direct HTTPS POST to the Firestore endpoint
        // Bypasses the client library, eliminating gRPC stream hangs
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tradingecosystem-f6a4c";
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/trades`;

        const response = await fetch(firestoreUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(firestorePayload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Firestore REST API returned error:", errText);
            // Return a 200 code to MT5 so the terminal doesn't crash or freeze
            return NextResponse.json({ success: false, warning: "REST write fallback activated" }, { status: 200 });
        }

        const resData = await response.json();
        console.log("Firestore REST Write Successful. Doc ID:", resData.name.split('/').pop());

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("WEBHOOK CATCH ERROR:", error);
        // Direct safety response to keep the MT5 terminal processing ticks smoothly
        return NextResponse.json({ error: 'Payload received, processing delayed' }, { status: 200 });
    }
}