"use client"

// ─────────────────────────────────────────────────────────────────────────
// PHOENIX — PUSH SUBSCRIBE (web + native FCM unified)
//
// Native (Capacitor app): uses @capacitor/push-notifications to get an FCM
// token, saves it to Firestore pushSubscriptions/{token_hash}. True native
// push — works on lockscreen, status bar, when app is fully closed.
//
// Web (browser): falls back to the original web push API (VAPID) which works
// in full Chrome/Firefox but NOT in the Capacitor WebView.
// ─────────────────────────────────────────────────────────────────────────
import { db } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""

export type PushState = "unsupported" | "denied" | "granted" | "default" | "error"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

async function hashKey(val: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(val))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32)
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window
}

// ── NATIVE FCM path ───────────────────────────────────────────────────────
async function enableNativePush(userId: string): Promise<PushState> {
  const { PushNotifications } = await import("@capacitor/push-notifications")

  // Check permission
  let perm = await PushNotifications.checkPermissions()
  if (perm.receive === "prompt") {
    perm = await PushNotifications.requestPermissions()
  }
  if (perm.receive !== "granted") return "denied"

  // Register with FCM — gets a token via callback.
  return new Promise<PushState>((resolve) => {
    let resolved = false
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; resolve("error") }
    }, 15000)

    PushNotifications.addListener("registration", async (token) => {
      if (resolved) return
      resolved = true; clearTimeout(timeout)
      try {
        const id = await hashKey(token.value)
        await setDoc(doc(db, "pushSubscriptions", id), {
          userId,
          fcmToken: token.value,
          type: "fcm",
          createdAt: new Date(),
          platform: "android",
        })
        resolve("granted")
      } catch (err) {
        console.error("FCM token save failed:", err)
        resolve("error")
      }
    })

    PushNotifications.addListener("registrationError", (err) => {
      if (resolved) return
      resolved = true; clearTimeout(timeout)
      console.error("FCM registration error:", err)
      resolve("error")
    })

    PushNotifications.register()
  })
}

// ── WEB PUSH path (browser only — NOT for the Capacitor WebView) ──────────
async function enableWebPush(userId: string): Promise<PushState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported"
  if (!VAPID_PUBLIC_KEY) return "error"
  const permission = await Notification.requestPermission()
  if (permission !== "granted") return permission as PushState
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  const json = sub.toJSON()
  const id = await hashKey(sub.endpoint)
  await setDoc(doc(db, "pushSubscriptions", id), {
    userId, endpoint: sub.endpoint, keys: json.keys ?? {},
    type: "web", createdAt: new Date(),
    userAgent: navigator.userAgent.slice(0, 200),
  })
  return "granted"
}

// ── Unified entry point ────────────────────────────────────────────────────
export async function enablePush(userId: string): Promise<PushState> {
  try {
    const { Capacitor } = await import("@capacitor/core")
    if (Capacitor.isNativePlatform()) return await enableNativePush(userId)
  } catch { /* not native */ }
  return await enableWebPush(userId)
}

export function pushPermission(): PushState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return Notification.permission as PushState
}
