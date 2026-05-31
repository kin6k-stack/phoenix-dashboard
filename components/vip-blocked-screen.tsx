"use client"

import { Lock, Mail } from "lucide-react"
import type { VipBlockReason } from "@/lib/use-vip-check"

interface VipBlockedScreenProps {
  reason: VipBlockReason
  onRetry?: () => void
}

const COPY: Record<VipBlockReason, { title: string; body: string; cta?: string }> = {
  VIP_LIST_FULL: {
    title: "VIP List Full",
    body: "Phoenix is currently invite-only and all 15 founding seats have been claimed. We'll open the doors wider soon — keep an eye out, or reach out if you think you should be on the list.",
    cta:  "Got it",
  },
  NETWORK_ERROR: {
    title: "Couldn't verify access",
    body: "Something went wrong on our end. Please try signing in again.",
    cta:  "Try again",
  },
  AUTH_ERROR: {
    title: "Authentication problem",
    body: "Your session ended before we could verify access. Please sign in again.",
    cta:  "Sign in again",
  },
}

export function VipBlockedScreen({ reason, onRetry }: VipBlockedScreenProps) {
  const copy = COPY[reason]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-2xl text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Lock className="w-6 h-6 text-amber-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black uppercase tracking-widest text-foreground">
            {copy.title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {copy.body}
          </p>
        </div>

        {reason === "VIP_LIST_FULL" && (
          <div className="rounded-lg bg-background/40 border border-border p-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <Mail className="w-3 h-3" />
            <span>Phoenix Trading Ecosystem · Invite-only beta</span>
          </div>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/15 transition-colors">
            {copy.cta}
          </button>
        )}
      </div>
    </div>
  )
}
