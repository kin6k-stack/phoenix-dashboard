"use client"

import { useTheme } from "@/lib/use-theme"

/**
 * AmbientBackdrop v2 — full-viewport floating-orb layer.
 *
 * Pass I v1 was invisible because:
 *   1. Used `position: absolute` inside a root with overflow-hidden,
 *      so negative-positioned orbs got clipped
 *   2. Opacity was way too conservative (25-45%) — invisible through
 *      the tiles' bg-card/60 layer
 *   3. Blur was too aggressive (140-180px) — the orb had no bright
 *      center, just a uniform tint
 *
 * v2 fix:
 *   • `position: fixed` so orbs paint the full viewport, never clipped
 *   • opacity bumped to 65-95% per theme
 *   • blur reduced to 80-110px so orbs have a real bright center
 *
 * Renders at z-index 0 behind everything except the body bg.
 * pointer-events-none so it never blocks interactions.
 *
 * Animations are disabled when user has animations: false in Settings.
 */
export function AmbientBackdrop() {
  const { theme, invert, animations, hydrated } = useTheme()

  if (!hydrated) return null

  // Black/White (either mode) → no orbs. Preserves monochrome aesthetic.
  if (theme === "black-white") return null

  const config = getOrbConfig(theme, invert)
  if (!config) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {config.orbs.map((orb, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${animations ? "animate-pulse" : ""}`}
          style={{
            top:    orb.top,
            left:   orb.left,
            right:  orb.right,
            bottom: orb.bottom,
            width:  orb.size,
            height: orb.size,
            background: orb.color,
            filter: `blur(${orb.blur})`,
            opacity: orb.opacity,
            mixBlendMode: config.blend as any,
            animationDuration: orb.duration,
          }}
        />
      ))}
    </div>
  )
}

// ── Per-theme orb definitions ─────────────────────────────────────
interface Orb {
  top?:     string
  left?:    string
  right?:   string
  bottom?:  string
  size:     string
  color:    string
  blur:     string
  opacity:  number
  duration: string
}

interface OrbConfig {
  orbs:  Orb[]
  blend: "screen" | "overlay" | "lighten" | "normal"
}

function getOrbConfig(theme: string, invert: boolean): OrbConfig | null {
  switch (theme) {
    case "violet":
      // Bright, saturated orbs against deep purple canvas.
      // High opacity + screen blend = orbs that glow through everything.
      return {
        blend: "screen",
        orbs: [
          {
            top: "-12%", left: "-8%",
            size: "55%",
            color: "radial-gradient(circle at center, hsl(280 100% 65%) 0%, hsl(285 95% 55% / 0.6) 30%, transparent 70%)",
            blur: "90px",
            opacity: 0.85,
            duration: "9s",
          },
          {
            top: "18%", right: "-12%",
            size: "55%",
            color: "radial-gradient(circle at center, hsl(310 100% 65%) 0%, hsl(315 95% 55% / 0.6) 30%, transparent 70%)",
            blur: "100px",
            opacity: 0.75,
            duration: "14s",
          },
          {
            bottom: "-18%", left: "25%",
            size: "60%",
            color: "radial-gradient(circle at center, hsl(265 100% 60%) 0%, hsl(270 95% 50% / 0.6) 30%, transparent 70%)",
            blur: "110px",
            opacity: 0.65,
            duration: "11s",
          },
        ],
      }

    case "gold":
      // Gold canvas is light — switch to multiply blend so orbs add warmth
      // instead of brightening (which would wash everything out).
      return {
        blend: "multiply",
        orbs: [
          {
            top: "-10%", left: "-8%",
            size: "55%",
            color: "radial-gradient(circle at center, hsl(38 95% 50%) 0%, hsl(33 90% 55% / 0.6) 30%, transparent 70%)",
            blur: "90px",
            opacity: 0.45,
            duration: "12s",
          },
          {
            top: "25%", right: "-10%",
            size: "50%",
            color: "radial-gradient(circle at center, hsl(28 92% 55%) 0%, hsl(25 90% 60% / 0.6) 30%, transparent 70%)",
            blur: "100px",
            opacity: 0.4,
            duration: "16s",
          },
          {
            bottom: "-15%", right: "20%",
            size: "50%",
            color: "radial-gradient(circle at center, hsl(45 90% 55%) 0%, hsl(42 85% 60% / 0.6) 30%, transparent 70%)",
            blur: "100px",
            opacity: 0.35,
            duration: "13s",
          },
        ],
      }

    case "midnight":
      // Deep navy base — bright blue orbs glow nicely with screen blend.
      return {
        blend: "screen",
        orbs: [
          {
            top: "-10%", left: "-10%",
            size: "55%",
            color: "radial-gradient(circle at center, hsl(220 100% 60%) 0%, hsl(215 95% 50% / 0.6) 30%, transparent 70%)",
            blur: "100px",
            opacity: 0.7,
            duration: "12s",
          },
          {
            bottom: "-12%", right: "-10%",
            size: "55%",
            color: "radial-gradient(circle at center, hsl(210 95% 55%) 0%, hsl(205 90% 45% / 0.6) 30%, transparent 70%)",
            blur: "110px",
            opacity: 0.6,
            duration: "16s",
          },
        ],
      }

    case "dark":
      // Subtle treatment — Dark is already polished. One emerald orb.
      return {
        blend: "screen",
        orbs: [
          {
            top: "10%", left: "-5%",
            size: "50%",
            color: "radial-gradient(circle at center, hsl(142 70% 45%) 0%, hsl(142 65% 35% / 0.5) 30%, transparent 70%)",
            blur: "120px",
            opacity: 0.35,
            duration: "15s",
          },
          {
            bottom: "5%", right: "-5%",
            size: "45%",
            color: "radial-gradient(circle at center, hsl(217 91% 60%) 0%, hsl(217 85% 50% / 0.5) 30%, transparent 70%)",
            blur: "120px",
            opacity: 0.25,
            duration: "18s",
          },
        ],
      }

    default:
      return null
  }
}
