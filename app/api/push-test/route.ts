// ─────────────────────────────────────────────────────────────────────────
// /api/push-test  (POST) — send a confirmation push to a user's devices.
// Used right after the user enables notifications, so they get instant proof
// the feed is live ("Phoenix notification feed loaded").
// Body: { userId: string }
// ─────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server"
import { sendPush } from "@/lib/push-server"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    const res = await sendPush({
      title: "Phoenix",
      body: "Phoenix notification feed loaded — you'll get alerts on every bot trade.",
      url: "/",
      tag: "phoenix-feed-loaded",
    }, userId || undefined)
    return NextResponse.json({ ok: true, ...res })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 200 })
  }
}
