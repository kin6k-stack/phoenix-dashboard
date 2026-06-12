"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import {
  User,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth"
import { auth } from "./firebase"

interface AuthContextType {
  user:    User | null
  loading: boolean
  signInWithEmail:  (email: string, password: string) => Promise<void>
  signUpWithEmail:  (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut:          () => Promise<void>
  resetPassword:    (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUpWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password)
  }

  const signInWithGoogle = async () => {
    // Detect the native app. In Capacitor we MUST use the native Google Auth
    // plugin — signInWithPopup hangs inside a WebView. On web we use popup.
    let isNative = false
    try {
      const { Capacitor } = await import("@capacitor/core")
      isNative = Capacitor.isNativePlatform()
    } catch { isNative = false }

    if (isNative) {
      // Native Google sign-in: the plugin shows the real Android account
      // picker, returns an idToken, which we exchange for a Firebase credential.
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth")
      const result = await GoogleAuth.signIn()
      const idToken = (result as any)?.authentication?.idToken
      if (!idToken) throw new Error("Google sign-in returned no idToken")
      const credential = GoogleAuthProvider.credential(idToken)
      const { signInWithCredential } = await import("firebase/auth")
      await signInWithCredential(auth, credential)
    } else {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
