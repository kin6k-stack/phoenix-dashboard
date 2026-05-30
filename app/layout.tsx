import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"

export const metadata: Metadata = {
  title: "Phoenix Trading Ecosystem",
  description: "Institutional-grade algorithmic trading dashboard",
}

// This script runs synchronously in <head> BEFORE React hydrates.
// It reads localStorage and applies the saved theme/density/animation
// settings to <html> so the page never flashes the wrong theme.
const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('phoenix_settings');
    var settings = saved ? JSON.parse(saved) : {};
    var theme = settings.theme || 'oled';
    var density = settings.density || 'default';
    var animations = settings.animations !== false;
    var html = document.documentElement;
    html.setAttribute('data-theme', theme);
    html.setAttribute('data-density', density);
    if (!animations) html.classList.add('no-animations');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'oled');
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
      data-theme="oled"
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
