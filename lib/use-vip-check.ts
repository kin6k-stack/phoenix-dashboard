"use client"

import { useState } from "react"
import { signOut, deleteUser } from "firebase/auth"
import { auth } from "@/lib/firebase"

// ============================================================
// useVipCheck()
//
// Call this AFTER Firebase auth succeeds (signInWithEmail / Google).
// It hits /api/auth/check which:
//   • Returns { allowed: true }  if user is on allowedUsers list
//   • Adds them if under VIP cap (currently 15)
//   • Returns { allowed: false, reason: "VIP_LIST_FULL" } if at cap
//
// If blocked, the hook:
//   • Signs them out of Firebase (so they're not stuck logged in)
//   • Optionally deletes the just-created Firebase account (so they
//     can re-attempt later if a slot opens)
//   • Sets state so your login page can show a "VIP_LIST_FULL" screen
//
// Usage in your login form's submit handler:
//   const { checkAccess, blocked } = useVipCheck()
//   ...
//   await signInWithEmail(email, password)
//   const ok = await checkAccess()
//   if (ok) router.push("/")
//   // else: render <VipBlockedScreen /> based on `blocked`
// ============================================================

export type VipBlockReason = "VIP_LIST_FULL" | "NETWORK_ERROR" | "AUTH_ERROR"

export function useVipCheck() {
  const [checking, setChecking] = useState(false)
  const [blocked,  setBlocked]  = useState<VipBlockReason | null>(null)

  const checkAccess = async (): Promise<boolean> => {
    setChecking(true)
    setBlocked(null)
    try {
      const user = auth.currentUser
      if (!user) {
        setBlocked("AUTH_ERROR")
        return false
      }

      const idToken = await user.getIdToken()
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })
      const data = await res.json()

      if (res.ok && data.allowed) {
        return true
      }

      if (res.status === 403 && data.reason === "VIP_LIST_FULL") {
        setBlocked("VIP_LIST_FULL")
        // Sign them out so they don't sit in an authenticated zombie state
        try {
          // For brand-new signups, delete the Firebase user entirely so they
          // can try again later if a slot frees. For existing users (rare —
          // could happen if you remove someone from allowedUsers manually),
          // just sign out.
          await deleteUser(user).catch(() => signOut(auth))
        } catch {
          await signOut(auth).catch(() => undefined)
        }
        return false
      }

      // Unexpected error — sign them out, show generic block
      setBlocked("NETWORK_ERROR")
      await signOut(auth).catch(() => undefined)
      return false

    } catch (err) {
      console.error("[useVipCheck]", err)
      setBlocked("NETWORK_ERROR")
      await signOut(auth).catch(() => undefined)
      return false
    } finally {
      setChecking(false)
    }
  }

  return { checkAccess, checking, blocked, clearBlock: () => setBlocked(null) }
}
