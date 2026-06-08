"use client"

// ─────────────────────────────────────────────────────────────────────────────
// useNotifications — Browser + audio notifications for Phoenix Dashboard
//
// Sounds (Web Audio API — no external files needed):
//   win:        ascending 3-note chord (440→550→660 Hz)
//   loss:       soft descending 2-tone (440→330 Hz)
//   signal:     single clean ping (528 Hz)
//   breakeven:  short neutral blip (392 Hz)
//
// Browser notifications: uses the Notifications API — user must grant
// permission. Requested from the Notifications section in Settings.
//
// Persistence: sounds/browser prefs stored in localStorage under
//   phoenix_notif_sounds  : "true" | "false"
//   phoenix_notif_browser : "true" | "false"
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from "react"

export type NotifType = "win" | "loss" | "signal" | "breakeven"

export interface NotifTrade {
  id:        string
  symbol:    string
  rMultiple: number
  setup?:    string
  date:      string
}

// ── Sound engine (Web Audio API) ──────────────────────────────────────────────
function playTone(notes: { freq: number; at: number; duration: number }[], volume = 0.25) {
  if (typeof window === "undefined") return
  try {
    const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(volume, ctx.currentTime)

    for (const note of notes) {
      const osc = ctx.createOscillator()
      osc.type = "sine"
      osc.connect(gain)
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.at)
      gain.gain.setValueAtTime(volume, ctx.currentTime + note.at)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.at + note.duration)
      osc.start(ctx.currentTime + note.at)
      osc.stop(ctx.currentTime + note.at + note.duration + 0.05)
    }
    // Auto-close after all notes finish
    const totalDuration = Math.max(...notes.map(n => n.at + n.duration)) + 0.2
    setTimeout(() => ctx.close(), totalDuration * 1000)
  } catch {
    // Audio not available — silent fail
  }
}

export function playNotifSound(type: NotifType) {
  switch(type) {
    case "win":
      // Ascending 3-note — uplifting, unmistakable win
      playTone([
        { freq: 440, at: 0.00, duration: 0.12 },
        { freq: 554, at: 0.12, duration: 0.12 },
        { freq: 659, at: 0.24, duration: 0.25 },
      ], 0.22)
      break
    case "loss":
      // Soft descending 2-tone — neutral, not alarming
      playTone([
        { freq: 440, at: 0.00, duration: 0.15 },
        { freq: 330, at: 0.18, duration: 0.20 },
      ], 0.18)
      break
    case "signal":
      // Single clean ping — new signal arrived
      playTone([{ freq: 528, at: 0, duration: 0.3 }], 0.2)
      break
    case "breakeven":
      // Short neutral blip
      playTone([{ freq: 392, at: 0, duration: 0.15 }], 0.15)
      break
  }
}

// ── Browser notification ──────────────────────────────────────────────────────
export async function sendBrowserNotif(trade: NotifTrade) {
  if (typeof window === "undefined") return
  if (Notification.permission !== "granted") return

  const isWin  = trade.rMultiple > 0
  const isLoss = trade.rMultiple < 0
  const sign   = isWin ? "+" : ""
  const emoji  = isWin ? "✅" : isLoss ? "❌" : "⚪"

  const title = `${emoji} ${trade.symbol} ${isWin ? "WIN" : isLoss ? "LOSS" : "BE"} ${sign}$${Math.abs(trade.rMultiple).toFixed(2)}`
  const body  = `${trade.setup ?? "Manual"} · ${new Date(trade.date).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" })}`

  try {
    new Notification(title, {
      body,
      icon:  "/phoenix-logo.jpg",
      badge: "/phoenix-logo.jpg",
      tag:   `phoenix-trade-${trade.id}`,
      silent: true,  // we play our own sound
    })
  } catch {
    // Notification blocked — silent fail
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useNotifications() {
  const [soundEnabled,   setSoundEnabled]   = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("phoenix_notif_sounds")  !== "false" : true
  )
  const [browserEnabled, setBrowserEnabled] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("phoenix_notif_browser") === "true"  : false
  )
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default"
  )
  // Tracks IDs already seen so we don't re-notify on initial load or re-renders
  const seenIds = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  const toggleSounds = useCallback((on: boolean) => {
    setSoundEnabled(on)
    localStorage.setItem("phoenix_notif_sounds", String(on))
  }, [])

  const toggleBrowser = useCallback((on: boolean) => {
    setBrowserEnabled(on)
    localStorage.setItem("phoenix_notif_browser", String(on))
  }, [])

  const requestBrowserPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied" as NotificationPermission
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === "granted") {
      setBrowserEnabled(true)
      localStorage.setItem("phoenix_notif_browser", "true")
    }
    return result
  }, [])

  // Called from page.tsx whenever the trades array updates
  const processNewTrades = useCallback((trades: NotifTrade[]) => {
    if (!initialized.current) {
      // First call — populate seenIds with ALL existing trade IDs, fire nothing
      trades.forEach(t => seenIds.current.add(t.id))
      initialized.current = true
      return
    }

    for (const trade of trades) {
      if (seenIds.current.has(trade.id)) continue
      seenIds.current.add(trade.id)

      const type: NotifType = trade.rMultiple > 0 ? "win"
        : trade.rMultiple < 0 ? "loss"
        : "breakeven"

      if (soundEnabled)   playNotifSound(type)
      if (browserEnabled) sendBrowserNotif(trade)
    }
  }, [soundEnabled, browserEnabled])

  return {
    soundEnabled,
    browserEnabled,
    permission,
    toggleSounds,
    toggleBrowser,
    requestBrowserPermission,
    processNewTrades,
  }
}