"use client"

import { useState, useEffect, useCallback } from "react"

// ── Types ─────────────────────────────────────────────────
export type Theme   = "black-white" | "dark" | "midnight" | "violet" | "light"
export type Density = "compact" | "default" | "expanded"

export interface PhoenixSettings {
  theme:      Theme
  density:    Density
  animations: boolean
  invert:     boolean   // only meaningful when theme === "black-white"
}

const STORAGE_KEY = "phoenix_settings"

const DEFAULT_SETTINGS: PhoenixSettings = {
  theme:      "black-white",
  density:    "default",
  animations: true,
  invert:     false,
}

// ── Migration: handle old `oled` / `pink` values from existing users ──
function migrateTheme(raw: string | undefined | null): Theme {
  if (raw === "oled" || raw == null) return "black-white"   // OLED → Black/White (same look)
  if (raw === "pink")                return "violet"        // Pink users → Violet (closest match)
  if (raw === "black-white" || raw === "dark" || raw === "midnight" || raw === "violet" || raw === "light") {
    return raw
  }
  return "black-white"
}

// ── Storage helpers ───────────────────────────────────────
function readSettings(): PhoenixSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_SETTINGS
    const parsed = JSON.parse(saved) as Partial<PhoenixSettings> & { theme?: string }
    return {
      theme:      migrateTheme(parsed.theme),
      density:    parsed.density    ?? DEFAULT_SETTINGS.density,
      animations: parsed.animations !== false,
      invert:     parsed.invert === true,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function writeSettings(settings: PhoenixSettings) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn("Failed to persist theme settings:", e)
  }
}

function applySettings(settings: PhoenixSettings) {
  if (typeof document === "undefined") return
  const html = document.documentElement
  html.setAttribute("data-theme", settings.theme)
  html.setAttribute("data-density", settings.density)
  if (settings.animations) html.classList.remove("no-animations")
  else                     html.classList.add("no-animations")

  // Invert only applies in Black/White mode; clear it on other themes
  if (settings.theme === "black-white" && settings.invert) html.classList.add("invert-bw")
  else                                                     html.classList.remove("invert-bw")
}

// ── Hook ──────────────────────────────────────────────────
export function useTheme() {
  const [settings, setSettings] = useState<PhoenixSettings>(DEFAULT_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSettings(readSettings())
    setHydrated(true)
  }, [])

  const update = useCallback((patch: Partial<PhoenixSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      writeSettings(next)
      applySettings(next)
      return next
    })
  }, [])

  const setTheme      = useCallback((theme: Theme)         => update({ theme }),      [update])
  const setDensity    = useCallback((density: Density)     => update({ density }),    [update])
  const setAnimations = useCallback((animations: boolean)  => update({ animations }), [update])
  const setInvert     = useCallback((invert: boolean)      => update({ invert }),     [update])

  return {
    theme:      settings.theme,
    density:    settings.density,
    animations: settings.animations,
    invert:     settings.invert,
    setTheme,
    setDensity,
    setAnimations,
    setInvert,
    hydrated,
  }
}
