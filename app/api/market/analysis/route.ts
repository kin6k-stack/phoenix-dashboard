// /api/market/analysis
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    narrative:
      "Markets are navigating a complex macro backdrop of persistent inflation, central bank divergence, and elevated geopolitical risk. Gold is well-supported by real yield compression and safe-haven demand. The USD is experiencing structural headwinds despite near-term rate support.",
    regime: "GEOPOLITICAL",
    dominantTheme: "Middle East risk premium + Fed policy uncertainty",
    conviction: 68,
    cautionFactors: [
      "NFP data due — significant range expansion likely",
      "Trump tariff escalation could trigger EUR volatility spike",
      "Gold at key weekly resistance — rejection risk elevated",
    ],
    macroRegime: {
      riskSentiment: { label: "Risk Sentiment", value: "Risk-Off Lean", color: "amber" },
      rateRegime:    { label: "Rate Regime",    value: "Hawkish Hold",  color: "red"   },
      inflation:     { label: "Inflation",      value: "Sticky Above Target", color: "orange" },
      usdRegime:     { label: "USD Regime",     value: "Consolidating",  color: "blue" },
      volatility:    { label: "Volatility",     value: "Elevated (VIX 22)", color: "purple" },
    },
    timestamp: new Date().toISOString(),
  });
}
