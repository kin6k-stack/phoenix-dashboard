"use client"

// ─────────────────────────────────────────────────────────────────────────────
// PASS V — Settings Panel: Cascade Slide Architecture
//
// Layout: single right-side drawer (420px) with two sliding "pages" inside.
// Clicking a section slides the section-list LEFT while content slides in
// from the RIGHT — iOS-style navigation cascade.
//
// New themes: bloomberg, nord, cyber (+ existing 5 = 8 total)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import {
  X, ChevronRight, ArrowLeft, Palette, RotateCcw, Maximize2,
  Zap, LogOut, AlertTriangle, Cpu, Moon, Globe, ShieldCheck,
} from "lucide-react"
import { useTheme, type Theme, type Density } from "@/lib/use-theme"
import { MT5ConnectSection } from "@/components/mt5-connect-section"

interface SettingsPanelProps {
  open:    boolean
  onClose: () => void
}

// ─── Theme catalogue ─────────────────────────────────────────────────────────
const THEMES: {
  id:          Theme
  label:       string
  description: string
  bg:          string
  accent:      string
  border:      string
  glow:        string
}[] = [
  {
    id: "black-white", label: "Monochrome", description: "True black/white — invertible to white canvas",
    bg: "#000", accent: "#e5e5e5", border: "#1c1c1c", glow: "rgba(229,229,229,0.4)",
  },
  {
    id: "dark", label: "Green Lab", description: "Slate base · emerald accents · OG Phoenix look",
    bg: "#1a1d23", accent: "#16a34a", border: "#2a2e36", glow: "rgba(22,163,74,0.45)",
  },
  {
    id: "midnight", label: "Midnight", description: "Deep navy · electric blue",
    bg: "#0c1018", accent: "#3b82f6", border: "#1a2030", glow: "rgba(59,130,246,0.45)",
  },
  {
    id: "violet", label: "Violet", description: "Purple gradient · matches login aurora",
    bg: "#0f0a18", accent: "#c084fc", border: "#241a36", glow: "rgba(192,132,252,0.45)",
  },
  {
    id: "gold", label: "Gold", description: "Warm light canvas · amber accents",
    bg: "#f5f3ee", accent: "#f59e0b", border: "#e8e2d4", glow: "rgba(245,158,11,0.45)",
  },
  {
    id: "bloomberg", label: "Bloomberg", description: "Pro terminal · sharp corners · orange",
    bg: "#0a0a0d", accent: "#ff6b00", border: "#1a1510", glow: "rgba(255,107,0,0.5)",
  },
  {
    id: "nord", label: "Nord", description: "Arctic slate · frost blue · Nordic calm",
    bg: "#2e3440", accent: "#88c0d0", border: "#3b4252", glow: "rgba(136,192,208,0.45)",
  },
  {
    id: "cyber", label: "Cyber", description: "Neon magenta · cyberpunk · Phoenix identity",
    bg: "#08000f", accent: "#ff00cc", border: "#1a0030", glow: "rgba(255,0,204,0.5)",
  },
]

// ─── Density catalogue ───────────────────────────────────────────────────────
const DENSITIES: { id: Density; label: string; description: string }[] = [
  { id: "compact",  label: "Compact",  description: "Tightest spacing — more data on screen" },
  { id: "default",  label: "Default",  description: "Balanced — recommended for most displays" },
  { id: "expanded", label: "Expanded", description: "Roomy spacing — easier on the eyes" },
]

// ─── Section catalogue ───────────────────────────────────────────────────────
const SECTIONS = [
  { id: "appearance", label: "Appearance", icon: Palette,     description: "Themes, density, animations" },
  { id: "account",    label: "Account",    icon: Cpu,         description: "MT5 terminal connection" },
  { id: "region",     label: "Region",     icon: Globe,       description: "Timezone & broker offset" },
  { id: "security",   label: "Security",   icon: ShieldCheck, description: "Session & danger zone" },
]

// ─── Theme card ──────────────────────────────────────────────────────────────
function ThemeCard({ t, active, onClick }: {
  t:       typeof THEMES[0]
  active:  boolean
  onClick: () => void
}) {
  const isLight = t.id === "gold"

  return (
    <button
      onClick={onClick}
      className="relative w-full text-left rounded-xl overflow-hidden transition-all duration-200 group"
      style={{
        border:     `2px solid ${active ? t.accent : t.border}`,
        boxShadow:  active ? `0 0 16px ${t.glow}, 0 0 1px ${t.accent}` : "none",
      }}
    >
      {/* Backdrop preview */}
      <div className="h-16 relative" style={{ background: t.bg }}>
        {/* Radial accent glow */}
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse at 80% 40%, ${t.accent}30 0%, transparent 65%)`,
        }} />
        {/* Mini bar chart decoration */}
        <div className="absolute bottom-2 left-3 flex items-end gap-0.5">
          {[45, 70, 35, 90, 55, 75, 40].map((h, i) => (
            <div key={i} className="w-1 rounded-sm" style={{
              height:     `${h * 0.18}px`,
              background: i === 3 ? t.accent : (isLight ? "#00000022" : "#ffffff14"),
              boxShadow:  i === 3 ? `0 0 4px ${t.accent}` : "none",
            }} />
          ))}
        </div>
        {/* Accent dot top-right */}
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{
          background: t.accent,
          boxShadow:  `0 0 6px ${t.glow}`,
        }} />
        {/* Active tick */}
        {active && (
          <div className="absolute top-2 left-2 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: t.accent }}>
            <div className="w-1.5 h-1 border-l-[2px] border-b-[2px] rotate-[-45deg] mt-px"
              style={{ borderColor: t.bg }} />
          </div>
        )}
      </div>
      {/* Label */}
      <div className="px-3 py-2 flex items-center justify-between"
        style={{ background: t.id === "gold" ? "#ede9e0" : "#0a0a0f" }}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider"
            style={{ color: active ? t.accent : (isLight ? "#333" : "#aaa") }}>
            {t.label}
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: isLight ? "#888" : "#555" }}>
            {t.description}
          </p>
        </div>
        <ChevronRight size={12} style={{ color: active ? t.accent : "#444" }} />
      </div>
    </button>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const {
    theme, density, animations, invert,
    setTheme, setDensity, setAnimations, setInvert,
  } = useTheme()
  const router = useRouter()

  // null = showing section list | string = showing section content
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeSection) setActiveSection(null)
        else onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, activeSection])

  useEffect(() => {
    if (!open) { setActiveSection(null); return }
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open])

  const handleSignOut = async () => {
    try { await signOut(auth); router.push("/login") }
    catch (e) { console.error(e) }
  }

  if (!open) return null

  const currentThemeMeta = THEMES.find(t => t.id === theme) ?? THEMES[0]

  // ── Section content renderer ─────────────────────────────────────────────
  const renderContent = () => {
    switch (activeSection) {

      // ── Appearance ──────────────────────────────────────────────────────
      case "appearance":
        return (
          <div className="p-4 space-y-6">

            {/* Theme picker */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Theme
              </p>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map(t => (
                  <ThemeCard
                    key={t.id}
                    t={t}
                    active={theme === t.id}
                    onClick={() => setTheme(t.id)}
                  />
                ))}
              </div>
            </div>

            {/* Black/White invert toggle — only shown when B/W is active */}
            {theme === "black-white" && (
              <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Canvas
                </p>
                <div className="flex gap-2">
                  {[
                    { val: false, label: "Black", preview: "#000" },
                    { val: true,  label: "White", preview: "#fff" },
                  ].map(opt => (
                    <button key={String(opt.val)}
                      onClick={() => setInvert(opt.val)}
                      className="flex-1 rounded-lg border py-2 text-xs font-bold transition-all flex items-center justify-center gap-2"
                      style={{
                        borderColor: invert === opt.val ? "hsl(var(--primary))" : "hsl(var(--border))",
                        background:  invert === opt.val ? "hsl(var(--primary)/0.08)" : "transparent",
                        color:       invert === opt.val ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                      }}>
                      <div className="w-3 h-3 rounded-sm border border-current" style={{ background: opt.preview }} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Layout density */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Maximize2 size={13} className="text-muted-foreground" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Layout Density
                </p>
              </div>
              <div className="flex gap-2">
                {DENSITIES.map(d => (
                  <button key={d.id}
                    onClick={() => setDensity(d.id)}
                    className="flex-1 rounded-lg border py-2.5 text-[10px] font-black uppercase tracking-wider transition-all"
                    style={{
                      borderColor: density === d.id ? "hsl(var(--primary))" : "hsl(var(--border))",
                      background:  density === d.id ? "hsl(var(--primary)/0.08)" : "transparent",
                      color:       density === d.id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Animations */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <Zap size={14} className="text-primary" />
                <div>
                  <p className="text-xs font-bold text-foreground">Animations</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Smooth transitions and micro-interactions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAnimations(!animations)}
                className="relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
                style={{ background: animations ? "hsl(var(--primary))" : "hsl(var(--muted))" }}
                role="switch"
                aria-checked={animations}>
                <span
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                  style={{ left: animations ? "calc(100% - 22px)" : "2px" }}
                />
              </button>
            </div>
          </div>
        )

      // ── Account / MT5 ────────────────────────────────────────────────────
      case "account":
        return (
          <div className="p-4">
            <MT5ConnectSection />
          </div>
        )

      // ── Region ───────────────────────────────────────────────────────────
      case "region":
        return (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-border bg-card/60 px-4 py-8 text-center">
              <Globe size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Region settings coming in a future pass.</p>
            </div>
          </div>
        )

      // ── Security ─────────────────────────────────────────────────────────
      case "security":
        return (
          <div className="p-4 space-y-4">
            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3.5 text-sm font-bold text-foreground hover:bg-white/[0.04] hover:border-primary/30 transition-all group">
              <LogOut size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
              Sign Out
            </button>

            {/* Danger zone */}
            <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-destructive" />
                <p className="text-[10px] font-black uppercase tracking-widest text-destructive">
                  Danger Zone
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Destructive actions (delete all trades, reset account) are managed via the Lifetime Ledger.
              </p>
            </div>
          </div>
        )

      default: return null
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        style={{ height: "100dvh" }}
        className="fixed top-0 right-0 w-full sm:w-[420px] bg-card border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden"
      >

        {/* ── Header — morphs between "Settings" and "← Section" ── */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0"
          style={{ background: "hsl(var(--background)/0.6)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2.5">
            {activeSection ? (
              <button
                onClick={() => setActiveSection(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors mr-0.5">
                <ArrowLeft size={15} />
              </button>
            ) : (
              <Palette size={15} className="text-primary" />
            )}
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
              {activeSection
                ? SECTIONS.find(s => s.id === activeSection)?.label ?? activeSection
                : "Settings"}
            </h2>
            {activeSection && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {SECTIONS.find(s => s.id === activeSection)?.description}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── CASCADE BODY ── */}
        {/* Outer container clips the sliding panels */}
        <div className="flex-1 overflow-hidden relative">

          {/* PAGE 1 — Section list (slides LEFT when activeSection is set) */}
          <div className={`absolute inset-0 overflow-y-auto custom-scrollbar transition-transform duration-300 ease-in-out
            ${activeSection ? "-translate-x-full" : "translate-x-0"}`}>

            {/* Current theme badge */}
            <div className="px-4 pt-4 pb-2">
              <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex-shrink-0 relative overflow-hidden"
                  style={{ background: currentThemeMeta.bg, border: `1px solid ${currentThemeMeta.border}` }}>
                  <div className="absolute inset-0" style={{
                    background: `radial-gradient(ellipse at 80% 40%, ${currentThemeMeta.accent}40 0%, transparent 65%)`,
                  }} />
                  <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: currentThemeMeta.accent, boxShadow: `0 0 4px ${currentThemeMeta.glow}` }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Active theme</p>
                  <p className="text-sm font-black text-foreground">{currentThemeMeta.label}</p>
                </div>
                <button onClick={() => setActiveSection("appearance")}
                  className="ml-auto text-[9px] font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity flex items-center gap-1">
                  Change
                  <ChevronRight size={10} />
                </button>
              </div>
            </div>

            {/* Section rows */}
            <div className="px-4 pb-4 space-y-1.5 mt-2">
              {SECTIONS.map(s => {
                const Icon = s.icon
                return (
                  <button key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left hover:bg-white/[0.04] hover:border-primary/20 border border-transparent transition-all group">
                    <div className="w-8 h-8 rounded-lg border border-border bg-background/40 flex items-center justify-center flex-shrink-0 group-hover:border-primary/30 transition-colors">
                      <Icon size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">{s.description}</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                  </button>
                )
              })}
            </div>

            {/* Sign out shortcut at bottom */}
            <div className="px-4 pb-4 border-t border-border pt-3 mt-2">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 hover:bg-destructive/[0.06] hover:border-destructive/20 border border-transparent transition-all group text-left">
                <div className="w-8 h-8 rounded-lg border border-border bg-background/40 flex items-center justify-center flex-shrink-0 group-hover:border-destructive/30 transition-colors">
                  <LogOut size={14} className="text-muted-foreground group-hover:text-destructive transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground group-hover:text-destructive transition-colors">Sign Out</p>
                  <p className="text-[10px] text-muted-foreground">End your session</p>
                </div>
              </button>
            </div>
          </div>

          {/* PAGE 2 — Section content (slides in from RIGHT when activeSection is set) */}
          <div className={`absolute inset-0 overflow-y-auto custom-scrollbar transition-transform duration-300 ease-in-out
            ${activeSection ? "translate-x-0" : "translate-x-full"}`}>
            {renderContent()}
          </div>

        </div>
      </aside>
    </>
  )
}
