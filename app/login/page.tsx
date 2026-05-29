"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Eye, EyeOff, CheckCircle2, Zap, ArrowLeft } from "lucide-react"

const FEATURES = [
  "Live MT5 bot sync — Gold Sentinel, Phoenix NQ, Phoenix Hybrid",
  "Session intelligence with institutional kill zones",
  "AI-powered market bias + multi-agent consensus",
  "Real-time equity curve and drawdown tracking",
]

const PARTICLES = [
  { w: 4, h: 4, top: "12%", left: "8%",  delay: "0s",    dur: "4.2s" },
  { w: 3, h: 3, top: "28%", left: "22%", delay: "1.1s",  dur: "5.8s" },
  { w: 5, h: 5, top: "55%", left: "6%",  delay: "0.4s",  dur: "3.9s" },
  { w: 3, h: 3, top: "72%", left: "35%", delay: "2.0s",  dur: "6.1s" },
  { w: 4, h: 4, top: "88%", left: "15%", delay: "0.8s",  dur: "4.7s" },
  { w: 3, h: 3, top: "20%", left: "48%", delay: "1.5s",  dur: "5.2s" },
  { w: 5, h: 5, top: "65%", left: "52%", delay: "2.3s",  dur: "4.4s" },
  { w: 3, h: 3, top: "42%", left: "38%", delay: "0.6s",  dur: "6.8s" },
  { w: 4, h: 4, top: "80%", left: "44%", delay: "1.8s",  dur: "3.6s" },
  { w: 3, h: 3, top: "6%",  left: "30%", delay: "3.0s",  dur: "5.5s" },
]

// Map Firebase auth error codes to user-friendly messages
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
    case "auth/network-request-failed":
      return "Network error. Check your connection."
    default:
      if (mode === "signup") return "Sign-up failed. Please try again."
      if (mode === "reset")  return "Password reset failed. Check the email and try again."
      return "Sign-in failed. Please try again."
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth()

  const [mode,      setMode]      = useState<"signin" | "signup" | "reset">("signin")
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [gLoading,  setGLoading]  = useState(false)
  const [error,     setError]     = useState("")
  const [success,   setSuccess]   = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password)
        router.push("/")
      } else if (mode === "reset") {
        await resetPassword(email)
        setSuccess("Password reset email sent. Check your inbox.")
      } else {
        await signInWithEmail(email, password)
        router.push("/")
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err?.code, mode))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError("")
    setSuccess("")
    setGLoading(true)
    try {
      await signInWithGoogle()
      router.push("/")
    } catch (err: any) {
      setError(getAuthErrorMessage(err?.code, mode === "signup" ? "signup" : "signin"))
    } finally {
      setGLoading(false)
    }
  }

  // ── UI text per mode ──────────────────────────────────────────────────────────
  const heading = mode === "signin" ? "Welcome back"
                : mode === "signup" ? "Create your account"
                                    : "Reset password"
  const subhead = mode === "signin" ? "Sign in to your trading terminal"
                : mode === "signup" ? "Start your 14-day trading edge"
                                    : "Enter your email and we'll send a reset link"
  const submitLabel = mode === "signin" ? (loading ? "Signing in…" : "Sign In")
                    : mode === "signup" ? (loading ? "Creating account…" : "Create Account")
                                        : (loading ? "Sending…" : "Send Reset Link")

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#0d0f14]">
      {/* ── Left marketing panel ────────────────────────────────────────────── */}
      <div className="relative hidden md:flex md:w-[56%] flex-col justify-between p-12 overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(95,199,122,0.12) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute top-[40%] left-[20%] w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(95,199,122,0.06) 0%, transparent 65%)" }} />

        {PARTICLES.map((p, i) => (
          <div key={i} className="particle" style={{
            width: p.w, height: p.h, top: p.top, left: p.left,
            animationDelay: p.delay, animationDuration: p.dur, opacity: 0.4,
          }} />
        ))}

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #5fc77a 0%, #3da85a 100%)", boxShadow: "0 0 24px rgba(95,199,122,0.35)" }}>
              <Zap className="w-5 h-5 text-[#0d0f14]" fill="currentColor" />
            </div>
            <span className="text-white font-black text-lg tracking-widest uppercase">Phoenix</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6"
              style={{ borderColor: "rgba(95,199,122,0.3)", background: "rgba(95,199,122,0.06)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#5fc77a] animate-pulse" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#5fc77a]">
                Live Algorithmic Trading Desk
              </span>
            </div>
            <h1 className="text-5xl font-black leading-tight text-white">
              The trading ecosystem<br />
              <span style={{ color: "#5fc77a" }}>serious traders build.</span>
            </h1>
            <p className="mt-4 text-base text-slate-400 leading-relaxed max-w-md">
              Live MT5 bot telemetry, institutional session intelligence, and
              AI-powered market bias — all in one command center.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#5fc77a" }} />
                <span className="text-sm text-slate-300">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-slate-600 italic">
            "The bots run. The dashboard breathes. You execute with edge."
          </p>
        </div>
      </div>

      {/* ── Right — form panel ─────────────────────────────────────────────── */}
      <div className="w-full md:w-[44%] flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="md:hidden mb-8 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#5fc77a" }}>
              <Zap className="w-4 h-4 text-[#0d0f14]" fill="currentColor" />
            </div>
            <span className="text-white font-black text-base tracking-widest uppercase">Phoenix</span>
          </div>

          <div className="rounded-2xl p-8 border" style={{ background: "#141720", borderColor: "#1e2232" }}>

            {/* Back button when in reset mode */}
            {mode === "reset" && (
              <button onClick={() => { setMode("signin"); setError(""); setSuccess("") }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-3 transition-colors">
                <ArrowLeft className="w-3 h-3" />
                Back to sign in
              </button>
            )}

            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">{heading}</h2>
              <p className="mt-1 text-sm text-slate-500">{subhead}</p>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="mb-4 p-3 rounded-lg text-xs font-medium text-red-400"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-lg text-xs font-medium text-emerald-400"
                style={{ background: "rgba(95,199,122,0.08)", border: "1px solid rgba(95,199,122,0.2)" }}>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Email
                </label>
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                  style={{ background: "#1a1f2e", border: "1px solid #1e2232" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(95,199,122,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "#1e2232")}
                />
              </div>

              {/* Password — hidden in reset mode */}
              {mode !== "reset" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Password
                    </label>
                    {mode === "signin" && (
                      <button type="button"
                        onClick={() => { setMode("reset"); setError(""); setSuccess("") }}
                        className="text-[11px] text-slate-500 hover:text-[#5fc77a] transition-colors">
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
                      className="w-full rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-600 outline-none transition-all"
                      style={{ background: "#1a1f2e", border: "1px solid #1e2232" }}
                      onFocus={e => (e.target.style.borderColor = "rgba(95,199,122,0.5)")}
                      onBlur={e  => (e.target.style.borderColor = "#1e2232")}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-black tracking-wider text-[#0d0f14] transition-all active:scale-[0.98]"
                style={{ background: loading ? "rgba(95,199,122,0.5)" : "#5fc77a", cursor: loading ? "not-allowed" : "pointer" }}>
                {submitLabel}
              </button>
            </form>

            {/* Hide Google + signup link on reset screen */}
            {mode !== "reset" && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full" style={{ borderTop: "1px solid #1e2232" }} />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 text-xs text-slate-600" style={{ background: "#141720" }}>OR</span>
                  </div>
                </div>

                <button onClick={handleGoogle} disabled={gLoading}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2.5 transition-all hover:border-slate-600 active:scale-[0.98]"
                  style={{ background: "#1a1f2e", border: "1px solid #1e2232", cursor: gLoading ? "not-allowed" : "pointer" }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {gLoading ? "Connecting…" : "Continue with Google"}
                </button>

                <p className="mt-5 text-center text-xs text-slate-500">
                  {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin")
                      setError(""); setSuccess("")
                    }}
                    className="font-bold transition-colors" style={{ color: "#5fc77a" }}>
                    {mode === "signin" ? "Sign up free" : "Sign in"}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
