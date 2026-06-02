"use client"

import { useEffect } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import {
  X, Palette, Maximize2, Sparkles, LogOut, Check, Moon, RotateCcw,
} from "lucide-react"
import { useTheme, type Theme, type Density } from "@/lib/use-theme"
import { MT5ConnectSection } from "@/components/mt5-connect-section"

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

// ── Theme swatches ──────────────────────────────────────────
const THEMES: { id: Theme; label: string; description: string; bg: string; accent: string; border: string; gradient?: string }[] = [
  { id: "black-white", label: "Black / White", description: "True monochrome — invertible to white canvas",            bg: "#000000", accent: "#e5e5e5", border: "#1c1c1c" },
  { id: "dark",        label: "Green Lab",     description: "Slate base with emerald accents — the OG Phoenix lab look", bg: "#1a1d23", accent: "#16a34a", border: "#2a2e36" },
  { id: "midnight",    label: "Midnight",      description: "Deep navy with electric blue accents",                     bg: "#0c1018", accent: "#3b82f6", border: "#1a2030" },
  { id: "violet",      label: "Violet",        description: "Purple gradient — matches login aesthetic",                bg: "#0f0a18", accent: "#c084fc", border: "#241a36", gradient: "linear-gradient(135deg, #c084fc 0%, #e879f9 100%)" },
  { id: "gold",        label: "Gold",          description: "Light canvas with amber/gold accents",                     bg: "#f5f3ee", accent: "#f59e0b", border: "#e8e2d4", gradient: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" },
]

const DENSITIES: { id: Density; label: string; description: string }[] = [
  { id: "compact",  label: "Compact",  description: "Tightest spacing, more on screen" },
  { id: "default",  label: "Default",  description: "Balanced — recommended for most" },
  { id: "expanded", label: "Expanded", description: "Roomy, easier on the eyes" },
]

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const {
    theme, density, animations, invert,
    setTheme, setDensity, setAnimations, setInvert,
  } = useTheme()
  const router = useRouter()

  // ESC to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
  }, [open])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (e) {
      console.error("Sign out failed:", e)
    }
  }

  if (!open) return null

  // For the Black/White swatch preview, flip colors if invert is active
  const bwSwatchBg     = invert ? "#ffffff" : "#000000"
  const bwSwatchBorder = invert ? "#e5e5e5" : "#1c1c1c"

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in"
        aria-hidden="true"
      />

      {/* Drawer
          Pass K: Switched h-screen → h-[100dvh] so the footer
          (Sign Out button) isn't pushed off-screen by mobile browser
          UI (iOS Safari URL bar, Chrome bottom bar, etc).
          `100dvh` = dynamic viewport height, which accounts for
          collapsible browser chrome. Fallback to h-screen for older
          browsers via the inline style. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        style={{ height: "100dvh" }}
        className="fixed top-0 right-0 w-full sm:w-[420px] h-screen bg-card border-l border-border z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
            aria-label="Close settings">
            <X size={16} />
          </button>
        </div>

        {/* Body
            Pass K: `min-h-0` is critical for the flex layout — without it,
            this flex-1 div would refuse to shrink past its content height,
            pushing the Sign Out footer off-screen on mobile. */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-6">

          {/* THEMES */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Theme</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {THEMES.map(t => {
                const active = theme === t.id
                const useBwOverride = t.id === "black-white"
                const swatchBg     = useBwOverride ? bwSwatchBg     : t.bg
                const swatchBorder = useBwOverride ? bwSwatchBorder : t.border
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all
                      ${active
                        ? "border-primary/40 bg-primary/[0.06]"
                        : "border-border bg-background/40 hover:bg-white/[0.03] hover:border-border"}`}>
                    <div
                      className="w-12 h-12 rounded flex-shrink-0 border relative overflow-hidden"
                      style={{ background: swatchBg, borderColor: swatchBorder }}>
                      {/* Accent dot — gradient if the theme defines one, else solid */}
                      <div
                        className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 rounded-full"
                        style={{ background: t.gradient ?? t.accent }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black uppercase tracking-widest ${active ? "text-primary" : "text-foreground"}`}>
                        {t.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        {t.description}
                      </p>
                    </div>
                    {active && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* Invert toggle — only when Black/White is active */}
            {theme === "black-white" && (
              <button
                onClick={() => setInvert(!invert)}
                role="switch"
                aria-checked={invert}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border bg-background/40 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-widest text-foreground">Invert</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {invert ? "White canvas, black text" : "Black canvas, white text"}
                    </p>
                  </div>
                </div>
                <div className={`relative w-9 h-5 rounded-full transition-colors ${invert ? "bg-primary" : "bg-muted"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${invert ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </div>
              </button>
            )}
          </section>

          {/* DENSITY */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Density</h3>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-background/40 border border-border">
              {DENSITIES.map(d => {
                const active = density === d.id
                return (
                  <button
                    key={d.id}
                    onClick={() => setDensity(d.id)}
                    className={`flex-1 px-2 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors
                      ${active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"}`}>
                    {d.label}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/70 leading-snug px-1">
              {DENSITIES.find(d => d.id === density)?.description}
            </p>
          </section>

          {/* ANIMATIONS */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Animations</h3>
            </div>
            <button
              onClick={() => setAnimations(!animations)}
              role="switch"
              aria-checked={animations}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors
                ${animations
                  ? "bg-primary/[0.06] border-primary/30"
                  : "bg-background/40 border-border"}`}>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-foreground">
                  {animations ? "Enabled" : "Disabled"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Pulses, transitions, hover effects
                </p>
              </div>
              <div className={`relative w-9 h-5 rounded-full transition-colors ${animations ? "bg-primary" : "bg-muted"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${animations ? "translate-x-[18px]" : "translate-x-0.5"}`} />
              </div>
            </button>
          </section>

          {/* MT5 CONNECT */}
          <MT5ConnectSection />

          {/* ABOUT */}
          <section className="pt-2 border-t border-border space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phoenix Command</p>
            <p className="text-[10px] text-muted-foreground/60 leading-snug">
              Settings are saved to this browser. Sign out below to end your session.
            </p>
          </section>

        </div>

        {/* Footer — Sign Out
            Pass K: `flex-shrink-0` ensures the footer keeps its full height
            and stays visible even when the body content is tall. */}
        <div className="p-3 border-t border-border bg-background/30 flex-shrink-0">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-colors text-xs font-black uppercase tracking-widest">
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
