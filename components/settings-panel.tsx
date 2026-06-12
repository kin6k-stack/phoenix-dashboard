"use client"

import { useEffect, useState } from "react"
import { signOut, deleteUser } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { collection, getDocs, writeBatch, doc, deleteDoc, query, where } from "firebase/firestore"
import { useRouter } from "next/navigation"
import {
  X, ChevronRight, ArrowLeft, Palette, Maximize2,
  Zap, LogOut, AlertTriangle, Cpu, Globe, ShieldCheck, Trash2, Bell, Volume2,
} from "lucide-react"
import { useTheme, type Theme, type Density } from "@/lib/use-theme"
import { MT5ConnectSection } from "@/components/mt5-connect-section"
import { useAuth } from "@/lib/auth-context"
import { useNotifications } from "@/lib/use-notifications"

interface SettingsPanelProps { open: boolean; onClose: () => void; isOwner?: boolean; onReplayOnboarding?: () => void }

// ── Theme catalogue ───────────────────────────────────────────────────────────
const THEMES: { id:Theme; label:string; description:string; bg:string; accent:string; border:string; glow:string }[] = [
  { id:"black-white", label:"Monochrome",  description:"True black/white — invertible", bg:"#000", accent:"#e5e5e5", border:"#1c1c1c", glow:"rgba(229,229,229,0.4)" },
  { id:"dark",        label:"Green Lab",   description:"Slate + emerald — OG Phoenix",  bg:"#1a1d23", accent:"#16a34a", border:"#2a2e36", glow:"rgba(22,163,74,0.45)" },
  { id:"midnight",    label:"Midnight",    description:"Deep navy + electric blue",      bg:"#0c1018", accent:"#3b82f6", border:"#1a2030", glow:"rgba(59,130,246,0.45)" },
  { id:"violet",      label:"LVNAR",       description:"Purple gradient",               bg:"#0f0a18", accent:"#c084fc", border:"#241a36", glow:"rgba(192,132,252,0.45)" },
  { id:"gold",        label:"Gold",        description:"Warm canvas + amber accents",   bg:"#f5f3ee", accent:"#f59e0b", border:"#e8e2d4", glow:"rgba(245,158,11,0.45)" },
  { id:"bloomberg",   label:"Bloomberg",   description:"Terminal orange · sharp corners",bg:"#0a0a0d", accent:"#ff6b00", border:"#1a1510", glow:"rgba(255,107,0,0.5)" },
  { id:"nord",        label:"Nord",        description:"Arctic slate + frost blue",      bg:"#2e3440", accent:"#88c0d0", border:"#3b4252", glow:"rgba(136,192,208,0.45)" },
  { id:"cyber",       label:"Cyber",       description:"Neon magenta + cyberpunk",       bg:"#08000f", accent:"#ff00cc", border:"#1a0030", glow:"rgba(255,0,204,0.5)" },
]

const DENSITIES: { id:Density; label:string }[] = [
  { id:"compact",  label:"Compact"  },
  { id:"default",  label:"Default"  },
  { id:"expanded", label:"Expanded" },
]

const SECTIONS = [
  { id:"appearance",   label:"Appearance",   icon:Palette,    description:"Theme, layout density, animations" },
  { id:"notifications",label:"Notifications",icon:Bell,       description:"Sounds and browser alerts"          },
  { id:"account",      label:"Account",      icon:Cpu,        description:"MT5 connection & sync settings"    },
  { id:"region",     label:"Region",     icon:Globe,      description:"Timezone & session calibration"    },
  { id:"security",   label:"Security",   icon:ShieldCheck,description:"Sign out & account management"     },
]

// ── Theme card ────────────────────────────────────────────────────────────────
function ThemeCard({ t, active, onClick }: { t:typeof THEMES[0]; active:boolean; onClick:()=>void }) {
  const isLight = t.id === "gold"
  return (
    <button onClick={onClick}
      className="relative w-full text-left rounded-xl overflow-hidden transition-all duration-200"
      style={{ border:`2px solid ${active ? t.accent : t.border}`, boxShadow:active ? `0 0 16px ${t.glow}` : "none" }}>
      <div className="h-14 relative" style={{ background:t.bg }}>
        <div className="absolute inset-0" style={{ background:`radial-gradient(ellipse at 80% 40%,${t.accent}30 0%,transparent 65%)` }} />
        <div className="absolute bottom-1.5 left-2.5 flex items-end gap-0.5">
          {[40,70,35,90,55,70,40].map((h,i) => (
            <div key={i} className="w-1 rounded-sm" style={{ height:`${h*0.16}px`, background:i===3?t.accent:(isLight?"#00000020":"#ffffff14"), boxShadow:i===3?`0 0 4px ${t.accent}`:"none" }} />
          ))}
        </div>
        {active && (
          <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background:t.accent }}>
            <div className="w-1.5 h-1 border-l-[2px] border-b-[2px] rotate-[-45deg] mt-px" style={{ borderColor:t.bg }} />
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background:t.accent, boxShadow:`0 0 5px ${t.glow}` }} />
      </div>
      <div className="px-2.5 py-1.5" style={{ background:t.id==="gold"?"#ede9e0":"#0a0a0f" }}>
        <p className="text-[10px] font-black uppercase tracking-wide" style={{ color:active?t.accent:(isLight?"#333":"#aaa") }}>{t.label}</p>
        <p className="text-[8px] mt-0.5 truncate" style={{ color:isLight?"#888":"#555" }}>{t.description}</p>
      </div>
    </button>
  )
}

// ── Notifications section component ──────────────────────────────────────────
function NotificationsSection({
  soundEnabled, browserEnabled, permission,
  toggleSounds, toggleBrowser, requestBrowserPermission, testSound, userId
}: {
  soundEnabled: boolean; browserEnabled: boolean
  permission: NotificationPermission
  toggleSounds: (v: boolean) => void; toggleBrowser: (v: boolean) => void
  requestBrowserPermission: () => Promise<NotificationPermission>
  testSound: () => void
  userId?: string
}) {
  const [pushState, setPushState] = useState<string>("")

  // Enable both: local browser permission AND server web-push subscription.
  // The web-push subscription is what lets the bot notify this device even
  // when the dashboard is fully closed (via the service worker).
  const enableAll = async () => {
    setPushState("working")
    try {
      await requestBrowserPermission()
      if (userId) {
        const { enablePush } = await import("@/lib/push-client")
        const res = await enablePush(userId)
        setPushState(res)
        // On success, fire the confirmation push so they get instant proof.
        // Small delay so the subscription write is readable by the send route.
        if (res === "granted") {
          setTimeout(() => {
            fetch("/api/push-test", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId }),
            }).catch(() => {})
          }, 1500)
        }
      } else {
        setPushState("granted")
      }
    } catch {
      setPushState("error")
    }
  }

  const SOUND_GROUPS = [
    {
      label: "Trade Outcomes",
      sounds: [
        { id:"win",       label:"Win",        desc:"3-note ascending chord"          },
        { id:"big_win",   label:"Big Win",     desc:"4-note fanfare for large wins"   },
        { id:"loss",      label:"Loss",        desc:"Soft descending 2-tone"          },
        { id:"breakeven", label:"Breakeven",   desc:"Short neutral blip"              },
      ]
    },
    {
      label: "Signals & Alerts",
      sounds: [
        { id:"signal",       label:"Signal",        desc:"Single clean ping"              },
        { id:"alert",        label:"Alert",          desc:"Double-ping — urgent attention" },
      ]
    },
    {
      label: "Sessions & Milestones",
      sounds: [
        { id:"session_open", label:"Session Open",   desc:"Rising arpeggio — market live"  },
        { id:"milestone",    label:"Milestone",      desc:"Triumphant 4-note"              },
        { id:"streak",       label:"Streak",         desc:"Rolling arpeggios — win streak" },
        { id:"new_day",      label:"New Day",         desc:"Morning chime"                  },
      ]
    },
    {
      label: "System",
      sounds: [
        { id:"error",        label:"Error",           desc:"Low buzz for system alerts"     },
      ]
    },
  ]

  const playSound = (id: string) => {
    import("@/lib/use-notifications").then(m => m.playNotifSound(id as any))
  }

  return (
    <div className="p-4 space-y-4">
      {/* Master sound toggle */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 size={14} className="text-primary flex-shrink-0"/>
            <div>
              <p className="text-xs font-bold text-foreground">Trade Sounds</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">11 sounds — click any to preview</p>
            </div>
          </div>
          <button onClick={() => toggleSounds(!soundEnabled)}
            className="relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
            style={{ background: soundEnabled ? "hsl(var(--primary))" : "hsl(var(--muted))" }}>
            <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: soundEnabled ? "calc(100% - 22px)" : "2px" }}/>
          </button>
        </div>

        {/* Sound library — grouped */}
        {soundEnabled && (
          <div className="space-y-3">
            {SOUND_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">{group.label}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.sounds.map(s => (
                    <button key={s.id} onClick={() => playSound(s.id)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-background/40 border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group">
                      <Volume2 size={10} className="text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0"/>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-foreground truncate">{s.label}</p>
                        <p className="text-[8px] text-muted-foreground/50 truncate">{s.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Browser notifications */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Browser Notifications</p>
        {permission === "denied" ? (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-[11px] text-destructive">
            Blocked in browser settings. Go to browser Settings → Site Permissions → Notifications to re-enable.
          </div>
        ) : permission === "granted" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={14} className="text-primary flex-shrink-0"/>
                <div>
                  <p className="text-xs font-bold text-foreground">Push Alerts</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Win / Loss / signal on every trade</p>
                </div>
              </div>
              <button onClick={() => toggleBrowser(!browserEnabled)}
                className="relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
                style={{ background: browserEnabled ? "hsl(var(--primary))" : "hsl(var(--muted))" }}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                  style={{ left: browserEnabled ? "calc(100% - 22px)" : "2px" }}/>
              </button>
            </div>
            {/* Permission is granted, but the device still needs a web-push
                SUBSCRIPTION saved server-side to actually receive pushes.
                This button registers/refreshes it and sends a test. */}
            <button onClick={enableAll} disabled={pushState === "working"}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50">
              <Bell size={12}/> {pushState === "working" ? "Registering…" : "Register This Device & Send Test"}
            </button>
            {pushState === "granted" && (
              <p className="text-[10px] text-emerald-400">✓ Device registered — test notification sent.</p>
            )}
            {pushState === "error" && (
              <p className="text-[10px] text-rose-400">Registration failed — see console. Check VAPID key on Vercel.</p>
            )}
            {pushState === "unsupported" && (
              <p className="text-[10px] text-amber-400">This browser doesn't support push.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">Get a notification for every bot trade — even when the dashboard is closed. Works on this device via the service worker.</p>
            <button onClick={enableAll} disabled={pushState === "working"}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[11px] font-black bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50">
              <Bell size={13}/> {pushState === "working" ? "Enabling…" : "Enable Notifications"}
            </button>
            {pushState === "granted" && (
              <p className="text-[10px] text-emerald-400">✓ Enabled — you'll get push alerts on bot trades.</p>
            )}
            {pushState === "unsupported" && (
              <p className="text-[10px] text-amber-400">This browser doesn't support push. On iPhone, add the app to your home screen first.</p>
            )}
            {pushState === "error" && (
              <p className="text-[10px] text-rose-400">Couldn't enable push. Check the VAPID key is set, then retry.</p>
            )}
            {pushState === "denied" && (
              <p className="text-[10px] text-rose-400">Permission denied — re-enable in browser site settings.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Timezone options ─────────────────────────────────────────────────────────
const TIMEZONES = [
  { label: "Antigua / Eastern (UTC-4)",    value: "America/Antigua"     },
  { label: "New York / EST (UTC-5/-4)",    value: "America/New_York"    },
  { label: "Chicago / CST (UTC-6/-5)",     value: "America/Chicago"     },
  { label: "London / GMT (UTC+0/+1)",      value: "Europe/London"       },
  { label: "Frankfurt / CET (UTC+1/+2)",   value: "Europe/Berlin"       },
  { label: "Dubai / GST (UTC+4)",          value: "Asia/Dubai"          },
  { label: "Singapore / SGT (UTC+8)",      value: "Asia/Singapore"      },
  { label: "Tokyo / JST (UTC+9)",          value: "Asia/Tokyo"          },
  { label: "Sydney / AEST (UTC+10/+11)",   value: "Australia/Sydney"    },
  { label: "UTC",                          value: "UTC"                  },
]

function RegionSection() {
  const TZ_KEY = "phoenix_timezone"
  const [tz, setTz] = useState(() => {
    if (typeof window === "undefined") return Intl.DateTimeFormat().resolvedOptions().timeZone
    return localStorage.getItem(TZ_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone
  })

  const saveTz = (val: string) => {
    setTz(val)
    localStorage.setItem(TZ_KEY, val)
    window.dispatchEvent(new CustomEvent("phoenix-timezone-changed", { detail: val }))
  }

  const now = new Date()
  const localTime = now.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", timeZone: tz, hour12: true })

  return (
    <div className="p-4 space-y-4">
      {/* Timezone picker */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Timezone</p>
        <div className="rounded-xl border border-border/40 bg-card/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Local time now</p>
            <p className="text-xs font-black font-mono text-primary">{localTime}</p>
          </div>
          <select value={tz} onChange={e => saveTz(e.target.value)}
            className="w-full bg-background/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors appearance-none"
            style={{ colorScheme: "dark" }}>
            {TIMEZONES.map(t => (
              <option key={t.value} value={t.value} style={{ background: "hsl(var(--card))" }}>
                {t.label}
              </option>
            ))}
            {!TIMEZONES.find(t => t.value === tz) && (
              <option value={tz}>{tz} (detected)</option>
            )}
          </select>
          <p className="text-[9px] text-muted-foreground/60">
            Used for session clocks in the sidebar and any time-based displays.
          </p>
        </div>
      </div>

      {/* Session reference */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Session Windows (UTC)</p>
        {[
          { name:"Asia (Sydney+Tokyo)",  open:"22:00", close:"08:00", label:"TYO", color:"text-sky-400"    },
          { name:"London",               open:"07:00", close:"16:00", label:"LDN", color:"text-emerald-400" },
          { name:"New York",             open:"12:00", close:"21:00", label:"NYC", color:"text-amber-400"   },
          { name:"LDN+NYC Overlap ★",    open:"12:00", close:"16:00", label:"KEY", color:"text-primary"     },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-0">
            <span className={`text-[10px] font-black w-8 ${s.color}`}>{s.label}</span>
            <span className="text-[10px] text-foreground flex-1">{s.name}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{s.open}–{s.close}</span>
          </div>
        ))}
        <p className="text-[9px] text-muted-foreground/50 pt-1">★ Highest liquidity for XAU/USD and NQ</p>
      </div>
    </div>
  )
}

// ── Account section component ────────────────────────────────────────────────
// MT5ConnectSection is the single method for syncing trades.
// It uses a secure one-time token (48hr expiry) via /api/generate-token —
// far more secure than a hardcoded shared API key.
function AccountSection({ isOwner, userId }: { isOwner: boolean; userId?: string }) {
  const [copied, setCopied] = useState(false)

  const copyUid = () => {
    if (!userId) return
    navigator.clipboard.writeText(userId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-4 space-y-4">

      {/* User ID — useful for support or identifying their account */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-3 space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Your User ID</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[10px] font-mono text-primary bg-background/60 px-2 py-1 rounded truncate">
            {userId ?? "—"}
          </code>
          <button onClick={copyUid}
            className="text-[10px] font-black px-2 py-1 rounded bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-colors flex-shrink-0">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground/50">Reference ID for your Phoenix account.</p>
      </div>

      {/* The single, secure MT5 sync flow */}
      <MT5ConnectSection />

      {/* Owner-only: bot magic numbers */}
      {isOwner && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary">Bot Magic Numbers</p>
          <p className="text-[10px] text-primary/80 font-mono">NQ v2.1 · 88801 &nbsp;|&nbsp; Apex v5.1 · 88802 &nbsp;|&nbsp; Hybrid v12.1 · 88803</p>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function SettingsPanel({ open, onClose, isOwner = false, onReplayOnboarding }: SettingsPanelProps) {
  const { theme, density, animations, invert, setTheme, setDensity, setAnimations, setInvert } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string|null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const {
    soundEnabled, browserEnabled, permission,
    toggleSounds, toggleBrowser, requestBrowserPermission,
  } = useNotifications()
  // lazily import playNotifSound to avoid SSR issues
  const testSound = () => import("@/lib/use-notifications").then(m => m.playNotifSound("win"))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (activeSection) setActiveSection(null); else onClose() }
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
    try { await signOut(auth); router.push("/login") } catch(e) { console.error(e) }
  }

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirm !== "DELETE") return
    setDeleting(true)
    try {
      // Delete all user data from Firestore
      const accountsSnap = await getDocs(query(collection(db, "accounts"), where("userId","==",user.uid)))
      for (const accDoc of accountsSnap.docs) {
        const tradesSnap = await getDocs(collection(db, "accounts", accDoc.id, "trades"))
        const batch = writeBatch(db)
        tradesSnap.docs.forEach(d => batch.delete(d.ref))
        batch.delete(accDoc.ref)
        await batch.commit()
      }
      // Delete Firebase Auth user
      await deleteUser(user)
      router.push("/login")
    } catch(e: any) {
      if (e.code === "auth/requires-recent-login") {
        alert("For security, please sign out and sign back in before deleting your account.")
      } else {
        console.error(e)
        alert("Delete failed — try again or contact support.")
      }
      setDeleting(false)
    }
  }

  const currentMeta = THEMES.find(t => t.id === theme) ?? THEMES[0]

  const renderContent = () => {
    switch(activeSection) {

      // ── Appearance — theme + layout grouped ──────────────────────────────
      case "appearance":
        return (
          <div className="p-4 space-y-6">
            {/* Theme picker */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Color Theme</p>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map(t => (
                  <ThemeCard key={t.id} t={t} active={theme===t.id} onClick={()=>setTheme(t.id)} />
                ))}
              </div>
            </div>

            {/* Canvas toggle — only for black-white */}
            {theme === "black-white" && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Canvas</p>
                <div className="flex gap-2">
                  {[{val:false,label:"Black",bg:"#000"},{val:true,label:"White",bg:"#fff"}].map(opt => (
                    <button key={String(opt.val)} onClick={()=>setInvert(opt.val)}
                      className="flex-1 rounded-lg border py-2 text-xs font-bold transition-all flex items-center justify-center gap-2"
                      style={{ borderColor:invert===opt.val?"hsl(var(--primary))":"hsl(var(--border))", background:invert===opt.val?"hsl(var(--primary)/0.08)":"transparent", color:invert===opt.val?"hsl(var(--primary))":"hsl(var(--muted-foreground))" }}>
                      <div className="w-3 h-3 rounded-sm border border-current" style={{background:opt.bg}} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Density + Animations grouped under "Layout" */}
            <div className="space-y-4 rounded-xl border border-border/40 bg-card/40 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Layout</p>

              <div className="space-y-2">
                <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                  <Maximize2 size={10} /> Density
                </p>
                <div className="flex gap-1.5">
                  {DENSITIES.map(d => (
                    <button key={d.id} onClick={()=>setDensity(d.id)}
                      className="flex-1 rounded-lg border py-2 text-[10px] font-black uppercase tracking-wider transition-all"
                      style={{ borderColor:density===d.id?"hsl(var(--primary))":"hsl(var(--border))", background:density===d.id?"hsl(var(--primary)/0.08)":"transparent", color:density===d.id?"hsl(var(--primary))":"hsl(var(--muted-foreground))" }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={13} className="text-primary" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Animations</p>
                    <p className="text-[9px] text-muted-foreground">Transitions and micro-interactions</p>
                  </div>
                </div>
                <button onClick={()=>setAnimations(!animations)}
                  className="relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
                  style={{ background:animations?"hsl(var(--primary))":"hsl(var(--muted))" }}>
                  <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                    style={{ left:animations?"calc(100% - 22px)":"2px" }} />
                </button>
              </div>
            </div>
          </div>
        )

      // ── Notifications ─────────────────────────────────────────────────────
      case "notifications":
        return <NotificationsSection
          soundEnabled={soundEnabled} browserEnabled={browserEnabled}
          permission={permission} toggleSounds={toggleSounds}
          toggleBrowser={toggleBrowser} requestBrowserPermission={requestBrowserPermission}
          testSound={testSound} userId={user?.uid}
        />

      // ── Account / MT5 ─────────────────────────────────────────────────────
      case "account":
        return <AccountSection isOwner={isOwner} userId={user?.uid} />

      // ── Region / Sessions ─────────────────────────────────────────────────
      case "region":
        return <RegionSection />

      // ── Security ──────────────────────────────────────────────────────────
      case "security":
        return (
          <div className="p-4 space-y-4">
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3.5 text-sm font-bold text-foreground hover:border-primary/30 hover:bg-white/[0.04] transition-all group">
              <LogOut size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
              Sign Out
            </button>

            {/* Delete account */}
            <div className="rounded-xl border border-destructive/25 bg-destructive/[0.04] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-destructive" />
                <p className="text-[10px] font-black uppercase tracking-widest text-destructive">Delete Account</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Permanently deletes your Phoenix account, all registered trading accounts, and all synced trade history. This cannot be undone.
              </p>
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground">Type <strong className="text-destructive font-mono">DELETE</strong> to confirm:</p>
                <input value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-background/40 border border-destructive/30 rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground/30 focus:outline-none focus:border-destructive/60"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== "DELETE" || deleting}
                  className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-black text-white bg-destructive disabled:opacity-40 disabled:cursor-not-allowed hover:bg-destructive/90 transition-colors">
                  <Trash2 size={13} />
                  {deleting ? "Deleting…" : "Delete My Account Permanently"}
                </button>
              </div>
            </div>
          </div>
        )

      default: return null
    }
  }

  if (!open) return null

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" aria-hidden="true" />

      {/* Panel on the LEFT */}
      <aside role="dialog" aria-modal="true" aria-label="Settings"
        style={{ height:"100dvh" }}
        className="fixed top-0 left-0 w-full sm:w-[420px] bg-card border-r border-border z-50 flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0"
          style={{ background:"hsl(var(--background)/0.6)", backdropFilter:"blur(12px)" }}>
          <div className="flex items-center gap-2.5">
            {activeSection ? (
              <button onClick={()=>setActiveSection(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
                <ArrowLeft size={15} />
              </button>
            ) : (
              <Palette size={15} className="text-primary" />
            )}
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
              {activeSection ? SECTIONS.find(s=>s.id===activeSection)?.label : "Settings"}
            </h2>
            {activeSection && (
              <span className="text-[9px] text-muted-foreground hidden sm:inline">
                {SECTIONS.find(s=>s.id===activeSection)?.description}
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Cascade body */}
        <div className="flex-1 overflow-hidden relative">

          {/* Page 1 — section list (slides LEFT when section is active) */}
          <div className={`absolute inset-0 overflow-y-auto custom-scrollbar transition-transform duration-300 ease-in-out
            ${activeSection ? "-translate-x-full" : "translate-x-0"}`}>

            {/* Current theme badge */}
            <div className="px-4 pt-4 pb-2">
              <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex-shrink-0 relative overflow-hidden"
                  style={{ background:currentMeta.bg, border:`1px solid ${currentMeta.border}` }}>
                  <div className="absolute inset-0" style={{ background:`radial-gradient(ellipse at 80% 40%,${currentMeta.accent}40 0%,transparent 65%)` }} />
                  <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full"
                    style={{ background:currentMeta.accent, boxShadow:`0 0 4px ${currentMeta.glow}` }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">Active theme</p>
                  <p className="text-sm font-black text-foreground">{currentMeta.label}</p>
                </div>
                <button onClick={()=>setActiveSection("appearance")}
                  className="ml-auto text-[9px] font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity flex items-center gap-1">
                  Change <ChevronRight size={10} />
                </button>
              </div>
            </div>

            {/* Section rows */}
            <div className="px-4 pb-4 space-y-1.5 mt-2">
              {SECTIONS.map(s => {
                const Icon = s.icon
                return (
                  <button key={s.id} onClick={()=>setActiveSection(s.id)}
                    className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left hover:bg-white/[0.04] border border-transparent hover:border-primary/20 transition-all group">
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

            <div className="px-4 pb-4 border-t border-border pt-3 space-y-1.5">
              {/* Replay onboarding — always accessible */}
              {onReplayOnboarding && (
                <button onClick={() => { onClose(); setTimeout(onReplayOnboarding, 200) }}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 hover:bg-primary/[0.06] border border-transparent hover:border-primary/20 transition-all group text-left">
                  <div className="w-8 h-8 rounded-lg border border-border bg-background/40 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                    <Zap size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Replay Onboarding</p>
                    <p className="text-[10px] text-muted-foreground">Revisit the setup wizard anytime</p>
                  </div>
                </button>
              )}
              <button onClick={handleSignOut}
                className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 hover:bg-destructive/[0.06] border border-transparent hover:border-destructive/20 transition-all group text-left">
                <div className="w-8 h-8 rounded-lg border border-border bg-background/40 flex items-center justify-center group-hover:border-destructive/30 transition-colors">
                  <LogOut size={14} className="text-muted-foreground group-hover:text-destructive transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground group-hover:text-destructive transition-colors">Sign Out</p>
                  <p className="text-[10px] text-muted-foreground">End your session</p>
                </div>
              </button>
            </div>
          </div>

          {/* Page 2 — content (slides in from RIGHT when section is active) */}
          <div className={`absolute inset-0 overflow-y-auto custom-scrollbar transition-transform duration-300 ease-in-out
            ${activeSection ? "translate-x-0" : "translate-x-full"}`}>
            {renderContent()}
          </div>
        </div>
      </aside>
    </>
  )
}
