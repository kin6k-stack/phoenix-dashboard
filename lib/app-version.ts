// ─────────────────────────────────────────────────────────────────────────────
//  lib/app-version.ts
//  SINGLE SOURCE OF TRUTH for the Phoenix Android APK.
//
//  STANDARD: whenever a new APK is built and placed in /public/downloads/,
//  update BOTH fields below and push to main. The Settings page reads from here.
//
//  Steps to release a new APK version:
//    1. Build: cd android && ./gradlew assembleRelease
//    2. Copy:  android/app/build/outputs/apk/release/app-release.apk
//              → public/downloads/phoenix-dashboard.apk
//    3. Bump:  APP_VERSION.version and APP_VERSION.buildDate below
//    4. Push to main → Vercel deploys → new APK live at the download URL
// ─────────────────────────────────────────────────────────────────────────────

export const APP_VERSION = {
  /** Version string shown in Settings and Telegram */
  version:   "v1.0.0",

  /** Human-readable build date */
  buildDate: "Jun 2026",

  /** Application ID (matches android/app/build.gradle applicationId) */
  appId: "app.phoenix.dashboard",

  /** Min Android version required */
  minAndroid: "7.0 (API 24)",

  /** Public download URL — served by Vercel from /public/downloads/ */
  downloadUrl: "/downloads/phoenix-dashboard.apk",

  /** Full changelog for the mobile app */
  changelog: [
    {
      version:  "v1.0.0",
      date:     "Jun 2026",
      note:     "Initial release. Capacitor wrapper in server.url mode — no APK rebuild needed on web updates. FCM push on trade open/close. Google Sign-In via @codetrix-studio/capacitor-google-auth. Biometric lock on launch.",
    },
  ],
}
