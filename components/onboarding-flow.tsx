"use client"

// ─────────────────────────────────────────────────────────────────────────
// PHOENIX — Onboarding Flow
//
// Shown once after first login. Two phases:
//   Phase 1: Intro slides (swipeable, skip option) — "what is Phoenix"
//   Phase 2: Setup wizard (3 steps: broker account + notifications)
//
// Completion is saved to Firestore users/{uid} → onboardingComplete: true
// so it only shows once even across devices. Accessible anytime via Settings.
// ─────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { enablePush } from "@/lib/push-client"
import { collection, addDoc } from "firebase/firestore"
import {
  ChevronRight, X, Zap, BarChart3, Bell, Wallet,
  TrendingUp, Bot, CheckCircle2, ArrowRight
} from "lucide-react"

// ── Intro slide data ────────────────────────────────────────────────────
const SLIDES = [
  {
    icon: Zap,
    color: "#f59e0b",
    title: "Welcome to Phoenix",
    sub: "Your institutional-grade trading ecosystem",
    body: "Phoenix connects your bots, signals, and P&L into one unified system — built for serious gold traders who demand precision over luck.",
  },
  {
    icon: Bot,
    color: "#16a34a",
    title: "Automated Bot Fleet",
    sub: "24/4 algorithmic execution",
    body: "Your MT5 bots run around the clock on validated logic — session-gated exits, smart partial closes, and real-time webhook reporting to the dashboard.",
  },
  {
    icon: TrendingUp,
    color: "#3b82f6",
    title: "Signal Intelligence",
    sub: "73.4% win rate · +263 pts/trade",
    body: "Live gold signals are captured, parsed, and validated against real market data. Every entry and exit is measured — nothing is assumed.",
  },
  {
    icon: BarChart3,
    color: "#8b5cf6",
    title: "Full P&L Dashboard",
    sub: "Every trade. Every session. Every pattern.",
    body: "The trading calendar, lifetime ledger, and performance analytics give you complete visibility into what's working and what isn't.",
  },
  {
    icon: Bell,
    color: "#ec4899",
    title: "Live Trade Alerts",
    sub: "On your lockscreen, the moment it happens",
    body: "When a bot opens or closes a trade, you get a native push notification — so you're always in the loop, even when the app is closed.",
  },
]

// ── Types ───────────────────────────────────────────────────────────────
interface OnboardingFlowProps {
  onComplete: () => void
}

// ── Main component ──────────────────────────────────────────────────────
export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth()
  const [phase,       setPhase]       = useState<"slides" | "wizard">("slides")
  const [slideIdx,    setSlideIdx]    = useState(0)
  const [wizardStep,  setWizardStep]  = useState(0)   // 0 = broker, 1 = notifications, 2 = done
  const [saving,      setSaving]      = useState(false)
  const [pushState,   setPushState]   = useState<string>("")

  // Wizard step 0 — add broker account form state
  const [brokerName,    setBrokerName]    = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountLabel,  setAccountLabel]  = useState("")
  const [addingAccount, setAddingAccount] = useState(false)
  const [accountAdded,  setAccountAdded]  = useState(false)

  const markComplete = useCallback(async () => {
    if (!user || saving) return
    setSaving(true)
    try {
      await setDoc(doc(db, "users", user.uid), { onboardingComplete: true }, { merge: true })
    } catch (err) {
      console.warn("onboarding flag save failed:", err)
    } finally {
      setSaving(false)
      onComplete()
    }
  }, [user, saving, onComplete])

  // ── Slide phase ─────────────────────────────────────────────────────
  const slide = SLIDES[slideIdx]
  const SlideIcon = slide.icon
  const isLast = slideIdx === SLIDES.length - 1

  if (phase === "slides") {
    return (
      <div style={{
        position:"fixed", inset:0, zIndex:99998,
        background:"#08090c",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:24,
      }}>
        {/* Skip */}
        <button onClick={() => setPhase("wizard")} style={{
          position:"absolute", top:24, right:24,
          color:"#555", fontSize:11, fontWeight:900,
          textTransform:"uppercase", letterSpacing:2,
          background:"none", border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", gap:4,
        }}>
          Skip <X size={12}/>
        </button>

        {/* Slide content */}
        <div style={{ maxWidth:360, width:"100%", textAlign:"center" }}>
          {/* Icon */}
          <div style={{
            width:72, height:72, borderRadius:20, margin:"0 auto 28px",
            background:`${slide.color}18`,
            border:`1px solid ${slide.color}40`,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <SlideIcon size={30} color={slide.color}/>
          </div>

          {/* Text */}
          <p style={{ fontSize:10, color:slide.color, fontWeight:900, letterSpacing:3,
            textTransform:"uppercase", marginBottom:12 }}>{slide.sub}</p>
          <h2 style={{ fontSize:22, fontWeight:900, color:"#f0f0f0", marginBottom:14,
            letterSpacing:1 }}>{slide.title}</h2>
          <p style={{ fontSize:13, color:"#888", lineHeight:1.7, marginBottom:40 }}>{slide.body}</p>

          {/* Dots */}
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:32 }}>
            {SLIDES.map((_, i) => (
              <div key={i} onClick={() => setSlideIdx(i)} style={{
                width: i===slideIdx ? 20 : 6, height:6, borderRadius:3,
                background: i===slideIdx ? slide.color : "#333",
                cursor:"pointer", transition:"all .2s",
              }}/>
            ))}
          </div>

          {/* Button */}
          <button onClick={() => isLast ? setPhase("wizard") : setSlideIdx(slideIdx+1)} style={{
            width:"100%", padding:"14px 24px", borderRadius:12,
            background:`${slide.color}18`, border:`1px solid ${slide.color}40`,
            color:slide.color, fontSize:12, fontWeight:900,
            textTransform:"uppercase", letterSpacing:2, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          }}>
            {isLast ? "Get Started" : "Next"}
            <ChevronRight size={14}/>
          </button>
        </div>
      </div>
    )
  }

  // ── Wizard phase ─────────────────────────────────────────────────────
  const STEPS = ["Broker Account", "Notifications", "All Set"]

  const handleAddAccount = async () => {
    if (!user || !brokerName || !accountNumber) return
    setAddingAccount(true)
    try {
      await addDoc(collection(db, "accounts"), {
        userId:      user.uid,
        accountName: accountLabel || `${brokerName} ${accountNumber}`,
        broker:      brokerName,
        accountId:   accountNumber,
        color:       "#16a34a",
        createdAt:   new Date(),
      })
      setAccountAdded(true)
      setWizardStep(1)
    } catch (err) {
      console.error("add account failed:", err)
    } finally {
      setAddingAccount(false)
    }
  }

  const handleEnablePush = async () => {
    if (!user) return
    setPushState("working")
    const res = await enablePush(user.uid)
    setPushState(res)
    if (res === "granted") {
      // Fire test notification
      setTimeout(() => {
        fetch("/api/push-test", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ userId: user.uid }),
        }).catch(()=>{})
      }, 1500)
      setTimeout(() => setWizardStep(2), 1200)
    }
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:99998,
      background:"#08090c",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:24,
    }}>
      <div style={{ maxWidth:420, width:"100%" }}>
        {/* Step header */}
        <div style={{ marginBottom:32 }}>
          <p style={{ fontSize:10, color:"#16a34a", fontWeight:900, letterSpacing:3,
            textTransform:"uppercase", marginBottom:8 }}>
            Setup {wizardStep < 2 ? `${wizardStep+1} of 2` : "Complete"}
          </p>
          {/* Progress bar */}
          <div style={{ height:3, background:"#1a1a1a", borderRadius:2 }}>
            <div style={{ height:3, background:"#16a34a", borderRadius:2,
              width:`${wizardStep === 0 ? 33 : wizardStep === 1 ? 66 : 100}%`,
              transition:"width .4s" }}/>
          </div>
          {/* Step pills */}
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            {STEPS.map((s,i) => (
              <div key={i} style={{
                fontSize:9, fontWeight:900, textTransform:"uppercase", letterSpacing:1.5,
                padding:"4px 10px", borderRadius:20,
                background: i<=wizardStep ? "#16a34a18" : "#111",
                border:`1px solid ${i<=wizardStep ? "#16a34a44" : "#222"}`,
                color: i<=wizardStep ? "#16a34a" : "#444",
                display:"flex", alignItems:"center", gap:4,
              }}>
                {i < wizardStep && <CheckCircle2 size={9}/>}
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* ── Step 0: Broker Account ── */}
        {wizardStep === 0 && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:900, color:"#f0f0f0", marginBottom:8 }}>
              Add Your Trading Account
            </h2>
            <p style={{ fontSize:12, color:"#666", lineHeight:1.7, marginBottom:24 }}>
              Connect your broker account so trades can be tracked in the P&L calendar and ledger.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { label:"Broker Name", placeholder:"e.g. Exness, Fusion Markets…",
                  value:brokerName, set:setBrokerName },
                { label:"Account Number", placeholder:"Your MT5 account number",
                  value:accountNumber, set:setAccountNumber },
                { label:"Display Label (optional)", placeholder:"e.g. Exness Gold Live",
                  value:accountLabel, set:setAccountLabel },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ fontSize:10, color:"#888", fontWeight:700,
                    textTransform:"uppercase", letterSpacing:1.5, marginBottom:6 }}>{f.label}</p>
                  <input value={f.value} onChange={e=>f.set(e.target.value)}
                    placeholder={f.placeholder}
                    style={{
                      width:"100%", padding:"10px 14px", borderRadius:10,
                      background:"#111", border:"1px solid #222", color:"#f0f0f0",
                      fontSize:13, outline:"none", boxSizing:"border-box",
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, marginTop:24 }}>
              <button onClick={() => setWizardStep(1)} style={{
                flex:1, padding:"12px 20px", borderRadius:10,
                background:"#111", border:"1px solid #222",
                color:"#555", fontSize:11, fontWeight:900,
                textTransform:"uppercase", letterSpacing:1.5, cursor:"pointer",
              }}>Skip for now</button>
              <button onClick={handleAddAccount}
                disabled={addingAccount || !brokerName || !accountNumber}
                style={{
                  flex:2, padding:"12px 20px", borderRadius:10,
                  background:"#16a34a18", border:"1px solid #16a34a44",
                  color:"#16a34a", fontSize:11, fontWeight:900,
                  textTransform:"uppercase", letterSpacing:1.5, cursor:"pointer",
                  opacity: (!brokerName || !accountNumber) ? 0.4 : 1,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                }}>
                {addingAccount ? "Adding…" : <><Wallet size={13}/> Add Account</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Notifications ── */}
        {wizardStep === 1 && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:900, color:"#f0f0f0", marginBottom:8 }}>
              Enable Trade Alerts
            </h2>
            <p style={{ fontSize:12, color:"#666", lineHeight:1.7, marginBottom:24 }}>
              Get notified the moment a bot opens or closes a trade — even when the app is closed. Alerts show on your lockscreen and status bar.
            </p>
            <div style={{
              padding:"16px 20px", borderRadius:12,
              background:"#ec4899" + "0d", border:"1px solid #ec489930",
              display:"flex", alignItems:"center", gap:14, marginBottom:24,
            }}>
              <Bell size={22} color="#ec4899"/>
              <div>
                <p style={{ fontSize:12, fontWeight:900, color:"#f0f0f0", marginBottom:2 }}>Native Push Notifications</p>
                <p style={{ fontSize:11, color:"#888" }}>Bot opened · Bot closed · Signal updates</p>
              </div>
            </div>
            {pushState === "granted" ? (
              <div style={{
                padding:"14px 20px", borderRadius:10,
                background:"#16a34a18", border:"1px solid #16a34a44",
                display:"flex", alignItems:"center", gap:10, color:"#16a34a",
                fontSize:12, fontWeight:900,
              }}>
                <CheckCircle2 size={16}/> Notifications enabled — test alert sent!
              </div>
            ) : (
              <button onClick={handleEnablePush} disabled={pushState==="working"} style={{
                width:"100%", padding:"14px 20px", borderRadius:12,
                background:"#ec489918", border:"1px solid #ec489940",
                color:"#ec4899", fontSize:12, fontWeight:900,
                textTransform:"uppercase", letterSpacing:2, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                opacity: pushState==="working" ? 0.6 : 1,
              }}>
                <Bell size={14}/> {pushState==="working" ? "Enabling…" : "Enable Notifications"}
              </button>
            )}
            {(pushState === "denied" || pushState === "error" || pushState === "unsupported") && (
              <p style={{ fontSize:11, color:"#f87171", marginTop:10, textAlign:"center" }}>
                {pushState==="denied" ? "Permission denied — you can enable in Settings later."
                  : "Couldn't enable — you can set this up in Settings later."}
              </p>
            )}
            <button onClick={() => setWizardStep(2)} style={{
              width:"100%", marginTop:12, padding:"12px 20px", borderRadius:10,
              background:"#111", border:"1px solid #222",
              color:"#555", fontSize:11, fontWeight:900,
              textTransform:"uppercase", letterSpacing:1.5, cursor:"pointer",
            }}>
              {pushState==="granted" ? "Continue" : "Skip for now"}
            </button>
          </div>
        )}

        {/* ── Step 2: All set ── */}
        {wizardStep === 2 && (
          <div style={{ textAlign:"center" }}>
            <div style={{
              width:72, height:72, borderRadius:20, margin:"0 auto 24px",
              background:"#16a34a18", border:"1px solid #16a34a44",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <CheckCircle2 size={32} color="#16a34a"/>
            </div>
            <h2 style={{ fontSize:22, fontWeight:900, color:"#f0f0f0", marginBottom:10 }}>
              Phoenix is Ready
            </h2>
            <p style={{ fontSize:13, color:"#666", lineHeight:1.7, marginBottom:32 }}>
              Your ecosystem is set up. Head to the dashboard to start tracking trades, monitoring bots, and reviewing signals.
            </p>
            <button onClick={markComplete} disabled={saving} style={{
              width:"100%", padding:"14px 24px", borderRadius:12,
              background:"#16a34a18", border:"1px solid #16a34a44",
              color:"#16a34a", fontSize:12, fontWeight:900,
              textTransform:"uppercase", letterSpacing:2, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              opacity: saving ? 0.6 : 1,
            }}>
              <ArrowRight size={14}/> {saving ? "Loading…" : "Go to Dashboard"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Hook: tracks onboarding state ────────────────────────────────────────
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

  const replayOnboarding = useCallback(() => setNeedsOnboarding(true), [])
  const markComplete     = useCallback(() => setNeedsOnboarding(false), [])

  return { needsOnboarding, checked, replayOnboarding, markComplete }
}
