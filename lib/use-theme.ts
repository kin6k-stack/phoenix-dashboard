"use client"

import { useState, useEffect, useCallback } from "react"

// ── Types ─────────────────────────────────────────────────
export type Theme     = "oled" | "dark" | "midnight" | "pink" | "light"
export type Density   = "compact" | "default" | "expanded"

export interface PhoenixSettings {
  theme:      Theme
  density:    Density
  animations: boolean
}

const STORAGE_KEY = "phoenix_settings"

const DEFAULT_SETTINGS: PhoenixSettings = {
  theme:      "oled",
  density:    "default",
  animations: true,
}

// ── Storage helpers ───────────────────────────────────────
function readSettings(): PhoenixSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_SETTINGS
    const parsed = JSON.parse(saved) as Partial<PhoenixSettings>
    return {
      theme:      parsed.theme      ?? DEFAULT_SETTINGS.theme,
      density:    parsed.density    ?? DEFAULT_SETTINGS.density,
      animations: parsed.animations !== false,
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
}

// ── Hook ──────────────────────────────────────────────────
export function useTheme() {
  // Lazy init from localStorage — but only on client
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

  return {
    theme:      settings.theme,
    density:    settings.density,
    animations: settings.animations,
    setTheme,
    setDensity,
    setAnimations,
    hydrated,
  }
}
