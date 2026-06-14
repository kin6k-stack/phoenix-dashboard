import type { CapacitorConfig } from '@capacitor/cli';

// ─────────────────────────────────────────────────────────────────────────
// PHOENIX — Capacitor config (native wrapper, biometric gate)
//
// STRATEGY: the native app loads the LIVE Vercel site (server.url) rather
// than a bundled static export. This keeps ALL server API routes working on
// Vercel and keeps the existing web-push system intact — Capacitor's only job
// here is to add a native biometric lock on top of the web app.
// ─────────────────────────────────────────────────────────────────────────
const config: CapacitorConfig = {
  appId: 'app.phoenix.dashboard',
  appName: 'Phoenix',
  webDir: 'public',
  server: {
    url: 'https://phoenix-dashboard-two.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '269412096320-rhjshguiana44llnvh77akuv9ud4pmpb.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      // Presentation options when app is in foreground
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      // Default channel for local notifications (foreground alerts)
      smallIcon: 'ic_stat_notify',
      iconColor: '#f97316',
      sound: 'default',
    },
  },
};

export default config;
