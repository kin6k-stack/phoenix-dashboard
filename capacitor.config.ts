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
  // webDir is required by Capacitor but unused when server.url is set.
  // Points at a folder that exists so the CLI doesn't error.
  webDir: 'public',
  server: {
    // Load the live deployed dashboard.
    url: 'https://phoenix-dashboard-two.vercel.app',
    cleartext: false,
  },
  android: {
    // Allow the WebView to use the device's network normally.
    allowMixedContent: false,
  },
  plugins: {
    GoogleAuth: {
      // Web client ID from Firebase → Authentication → Google → Web SDK config.
      // (Safe to commit — it's a public client ID.)
      scopes: ['profile', 'email'],
      serverClientId: '269412096320-rhjshguiana44llnvh77akuv9ud4pmpb.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
