"use client"

import { useTheme } from "@/lib/use-theme"

/**
 * AmbientBackdrop — full-viewport floating-orb layer.
 *
 * Reads the active theme + animations preference from useTheme()
 * and renders a per-theme atmospheric backdrop:
 *
 *   • Violet    → 2 purple/magenta orbs, screen blend, slow pulse
 *   • Gold      → 2 amber/bronze orbs, screen blend, slower pulse
 *   • Midnight  → 2 blue orbs, screen blend, very slow pulse
 *   • Dark      → 1 subtle emerald orb, low opacity
 *   • Black/White (default + invert) → null (noise from Pass H is enough)
 *
 * Renders at z-index 0 with pointer-events-none so it sits behind all UI
 * but blocks no interactions. Mounted once at the root layout level.
 *
 * Animations are disabled when user has animations: false in Settings.
 */
export function AmbientBackdrop() {
  const { theme, invert, animations, hydrated } = useTheme()

  // Don't render until hydrated — avoids flashing orbs during pre-paint script run
  if (!hydrated) return null

  // Black/White (either mode) → no orbs. Preserves monochrome aesthetic.
  // Noise overlay from Pass H provides the texture there.
  if (theme === "black-white") return null

  // Orb configurations per theme
  const config = getOrbConfig(theme, invert)
  if (!config) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
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
      return {
        blend: "screen",
        orbs: [
          {
            top: "-15%", left: "-10%",
            size: "65%",
            color: "radial-gradient(circle at center, hsl(280 95% 60%) 0%, transparent 65%)",
            blur: "140px",
            opacity: 0.45,
            duration: "9s",
          },
          {
            top: "25%", right: "-15%",
            size: "60%",
            color: "radial-gradient(circle at center, hsl(310 90% 65%) 0%, transparent 65%)",
            blur: "160px",
            opacity: 0.35,
            duration: "14s",
          },
          {
            bottom: "-20%", left: "30%",
            size: "55%",
            color: "radial-gradient(circle at center, hsl(265 90% 55%) 0%, transparent 65%)",
            blur: "150px",
            opacity: 0.28,
            duration: "11s",
          },
        ],
      }

    case "gold":
      // Gold has a LIGHT canvas — screen blend would wash everything out.
      // Use overlay blend at lower opacity to add warmth without flooding.
      return {
        blend: "overlay",
        orbs: [
          {
            top: "-10%", left: "-8%",
            size: "60%",
            color: "radial-gradient(circle at center, hsl(38 95% 50%) 0%, transparent 65%)",
            blur: "140px",
            opacity: 0.55,
            duration: "12s",
          },
          {
            top: "30%", right: "-12%",
            size: "55%",
            color: "radial-gradient(circle at center, hsl(28 92% 55%) 0%, transparent 65%)",
            blur: "150px",
            opacity: 0.45,
            duration: "16s",
          },
        ],
      }

    case "midnight":
      return {
        blend: "screen",
        orbs: [
          {
            top: "-12%", left: "-10%",
            size: "60%",
            color: "radial-gradient(circle at center, hsl(220 90% 55%) 0%, transparent 65%)",
            blur: "150px",
            opacity: 0.35,
            duration: "12s",
          },
          {
            bottom: "-15%", right: "-10%",
            size: "55%",
            color: "radial-gradient(circle at center, hsl(210 85% 50%) 0%, transparent 65%)",
            blur: "160px",
            opacity: 0.3,
            duration: "16s",
          },
        ],
      }

    case "dark":
      // Subtle single orb — Dark theme is already balanced, doesn't need much
      return {
        blend: "screen",
        orbs: [
          {
            top: "10%", left: "-5%",
            size: "50%",
            color: "radial-gradient(circle at center, hsl(142 70% 45%) 0%, transparent 65%)",
            blur: "180px",
            opacity: 0.15,
            duration: "15s",
          },
        ],
      }

    default:
      return null
  }
}
