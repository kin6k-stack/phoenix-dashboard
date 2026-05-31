import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"

export const metadata: Metadata = {
  title: "Phoenix Trading Ecosystem",
  description: "Institutional-grade algorithmic trading dashboard",
}

// Runs synchronously in <head> BEFORE React hydrates.
// Reads localStorage and applies saved theme/density/animation/invert
// settings to <html> so the page never flashes the wrong theme.
//
// Theme name migration (from prior versions):
//   "oled"  → "black-white"
//   "pink"  → "violet"
//   "light" → "gold"
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
