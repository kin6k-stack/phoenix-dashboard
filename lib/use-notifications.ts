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

export type NotifType = "win" | "loss" | "signal" | "breakeven" | "big_win" | "session_open" | "alert" | "milestone" | "streak" | "new_day" | "error"

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

    // ── Core trade outcomes ──────────────────────────────────────────
    case "win":
      // Ascending 3-note chord — clear win
      playTone([
        { freq: 440, at: 0.00, duration: 0.12 },
        { freq: 554, at: 0.12, duration: 0.12 },
        { freq: 659, at: 0.24, duration: 0.28 },
      ], 0.22)
      break

    case "big_win":
      // Extended 4-note fanfare — large winner
      playTone([
        { freq: 440, at: 0.00, duration: 0.10 },
        { freq: 554, at: 0.10, duration: 0.10 },
        { freq: 659, at: 0.20, duration: 0.10 },
        { freq: 880, at: 0.30, duration: 0.45 },
      ], 0.26)
      break

    case "loss":
      // Soft descending 2-tone — not jarring
      playTone([
        { freq: 440, at: 0.00, duration: 0.15 },
        { freq: 330, at: 0.18, duration: 0.22 },
      ], 0.18)
      break

    case "breakeven":
      // Short neutral blip
      playTone([{ freq: 392, at: 0, duration: 0.15 }], 0.15)
      break

    // ── Signals & alerts ─────────────────────────────────────────────
    case "signal":
      // Single clean ping
      playTone([{ freq: 528, at: 0, duration: 0.28 }], 0.20)
      break

    case "alert":
      // Quick double-ping — attention needed now
      playTone([
        { freq: 660, at: 0.00, duration: 0.08 },
        { freq: 660, at: 0.14, duration: 0.12 },
      ], 0.24)
      break

    // ── Session & milestones ──────────────────────────────────────────
    case "session_open":
      // Gentle rising arpeggio — session is live
      playTone([
        { freq: 330, at: 0.00, duration: 0.10 },
        { freq: 415, at: 0.10, duration: 0.10 },
        { freq: 523, at: 0.20, duration: 0.22 },
      ], 0.18)
      break

    case "milestone":
      // Triumphant 4-note — profit target hit
      playTone([
        { freq: 523, at: 0.00, duration: 0.10 },
        { freq: 659, at: 0.10, duration: 0.10 },
        { freq: 784, at: 0.20, duration: 0.10 },
        { freq: 1047,at: 0.30, duration: 0.50 },
      ], 0.24)
      break

    case "streak":
      // Rolling ascending arpeggios — consecutive wins
      playTone([
        { freq: 440, at: 0.00, duration: 0.08 },
        { freq: 554, at: 0.08, duration: 0.08 },
        { freq: 659, at: 0.16, duration: 0.08 },
        { freq: 554, at: 0.24, duration: 0.08 },
        { freq: 659, at: 0.32, duration: 0.08 },
        { freq: 784, at: 0.40, duration: 0.25 },
      ], 0.20)
      break

    case "new_day":
      // Clean morning chime — new trading day open
      playTone([
        { freq: 523, at: 0.00, duration: 0.14 },
        { freq: 659, at: 0.16, duration: 0.14 },
        { freq: 784, at: 0.32, duration: 0.30 },
      ], 0.16)
      break

    // ── System ──────────────────────────────────────────────────────
    case "error":
      // Low descending buzz — something went wrong
      playTone([
        { freq: 220, at: 0.00, duration: 0.18 },
        { freq: 180, at: 0.20, duration: 0.25 },
      ], 0.20)
      break
  }
}

// Convenience: play a sound then optionally follow with another after delay
export function playNotifSequence(types: NotifType[], delayMs = 400) {
  if (!types.length) return
  playNotifSound(types[0])
  for (let i = 1; i < types.length; i++) {
    setTimeout(() => playNotifSound(types[i]), delayMs * i)
  }
}

// All available sounds with labels (for settings UI)
export const NOTIF_SOUNDS: { id: NotifType; label: string; description: string }[] = [
  { id:"win",          label:"Win",           description:"3-note ascending chord"                  },
  { id:"big_win",      label:"Big Win",       description:"4-note fanfare for large winners"        },
  { id:"loss",         label:"Loss",          description:"Soft descending 2-tone"                  },
  { id:"breakeven",    label:"Breakeven",     description:"Short neutral blip"                      },
  { id:"signal",       label:"Signal",        description:"Single clean ping"                       },
  { id:"alert",        label:"Alert",         description:"Double-ping for urgent attention"        },
  { id:"session_open", label:"Session Open",  description:"Rising arpeggio — market session live"  },
  { id:"milestone",    label:"Milestone",     description:"Triumphant 4-note for profit targets"   },
  { id:"streak",       label:"Streak",        description:"Rolling arpeggios for win streaks"       },
  { id:"new_day",      label:"New Day",       description:"Morning chime — new trading day"         },
  { id:"error",        label:"Error",         description:"Low buzz for system errors"              },
]

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