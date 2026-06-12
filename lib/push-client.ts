"use client"

// ─────────────────────────────────────────────────────────────────────────
// PHOENIX — WEB PUSH SUBSCRIBE HELPER
// Asks the user for notification permission, subscribes the device to web
// push using the VAPID public key, and saves the subscription to Firestore
// (pushSubscriptions/{endpointHash}) so the server can send to it later.
// ─────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""

// Convert the base64 VAPID key to the Uint8Array the push API expects.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Stable id for a subscription from its endpoint (so re-subscribing updates
// the same doc instead of creating duplicates).
async function endpointId(endpoint: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32)
}

export type PushState = "unsupported" | "denied" | "granted" | "default" | "error"

// Returns true if this browser can do web push at all.
export function pushSupported(): boolean {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window
}

// Ask permission + subscribe + save. Call from a button click.
export async function enablePush(userId: string): Promise<PushState> {
  if (!pushSupported()) return "unsupported"
  if (!VAPID_PUBLIC_KEY) { console.error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY"); return "error" }

  try {
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
    const id = await endpointId(sub.endpoint)
    await setDoc(doc(db, "pushSubscriptions", id), {
      userId,
      endpoint: sub.endpoint,
      keys: json.keys ?? {},
      createdAt: new Date(),
      userAgent: navigator.userAgent.slice(0, 200),
    })
    return "granted"
  } catch (err) {
    console.error("enablePush failed:", err)
    return "error"
  }
}

// Current permission state without prompting.
export function pushPermission(): PushState {
  if (!pushSupported()) return "unsupported"
  return Notification.permission as PushState
}
