"use client"

// ─────────────────────────────────────────────────────────────────────────
// PHOENIX — Biometric gate (native app only)
//
// Locks the app behind fingerprint/face on launch when running inside the
// Capacitor native app. No-op on the web (Firebase login guards there).
//
// IMPORTANT FIX: the OS biometric dialog itself causes app "state changes",
// so a naive appStateChange→re-lock listener creates an infinite loop (you
// authenticate, the dialog closes, that fires a state change, it re-locks).
// We guard against that by (a) ignoring state changes while auth is running,
// and (b) only re-locking after a real background gap (> a few seconds).
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback, useRef } from "react"

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const [isNative, setIsNative] = useState(false)
  const [unlocked, setUnlocked] = useState(true)   // web defaults to unlocked
  const [checking, setChecking] = useState(false)
  const [error, setError]       = useState<string>("")

  const authInProgress = useRef(false)
  const backgroundedAt = useRef<number>(0)

  const runAuth = useCallback(async () => {
    if (authInProgress.current) return    // never run two auths at once
    authInProgress.current = true
    setChecking(true); setError("")
    try {
      const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth")

      // If no biometrics are enrolled / available, don't lock the user out.
      let available = false
      try {
        const info = await BiometricAuth.checkBiometry()
        available = !!info.isAvailable
      } catch {
        available = false
      }
      if (!available) {
        setUnlocked(true)
        return
      }

      await BiometricAuth.authenticate({
        reason: "Unlock Phoenix",
        cancelTitle: "Cancel",
        allowDeviceCredential: true,   // PIN/pattern fallback
        androidTitle: "Phoenix",
        androidSubtitle: "Verify your identity",
        androidConfirmationRequired: false,
      })
      // Success.
      setUnlocked(true)
      setError("")
    } catch (e: any) {
      setUnlocked(false)
      setError(e?.message || "Authentication failed — tap Unlock to retry")
    } finally {
      setChecking(false)
      authInProgress.current = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    let removeListener: (() => void) | null = null

    ;(async () => {
      try {
        const { Capacitor } = await import("@capacitor/core")
        const native = Capacitor.isNativePlatform()
        if (!mounted) return
        setIsNative(native)
        if (!native) { setUnlocked(true); return }

        setUnlocked(false)   // lock on launch
        runAuth()

        // Re-lock only after a REAL background gap, not when the biometric
        // dialog momentarily steals focus.
        const appMod = await import("@capacitor/app").catch(() => null)
        if (appMod?.App && mounted) {
          const handle = await appMod.App.addListener(
            "appStateChange",
            (state: { isActive: boolean }) => {
              if (authInProgress.current) return  // ignore dialog focus changes
              if (!state.isActive) {
                // Going to background — note the time.
                backgroundedAt.current = Date.now()
              } else {
                // Coming to foreground — only re-lock if backgrounded for a
                // real interval (> 3s), so the auth dialog round-trip doesn't
                // trigger a re-lock.
                const gap = Date.now() - backgroundedAt.current
                if (backgroundedAt.current > 0 && gap > 3000) {
                  setUnlocked(false)
                  runAuth()
                }
              }
            }
          )
          removeListener = () => { try { handle.remove() } catch {} }
        }
      } catch {
        if (mounted) { setIsNative(false); setUnlocked(true) }
      }
    })()

    return () => { mounted = false; if (removeListener) removeListener() }
  }, [runAuth])

  // Web, or unlocked → render the app.
  if (!isNative || unlocked) return <>{children}</>

  // Native + locked → lock screen.
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#08090c", color: "#e5e5e5",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 24, padding: 24,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: "linear-gradient(135deg,#16a34a33,#16a34a11)",
        border: "1px solid #16a34a55",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28,
      }}>🔒</div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>Phoenix</p>
        <p style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
          {checking ? "Verifying…" : "Locked — authenticate to continue"}
        </p>
        {error && <p style={{ fontSize: 11, color: "#f87171", marginTop: 8, maxWidth: 260 }}>{error}</p>}
      </div>
      {!checking && (
        <button onClick={runAuth} style={{
          padding: "10px 24px", borderRadius: 10,
          background: "#16a34a1a", border: "1px solid #16a34a44",
          color: "#16a34a", fontSize: 12, fontWeight: 900,
          textTransform: "uppercase", letterSpacing: 1, cursor: "pointer",
        }}>Unlock</button>
      )}
    </div>
  )
}
