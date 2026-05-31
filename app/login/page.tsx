"use client"

import { useState, useEffect, FormEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { Eye, EyeOff, CheckCircle2, ArrowLeft, Sparkles, Orbit, Zap } from "lucide-react"
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

const FEATURES = [
  "Live MT5 bot sync — Gold Sentinel, Phoenix NQ, Phoenix Hybrid",
  "Session intelligence with institutional kill zones",
  "AI-powered market bias + multi-agent consensus",
  "Real-time equity curve and drawdown tracking",
]

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
// Style A — AURORA (deep horizon glow, atmospheric, default)
// ─────────────────────────────────────────────────────────────────────
function AuroraBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Pure black underlay */}
      <div className="absolute inset-0 bg-black" />

      {/* Horizon arc — purple glow rising from bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] blur-3xl opacity-70"
        style={{
          width: "180%",
          height: "60vh",
          background: "radial-gradient(ellipse at center top, hsl(265 80% 55% / 0.35) 0%, hsl(280 75% 45% / 0.15) 35%, transparent 65%)",
          transform: "translate(-50%, 50%)",
        }}
      />

      {/* Thin glowing arc — adds a "planet horizon" feel */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          bottom: "12%",
          width: "120%",
          height: "8px",
          background: "linear-gradient(90deg, transparent 0%, hsl(280 90% 65% / 0.6) 50%, transparent 100%)",
          boxShadow: "0 0 60px hsl(265 90% 60% / 0.7), 0 0 30px hsl(280 90% 65% / 0.5)",
          filter: "blur(1px)",
        }}
      />

      {/* Top fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-transparent opacity-50" />

      {/* Stars (CSS-only, low density) */}
      <div className="absolute inset-0">
        {[
          { top: "8%",  left: "12%", size: 1 },
          { top: "14%", left: "78%", size: 2 },
          { top: "22%", left: "35%", size: 1 },
          { top: "18%", left: "55%", size: 1 },
          { top: "5%",  left: "88%", size: 2 },
          { top: "32%", left: "22%", size: 1 },
          { top: "10%", left: "65%", size: 1 },
          { top: "28%", left: "85%", size: 2 },
          { top: "40%", left: "8%",  size: 1 },
          { top: "6%",  left: "45%", size: 1 },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              top: s.top, left: s.left,
              width:  s.size, height: s.size,
              opacity: 0.4 + Math.random() * 0.4,
              animationDelay:    `${i * 0.7}s`,
              animationDuration: `${3 + (i % 4)}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Style B — ORBS (minimal gradient blobs)
// ─────────────────────────────────────────────────────────────────────
function OrbsBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-black" />

      <div
        className="absolute rounded-full blur-3xl opacity-60"
        style={{
          width: "500px", height: "500px",
          top:   "10%", left: "5%",
          background: "radial-gradient(circle, hsl(265 85% 55% / 0.45) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute rounded-full blur-3xl opacity-50"
        style={{
          width: "600px", height: "600px",
          bottom: "5%", left: "30%",
          background: "radial-gradient(circle, hsl(220 85% 55% / 0.35) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute rounded-full blur-3xl opacity-40"
        style={{
          width: "450px", height: "450px",
          top:   "35%", right: "10%",
          background: "radial-gradient(circle, hsl(300 80% 60% / 0.3) 0%, transparent 70%)",
        }}
      />

      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
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
      <div className="relative z-10 hidden md:flex md:w-[58%] flex-col justify-between p-12 lg:p-16">

        {/* Brand mark — top */}
        <div className="flex items-center gap-3">
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

        {/* Middle — headline */}
        <div className="space-y-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md"
            style={{ borderColor: "hsl(280 85% 65% / 0.35)", background: "hsl(280 85% 65% / 0.08)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(280 90% 70%)" }} />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "hsl(280 90% 75%)" }}>
              Live Algorithmic Trading Desk
            </span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-black leading-[1.05] text-white">
            Welcome to your<br />
            <span style={{
              background: "linear-gradient(120deg, hsl(280 90% 70%) 0%, hsl(220 90% 70%) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              command center.
            </span>
          </h1>

          <p className="text-base text-white/60 leading-relaxed max-w-md">
            Live MT5 bot telemetry, institutional session intelligence, and AI-powered market bias —
            all in one terminal.
          </p>

          <ul className="space-y-3 pt-2">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "hsl(280 80% 70%)" }} />
                <span className="text-sm text-white/75">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — Trader Kizan credit + style toggle */}
        <div className="flex items-end justify-between">

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
