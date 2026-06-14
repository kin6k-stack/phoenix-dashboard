// ─────────────────────────────────────────────────────────────────────────────
//  lib/app-version.ts
//  SINGLE SOURCE OF TRUTH for the Phoenix Android APK.
//
//  Steps to release a new APK version:
//    1. Build:  cd android && gradlew assembleRelease
//    2. Copy:   android/app/build/outputs/apk/release/app-release.apk
//               → public/downloads/phoenix-dashboard.apk
//    3. Bump:   version and buildDate below + prepend changelog entry
//    4. Push to main → Vercel deploys → download link is live
// ─────────────────────────────────────────────────────────────────────────────

export const APP_VERSION = {
  version:     "v1.1.0",
  buildDate:   "Jun 2026",
  appId:       "app.phoenix.dashboard",
  minAndroid:  "7.0 (API 24)",
  downloadUrl: "/downloads/phoenix-dashboard.apk",

  changelog: [
    {
      version: "v1.1.0",
      date:    "Jun 2026",
      note:    "Updated app icon and status bar notification icon across all density buckets (mdpi → xxxhdpi). White-on-transparent notification icon for Android API 21+ compliance.",
    },
    {
      version: "v1.0.0",
      date:    "Jun 2026",
      note:    "Initial release. Capacitor wrapper in server.url mode — no APK rebuild needed on web updates. FCM push on trade open/close. Google Sign-In via @codetrix-studio/capacitor-google-auth. Biometric lock on launch.",
    },
  ],
}
