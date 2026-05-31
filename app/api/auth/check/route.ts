// ============================================================
// /api/auth/check  (POST)
//
// Called by login flow after Firebase auth succeeds.
// Verifies the user is on `allowedUsers` whitelist.
// If not on the list AND count < 15, adds them.
// Otherwise returns 403 with VIP_LIST_FULL.
//
// Body: { idToken: string }  (Firebase ID token from client)
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

const VIP_CAP = 15

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()
const auth = getAuth()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const idToken = body?.idToken

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 })
    }

    // Verify token + extract uid/email
    const decoded = await auth.verifyIdToken(idToken)
    const uid = decoded.uid
    const email = decoded.email ?? "no-email"

    // Check if already on the allow list
    const userRef = db.collection("allowedUsers").doc(uid)
    const existing = await userRef.get()

    if (existing.exists) {
      // Already on the list — let them through
      return NextResponse.json({
        allowed: true,
        status: "existing",
        isOwner: existing.data()?.isPhoenixOwner === true,
      })
    }

    // Not on the list — count current size, decide
    const allUsers = await db.collection("allowedUsers").count().get()
    const currentCount = allUsers.data().count

    if (currentCount >= VIP_CAP) {
      // Cap reached — reject. We DO NOT sign them out here; the
      // client deletes the Firebase Auth user (so they don't linger)
      // and shows the VIP_LIST_FULL screen.
      return NextResponse.json({
        allowed: false,
        reason: "VIP_LIST_FULL",
        cap: VIP_CAP,
      }, { status: 403 })
    }

    // Under cap — add them
    await userRef.set({
      uid,
      email,
      joinedAt: FieldValue.serverTimestamp(),
      isPhoenixOwner: false,
    })

    return NextResponse.json({
      allowed: true,
      status: "added",
      slotsRemaining: VIP_CAP - (currentCount + 1),
      isOwner: false,
    })

  } catch (err) {
    console.error("[auth/check]", err)
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: "Internal error", details: msg }, { status: 500 })
  }
}
