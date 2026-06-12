import type { Metadata } from "next"
import Script from "next/script" // Patched: Imported Next.js Script component
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { NativeBridge } from "@/components/native-bridge" // Capacitor Phase 1: installs native /api fetch bridge (no-op on web)
import { BiometricGate } from "@/components/biometric-gate" // Native-only fingerprint/face lock (no-op on web)

export const metadata: Metadata = {
  title: "Phoenix Trading Ecosystem",
  description: "Institutional-grade algorithmic trading dashboard",
  manifest: "/manifest.json",
}

// Runs synchronously in <head> BEFORE React hydrates.
// Reads localStorage and applies saved theme/density/animation/invert
// settings to <html> so the page never flashes the wrong theme.
const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('phoenix_settings');
    var settings = saved ? JSON.parse(saved) : {};
    var theme = settings.theme;
    if (theme === 'oled' || !theme) theme = 'black-white';
    else if (theme === 'pink')     theme = 'violet';
    else if (theme === 'light')    theme = 'gold';
    var density = settings.density || 'default';
    var animations = settings.animations !== false;
    var invert = settings.invert === true;
    var html = document.documentElement;
    html.setAttribute('data-theme', theme);
    html.setAttribute('data-density', density);
    if (!animations) html.classList.add('no-animations');
    if (theme === 'black-white' && invert) html.classList.add('invert-bw');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'black-white');
    document.documentElement.setAttribute('data-density', 'default');
  }
})();
`

// Patched: Service Worker registration logic string
const swRegisterScript = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(
      function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      function(err) {
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      data-theme="black-white"
      data-density="default"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <NativeBridge />
        <BiometricGate>
          <AuthProvider>{children}</AuthProvider>
        </BiometricGate>

        {/* Patched: Registers the background service worker without hurting load performance */}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: swRegisterScript }}
        />
      </body>
    </html>
  )
}