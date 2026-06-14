export const APP_VERSION = {
  version:     "v1.2.0",
  buildDate:   "Jun 2026",
  appId:       "app.phoenix.dashboard",
  minAndroid:  "7.0 (API 24)",
  downloadUrl: "/downloads/phoenix-dashboard.apk",

  changelog: [
    {
      version: "v1.2.0",
      date:    "Jun 2026",
      note:    "Fixed app icon — restored original foreground layer for correct adaptive icon rendering (dark background with phoenix foreground). Added high-importance Android notification channels (default + phoenix_trades) with sound and vibration so trade alerts fire natively even when app is fully closed.",
    },
    {
      version: "v1.1.0",
      date:    "Jun 2026",
      note:    "Updated launcher icon across all density buckets (mdpi → xxxhdpi). White-on-transparent notification icon for Android API 21+ status bar compliance.",
    },
    {
      version: "v1.0.0",
      date:    "Jun 2026",
      note:    "Initial release. Capacitor server.url mode. FCM push on trade open/close. Google Sign-In. Biometric lock on launch.",
    },
  ],
}
