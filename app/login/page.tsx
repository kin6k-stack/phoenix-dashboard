"use client"

import { useState, useEffect, FormEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { Eye, EyeOff, ArrowLeft, Sparkles, Orbit } from "lucide-react"
import { useVipCheck } from "@/lib/use-vip-check"
import { VipBlockedScreen } from "@/components/vip-blocked-screen"

// ─────────────────────────────────────────────────────────────────────
// PHOENIX COMMAND — Modernized login
//
// • Form stays on the RIGHT, hero panel on the LEFT
// • Two visual styles toggle in bottom-left corner: "aurora" / "orbs"
// • Preference persists to localStorage.phoenix_login_style
// • Phoenix Command branding + Trader Kizan footer credit
// ─────────────────────────────────────────────────────────────────────

type LoginStyle = "aurora" | "orbs"

function getAuthErrorMessage(code: string | undefined, mode: "signin" | "signup" | "reset"): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password."
    case "auth/email-already-in-use":
      return "This email is already registered. Try signing in instead."
    case "auth/weak-password":
      return "Password must be at least 6 characters."
    case "auth/invalid-email":
      return "Please enter a valid email address."
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes."
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled."
    case "auth/popup-blocked":
      return "Pop-up was blocked. Please allow pop-ups for this site."
    case "auth/unauthorized-domain":
      return "This domain isn't authorized. Add it in Firebase Console → Authentication → Authorized domains."
    default:
      return mode === "reset"
        ? "Couldn't send reset email. Please try again."
        : "Authentication failed. Please try again."
  }
}

// ─────────────────────────────────────────────────────────────────────
// Pass M — Theme-aware login backdrops
//
// Login page reads the user's saved theme (`phoenix_settings.theme`) from
// localStorage on mount. Backdrops (Aurora + Orbs) recolor to match.
// On Black/White theme, Aurora becomes a BLACK HOLE composition instead
// of a planet — distinct visual identity for the monochrome aesthetic.
//
// Hidden easter egg: clicking the "ACTIVE" status badge in the sidebar
// (post-login) flips a localStorage flag that enables a prismatic
// (rainbow chromatic-aberration) variant of the black hole. Toggles
// back to monochrome on next click.
// ─────────────────────────────────────────────────────────────────────

type LoginTheme = "black-white" | "dark" | "midnight" | "violet" | "gold"

interface LoginThemeState {
  theme:     LoginTheme
  invert:    boolean    // only meaningful for black-white
  prismatic: boolean    // hidden easter egg flag, only meaningful for black-white
  hydrated:  boolean
}

function useLoginTheme(): LoginThemeState {
  const [state, setState] = useState<LoginThemeState>({
    theme: "violet", invert: false, prismatic: false, hydrated: false,
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem("phoenix_settings")
      const parsed = saved ? JSON.parse(saved) : {}
      let theme = parsed.theme as string
      // Migrate legacy theme names
      if (theme === "oled" || !theme) theme = "black-white"
      else if (theme === "pink")     theme = "violet"
      else if (theme === "light")    theme = "gold"
      const validThemes: LoginTheme[] = ["black-white","dark","midnight","violet","gold"]
      if (!validThemes.includes(theme as LoginTheme)) theme = "violet"

      const prismatic = localStorage.getItem("phoenix_easter_prismatic") === "true"

      setState({
        theme: theme as LoginTheme,
        invert: parsed.invert === true,
        prismatic,
        hydrated: true,
      })
    } catch {
      setState({ theme: "violet", invert: false, prismatic: false, hydrated: true })
    }
  }, [])

  return state
}

// ── Per-theme color palette for login backdrops ──────────────────────
interface LoginPalette {
  // Aurora SVG colors (purple by default)
  rimMidColor:      string  // main rim sweep color (purple, gold, etc)
  rimAccentColor:   string  // secondary rim sweep color (magenta, bronze)
  hotspotColor:     string  // bright sunburst point on the rim
  haloColor:        string  // soft outer halo around planet
  bleedLeftColor:   string  // left-side bleed color
  bleedRightColor:  string  // right-side bleed color
  ambientWashColor: string  // wide low-intensity wash filling the rim area

  // Orbs colors
  orb1: string
  orb2: string
  orb3: string
  orb4: string
  orb5: string

  // Form / button accents
  buttonGradient:   string  // CSS gradient for the Sign In button
  buttonGlow:       string  // box-shadow color for the button (tuned, low-opacity)
  accentText:       string  // small accent text (e.g. "to your command center.")
  accentTextStart:  string  // accent text gradient START (text-legible, not rim-bright)
  accentTextEnd:    string  // accent text gradient END
  liveBadgeBg:      string  // "LIVE ALGORITHMIC TRADING DESK" badge background
  liveBadgeBorder:  string
  liveBadgeText:    string
  liveDotColor:     string

  // Body class (true for black hole composition, false for planet)
  isBlackHole:      boolean
  // Inverted black hole — light canvas with dark event horizon
  isInverted:       boolean
  // Prismatic rainbow accretion disk (easter egg)
  isPrismatic:      boolean
}

function getLoginPalette(state: LoginThemeState): LoginPalette {
  const { theme, invert, prismatic } = state

  switch (theme) {
    case "violet":
      return {
        rimMidColor:      "hsl(290 100% 85%)",
        rimAccentColor:   "hsl(300 100% 90%)",
        hotspotColor:     "white",
        haloColor:        "hsl(280 80% 55%)",
        bleedLeftColor:   "hsl(280 95% 60%)",
        bleedRightColor:  "hsl(200 95% 70%)",
        ambientWashColor: "hsl(280 80% 55% / 0.35)",
        orb1: "hsl(265 90% 55%)",
        orb2: "hsl(300 90% 60%)",
        orb3: "hsl(220 95% 55%)",
        orb4: "hsl(285 95% 65%)",
        orb5: "hsl(280 100% 70%)",
        buttonGradient: "linear-gradient(135deg, hsl(280 85% 65%) 0%, hsl(310 80% 60%) 100%)",
        buttonGlow:       "hsl(280 80% 50% / 0.45)",
        accentText:       "hsl(280 70% 75%)",
        accentTextStart:  "hsl(280 85% 72%)",
        accentTextEnd:    "hsl(305 80% 68%)",
        liveBadgeBg:      "hsl(280 60% 40% / 0.15)",
        liveBadgeBorder:  "hsl(280 80% 60% / 0.4)",
        liveBadgeText:    "hsl(280 90% 80%)",
        liveDotColor:     "hsl(280 90% 65%)",
        isBlackHole: false, isInverted: false, isPrismatic: false,
      }

    case "gold":
      return {
        rimMidColor:      "hsl(38 100% 75%)",
        rimAccentColor:   "hsl(45 100% 85%)",
        hotspotColor:     "white",
        haloColor:        "hsl(38 80% 55%)",
        bleedLeftColor:   "hsl(38 95% 55%)",
        bleedRightColor:  "hsl(28 95% 60%)",
        ambientWashColor: "hsl(38 80% 50% / 0.35)",
        orb1: "hsl(38 92% 50%)",
        orb2: "hsl(28 92% 55%)",
        orb3: "hsl(45 90% 55%)",
        orb4: "hsl(20 95% 50%)",
        orb5: "hsl(35 100% 65%)",
        buttonGradient: "linear-gradient(135deg, hsl(38 92% 50%) 0%, hsl(28 92% 55%) 100%)",
        buttonGlow:       "hsl(38 90% 50% / 0.4)",
        accentText:       "hsl(38 80% 70%)",
        accentTextStart:  "hsl(42 90% 65%)",
        accentTextEnd:    "hsl(28 88% 58%)",
        liveBadgeBg:      "hsl(38 60% 35% / 0.18)",
        liveBadgeBorder:  "hsl(38 80% 55% / 0.45)",
        liveBadgeText:    "hsl(38 95% 75%)",
        liveDotColor:     "hsl(38 95% 60%)",
        isBlackHole: false, isInverted: false, isPrismatic: false,
      }

    case "midnight":
      return {
        rimMidColor:      "hsl(215 100% 80%)",
        rimAccentColor:   "hsl(195 100% 85%)",
        hotspotColor:     "white",
        haloColor:        "hsl(220 80% 50%)",
        bleedLeftColor:   "hsl(220 95% 60%)",
        bleedRightColor:  "hsl(195 95% 65%)",
        ambientWashColor: "hsl(220 80% 50% / 0.35)",
        orb1: "hsl(220 95% 55%)",
        orb2: "hsl(195 90% 60%)",
        orb3: "hsl(240 95% 50%)",
        orb4: "hsl(210 95% 65%)",
        orb5: "hsl(200 100% 70%)",
        buttonGradient: "linear-gradient(135deg, hsl(220 90% 60%) 0%, hsl(195 85% 55%) 100%)",
        buttonGlow:       "hsl(220 85% 50% / 0.4)",
        accentText:       "hsl(215 70% 75%)",
        accentTextStart:  "hsl(215 88% 70%)",
        accentTextEnd:    "hsl(195 85% 62%)",
        liveBadgeBg:      "hsl(220 60% 35% / 0.18)",
        liveBadgeBorder:  "hsl(220 80% 55% / 0.4)",
        liveBadgeText:    "hsl(215 90% 80%)",
        liveDotColor:     "hsl(215 95% 65%)",
        isBlackHole: false, isInverted: false, isPrismatic: false,
      }

    case "dark":  // Green Lab
      return {
        rimMidColor:      "hsl(142 90% 75%)",
        rimAccentColor:   "hsl(160 90% 80%)",
        hotspotColor:     "white",
        haloColor:        "hsl(142 70% 45%)",
        bleedLeftColor:   "hsl(142 90% 50%)",
        bleedRightColor:  "hsl(170 85% 55%)",
        ambientWashColor: "hsl(142 70% 40% / 0.35)",
        orb1: "hsl(142 75% 50%)",
        orb2: "hsl(160 75% 55%)",
        orb3: "hsl(180 75% 50%)",
        orb4: "hsl(150 80% 60%)",
        orb5: "hsl(135 85% 65%)",
        buttonGradient: "linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(160 75% 50%) 100%)",
        buttonGlow:       "hsl(142 70% 40% / 0.4)",
        accentText:       "hsl(142 60% 70%)",
        accentTextStart:  "hsl(142 75% 62%)",
        accentTextEnd:    "hsl(165 72% 58%)",
        liveBadgeBg:      "hsl(142 50% 30% / 0.18)",
        liveBadgeBorder:  "hsl(142 70% 50% / 0.4)",
        liveBadgeText:    "hsl(142 80% 70%)",
        liveDotColor:     "hsl(142 80% 55%)",
        isBlackHole: false, isInverted: false, isPrismatic: false,
      }

    case "black-white":
    default:
      // Black/white shows a BLACK HOLE composition instead of a planet.
      // Default = monochrome white accretion disk on black canvas.
      // Inverted = dark event horizon on white canvas.
      // Prismatic (easter egg) = rainbow chromatic accretion.
      if (invert) {
        return {
          rimMidColor:      "hsl(0 0% 5%)",
          rimAccentColor:   "hsl(0 0% 15%)",
          hotspotColor:     "black",
          haloColor:        "hsl(0 0% 50%)",
          bleedLeftColor:   "hsl(0 0% 20%)",
          bleedRightColor:  "hsl(0 0% 30%)",
          ambientWashColor: "hsl(0 0% 70% / 0.4)",
          orb1: "hsl(0 0% 50%)",
          orb2: "hsl(0 0% 40%)",
          orb3: "hsl(0 0% 60%)",
          orb4: "hsl(0 0% 30%)",
          orb5: "hsl(0 0% 25%)",
          buttonGradient: "linear-gradient(135deg, hsl(0 0% 8%) 0%, hsl(0 0% 30%) 100%)",
          buttonGlow:       "hsl(0 0% 20% / 0.35)",
          accentText:       "hsl(0 0% 35%)",
          accentTextStart:  "hsl(0 0% 25%)",
          accentTextEnd:    "hsl(0 0% 45%)",
          liveBadgeBg:      "hsl(0 0% 30% / 0.1)",
          liveBadgeBorder:  "hsl(0 0% 50% / 0.3)",
          liveBadgeText:    "hsl(0 0% 25%)",
          liveDotColor:     "hsl(0 0% 30%)",
          isBlackHole: true, isInverted: true, isPrismatic: prismatic,
        }
      }
      return {
        rimMidColor:      "hsl(0 0% 92%)",
        rimAccentColor:   "hsl(0 0% 98%)",
        hotspotColor:     "white",
        haloColor:        "hsl(0 0% 80%)",
        bleedLeftColor:   "hsl(0 0% 70%)",
        bleedRightColor:  "hsl(0 0% 60%)",
        ambientWashColor: "hsl(0 0% 60% / 0.25)",
        orb1: "hsl(0 0% 85%)",
        orb2: "hsl(0 0% 72%)",
        orb3: "hsl(0 0% 65%)",
        orb4: "hsl(0 0% 90%)",
        orb5: "hsl(0 0% 95%)",
        buttonGradient: "linear-gradient(135deg, hsl(0 0% 92%) 0%, hsl(0 0% 70%) 100%)",
        buttonGlow:       "hsl(0 0% 80% / 0.25)",
        accentText:       "hsl(0 0% 75%)",
        accentTextStart:  "hsl(0 0% 82%)",
        accentTextEnd:    "hsl(0 0% 58%)",
        liveBadgeBg:      "hsl(0 0% 70% / 0.1)",
        liveBadgeBorder:  "hsl(0 0% 80% / 0.3)",
        liveBadgeText:    "hsl(0 0% 85%)",
        liveDotColor:     "hsl(0 0% 80%)",
        isBlackHole: true, isInverted: false, isPrismatic: prismatic,
      }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Style A — AURORA (planet + sunrise, tightly composed)
//
// Approach: a single bright radial bloom positioned low and slightly
// behind a darker circle that acts as the planet. The "sunrise" effect
// emerges from the bloom showing through the gap between the planet's
// edge and the surrounding darkness.
// ─────────────────────────────────────────────────────────────────────
function AuroraBackdrop({ palette }: { palette: LoginPalette }) {
  // Black/White → black hole composition (entirely different visual)
  if (palette.isBlackHole) {
    return <BlackHoleBackdrop palette={palette} />
  }
  // All other themes → planet+sunrise (the proven v6 composition, themed)
  return <PlanetBackdrop palette={palette} />
}

// ─────────────────────────────────────────────────────────────────────
// PLANET BACKDROP — for Violet, Gold, Midnight, Green Lab themes
// (Same composition as original v6 but with palette-driven colors)
// ─────────────────────────────────────────────────────────────────────
function PlanetBackdrop({ palette }: { palette: LoginPalette }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Deep space canvas */}
      <div className="absolute inset-0 bg-black" />

      {/* ── UPPER-SKY NEBULA HAZE ──
          Soft scatter of the sun's light into the atmosphere above the
          planet. Centered slightly right of center where the sun rises. */}
      <div
        className="absolute"
        style={{
          top: "5%", left: "35%", width: "55%", height: "55%",
          background: `radial-gradient(ellipse at center, ${palette.haloColor} 0%, transparent 60%)`,
          opacity: 0.30,
          filter: "blur(70px)",
        }}
      />
      {/* Secondary cooler haze drifting left */}
      <div
        className="absolute"
        style={{
          top: "12%", left: "8%", width: "45%", height: "45%",
          background: `radial-gradient(ellipse at center, ${palette.bleedRightColor} 0%, transparent 65%)`,
          opacity: 0.14,
          filter: "blur(80px)",
        }}
      />

      {/* ── STAR FIELD ── */}
      <div className="absolute inset-0">
        {[
          { top: "6%",  left: "10%", size: 2, opacity: 0.85 },
          { top: "9%",  left: "48%", size: 2, opacity: 0.7 },
          { top: "13%", left: "78%", size: 2, opacity: 0.65 },
          { top: "18%", left: "26%", size: 1, opacity: 0.55 },
          { top: "22%", left: "62%", size: 1, opacity: 0.5 },
          { top: "8%",  left: "36%", size: 1, opacity: 0.5 },
          { top: "16%", left: "90%", size: 1, opacity: 0.55 },
          { top: "27%", left: "4%",  size: 1, opacity: 0.45 },
          { top: "5%",  left: "70%", size: 1, opacity: 0.55 },
          { top: "3%",  left: "22%", size: 1, opacity: 0.65 },
          { top: "20%", left: "84%", size: 1, opacity: 0.4 },
          { top: "11%", left: "58%", size: 1, opacity: 0.4 },
          { top: "24%", left: "44%", size: 1, opacity: 0.35 },
          { top: "30%", left: "16%", size: 1, opacity: 0.4 },
          { top: "14%", left: "6%",  size: 1, opacity: 0.45 },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              opacity: s.opacity,
              animationDelay:    `${i * 0.4}s`,
              animationDuration: `${4 + (i % 4)}s`,
              boxShadow: s.size >= 2 ? "0 0 4px hsla(0,0%,100%,0.7)" : "none",
            }}
          />
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          THE PLANET — sits mostly BELOW the canvas. Only the top
          ~18% of its curve shows as a horizon arc at screen mid.
          Center pushed far down via translate Y +62%.
          ════════════════════════════════════════════════════════ */}

      {/* Planet body — huge, mostly off-screen bottom */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width:  "1700px", height: "1700px",
          transform: "translate(-50%, 62%)",
          background: "radial-gradient(circle at 50% 25%, hsl(265 22% 6%) 0%, hsl(0 0% 0.5%) 60%)",
          borderRadius: "50%",
          boxShadow: "inset 0 4px 40px hsla(0,0%,0%,0.8)",
          zIndex: 2,
        }}
      />

      {/* ── THE RISING SUN (light source behind planet) ──
          Positioned at the back-right of the rim, sitting just above the
          horizon line. Most of its bloom is ABOVE the planet edge,
          creating the "sun breaking over the edge" effect. */}

      {/* Wide atmospheric bloom — the sun's glow scattering into the sky */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: "1100px", height: "1100px",
          transform: "translate(calc(-50% + 240px), calc(-50% + 250px))",
          background: `radial-gradient(circle at center, ${palette.haloColor} 0%, transparent 55%)`,
          filter: "blur(40px)",
          opacity: 0.55,
          zIndex: 3,
        }}
      />

      {/* Mid bloom — tighter, brighter */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: "560px", height: "560px",
          transform: "translate(calc(-50% + 240px), calc(-50% + 250px))",
          background: `radial-gradient(circle at center, ${palette.rimMidColor} 0%, ${palette.haloColor} 30%, transparent 68%)`,
          filter: "blur(14px)",
          opacity: 0.9,
          zIndex: 3,
        }}
      />

      {/* Core flare — the actual bright point of the sun */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: "16px", height: "16px",
          transform: "translate(calc(-50% + 240px), calc(-50% + 246px))",
          background: palette.hotspotColor,
          borderRadius: "50%",
          boxShadow: `
            0 0 14px ${palette.hotspotColor},
            0 0 36px ${palette.rimMidColor},
            0 0 80px ${palette.rimAccentColor},
            0 0 160px ${palette.haloColor}
          `,
          zIndex: 4,
        }}
      />

      {/* ── RIM HIGHLIGHT ──
          Thin sharp line of light grazing the planet's upper edge.
          This is the crescent where the sun catches the atmosphere.
          Built as a ring slightly larger than the planet, masked to
          only show the top arc, with a bright gradient sweep. */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width:  "1700px", height: "1700px",
          transform: "translate(-50%, 62%)",
          borderRadius: "50%",
          background: `conic-gradient(from 270deg at 50% 50%,
            transparent 0deg,
            ${palette.bleedLeftColor} 35deg,
            ${palette.rimMidColor} 78deg,
            ${palette.hotspotColor} 90deg,
            ${palette.rimAccentColor} 102deg,
            ${palette.bleedRightColor} 145deg,
            transparent 180deg,
            transparent 360deg)`,
          WebkitMask: "radial-gradient(circle, transparent 0, transparent calc(50% - 3px), black calc(50% - 2px), black 50%, transparent calc(50% + 1px))",
          mask: "radial-gradient(circle, transparent 0, transparent calc(50% - 3px), black calc(50% - 2px), black 50%, transparent calc(50% + 1px))",
          opacity: 0.95,
          zIndex: 5,
          filter: "blur(0.5px)",
        }}
      />

      {/* Rim bloom — soft glow bleeding off the bright crescent into the sky */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width:  "1740px", height: "1740px",
          transform: "translate(-50%, 61.5%)",
          borderRadius: "50%",
          background: `conic-gradient(from 270deg at 50% 50%,
            transparent 0deg,
            ${palette.rimMidColor} 80deg,
            ${palette.hotspotColor} 90deg,
            ${palette.rimAccentColor} 100deg,
            transparent 160deg,
            transparent 360deg)`,
          WebkitMask: "radial-gradient(circle, transparent 0, transparent calc(50% - 22px), black calc(50% - 18px), black 50%, transparent calc(50% + 4px))",
          mask: "radial-gradient(circle, transparent 0, transparent calc(50% - 22px), black calc(50% - 18px), black 50%, transparent calc(50% + 4px))",
          opacity: 0.5,
          zIndex: 3,
          filter: "blur(12px)",
        }}
      />

      {/* Bottom darkness fade */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/4 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, hsl(0 0% 0%) 80%)",
          zIndex: 6,
        }}
      />
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────
// BLACK HOLE BACKDROP — for Black/White theme
//
// Three variants:
//   - Default (B/W default):  Monochrome white accretion disk, black void
//   - Inverted (B/W invert):  Dark event horizon, white void/sphere on light canvas
//   - Prismatic (easter egg): Rainbow chromatic accretion disk
// ─────────────────────────────────────────────────────────────────────
function BlackHoleBackdrop({ palette }: { palette: LoginPalette }) {
  const isPrismatic = palette.isPrismatic
  const isInverted  = palette.isInverted

  // Background canvas — black on default, white on invert
  const canvasBg = isInverted ? "white" : "black"
  // Void color (the "hole" itself) — opposite of canvas
  const voidColor = isInverted ? "white" : "black"
  // Accretion disk colors — monochrome ring needs high contrast + tight stops
  const diskInner = isInverted ? "hsl(0 0% 5%)"  : "hsl(0 0% 100%)"
  const diskMid   = isInverted ? "hsl(0 0% 15%)" : "hsl(0 0% 90%)"
  const diskOuter = isInverted ? "hsl(0 0% 35%)" : "hsl(0 0% 60%)"

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Canvas background */}
      <div className="absolute inset-0" style={{ background: canvasBg }} />

      {/* Stars (or dark dots on inverted) */}
      <div className="absolute inset-0">
        {[
          { top: "5%",  left: "12%", size: 2, opacity: 0.8 },
          { top: "8%",  left: "55%", size: 2, opacity: 0.7 },
          { top: "14%", left: "82%", size: 2, opacity: 0.6 },
          { top: "20%", left: "30%", size: 1, opacity: 0.5 },
          { top: "25%", left: "65%", size: 1, opacity: 0.5 },
          { top: "11%", left: "40%", size: 1, opacity: 0.45 },
          { top: "18%", left: "92%", size: 1, opacity: 0.5 },
          { top: "30%", left: "5%",  size: 1, opacity: 0.4 },
          { top: "6%",  left: "75%", size: 1, opacity: 0.5 },
          { top: "3%",  left: "25%", size: 1, opacity: 0.6 },
          { top: "16%", left: "8%",  size: 1, opacity: 0.4 },
          { top: "22%", left: "48%", size: 1, opacity: 0.35 },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              background: isInverted ? "black" : "white",
              opacity: s.opacity,
              animationDelay:    `${i * 0.5}s`,
              animationDuration: `${4 + (i % 4)}s`,
              boxShadow: s.size >= 2
                ? (isInverted ? "0 0 4px hsla(0,0%,0%,0.5)" : "0 0 4px hsla(0,0%,100%,0.7)")
                : "none",
            }}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          THE BLACK HOLE — centered, slightly below center
          Layers: outer halo → accretion ring (tilted) → photon ring → event horizon void
          ═══════════════════════════════════════════════════════ */}

      {/* Wide outer halo glow */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: "1400px", height: "1400px",
          transform: "translate(-50%, -45%)",
          background: isPrismatic
            ? `radial-gradient(circle at center,
                hsla(45,100%,70%,0.18) 0%,
                hsla(180,100%,70%,0.12) 30%,
                hsla(280,100%,70%,0.08) 50%,
                transparent 70%)`
            : `radial-gradient(circle at center, ${diskOuter} 0%, transparent 50%)`,
          opacity: isPrismatic ? 1 : 0.4,
          filter: "blur(60px)",
        }}
      />

      {/* ─── ACCRETION DISK ─── Elongated horizontal ellipse, tilted slightly */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: "1100px", height: "320px",
          transform: "translate(-50%, -50%) rotate(-8deg)",
          background: isPrismatic
            ? `radial-gradient(ellipse at center,
                transparent 0%, transparent 22%,
                hsl(45 100% 75% / 0.95) 24%,
                hsl(20 100% 70% / 0.85) 28%,
                hsl(330 100% 70% / 0.7) 33%,
                hsl(280 100% 75% / 0.5) 38%,
                hsl(200 100% 75% / 0.4) 44%,
                hsl(160 100% 75% / 0.3) 50%,
                transparent 60%)`
            : `radial-gradient(ellipse at center,
                transparent 0%, transparent 30%,
                ${diskInner} 33%,
                ${diskMid} 40%,
                ${diskOuter} 48%,
                transparent 58%)`,
          filter: "blur(1.5px)",
          opacity: 0.95,
        }}
      />

      {/* Secondary accretion (slight rotation offset for depth) */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: "1000px", height: "260px",
          transform: "translate(-50%, -50%) rotate(-12deg)",
          background: isPrismatic
            ? `radial-gradient(ellipse at center,
                transparent 0%, transparent 22%,
                hsl(60 100% 80% / 0.6) 25%,
                hsl(30 100% 75% / 0.5) 35%,
                hsl(300 100% 75% / 0.35) 45%,
                transparent 60%)`
            : `radial-gradient(ellipse at center,
                transparent 0%, transparent 22%,
                ${diskMid} 28%,
                ${diskOuter} 42%,
                transparent 58%)`,
          filter: "blur(8px)",
          opacity: 0.7,
        }}
      />

      {/* Photon ring — bright thin ring tight around the void */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: "340px", height: "340px",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: `radial-gradient(circle at center,
            transparent 0%, transparent 47%,
            ${isPrismatic ? "hsl(45 100% 90%)" : diskInner} 49%,
            ${isPrismatic ? "hsl(0 100% 75%)"  : diskInner} 51%,
            transparent 54%)`,
          filter: "blur(1px)",
          opacity: 0.95,
        }}
      />

      {/* Inner glow ring (gravitational lensing effect — bright halo just outside the void) */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: "400px", height: "400px",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: `radial-gradient(circle at center,
            transparent 38%,
            ${isPrismatic ? "hsla(45,100%,80%,0.5)" : (isInverted ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)")} 45%,
            transparent 60%)`,
          filter: "blur(8px)",
        }}
      />

      {/* THE VOID — the black hole itself */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: "300px", height: "300px",
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle at center, ${voidColor} 0%, ${voidColor} 50%, transparent 90%)`,
          borderRadius: "50%",
          boxShadow: `0 0 80px 20px ${voidColor}`,
        }}
      />

      {/* Top half — bright "lensed" arc from light going around the back of the hole */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: "320px", height: "60px",
          transform: "translate(-50%, calc(-50% - 165px))",
          background: isPrismatic
            ? `radial-gradient(ellipse at center,
                hsl(45 100% 85%) 0%,
                hsl(0 100% 70% / 0.6) 50%,
                transparent 90%)`
            : `radial-gradient(ellipse at center, ${diskInner} 0%, ${diskMid} 50%, transparent 90%)`,
          filter: "blur(4px)",
          borderRadius: "50%",
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, ${canvasBg} 70%)`,
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Style B — ORBS (gradient blobs, themed)
// ─────────────────────────────────────────────────────────────────────
function OrbsBackdrop({ palette }: { palette: LoginPalette }) {
  // Canvas is black on dark themes, white on B/W-invert, black otherwise
  const canvasBg = palette.isInverted ? "white" : "black"
  // B/W default needs brighter orbs to register against pure black.
  // Inverted (white canvas) uses multiply to darken.
  const isBW = palette.isBlackHole
  const blendMode = palette.isInverted ? "multiply" : "screen"
  const dotColor  = palette.isInverted ? "black" : "white"
  // Opacity multiplier — B/W orbs get a boost since grey-on-black is faint
  const op = (base: number) => isBW && !palette.isInverted
    ? Math.min(1, base + 0.25)
    : base

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0" style={{ background: canvasBg }} />

      {[
        { width: "560px", height: "560px", top: "-10%", left: "-8%",  color: palette.orb1, blur: "70px", opacity: op(0.7) },
        { width: "460px", height: "460px", top: "8%",  right: "-5%",  color: palette.orb2, blur: "60px", opacity: op(0.55) },
        { width: "640px", height: "640px", bottom: "-15%", left: "20%", color: palette.orb3, blur: "80px", opacity: op(0.6) },
        { width: "340px", height: "340px", top: "45%", right: "15%",   color: palette.orb4, blur: "50px", opacity: op(0.5) },
        { width: "200px", height: "200px", top: "25%", left: "35%",    color: palette.orb5, blur: "35px", opacity: op(0.7) },
      ].map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: orb.top, left: orb.left, right: (orb as any).right, bottom: (orb as any).bottom,
            width: orb.width, height: orb.height,
            background: `radial-gradient(circle, ${orb.color} 0%, ${orb.color} 35%, transparent 72%)`,
            filter: `blur(${orb.blur})`,
            opacity: orb.opacity,
            mixBlendMode: blendMode as any,
          }}
        />
      ))}

      {/* Subtle dot-grid texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${dotColor} 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  )
}


export default function LoginPage() {
  const router = useRouter()
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth()
  const { checkAccess, blocked, checking, clearBlock } = useVipCheck()

  const [mode,        setMode]       = useState<"signin" | "signup" | "reset">("signin")
  const [email,       setEmail]      = useState("")
  const [password,    setPassword]   = useState("")
  const [showPass,    setShowPass]   = useState(false)
  const [loading,     setLoading]    = useState(false)
  const [gLoading,    setGLoading]   = useState(false)
  const [error,       setError]      = useState("")
  const [success,     setSuccess]    = useState("")
  const [loginStyle,  setLoginStyle] = useState<LoginStyle>("aurora")

  // Pass M: read saved theme + invert + prismatic flag
  const themeState = useLoginTheme()
  const palette    = getLoginPalette(themeState)

  // Load saved login style preference (browser memory)
  useEffect(() => {
    const saved = localStorage.getItem("phoenix_login_style")
    if (saved === "aurora" || saved === "orbs") setLoginStyle(saved)
  }, [])

  const cycleLoginStyle = () => {
    const next: LoginStyle = loginStyle === "aurora" ? "orbs" : "aurora"
    setLoginStyle(next)
    try { localStorage.setItem("phoenix_login_style", next) } catch {}
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(""); setSuccess("")
    setLoading(true)
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password)
        const ok = await checkAccess()
        if (ok) router.push("/")
      } else if (mode === "reset") {
        await resetPassword(email)
        setSuccess("Password reset email sent. Check your inbox.")
      } else {
        await signInWithEmail(email, password)
        const ok = await checkAccess()
        if (ok) router.push("/")
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err?.code, mode))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(""); setSuccess("")
    setGLoading(true)
    try {
      await signInWithGoogle()
      const ok = await checkAccess()
      if (ok) router.push("/")
    } catch (err: any) {
      setError(getAuthErrorMessage(err?.code, mode === "signup" ? "signup" : "signin"))
    } finally {
      setGLoading(false)
    }
  }

  const busy = loading || checking
  const submitLabel = mode === "signin" ? (checking ? "Verifying access…" : loading ? "Signing in…" : "Sign In")
                    : mode === "signup" ? (checking ? "Verifying access…" : loading ? "Creating account…" : "Create Account")
                                        : (loading ? "Sending…" : "Send Reset Link")

  const heading = mode === "signin" ? "Welcome back."
                : mode === "signup" ? "Create your access."
                                    : "Reset password."
  const subhead = mode === "signin" ? "Sign in to your command terminal"
                : mode === "signup" ? "Join the founding 15 — VIP slot required"
                                    : "Enter your email and we'll send a reset link"

  if (blocked) {
    return <VipBlockedScreen reason={blocked} onRetry={clearBlock} />
  }

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row overflow-hidden bg-black text-white">

      {/* Backdrop (full bleed under everything) */}
      {loginStyle === "aurora" ? <AuroraBackdrop palette={palette} /> : <OrbsBackdrop palette={palette} />}

      {/* ── LEFT — Hero panel ─────────────────────────────────────── */}
      <div className="relative z-10 hidden md:flex md:w-[58%] flex-col p-10 lg:p-14">

        {/* Brand mark — top */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              boxShadow: "0 0 28px hsl(270 80% 60% / 0.45)",
              border: "1px solid hsl(280 60% 40% / 0.4)",
            }}>
            <Image
              src="/phoenix-logo.jpg"
              alt="Phoenix"
              width={44} height={44}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-white font-black text-base tracking-[0.2em] uppercase">Phoenix</span>
            <span className="text-white/50 font-bold text-[10px] tracking-[0.35em] uppercase mt-1">Command</span>
          </div>
        </div>

        {/* Headline — centered horizontally, positioned above the planet rim
            (which sits at ~55% from top thanks to the AuroraBackdrop math).
            Pushes itself ~30% from top so "Welcome" floats above the planet. */}
        <div className="flex-1 flex flex-col items-center justify-center text-center"
             style={{ paddingBottom: "20%" }}>

          {/* Status pill — themed */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md mb-8"
            style={{ borderColor: palette.liveBadgeBorder, background: palette.liveBadgeBg }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: palette.liveDotColor }} />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: palette.liveBadgeText }}>
              Live Algorithmic Trading Desk
            </span>
          </div>

          {/* Big "Welcome" */}
          <h1 className="font-black text-white tracking-tight leading-none"
              style={{ fontSize: "clamp(4.5rem, 8vw, 7rem)" }}>
            Welcome
          </h1>

          {/* Smaller "to your command center." — themed gradient */}
          <p className="mt-3 font-bold tracking-tight"
             style={{
               fontSize: "clamp(1.25rem, 2.2vw, 1.875rem)",
               background: `linear-gradient(120deg, ${palette.accentTextStart} 0%, ${palette.accentTextEnd} 100%)`,
               WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
               backgroundClip: "text",
             }}>
            to your command center.
          </p>
        </div>

        {/* Bottom — Trader Kizan credit + style toggle */}
        <div className="flex items-end justify-between flex-shrink-0">

          {/* Trader Kizan credit */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/15 flex-shrink-0">
              <Image
                src="/trader-kizan-logo.jpg"
                alt="Trader Kizan"
                width={32} height={32}
                className="object-cover"
              />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">by</p>
              <p className="text-xs text-white/80 font-black tracking-wider uppercase">Trader Kizan</p>
            </div>
          </div>

          {/* Style toggle */}
          <button
            onClick={cycleLoginStyle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/[0.04] backdrop-blur-md transition-all text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white/90"
            title={`Switch to ${loginStyle === "aurora" ? "orbs" : "aurora"} style`}>
            {loginStyle === "aurora" ? <Sparkles className="w-3 h-3" /> : <Orbit className="w-3 h-3" />}
            <span>{loginStyle === "aurora" ? "Aurora" : "Orbs"}</span>
          </button>
        </div>
      </div>

      {/* ── RIGHT — Form panel ────────────────────────────────────── */}
      <div className="relative z-10 w-full md:w-[42%] flex items-center justify-center p-6 md:p-10 lg:p-12">
        <div className="w-full max-w-sm">

          {/* Mobile branding */}
          <div className="md:hidden mb-10 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden"
              style={{
                boxShadow: "0 0 24px hsl(270 80% 60% / 0.45)",
                border: "1px solid hsl(280 60% 40% / 0.4)",
              }}>
              <Image
                src="/phoenix-logo.jpg"
                alt="Phoenix"
                width={40} height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center leading-none">
              <p className="text-white font-black text-base tracking-[0.2em] uppercase">Phoenix</p>
              <p className="text-white/50 font-bold text-[10px] tracking-[0.35em] uppercase mt-1.5">Command</p>
            </div>
          </div>

          {/* Glass card */}
          <div className="rounded-2xl p-7 md:p-8 backdrop-blur-xl"
            style={{
              background: "linear-gradient(165deg, hsla(0,0%,100%,0.04) 0%, hsla(0,0%,100%,0.01) 100%)",
              border: "1px solid hsla(0,0%,100%,0.08)",
              boxShadow: "0 20px 60px hsla(0,0%,0%,0.5), inset 0 1px 0 hsla(0,0%,100%,0.04)",
            }}>

            {/* Back button when in reset mode */}
            {mode === "reset" && (
              <button onClick={() => { setMode("signin"); setError(""); setSuccess("") }}
                className="flex items-center gap-1 text-xs text-white/40 hover:text-white/80 mb-3 transition-colors">
                <ArrowLeft className="w-3 h-3" />
                Back to sign in
              </button>
            )}

            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{heading}</h2>
              <p className="mt-1.5 text-sm text-white/45">{subhead}</p>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="mb-4 p-3 rounded-lg text-xs font-medium text-rose-300"
                style={{ background: "hsla(0,84%,60%,0.08)", border: "1px solid hsla(0,84%,60%,0.2)" }}>
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-lg text-xs font-medium"
                style={{
                  background: "hsla(280,80%,65%,0.08)", border: "1px solid hsla(280,80%,65%,0.2)",
                  color: "hsl(280 80% 80%)",
                }}>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1.5">
                  Email
                </label>
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all"
                  style={{
                    background: "hsla(0,0%,100%,0.04)",
                    border: "1px solid hsla(0,0%,100%,0.08)",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "hsl(280 80% 65% / 0.5)"
                    e.target.style.background  = "hsla(0,0%,100%,0.06)"
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "hsla(0,0%,100%,0.08)"
                    e.target.style.background  = "hsla(0,0%,100%,0.04)"
                  }}
                />
              </div>

              {/* Password — hidden in reset mode */}
              {mode !== "reset" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                      Password
                    </label>
                    {mode === "signin" && (
                      <button type="button"
                        onClick={() => { setMode("reset"); setError(""); setSuccess("") }}
                        className="text-[11px] text-white/40 hover:text-white/90 transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"} required
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "At least 6 characters" : "••••••••••"}
                      minLength={6}
                      className="w-full rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white outline-none transition-all"
                      style={{
                        background: "hsla(0,0%,100%,0.04)",
                        border: "1px solid hsla(0,0%,100%,0.08)",
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = "hsl(280 80% 65% / 0.5)"
                        e.target.style.background  = "hsla(0,0%,100%,0.06)"
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = "hsla(0,0%,100%,0.08)"
                        e.target.style.background  = "hsla(0,0%,100%,0.04)"
                      }}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/90 transition-colors"
                      aria-label={showPass ? "Hide password" : "Show password"}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit — gradient button */}
              <button type="submit" disabled={busy}
                className="w-full py-3 rounded-lg text-sm font-black tracking-wider text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                style={{
                  background: busy
                    ? "linear-gradient(135deg, hsl(0 0% 30%) 0%, hsl(0 0% 20%) 100%)"
                    : palette.buttonGradient,
                  boxShadow: busy ? "none" : `0 4px 20px ${palette.buttonGlow}`,
                  opacity: busy ? 0.7 : 1,
                }}>
                {submitLabel}
              </button>
            </form>

            {mode !== "reset" && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: "hsla(0,0%,100%,0.08)" }} />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 text-[10px] font-bold tracking-widest uppercase text-white/30 bg-black/40 backdrop-blur-sm rounded">
                      OR
                    </span>
                  </div>
                </div>

                <button onClick={handleGoogle} disabled={gLoading || checking}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                  style={{
                    background: "hsla(0,0%,100%,0.04)",
                    border: "1px solid hsla(0,0%,100%,0.1)",
                  }}
                  onMouseEnter={e => { if (!gLoading && !checking) e.currentTarget.style.background = "hsla(0,0%,100%,0.07)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "hsla(0,0%,100%,0.04)" }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {gLoading ? "Connecting…" : "Continue with Google"}
                </button>

                <p className="mt-6 text-center text-xs text-white/40">
                  {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin")
                      setError(""); setSuccess("")
                    }}
                    className="font-black transition-colors hover:text-white"
                    style={{ color: "hsl(280 85% 75%)" }}>
                    {mode === "signin" ? "Request access" : "Sign in"}
                  </button>
                </p>
              </>
            )}
          </div>

          {/* Mobile — Trader Kizan credit + style toggle */}
          <div className="md:hidden mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden border border-white/15 flex-shrink-0">
                <Image src="/trader-kizan-logo.jpg" alt="Trader Kizan" width={24} height={24} className="object-cover" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-white/40">by <span className="text-white/80 font-black">Trader Kizan</span></span>
            </div>
            <button
              onClick={cycleLoginStyle}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/50">
              {loginStyle === "aurora" ? <Sparkles className="w-3 h-3" /> : <Orbit className="w-3 h-3" />}
              {loginStyle === "aurora" ? "Aurora" : "Orbs"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
