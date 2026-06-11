# Phoenix Dashboard → Native Android App (Capacitor) — Migration Plan

**Goal:** Turn the existing Next.js dashboard into a real native Android app you
can extend with biometrics, push, and (later) widgets — WITHOUT rewriting the app
and WITHOUT breaking your bot backend.

**Read this first — the one decision that matters:**
Your app is NOT a pure frontend. It has ~25 API routes (/api/webhook,
/api/candles, /api/market/*, firebase-admin, CORS for the MT5 bots). Capacitor
bundles a STATIC export of your frontend into the APK, and a static export
**cannot contain API routes** (they're server code). So we do NOT try to put the
whole app in the APK.

### THE ARCHITECTURE (hybrid — this is the correct one for you)
- The **APK ships only the frontend** (the dashboard UI screens).
- The frontend talks to your **API routes that STAY on Vercel**, over HTTPS.
- Your **MT5 bots keep POSTing to Vercel exactly as today** — nothing changes
  for them. The webhook, telemetry, market data all stay server-side on Vercel.
- Result: the app is native, but the brain stays on Vercel. Bots unaffected.

This is a feature, not a compromise: you get native phone features on top of a
backend you don't have to touch.

---

## PHASE 0 — Prerequisites (install once, when fresh)
- Android Studio (the full IDE — needed for native plugins, emulator, builds).
- Node + your existing pnpm setup (already have).
- Keep the existing PWA Builder keystore SAFE — but note: the Capacitor app will
  use its OWN signing. Don't mix them.

---

## PHASE 1 — Point the frontend at the Vercel backend
Right now the frontend calls API routes as relative paths like `/api/candles`.
Inside a Capacitor APK, `/api/candles` resolves to the APK's local files (which
don't exist) — NOT to Vercel. So every API call must become an ABSOLUTE URL.

1. Add an env var for the backend base URL:
   - `.env.local`:  `NEXT_PUBLIC_API_BASE=https://phoenix-dashboard-two.vercel.app`
2. Create a tiny fetch helper (e.g. `lib/api-base.ts`) that prepends the base in
   the native app, and stays relative on the web:
   ```ts
   export const API_BASE =
     process.env.NEXT_PUBLIC_API_BASE && typeof window !== "undefined"
       ? process.env.NEXT_PUBLIC_API_BASE
       : "";
   export const apiUrl = (path: string) => `${API_BASE}${path}`;
   ```
3. Replace `fetch("/api/...")` calls with `fetch(apiUrl("/api/..."))`.
   (Search the codebase for `fetch("/api` and `fetch('/api` — update each.)
4. CONFIRM your API routes already send CORS headers — they DO (next.config.ts
   has Access-Control-Allow-Origin: *). The APK loads from a different origin,
   so CORS is required. You're already set for this. ✅

---

## PHASE 2 — Split frontend vs backend for the build
The APK build needs a static export of ONLY the pages, not the API routes.

Option A (cleanest, more work): keep ONE codebase, use a Capacitor-specific build
that static-exports pages while the /api routes continue to be deployed to Vercel
normally. With Next 16 app-router this needs care — API routes must be excluded
from the static export.

Option B (simplest, recommended to start): create a SEPARATE thin export config
for the app build that outputs just the dashboard pages as static HTML/JS, all
data coming from the Vercel API via the absolute URLs from Phase 1.

> DECISION TO MAKE WHEN FRESH: A or B. B gets you running faster; A is tidier
> long-term. Don't decide this at 4am. (When you start, tell me which and I'll
> write the exact next.config + build script for that choice.)

Key config for the export build:
```js
// next.config (app/export variant)
const nextConfig = {
  output: 'export',          // static export for Capacitor
  images: { unoptimized: true },  // you already have this ✅
  // NOTE: /api routes must NOT be part of this export build
};
```

---

## PHASE 3 — Add Capacitor
```bash
pnpm add @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Phoenix" "app.phoenix.dashboard"   # pick a package id
# build the static frontend export first (Phase 2), output dir e.g. "out"
npx cap add android
npx cap copy
npx cap open android        # opens Android Studio
```
- `webDir` in capacitor.config = your static export folder (e.g. `out`).
- From Android Studio you build/run on an emulator or your phone.

---

## PHASE 4 — Native look (solves the bar properly, natively)
- Status bar + nav bar color: use `@capacitor/status-bar` plugin → set black,
  set overlay, real native control (no manifest guessing).
- Splash screen: `@capacitor/splash-screen`, black background to match.
- This replaces all the PWA-display-mode wrrestling — Capacitor controls the
  system bars directly in native code.

---

## PHASE 5 — The features you actually wanted (in order of difficulty)

### 5a. Biometrics (EASY — do this first to prove the native bridge works)
- Plugin: a maintained biometric-auth Capacitor plugin.
- Flow: on app open, require fingerprint/face before showing the dashboard.
- This is ~an evening once Capacitor runs. Good first native win.

### 5b. Push notifications (MEDIUM — replaces background polling)
- Use `@capacitor/push-notifications` + Firebase Cloud Messaging (FCM).
- IMPORTANT REFRAME: don't poll the bots in the background (Android kills it).
  Instead, your Vercel backend / bot SENDS a push to the phone when something
  happens. You already have Firebase — FCM is the same ecosystem.
- This is the RIGHT way to get bot alerts on the phone natively. (You currently
  approximate this with Telegram — FCM would be the native version.)

### 5c. Background tasks (MEDIUM-HARD — manage expectations)
- Android aggressively kills background work. True periodic background fetch is
  unreliable on ALL frameworks, not a Capacitor limitation.
- Use it only for light local-notification scheduling. For anything real-time,
  use push (5b) instead. Don't fight Android on this.

### 5d. Home-screen widgets (HARD — true native, separate sub-project)
- Capacitor does NOT do Android widgets out of the box.
- This requires real native Kotlin using the Android App Widget API, bridged to
  your app's data. It's a proper native-code task, not a plugin drop-in.
- Do this LAST, as its own focused project, only after the app is stable.
- Realistic: a P&L widget reads cached data your app writes; updates on a
  schedule Android permits (typically ~30 min minimum, not real-time).

---

## SANITY CHECKS / GOTCHAS
- Firebase **client** SDK works in the APK (it's just JS). Firebase **ADMIN**
  must NEVER ship in the app — it stays server-side on Vercel. Keep admin code
  in /api routes only.
- Auth: your login flow must work over the absolute-URL/CORS setup. Test login
  early — it's the most likely thing to break first.
- Don't ship the `.env.local` secrets into the APK. Only `NEXT_PUBLIC_*` vars are
  safe client-side; everything else stays on Vercel.
- Test on a REAL device early, not just emulator — biometrics/push behave
  differently on real hardware.

---

## SUGGESTED ORDER WHEN YOU START FRESH
1. Phase 1 (absolute API URLs) — do this even before Capacitor; test on web.
2. Phase 2 decision (A or B) — ping me, I'll write the exact config.
3. Phases 3–4 — get a black, native-feeling app running that loads your
   dashboard from Vercel. THIS IS THE MILESTONE: a working native app.
4. Phase 5a biometrics — first real native feature.
5. Phase 5b push — the genuinely useful one.
6. Phase 5d widgets — last, as its own project.

## DON'T
- Don't try to static-export the API routes. They stay on Vercel.
- Don't rewrite the dashboard in Kotlin. You're wrapping, not rebuilding.
- Don't start this at the end of a long session. It's a fresh-head project.
- Don't abandon the working TWA until the Capacitor app actually runs — keep
  the thing that works until the new thing works.
