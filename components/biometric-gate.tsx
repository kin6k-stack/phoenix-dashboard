"use client"

// ─────────────────────────────────────────────────────────────────────────
// PHOENIX — Biometric gate (native app only)
//
// When running inside the Capacitor native app, this blocks the UI with a
// lock screen until the user passes fingerprint/face authentication. On a
// normal web browser it renders nothing and does nothing (no biometrics on
// the web — auth there is handled by Firebase login as usual).
//
// Re-prompts when the app returns to the foreground after being backgrounded,
// so a stolen unlocked phone can't just reopen the app.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from "react"

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const [isNative, setIsNative]   = useState(false)
  const [unlocked, setUnlocked]   = useState(true)   // web defaults to unlocked
  const [checking, setChecking]   = useState(false)
  const [error, setError]         = useState<string>("")

  const runAuth = useCallback(async () => {
    setChecking(true); setError("")
    try {
      const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth")
      // Check availability first — if the device has no biometrics enrolled,
      // don't lock the user out; just let them in (Firebase login still guards).
      const info = await BiometricAuth.checkBiometry()
      if (!info.isAvailable) { setUnlocked(true); setChecking(false); return }

      await BiometricAuth.authenticate({
        reason: "Unlock Phoenix",
        cancelTitle: "Cancel",
        allowDeviceCredential: true,   // fall back to PIN/pattern if biometric fails
        androidTitle: "Phoenix",
        androidSubtitle: "Verify your identity",
      })
      setUnlocked(true)
    } catch (e: any) {
      // Authentication failed or was cancelled — stay locked, show retry.
      setUnlocked(false)
      setError(e?.message || "Authentication failed")
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { Capacitor } = await import("@capacitor/core")
        const native = Capacitor.isNativePlatform()
        if (!mounted) return
        setIsNative(native)
        if (native) {
          setUnlocked(false)      // lock immediately on native
          runAuth()

          // Re-lock when the app returns from background.
          const { App } = await import("@capacitor/app").catch(() => ({ App: null as any }))
          if (App) {
            App.addListener("appStateChange", (state: { isActive: boolean }) => {
              if (state.isActive) { setUnlocked(false); runAuth() }
            })
          }
        }
      } catch {
        // Not in Capacitor / plugin missing — behave as web (unlocked).
        if (mounted) { setIsNative(false); setUnlocked(true) }
      }
    })()
    return () => { mounted = false }
  }, [runAuth])

  // Web, or already unlocked → render the app normally.
  if (!isNative || unlocked) return <>{children}</>

  // Native + locked → show the lock screen.
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
        {error && <p style={{ fontSize: 11, color: "#f87171", marginTop: 8 }}>{error}</p>}
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
