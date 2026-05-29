// /api/market/catalysts
import { NextResponse } from "next/server";
import { MOCK_CATALYSTS } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({
    data: MOCK_CATALYSTS,
    timestamp: new Date().toISOString(),
  });
}
