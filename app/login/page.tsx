"use client"

import { useState, useEffect, FormEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { Eye, EyeOff, ArrowLeft, Sparkles, Orbit, Zap } from "lucide-react"
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
// Style A — AURORA (SVG planet with rim-lit edge)
//
// Uses an SVG layered approach for full control over the curve:
//   1. Black background + stars
//   2. Dark planet circle (positioned so upper half is visible)
//   3. Crescent rim with glow filter
//   4. Hot spot — bright lens flare on the rim
// ─────────────────────────────────────────────────────────────────────
function AuroraBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Pure black space */}
      <div className="absolute inset-0 bg-black" />

      {/* Nebula haze in the upper sky */}
      <div
        className="absolute"
        style={{
          top: "-10%", left: "-15%", width: "70%", height: "55%",
          background: "radial-gradient(ellipse, hsl(265 80% 45% / 0.22) 0%, transparent 60%)",
          filter: "blur(50px)",
        }}
      />
      <div
        className="absolute"
        style={{
          top: "5%", right: "-15%", width: "60%", height: "50%",
          background: "radial-gradient(ellipse, hsl(220 80% 50% / 0.15) 0%, transparent 60%)",
          filter: "blur(50px)",
        }}
      />

      {/* Stars — varied sizes and brightness */}
      <div className="absolute inset-0">
        {[
          { top: "4%",  left: "8%",  size: 2, opacity: 0.9 },
          { top: "12%", left: "78%", size: 2, opacity: 0.85 },
          { top: "8%",  left: "42%", size: 2, opacity: 0.75 },
          { top: "20%", left: "88%", size: 2, opacity: 0.7 },
          { top: "6%",  left: "65%", size: 2, opacity: 0.6 },
          { top: "18%", left: "22%", size: 2, opacity: 0.7 },
          { top: "3%",  left: "30%", size: 1, opacity: 0.55 },
          { top: "10%", left: "55%", size: 1, opacity: 0.6 },
          { top: "16%", left: "12%", size: 1, opacity: 0.55 },
          { top: "22%", left: "48%", size: 1, opacity: 0.45 },
          { top: "26%", left: "70%", size: 1, opacity: 0.45 },
          { top: "30%", left: "5%",  size: 1, opacity: 0.5 },
          { top: "34%", left: "92%", size: 1, opacity: 0.45 },
          { top: "14%", left: "95%", size: 1, opacity: 0.45 },
          { top: "11%", left: "5%",  size: 1, opacity: 0.5 },
          { top: "25%", left: "35%", size: 1, opacity: 0.4 },
          { top: "32%", left: "62%", size: 1, opacity: 0.35 },
          { top: "7%",  left: "95%", size: 1, opacity: 0.5 },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              top: s.top, left: s.left,
              width:  s.size, height: s.size,
              opacity: s.opacity,
              animationDelay:    `${i * 0.4}s`,
              animationDuration: `${4 + (i % 5)}s`,
              boxShadow: s.size >= 2 ? "0 0 4px hsla(0,0%,100%,0.6)" : "none",
            }}
          />
        ))}
      </div>

      {/* ─── THE PLANET ─────────────────────────────────────────
          SVG approach — full control over the curve.
          The circle is positioned with its center BELOW the viewBox
          so we see the upper portion as a curved arc rising from
          the bottom. */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Planet surface gradient — very dark with slight purple */}
          <radialGradient id="planetSurface" cx="50%" cy="0%" r="80%">
            <stop offset="0%"   stopColor="hsl(265 35% 14%)" />
            <stop offset="20%"  stopColor="hsl(265 25% 9%)" />
            <stop offset="50%"  stopColor="hsl(0 0% 2%)" />
            <stop offset="100%" stopColor="hsl(0 0% 0%)" />
          </radialGradient>

          {/* Rim gradient — bright purple-white at top, fading to sides */}
          <linearGradient id="rimLight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="hsl(265 90% 60%)" stopOpacity="0" />
            <stop offset="20%"  stopColor="hsl(280 95% 70%)" stopOpacity="0.8" />
            <stop offset="50%"  stopColor="hsl(290 100% 85%)" stopOpacity="1" />
            <stop offset="65%"  stopColor="hsl(300 100% 90%)" stopOpacity="1" />
            <stop offset="80%"  stopColor="hsl(220 95% 75%)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(220 90% 60%)" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter for the rim */}
          <filter id="rimGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur1" />
            <feGaussianBlur stdDeviation="20" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft outer halo filter */}
          <filter id="halo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="40" />
          </filter>

          {/* Hot-spot lens flare filter */}
          <filter id="hotSpot" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="b1" />
            <feGaussianBlur stdDeviation="15" result="b2" in="SourceGraphic" />
            <feGaussianBlur stdDeviation="40" result="b3" in="SourceGraphic" />
            <feMerge>
              <feMergeNode in="b3" />
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer halo — soft purple glow that bleeds into the sky */}
        <ellipse
          cx="500" cy="1180" rx="780" ry="580"
          fill="hsl(280 80% 55%)" opacity="0.18"
          filter="url(#halo)"
        />

        {/* The planet body — dark sphere with subtle gradient */}
        <circle
          cx="500" cy="1180" r="700"
          fill="url(#planetSurface)"
        />

        {/* The bright crescent rim — thick stroked arc with glow */}
        <path
          d="M -200 600 Q 500 350, 1200 600"
          fill="none"
          stroke="url(#rimLight)"
          strokeWidth="3"
          filter="url(#rimGlow)"
        />

        {/* Hot spot — bright lens flare on the rim, off-center to the right */}
        <circle
          cx="640" cy="490" r="6"
          fill="white"
          filter="url(#hotSpot)"
        />

        {/* Extra bright core of the hot spot */}
        <circle
          cx="640" cy="490" r="2"
          fill="white"
          opacity="1"
        />
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Style B — ORBS (visible gradient blobs)
//
// Less aggressive blur, higher opacity, more saturated colors so the
// orbs are actually visible on a black canvas.
// ─────────────────────────────────────────────────────────────────────
function OrbsBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-black" />

      {/* Top-left purple orb */}
      <div
        className="absolute rounded-full"
        style={{
          width: "520px", height: "520px",
          top:   "-10%", left: "-8%",
          background: "radial-gradient(circle, hsl(265 90% 55%) 0%, hsl(265 80% 45% / 0.4) 35%, transparent 70%)",
          filter: "blur(70px)",
          opacity: 0.7,
        }}
      />

      {/* Top-right magenta orb */}
      <div
        className="absolute rounded-full"
        style={{
          width: "420px", height: "420px",
          top:   "8%", right: "-5%",
          background: "radial-gradient(circle, hsl(300 90% 60%) 0%, hsl(310 85% 50% / 0.35) 35%, transparent 70%)",
          filter: "blur(60px)",
          opacity: 0.55,
        }}
      />

      {/* Center-bottom blue orb */}
      <div
        className="absolute rounded-full"
        style={{
          width: "600px", height: "600px",
          bottom: "-15%", left: "20%",
          background: "radial-gradient(circle, hsl(220 95% 55%) 0%, hsl(225 85% 45% / 0.35) 35%, transparent 70%)",
          filter: "blur(80px)",
          opacity: 0.6,
        }}
      />

      {/* Middle-right violet accent (smaller, sharper) */}
      <div
        className="absolute rounded-full"
        style={{
          width: "320px", height: "320px",
          top: "45%", right: "15%",
          background: "radial-gradient(circle, hsl(285 95% 65%) 0%, hsl(290 85% 55% / 0.4) 30%, transparent 65%)",
          filter: "blur(50px)",
          opacity: 0.5,
        }}
      />

      {/* Small bright purple core — anchor point */}
      <div
        className="absolute rounded-full"
        style={{
          width: "180px", height: "180px",
          top: "25%", left: "35%",
          background: "radial-gradient(circle, hsl(280 100% 70%) 0%, hsl(275 90% 60% / 0.5) 30%, transparent 65%)",
          filter: "blur(35px)",
          opacity: 0.7,
        }}
      />

      {/* Subtle dot-grid texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Main login page
// ─────────────────────────────────────────────────────────────────────
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
      {loginStyle === "aurora" ? <AuroraBackdrop /> : <OrbsBackdrop />}

      {/* ── LEFT — Hero panel ─────────────────────────────────────── */}
      <div className="relative z-10 hidden md:flex md:w-[58%] flex-col p-10 lg:p-14">

        {/* Brand mark — top */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-md"
            style={{
              background: "linear-gradient(135deg, hsl(265 85% 60% / 0.9) 0%, hsl(280 80% 50% / 0.9) 100%)",
              boxShadow: "0 0 28px hsl(270 80% 60% / 0.45)",
            }}>
            <Zap className="w-5 h-5 text-white" fill="currentColor" />
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

          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md mb-8"
            style={{ borderColor: "hsl(280 85% 65% / 0.35)", background: "hsl(280 85% 65% / 0.08)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(280 90% 70%)" }} />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "hsl(280 90% 75%)" }}>
              Live Algorithmic Trading Desk
            </span>
          </div>

          {/* Big "Welcome" */}
          <h1 className="font-black text-white tracking-tight leading-none"
              style={{ fontSize: "clamp(4.5rem, 8vw, 7rem)" }}>
            Welcome
          </h1>

          {/* Smaller "to your command center." */}
          <p className="mt-3 font-bold tracking-tight"
             style={{
               fontSize: "clamp(1.25rem, 2.2vw, 1.875rem)",
               background: "linear-gradient(120deg, hsl(280 90% 75%) 0%, hsl(220 90% 75%) 100%)",
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(265 85% 60%) 0%, hsl(280 80% 50%) 100%)",
                boxShadow: "0 0 24px hsl(270 80% 60% / 0.45)",
              }}>
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
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
                    ? "linear-gradient(135deg, hsl(265 60% 45%) 0%, hsl(280 55% 40%) 100%)"
                    : "linear-gradient(135deg, hsl(265 85% 60%) 0%, hsl(280 80% 50%) 100%)",
                  boxShadow: busy ? "none" : "0 8px 24px hsl(270 80% 50% / 0.35)",
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
