// ============================================================
// PHOENIX — Firebase Admin SDK initializer
// Server-side ONLY. Has elevated privileges for writes.
// Used in API routes to write trades to Firestore from MT5 pushes.
// ============================================================

import {
  initializeApp,
  getApps,
  cert,
  ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let _db: Firestore | null = null;

function getServiceAccount(): ServiceAccount {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars. Need: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  return { projectId, clientEmail, privateKey };
}

export function getAdminDb(): Firestore {
  if (_db) return _db;

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(getServiceAccount()),
    });
  }

  _db = getFirestore();
  return _db;
}
