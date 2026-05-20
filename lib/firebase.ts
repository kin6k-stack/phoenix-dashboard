import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, initializeDb, DB } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize App safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 🔥 SURGICAL FIX FOR SERVERLESS TIMEOUTS:
// Instead of getFirestore(app), we use initializeFirestore with long polling.
// This forces Firebase to use clean, instant HTTP requests instead of heavy gRPC streams.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true, 
  useFetchStreams: false
});