"use client"

import { useState, useEffect, useCallback } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { enablePush } from "@/lib/push-client"
import { collection, addDoc } from "firebase/firestore"
import {
  ChevronRight, X, Zap, BarChart3, Bell, Wallet,
  Bot, CheckCircle2, ArrowRight, BookOpen, Globe
} from "lucide-react"

// ── Slide data (non-owner focused) ──────────────────────────────────────────
const SLIDES = [
  {
    icon: Zap,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.3)",
    label: "Welcome",
    title: "Your Trading\nEcosystem",
    body: "Phoenix brings institutional-grade tools to your fingertips — connect your broker accounts, track every trade, and access professional-level insights, all in one place.",
  },
  {
    icon: BookOpen,
    color: "#16a34a",
    glow: "rgba(22,163,74,0.3)",
    label: "Lifetime Ledger",
    title: "Every Trade.\nEvery Broker.",
    body: "Import and sync trade history from any broker into one unified ledger. Full P&L calendar, win-rate analytics, and session performance — across your entire trading career.",
  },
  {
    icon: Bot,
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.3)",
    label: "Bot Fleet",
    title: "Automated\nGold Bots",
    body: "Phoenix's MT5 bots trade XAU/USD around the clock — validated session-gated exits, smart partial closes, and real-time reporting. You have live access to every signal and outcome.",
  },
  {
    icon: BarChart3,
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.3)",
    label: "Signal Intelligence",
    title: "73.4% Win Rate.\nValidated.",
    body: "Live gold signals captured, parsed, and measured against real market data. Every entry zone, TP level, and session context is tracked — nothing assumed, everything proven.",
  },
  {
    icon: Globe,
    color: "#ec4899",
    glow: "rgba(236,72,153,0.3)",
    label: "AI Insights",
    title: "Institutional\nContext Engine",
    body: "Market Bias, Intelligence Hub, and the Asset Matrix give you the macro picture — multi-agent AI consensus, live event calendars, and cross-asset correlations in real time.",
  },
]

interface OnboardingFlowProps { onComplete: () => void }

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth()
  const [phase,       setPhase]       = useState<"slides" | "wizard">("slides")
  const [slideIdx,    setSlideIdx]    = useState(0)
  const [wizardStep,  setWizardStep]  = useState(0)
  const [saving,      setSaving]      = useState(false)
  const [pushState,   setPushState]   = useState<string>("")
  const [brokerName,    setBrokerName]    = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountLabel,  setAccountLabel]  = useState("")
  const [addingAccount, setAddingAccount] = useState(false)

  const markComplete = useCallback(async () => {
    if (!user || saving) return
    setSaving(true)
    try { await setDoc(doc(db, "users", user.uid), { onboardingComplete: true }, { merge: true }) }
    catch (err) { console.warn("onboarding flag:", err) }
    finally { setSaving(false); onComplete() }
  }, [user, saving, onComplete])

  const slide = SLIDES[slideIdx]
  const SlideIcon = slide.icon
  const isLast = slideIdx === SLIDES.length - 1

  // ── Slide phase ───────────────────────────────────────────────────────────
  if (phase === "slides") {
    return (
      <div className="fixed inset-0 z-[99998] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "#08090c" }}>

        {/* Ambient glow — moves with each slide */}
        <div className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse 60% 45% at 50% 35%, ${slide.glow}, transparent 70%)`,
          }}/>

        {/* Subtle grid texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}/>

        {/* Skip */}
        <button onClick={() => setPhase("wizard")}
          className="absolute top-6 right-6 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors z-10">
          Skip <X size={11}/>
        </button>

        {/* Slide card */}
        <div className="relative z-10 w-full max-w-[340px] px-5 flex flex-col items-center text-center">

          {/* Icon block */}
          <div className="relative mb-8">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-[22px] blur-xl opacity-60 transition-all duration-700"
              style={{ background: slide.glow }}/>
            {/* Glass card */}
            <div className="relative w-[72px] h-[72px] rounded-[22px] flex items-center justify-center transition-all duration-500"
              style={{
                background: `linear-gradient(135deg, ${slide.color}22, ${slide.color}0a)`,
                border: `1px solid ${slide.color}50`,
                boxShadow: `0 0 30px ${slide.glow}, inset 0 1px 0 ${slide.color}30`,
              }}>
              <SlideIcon size={28} color={slide.color}/>
            </div>
          </div>

          {/* Label pill */}
          <div className="mb-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.25em]"
            style={{
              background: `${slide.color}15`,
              border: `1px solid ${slide.color}30`,
              color: slide.color,
            }}>
            {slide.label}
          </div>

          {/* Title */}
          <h2 className="text-[28px] font-black leading-[1.15] tracking-[-0.5px] text-white mb-4"
            style={{ whiteSpace: "pre-line" }}>
            {slide.title}
          </h2>

          {/* Body */}
          <p className="text-[12px] leading-[1.75] text-white/45 mb-10 max-w-[300px]">
            {slide.body}
          </p>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlideIdx(i)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: i === slideIdx ? 20 : 6,
                  height: 6,
                  background: i === slideIdx ? slide.color : "rgba(255,255,255,0.12)",
                }}/>
            ))}
          </div>

          {/* CTA button */}
          <button onClick={() => isLast ? setPhase("wizard") : setSlideIdx(slideIdx + 1)}
            className="w-full flex items-center justify-center gap-2 py-[14px] rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${slide.color}25, ${slide.color}10)`,
              border: `1px solid ${slide.color}45`,
              color: slide.color,
              boxShadow: `0 4px 24px ${slide.glow}`,
            }}>
            {isLast ? "Get Started" : "Next"}
            <ChevronRight size={13}/>
          </button>
        </div>
      </div>
    )
  }

  // ── Wizard phase ──────────────────────────────────────────────────────────
  const STEPS = ["Broker Account", "Notifications", "All Set"]

  const handleAddAccount = async () => {
    if (!user || !brokerName || !accountNumber) return
    setAddingAccount(true)
    try {
      await addDoc(collection(db, "accounts"), {
        userId: user.uid,
        accountName: accountLabel || `${brokerName} ${accountNumber}`,
        broker: brokerName, accountId: accountNumber,
        color: "#16a34a", createdAt: new Date(),
      })
      setWizardStep(1)
    } catch (err) { console.error("add account:", err) }
    finally { setAddingAccount(false) }
  }

  const handleEnablePush = async () => {
    if (!user) return
    setPushState("working")
    const res = await enablePush(user.uid)
    setPushState(res)
    if (res === "granted") {
      setTimeout(() => {
        fetch("/api/push-test", { method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ userId: user.uid })
        }).catch(()=>{})
      }, 1500)
      setTimeout(() => setWizardStep(2), 1200)
    }
  }

  const ACCENT = "#16a34a"
  const GLOW   = "rgba(22,163,74,0.25)"

  return (
    <div className="fixed inset-0 z-[99998] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#08090c" }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 55% 40% at 50% 30%, ${GLOW}, transparent 70%)` }}/>
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}/>

      <div className="relative z-10 w-full max-w-[380px] px-5">

        {/* Glass card */}
        <div className="rounded-3xl p-6"
          style={{
            background: "linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            boxShadow: `0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)`,
          }}>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-black uppercase tracking-[0.25em]"
                style={{ color: ACCENT }}>
                {wizardStep < 2 ? `Step ${wizardStep + 1} of 2` : "Complete"}
              </p>
              <p className="text-[9px] text-white/25 font-mono">
                {STEPS[wizardStep]}
              </p>
            </div>
            {/* Bar */}
            <div className="h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-[3px] rounded-full transition-all duration-500"
                style={{
                  width: `${wizardStep === 0 ? 33 : wizardStep === 1 ? 66 : 100}%`,
                  background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}88)`,
                  boxShadow: `0 0 8px ${GLOW}`,
                }}/>
            </div>
            {/* Pills */}
            <div className="flex gap-2 mt-3">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all duration-300"
                  style={{
                    background: i <= wizardStep ? `${ACCENT}18` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${i <= wizardStep ? ACCENT + "40" : "rgba(255,255,255,0.06)"}`,
                    color: i <= wizardStep ? ACCENT : "rgba(255,255,255,0.2)",
                  }}>
                  {i < wizardStep && <CheckCircle2 size={8}/>} {s}
                </div>
              ))}
            </div>
          </div>

          {/* ── Step 0: Broker Account ── */}
          {wizardStep === 0 && (
            <div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ background:`${ACCENT}18`, border:`1px solid ${ACCENT}35` }}>
                <Wallet size={20} color={ACCENT}/>
              </div>
              <h2 className="text-[20px] font-black text-white mb-2 leading-tight">Add Your Trading Account</h2>
              <p className="text-[11px] text-white/40 leading-relaxed mb-5">
                Connect your broker account so your trades sync into the Lifetime Ledger and P&L calendar automatically.
              </p>
              <div className="space-y-3">
                {[
                  { label:"Broker Name", placeholder:"e.g. Exness, Fusion Markets…", value:brokerName, set:setBrokerName },
                  { label:"Account Number", placeholder:"Your MT5 account number", value:accountNumber, set:setAccountNumber },
                  { label:"Display Label (optional)", placeholder:"e.g. Exness Gold Live", value:accountLabel, set:setAccountLabel },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-1.5">{f.label}</p>
                    <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                      className="w-full px-4 py-3 rounded-xl text-[12px] text-white placeholder-white/20 outline-none transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxSizing: "border-box",
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = `${ACCENT}60`; e.currentTarget.style.background = `${ACCENT}08` }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)" }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2.5 mt-5">
                <button onClick={() => setWizardStep(1)}
                  className="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.25)" }}>
                  Skip
                </button>
                <button onClick={handleAddAccount}
                  disabled={addingAccount || !brokerName || !accountNumber}
                  className="flex-[2] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200"
                  style={{
                    background:`linear-gradient(135deg,${ACCENT}25,${ACCENT}10)`,
                    border:`1px solid ${ACCENT}45`,
                    color: ACCENT,
                    opacity: (!brokerName || !accountNumber) ? 0.4 : 1,
                    boxShadow: (!brokerName || !accountNumber) ? "none" : `0 4px 16px ${GLOW}`,
                  }}>
                  <Wallet size={12}/> {addingAccount ? "Adding…" : "Add Account"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1: Notifications ── */}
          {wizardStep === 1 && (
            <div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ background:"rgba(236,72,153,0.15)", border:"1px solid rgba(236,72,153,0.3)" }}>
                <Bell size={20} color="#ec4899"/>
              </div>
              <h2 className="text-[20px] font-black text-white mb-2 leading-tight">Enable Trade Alerts</h2>
              <p className="text-[11px] text-white/40 leading-relaxed mb-5">
                Get notified the moment a Phoenix bot opens or closes a trade — directly on your lockscreen and status bar, even when the app is closed.
              </p>
              <div className="p-4 rounded-2xl mb-4"
                style={{ background:"rgba(236,72,153,0.07)", border:"1px solid rgba(236,72,153,0.18)" }}>
                <div className="flex items-center gap-3">
                  <Bell size={18} color="#ec4899"/>
                  <div>
                    <p className="text-[11px] font-black text-white">Native Push Notifications</p>
                    <p className="text-[10px] text-white/35 mt-0.5">Bot opened · Bot closed · Signal updates</p>
                  </div>
                </div>
              </div>
              {pushState === "granted" ? (
                <div className="p-3 rounded-2xl flex items-center gap-2 mb-3"
                  style={{ background:`${ACCENT}15`, border:`1px solid ${ACCENT}35` }}>
                  <CheckCircle2 size={14} color={ACCENT}/>
                  <p className="text-[11px] font-black" style={{ color:ACCENT }}>Enabled — test alert sent!</p>
                </div>
              ) : (
                <button onClick={handleEnablePush} disabled={pushState === "working"}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-200 mb-3"
                  style={{
                    background:"rgba(236,72,153,0.12)",
                    border:"1px solid rgba(236,72,153,0.3)",
                    color:"#ec4899",
                    opacity: pushState === "working" ? 0.6 : 1,
                    boxShadow: pushState === "working" ? "none" : "0 4px 20px rgba(236,72,153,0.2)",
                  }}>
                  <Bell size={13}/> {pushState === "working" ? "Enabling…" : "Enable Notifications"}
                </button>
              )}
              {(pushState === "denied" || pushState === "error" || pushState === "unsupported") && (
                <p className="text-[10px] text-red-400/70 text-center mb-3">
                  {pushState === "denied" ? "Permission denied — you can enable in Settings later."
                    : "Couldn't enable — you can set this up in Settings later."}
                </p>
              )}
              <button onClick={() => setWizardStep(2)}
                className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.25)" }}>
                {pushState === "granted" ? "Continue" : "Skip for now"}
              </button>
            </div>
          )}

          {/* ── Step 2: All set ── */}
          {wizardStep === 2 && (
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl blur-xl opacity-70"
                  style={{ background: GLOW }}/>
                <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background:`linear-gradient(135deg,${ACCENT}28,${ACCENT}0a)`,
                    border:`1px solid ${ACCENT}50`,
                    boxShadow:`0 0 24px ${GLOW}, inset 0 1px 0 ${ACCENT}30`,
                  }}>
                  <CheckCircle2 size={28} color={ACCENT}/>
                </div>
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] mb-3" style={{ color:ACCENT }}>Ready</p>
              <h2 className="text-[22px] font-black text-white mb-3 leading-tight">Phoenix is Live</h2>
              <p className="text-[11px] text-white/40 leading-relaxed mb-8 max-w-[280px] mx-auto">
                Your ecosystem is set up. Head to the dashboard to start tracking your trades, monitoring the bots, and accessing AI insights.
              </p>
              <button onClick={markComplete} disabled={saving}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background:`linear-gradient(135deg,${ACCENT}28,${ACCENT}10)`,
                  border:`1px solid ${ACCENT}50`,
                  color: ACCENT,
                  boxShadow:`0 6px 28px ${GLOW}`,
                  opacity: saving ? 0.6 : 1,
                }}>
                <ArrowRight size={13}/> {saving ? "Loading…" : "Go to Dashboard"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useOnboarding() {
  const { user } = useAuth()
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!user) { setChecked(false); setNeedsOnboarding(false); return }
    getDoc(doc(db, "users", user.uid)).then(snap => {
      const done = snap.exists() && snap.data()?.onboardingComplete === true
      setNeedsOnboarding(!done)
      setChecked(true)
    }).catch(() => { setNeedsOnboarding(false); setChecked(true) })
  }, [user])

  const replayOnboarding = useCallback(() => setNeedsOnboarding(true),  [])
  const markComplete     = useCallback(() => setNeedsOnboarding(false), [])

  return { needsOnboarding, checked, replayOnboarding, markComplete }
}
