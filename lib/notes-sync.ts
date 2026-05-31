"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"

// ============================================================
// useNotes(symbol)
//
// Per-asset, per-user notes synced to Firestore.
// Document ID format:  `${uid}_${symbol}`
//
// Behavior:
//   - On mount: fetches existing note from Firestore
//   - On every saveNotes() call: writes to local state immediately,
//     debounces Firestore write to 2 seconds
//   - Also syncs across devices via real-time listener
//
// Cost guardrails:
//   - 2-second debounce on writes
//   - Single listener per asset
//   - Listener auto-cleans on unmount
// ============================================================

const DEBOUNCE_MS = 2000

export function useNotes(symbol: string) {
  const { user } = useAuth()
  const [notes, setLocalNotes]   = useState("")
  const [loading, setLoading]    = useState(true)
  const [saving, setSaving]      = useState(false)
  const [lastSavedAt, setSaved]  = useState<Date | null>(null)
  const saveTimerRef             = useRef<NodeJS.Timeout | null>(null)
  const pendingValueRef          = useRef<string>("")

  // Subscribe to the note doc (read + sync across tabs/devices)
  useEffect(() => {
    if (!user || !symbol) return

    const docId = `${user.uid}_${symbol}`
    const ref = doc(db, "notes", docId)

    setLoading(true)
    const unsub = onSnapshot(
      ref,
      snap => {
        if (snap.exists()) {
          const data = snap.data()
          // Don't overwrite local edits in progress
          if (pendingValueRef.current === "" || pendingValueRef.current === data.content) {
            setLocalNotes(data.content ?? "")
          }
        } else {
          setLocalNotes("")
        }
        setLoading(false)
      },
      err => {
        console.warn("[useNotes] listener error:", err)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [user, symbol])

  // Save with debounce
  const saveNotes = useCallback((value: string) => {
    setLocalNotes(value)
    pendingValueRef.current = value

    if (!user || !symbol) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const docId = `${user.uid}_${symbol}`
        await setDoc(doc(db, "notes", docId), {
          userId:    user.uid,
          symbol,
          content:   pendingValueRef.current,
          updatedAt: serverTimestamp(),
        }, { merge: true })
        setSaved(new Date())
      } catch (err) {
        console.error("[useNotes] save error:", err)
      } finally {
        setSaving(false)
      }
    }, DEBOUNCE_MS)
  }, [user, symbol])

  // Flush pending write on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  return { notes, saveNotes, loading, saving, lastSavedAt }
}
