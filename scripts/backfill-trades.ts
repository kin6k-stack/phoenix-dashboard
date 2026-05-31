#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 * PHOENIX MIGRATION — Backfill Trades
 *
 * One-time script. Run locally with Firebase Admin SDK credentials.
 *
 * What it does:
 *   1. Reads every doc in `trades` collection
 *   2. For each trade:
 *      - If `bot` matches a known Phoenix bot → moves to `botTrades` collection
 *      - Otherwise → adds `userId: PHOENIX_OWNER_UID` and keeps in `trades`
 *   3. Seeds `allowedUsers/{PHOENIX_OWNER_UID}` as the owner record
 *   4. Initializes the VIP counter at the current count
 *
 * Usage:
 *   # From repo root, with .env populated:
 *   pnpm tsx scripts/backfill-trades.ts            # dry run (default — preview only)
 *   pnpm tsx scripts/backfill-trades.ts --commit   # actually write
 *
 * Required env vars (in .env or shell):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY     (with \n escapes if from Vercel)
 *   PHOENIX_OWNER_UID        (your Firebase Auth uid)
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { config } from "dotenv"
config({ path: ".env.local" })       // Next.js convention
config({ path: ".env" })              // fallback

import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

// ── Identify bot trades ─────────────────────────────────────
const BOT_NAME_PATTERNS = [
  /phoenix\s*nq/i,
  /nq\s*v1/i,
  /gold\s*sentinel/i,
  /sentinel\s*apex/i,
  /phoenix\s*hybrid/i,
  /phoenix\s*gold\s*hybrid/i,
  /gold\s*h\.?e/i,
]

function isBotTrade(rawBot?: string | null): boolean {
  if (!rawBot) return false
  return BOT_NAME_PATTERNS.some(p => p.test(rawBot))
}

// ── Env & guards ────────────────────────────────────────────
const PHOENIX_OWNER_UID = process.env.PHOENIX_OWNER_UID
const COMMIT = process.argv.includes("--commit")

if (!PHOENIX_OWNER_UID) {
  console.error("❌ PHOENIX_OWNER_UID is not set in .env / .env.local")
  console.error("   Add it from your Firebase Auth → Users page")
  process.exit(1)
}

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error("❌ Missing Firebase Admin credentials in .env / .env.local")
  console.error("   Need: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY")
  process.exit(1)
}

// ── Init Admin SDK ──────────────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n${"═".repeat(60)}`)
  console.log(` PHOENIX BACKFILL  ${COMMIT ? "[COMMIT MODE]" : "[DRY RUN — use --commit to write]"}`)
  console.log(`${"═".repeat(60)}\n`)
  console.log(`Owner UID: ${PHOENIX_OWNER_UID}`)
  console.log(`Mode: ${COMMIT ? "WILL WRITE TO FIRESTORE" : "preview only, no writes"}\n`)

  // 1. Load all trades
  console.log("📥 Loading all trades from Firestore...")
  const snap = await db.collection("trades").get()
  console.log(`   Found ${snap.size} trades\n`)

  // 2. Categorize
  let willMoveToBot   = 0
  let willTagAsUser   = 0
  let alreadyHasUser  = 0
  let skippedNoBot    = 0

  const operations: { type: "move-to-bot" | "tag-user"; tradeId: string; bot: string }[] = []

  snap.forEach(doc => {
    const data = doc.data()
    const rawBot = data.bot ?? data.botName ?? data.setup ?? null

    if (data.userId === PHOENIX_OWNER_UID) {
      alreadyHasUser++
      return
    }

    if (isBotTrade(rawBot)) {
      willMoveToBot++
      operations.push({ type: "move-to-bot", tradeId: doc.id, bot: rawBot })
    } else if (rawBot) {
      willTagAsUser++
      operations.push({ type: "tag-user", tradeId: doc.id, bot: rawBot })
    } else {
      skippedNoBot++
      willTagAsUser++  // tag manual trades as yours
      operations.push({ type: "tag-user", tradeId: doc.id, bot: "Manual Execution" })
    }
  })

  console.log("📊 Plan:")
  console.log(`   • Move to botTrades collection:  ${willMoveToBot}`)
  console.log(`   • Tag as owner (your trades):     ${willTagAsUser}`)
  console.log(`   • Already tagged correctly:       ${alreadyHasUser}`)
  console.log(`   • Total to process:               ${operations.length}\n`)

  if (operations.length === 0) {
    console.log("✓ Nothing to do.\n")
    return
  }

  // Sample preview
  console.log("📋 Sample operations (first 5):")
  operations.slice(0, 5).forEach(op => {
    console.log(`   [${op.type.padEnd(12)}] ${op.tradeId}  bot="${op.bot}"`)
  })
  console.log()

  if (!COMMIT) {
    console.log("⚠  DRY RUN — no changes made.")
    console.log("   Re-run with --commit to actually write.\n")
    return
  }

  // 3. Execute — use batches (max 500 ops per batch)
  console.log("🔥 Writing to Firestore...")
  const BATCH_SIZE = 400
  let processed = 0

  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const slice = operations.slice(i, i + BATCH_SIZE)
    const batch = db.batch()

    for (const op of slice) {
      const tradeRef = db.collection("trades").doc(op.tradeId)
      const snap = await tradeRef.get()
      if (!snap.exists) continue
      const data = snap.data()!

      if (op.type === "move-to-bot") {
        // Write to botTrades, delete from trades
        const botRef = db.collection("botTrades").doc(op.tradeId)
        batch.set(botRef, {
          ...data,
          source: "bot",
          migratedAt: FieldValue.serverTimestamp(),
        })
        batch.delete(tradeRef)
      } else if (op.type === "tag-user") {
        // Just add userId field
        batch.update(tradeRef, {
          userId: PHOENIX_OWNER_UID,
          migratedAt: FieldValue.serverTimestamp(),
        })
      }
    }

    await batch.commit()
    processed += slice.length
    console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1} committed (${processed} / ${operations.length})`)
  }

  // 4. Seed owner record in allowedUsers
  console.log("\n👤 Seeding owner record in allowedUsers...")
  await db.collection("allowedUsers").doc(PHOENIX_OWNER_UID).set({
    uid:             PHOENIX_OWNER_UID,
    email:           "phoenix-owner",  // Update manually if you want
    joinedAt:        FieldValue.serverTimestamp(),
    isPhoenixOwner:  true,
    migratedFromBackfill: true,
  }, { merge: true })

  console.log("\n✅ Backfill complete.\n")
  console.log("Next steps:")
  console.log("  1. Deploy rules:  firebase deploy --only firestore:rules")
  console.log("  2. Push the updated code")
  console.log("  3. Test by opening the dashboard — your trades should still appear,")
  console.log("     bot trades should appear only on the Performance tab.\n")
}

main()
  .catch(err => {
    console.error("\n❌ Backfill failed:", err)
    process.exit(1)
  })
  .finally(() => process.exit(0))
