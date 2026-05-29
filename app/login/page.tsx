"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Eye, EyeOff, CheckCircle2, Zap } from "lucide-react"

const FEATURES = [
  "Live MT5 bot sync — Gold Sentinel, Phoenix NQ, Phoenix Hybrid",
  "Session intelligence with institutional kill zones",
  "AI-powered market bias + multi-agent consensus",
  "Real-time equity curve and drawdown tracking",
]

// Floating particle positions
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

export default function LoginPage() {
  const router = useRouter()
  const { signInWithEmail, signInWithGoogle } = useAuth()

  const [mode,      setMode]      = useState<"signin" | "signup">("signin")
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [gLoading,  setGLoading]  = useState(false)
  const [error,     setError]     = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      router.push("/")
    } catch (err: any) {
      const msg = err?.code
      if (msg === "auth/user-not-found" || msg === "auth/wrong-password" || msg === "auth/invalid-credential")
        setError("Invalid email or password.")
      else if (msg === "auth/too-many-requests")
        setError("Too many attempts. Try again later.")
      else
        setError("Sign-in failed. Check your credentials.")
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    setError("")
    setGLoading(true)
    try {
      await signInWithGoogle()
      router.push("/")
    } catch { setError("Google sign-in failed. Try again.") }
    finally { setGLoading(false) }
  }

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#0d0f14]">

      {/* ── Left — marketing panel ──────────────────────────────────────────── */}
      <div className="relative hidden md:flex md:w-[56%] flex-col justify-between p-12 overflow-hidden">

        {/* Green radial glow */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(95,199,122,0.12) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute top-[40%] left-[20%] w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(95,199,122,0.06) 0%, transparent 65%)" }} />

        {/* Particles */}
        {PARTICLES.map((p, i) => (
          <div key={i} className="particle" style={{
            width: p.w, height: p.h, top: p.top, left: p.left,
            animationDelay: p.delay, animationDuration: p.dur, opacity: 0.4,
          }} />
        ))}

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #5fc77a 0%, #3da85a 100%)", boxShadow: "0 0 24px rgba(95,199,122,0.35)" }}>
              <Zap className="w-5 h-5 text-[#0d0f14]" fill="currentColor" />
            </div>
            <span className="text-white font-black text-lg tracking-widest uppercase">Phoenix</span>
          </div>
        </div>

        {/* Main copy */}
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
              AI‑powered market bias — all in one command center.
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

        {/* Bottom quote */}
        <div className="relative z-10">
          <p className="text-xs text-slate-600 italic">
            "The bots run. The dashboard breathes. You execute with edge."
          </p>
        </div>
      </div>

      {/* ── Right — form panel ──────────────────────────────────────────────── */}
      <div className="w-full md:w-[44%] flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="md:hidden mb-8 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#5fc77a" }}>
              <Zap className="w-4 h-4 text-[#0d0f14]" fill="currentColor" />
            </div>
            <span className="text-white font-black text-base tracking-widest uppercase">Phoenix</span>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8 border" style={{ background: "#141720", borderColor: "#1e2232" }}>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500">Sign in to your trading terminal</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg text-xs font-medium text-red-400"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
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

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Password
                  </label>
                  <button type="button" className="text-[11px] text-slate-500 hover:text-[#5fc77a] transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} required autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
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

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-black tracking-wider text-[#0d0f14] transition-all active:scale-[0.98]"
                style={{ background: loading ? "rgba(95,199,122,0.5)" : "#5fc77a", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: "1px solid #1e2232" }} />
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 text-xs text-slate-600" style={{ background: "#141720" }}>OR</span>
              </div>
            </div>

            {/* Google */}
            <button onClick={handleGoogle} disabled={gLoading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2.5 transition-all hover:border-slate-600 active:scale-[0.98]"
              style={{ background: "#1a1f2e", border: "1px solid #1e2232", cursor: gLoading ? "not-allowed" : "pointer" }}>
              {/* Google SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {gLoading ? "Connecting…" : "Continue with Google"}
            </button>

            {/* Sign up link */}
            <p className="mt-5 text-center text-xs text-slate-500">
              Don&apos;t have an account?{" "}
              <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-bold transition-colors" style={{ color: "#5fc77a" }}>
                Sign up free
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
