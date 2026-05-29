// /api/market/sessions
import { NextResponse } from "next/server";
import { MOCK_SESSIONS } from "@/lib/mock-data";
import type { SessionName } from "@/types";

function getCurrentSession(): SessionName {
  const hour = new Date().getUTCHours();
  if (hour >= 22 || hour < 7) return "sydney";
  if (hour >= 0 && hour < 9) return "asia";
  if (hour >= 8 && hour < 17) return "london";
  return "new-york";
}

function getNextSession(current: SessionName): SessionName {
  const order: SessionName[] = ["sydney", "asia", "london", "new-york"];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

export async function GET() {
  const currentSession = getCurrentSession();
  const nextSession = getNextSession(currentSession);

  const data = MOCK_SESSIONS.map((s) => ({
    ...s,
    status:
      s.session === currentSession
        ? "active"
        : s.session === nextSession
        ? "opening"
        : "closed",
  }));

  return NextResponse.json({
    data,
    currentSession,
    nextSession,
    timestamp: new Date().toISOString(),
  });
}
