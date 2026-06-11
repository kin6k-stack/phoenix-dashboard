// ============================================================
// PHOENIX — API BASE / NATIVE FETCH BRIDGE   (Capacitor Phase 1)
// ============================================================
//
// WHY THIS FILE EXISTS
// --------------------
// On the WEB (phoenix-dashboard-two.vercel.app), the dashboard and its API
// routes live on the SAME domain, so calls like fetch("/api/candles") just
// work — "/api/..." resolves to the same site.
//
// Inside a CAPACITOR NATIVE APP, the frontend is served from a local file://
// (or capacitor://) origin INSIDE the phone. There is no "/api" there — the
// API routes still live on Vercel. So fetch("/api/candles") would fail.
//
// This file fixes that WITHOUT changing any of the existing fetch() calls.
// It wraps the global fetch ONCE. When (and only when) the app is running in
// the native shell, it rewrites any request that starts with "/api" to the
// absolute Vercel URL. On the web it does NOTHING — behaviour is identical to
// before, so nothing about the current site changes.
//
// HOW TO ACTIVATE
// ---------------
// It activates itself by being imported once in app/layout.tsx (see Phase 1
// step 2). Importing it runs installNativeFetchBridge() a single time.
//
// IS THIS SAFE FOR THE WEB?
// -------------------------
// Yes. isNativeApp() is false in any normal browser, so the wrapper passes
// every call straight through untouched. The only time it rewrites a URL is
// inside the packaged Android app.
// ============================================================

// The backend base URL. In the native app, "/api/..." calls are sent here.
// Falls back to the production URL if the env var isn't set.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://phoenix-dashboard-two.vercel.app";

// Detect whether we're running inside the Capacitor native shell.
// Capacitor injects window.Capacitor; on the web this is undefined.
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false; // server-side render
  // @ts-expect-error - Capacitor is injected at runtime in the native app
  const cap = window.Capacitor;
  return !!(cap && typeof cap.isNativePlatform === "function"
    ? cap.isNativePlatform()
    : cap?.isNative);
}

// Turn a possibly-relative API path into the right absolute URL for the
// current environment. Safe to call anywhere.
export function apiUrl(path: string): string {
  if (!path.startsWith("/api")) return path;     // not an API call, leave it
  if (!isNativeApp()) return path;               // web: keep relative
  return `${API_BASE}${path}`;                   // native: make absolute
}

// Install the global fetch wrapper exactly once.
let installed = false;
export function installNativeFetchBridge(): void {
  if (installed) return;
  if (typeof window === "undefined") return;     // never on the server
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      // Only rewrite when in the native app AND the target is a relative /api path
      if (isNativeApp()) {
        if (typeof input === "string" && input.startsWith("/api")) {
          input = `${API_BASE}${input}`;
        } else if (input instanceof Request && input.url.startsWith("/api")) {
          input = new Request(`${API_BASE}${input.url}`, input);
        }
      }
    } catch {
      // If anything goes wrong detecting/ rewriting, fall through to the
      // original call unchanged — never break fetch.
    }
    return originalFetch(input as RequestInfo, init);
  };
}

// Auto-install on import (client side only).
installNativeFetchBridge();
