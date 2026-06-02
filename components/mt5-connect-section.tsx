"use client"
// components/mt5-connect-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// MT5 Connect — Settings Panel Section
//
// Inject between the ANIMATIONS section and the ABOUT section in settings-panel.tsx:
//
//   {/* MT5 CONNECT */}
//   <MT5ConnectSection />
//
// Add this import at the top of settings-panel.tsx:
//   import { MT5ConnectSection } from "@/components/mt5-connect-section"
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { downloadSyncScript } from "@/lib/generate-sync-script"
import {
  MonitorDot, Download, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronUp, Loader2, RefreshCw,
} from "lucide-react"

type TokenStatus = "idle" | "generating" | "ready" | "error"

interface SyncTokenState {
  token:     string
  expiresAt: string   // ISO string
  generated: number   // Date.now() when generated
}

const WEBHOOK_URL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : "https://phoenix-dashboard-two.vercel.app"

export function MT5ConnectSection() {
  const { user } = useAuth()

  const [status,      setStatus]      = useState<TokenStatus>("idle")
  const [tokenState,  setTokenState]  = useState<SyncTokenState | null>(null)
  const [errorMsg,    setErrorMsg]    = useState("")
  const [expanded,    setExpanded]    = useState(false)
  const [downloaded,  setDownloaded]  = useState(false)

  // Restore any previously generated token from sessionStorage
  // (survives settings panel close/reopen within the same tab)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("phoenix_sync_token")
      if (raw) {
        const parsed: SyncTokenState = JSON.parse(raw)
        // Discard if expired
        if (new Date(parsed.expiresAt) > new Date()) {
          setTokenState(parsed)
          setStatus("ready")
        } else {
          sessionStorage.removeItem("phoenix_sync_token")
        }
      }
    } catch {}
  }, [])

  // ── Generate token ─────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!user) return
    setStatus("generating")
    setErrorMsg("")
    setDownloaded(false)

    try {
      // Get Firebase ID token for server-side auth
      const idToken = await user.getIdToken()

      const res = await fetch("/api/generate-token", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: user.uid }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to generate token")
      }

      const data = await res.json()
      const newState: SyncTokenState = {
        token:     data.token,
        expiresAt: data.expiresAt,
        generated: Date.now(),
      }

      setTokenState(newState)
      setStatus("ready")

      // Persist for the session
      try { sessionStorage.setItem("phoenix_sync_token", JSON.stringify(newState)) } catch {}

      // Auto-trigger download immediately
      downloadSyncScript(data.token, WEBHOOK_URL, "Phoenix_Sync.mq5")
      setDownloaded(true)

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error")
      setStatus("error")
    }
  }

  // ── Re-download (token already exists) ────────────────────────────────────
  const handleRedownload = () => {
    if (!tokenState) return
    downloadSyncScript(tokenState.token, WEBHOOK_URL, "Phoenix_Sync.mq5")
    setDownloaded(true)
  }

  // ── Regenerate (get a fresh token) ────────────────────────────────────────
  const handleRegenerate = () => {
    try { sessionStorage.removeItem("phoenix_sync_token") } catch {}
    setTokenState(null)
    setStatus("idle")
    setDownloaded(false)
    setErrorMsg("")
  }

  // ── Time remaining ─────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState("")
  useEffect(() => {
    if (!tokenState) return
    const update = () => {
      const ms = new Date(tokenState.expiresAt).getTime() - Date.now()
      if (ms <= 0) { setTimeLeft("Expired"); return }
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      setTimeLeft(`${h}h ${m}m remaining`)
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [tokenState])

  return (
    <section className="space-y-2.5">

      {/* Section header */}
      <div className="flex items-center gap-2">
        <MonitorDot className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          MetaTrader 5 Connect
        </h3>
      </div>

      {/* Main card */}
      <div className="rounded-lg border border-border bg-background/40 overflow-hidden">

        {/* Card header — always visible */}
        <div className="p-3 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Sync your MT5 trade history to your Phoenix dashboard.
            Generate a one-time script, run it in MetaTrader 5, and your
            trades populate automatically — no technical setup required.
          </p>

          {/* IDLE / ERROR state */}
          {(status === "idle" || status === "error") && (
            <>
              <button
                onClick={handleGenerate}
                disabled={status === "generating"}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest text-white transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, #fff) 100%)" }}>
                <Download className="h-3.5 w-3.5" />
                Generate Sync Script
              </button>
              {status === "error" && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-destructive leading-snug">{errorMsg}</p>
                </div>
              )}
            </>
          )}

          {/* GENERATING state */}
          {status === "generating" && (
            <div className="flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-border bg-background/20">
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Generating secure token…
              </span>
            </div>
          )}

          {/* READY state */}
          {status === "ready" && tokenState && (
            <div className="space-y-2.5">

              {/* Status pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Token Active
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{timeLeft}</span>
                </div>
              </div>

              {/* Downloaded confirmation */}
              {downloaded && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <p className="text-[10px] text-emerald-400 font-bold">
                    Phoenix_Sync.mq5 downloaded to your computer
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleRedownload}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-primary/30 bg-primary/[0.06] text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors">
                  <Download className="h-3 w-3" />
                  Re-download
                </button>
                <button
                  onClick={handleRegenerate}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background/40 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors">
                  <RefreshCw className="h-3 w-3" />
                  New Token
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions accordion */}
        <div className="border-t border-border">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-white/[0.02] transition-colors">
            <span>How to install</span>
            {expanded
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {expanded && (
            <div className="px-3 pb-3 space-y-2">

              {/* Step list */}
              {[
                {
                  n: "1",
                  title: "Allow the URL in MetaTrader 5",
                  body: "Tools → Options → Expert Advisors → tick \"Allow WebRequest for listed URL\" → add: phoenix-dashboard-two.vercel.app",
                },
                {
                  n: "2",
                  title: "Copy the script to MT5",
                  body: "Open MT5 → File → Open Data Folder → MQL5 → Scripts → paste Phoenix_Sync.mq5 here",
                },
                {
                  n: "3",
                  title: "Run the script",
                  body: "In MT5 Navigator panel → Scripts → double-click Phoenix_Sync → set Dry Run = false → OK",
                },
                {
                  n: "4",
                  title: "Watch your dashboard update",
                  body: "Trades appear in your Phoenix Imported Trades page within 5–10 seconds of the script finishing.",
                },
              ].map(step => (
                <div key={step.n} className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[9px] font-black text-primary">{step.n}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-foreground uppercase tracking-wide">{step.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{step.body}</p>
                  </div>
                </div>
              ))}

              {/* Security note */}
              <div className="mt-2 p-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">
                <p className="text-[10px] text-amber-400/80 leading-snug">
                  <span className="font-black">Security:</span> Each script contains a unique token tied to your account.
                  Do not share the downloaded file. Tokens expire after 48 hours and can only be used once.
                </p>
              </div>

            </div>
          )}
        </div>
      </div>
    </section>
  )
}
