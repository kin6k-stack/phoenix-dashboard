"use client"

// ============================================================
// PHOENIX — NATIVE BRIDGE LOADER   (Capacitor Phase 1)
// ============================================================
// Tiny client-only component whose only job is to import lib/api-base,
// which installs the native fetch bridge exactly once on the client.
// Rendering this in app/layout.tsx guarantees the bridge runs in the
// browser / native shell without making the whole layout a client component.
//
// It renders nothing.
// ============================================================

import { useEffect } from "react"
import { installNativeFetchBridge } from "@/lib/api-base"

export function NativeBridge() {
  useEffect(() => {
    installNativeFetchBridge()
  }, [])
  return null
}
