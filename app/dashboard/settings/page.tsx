"use client";

import { useState } from "react";
import {
  Settings, Monitor, Bell, Wifi, Shield, Save,
  Smartphone, Download, ChevronRight, CheckCircle2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/app-version";

interface ToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
        enabled ? "bg-emerald-500" : "bg-zinc-700"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform"
        )}
        style={{ transform: enabled ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function Section({
  title, icon: Icon, children, accent
}: {
  title: string; icon: React.ElementType; children: React.ReactNode; accent?: string
}) {
  return (
    <Card style={accent ? { borderColor: `${accent}30` } : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Icon
            className="h-4 w-4"
            style={{ color: accent ?? "rgb(96,165,250)" }}
          />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--t-border)] last:border-0">
      <div>
        <p className="text-sm text-zinc-300">{label}</p>
        {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
      </div>
      <div className="ml-4 shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [apkCopied, setApkCopied] = useState(false);

  // Display
  const [autoRefresh,      setAutoRefresh]      = useState(true);
  const [refreshInterval,  setRefreshInterval]  = useState("5");
  const [compactMode,      setCompactMode]      = useState(false);
  const [showMockBadge,    setShowMockBadge]    = useState(true);

  // Notifications
  const [signalAlerts,    setSignalAlerts]    = useState(true);
  const [highImpactNews,  setHighImpactNews]  = useState(true);
  const [trumpAlerts,     setTrumpAlerts]     = useState(true);
  const [riskGateAlerts,  setRiskGateAlerts]  = useState(true);

  // Bot Connection
  const [botSecret,     setBotSecret]     = useState("");
  const [botEndpoint,   setBotEndpoint]   = useState("https://your-dashboard.vercel.app");
  const [verboseLogs,   setVerboseLogs]   = useState(false);

  // Agent
  const [defaultSymbol,    setDefaultSymbol]    = useState("XAUUSD");
  const [defaultTimeframe, setDefaultTimeframe] = useState("H1");
  const [agentCacheTTL,    setAgentCacheTTL]    = useState("5");

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function copyDownloadLink() {
    const url = `${window.location.origin}${APP_VERSION.downloadUrl}`;
    navigator.clipboard.writeText(url).then(() => {
      setApkCopied(true);
      setTimeout(() => setApkCopied(false), 2500);
    });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-xs text-[var(--t-muted)] mt-0.5">Dashboard preferences and bot connection</p>
        </div>
        <Button variant="primary" size="sm" onClick={handleSave}>
          {saved ? (
            <><span className="h-2 w-2 rounded-full bg-emerald-300" />SAVED</>
          ) : (
            <><Save className="h-3.5 w-3.5" />Save Changes</>
          )}
        </Button>
      </div>

      {/* ── Android App Download ─────────────────────────────────────── */}
      <Section title="Android App" icon={Smartphone} accent="#f97316">
        {/* Hero download card */}
        <div
          className="rounded-xl border p-4 mb-4 relative overflow-hidden"
          style={{ borderColor: "#f9731630", background: "#f9731608" }}
        >
          {/* Glow strip */}
          <div
            className="absolute top-0 left-8 right-8 h-px"
            style={{ background: "linear-gradient(90deg,transparent,#f97316,transparent)" }}
          />

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔥</span>
                <p className="text-sm font-black text-foreground">Phoenix Dashboard</p>
                <span
                  className="text-[9px] font-black px-1.5 py-0.5 rounded"
                  style={{ background: "#f9731620", color: "#f97316" }}
                >
                  {APP_VERSION.version}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                {APP_VERSION.appId} · Android {APP_VERSION.minAndroid}+
              </p>
              <p className="text-[10px] text-muted-foreground">
                Built {APP_VERSION.buildDate}
              </p>
            </div>

            {/* Download button */}
            <a
              href={APP_VERSION.downloadUrl}
              download="phoenix-dashboard.apk"
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-black flex-shrink-0 transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#f97316", boxShadow: "0 0 16px rgba(249,115,22,0.4)" }}
            >
              <Download size={12} />
              Download APK
            </a>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {[
              "📡 Live bot trades",
              "🔔 FCM push alerts",
              "🔐 Biometric lock",
              "🔑 Google Sign-In",
              "♻️ Auto-syncs via Vercel",
            ].map(f => (
              <span
                key={f}
                className="text-[9px] px-2 py-0.5 rounded-full border"
                style={{ borderColor: "#f9731625", color: "#f9731699" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Install steps */}
        <div className="space-y-2 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Install Steps
          </p>
          {[
            { n: "1", label: "Download the APK using the button above" },
            { n: "2", label: 'Open Settings → Apps → Install Unknown Apps → allow your browser' },
            { n: "3", label: "Open the downloaded APK file and tap Install" },
            { n: "4", label: "Sign in with Google — same account as the web dashboard" },
          ].map(step => (
            <div key={step.n} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: "#f9731620", color: "#f97316" }}
              >
                {step.n}
              </span>
              <p className="text-[10px] text-muted-foreground leading-relaxed pt-0.5">{step.label}</p>
            </div>
          ))}
        </div>

        {/* Copy link */}
        <Row label="Share Download Link" sub="Copy direct APK URL to send to someone">
          <button
            onClick={copyDownloadLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black transition-all"
            style={{ borderColor: "#f9731640", color: apkCopied ? "#22c55e" : "#f97316" }}
          >
            {apkCopied ? <><CheckCircle2 size={10} /> Copied!</> : <><ChevronRight size={10} /> Copy Link</>}
          </button>
        </Row>

        {/* Changelog */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            App Changelog
          </p>
          {APP_VERSION.changelog.map((c, i) => (
            <div key={c.version} className="flex gap-3 mb-2 last:mb-0">
              <span className="text-[9px] font-black flex-shrink-0" style={{ color: i === 0 ? "#f97316" : "hsl(var(--foreground))" }}>
                {c.version}
              </span>
              <span className="text-[9px] text-muted-foreground flex-shrink-0">{c.date}</span>
              <p className="text-[9px] text-muted-foreground leading-relaxed">{c.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Display ──────────────────────────────────────────────────── */}
      <Section title="Display" icon={Monitor}>
        <Row label="Auto-Refresh Data" sub="Automatically fetch fresh market data on a timer">
          <Toggle enabled={autoRefresh} onChange={setAutoRefresh} />
        </Row>
        <Row label="Refresh Interval" sub="How often to poll API routes (minutes)">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(e.target.value)}
            className="bg-zinc-800 border border-[var(--t-border)] rounded px-2 py-1 text-xs text-zinc-300"
          >
            {["1", "2", "5", "10", "30"].map((v) => (
              <option key={v} value={v}>{v} min</option>
            ))}
          </select>
        </Row>
        <Row label="Compact Mode" sub="Reduce card padding for denser information display">
          <Toggle enabled={compactMode} onChange={setCompactMode} />
        </Row>
        <Row label="Show Mock Data Badge" sub="Display indicator when using seeded mock data">
          <Toggle enabled={showMockBadge} onChange={setShowMockBadge} />
        </Row>
      </Section>

      {/* ── MT5 Bot Connection ────────────────────────────────────────── */}
      <Section title="MT5 Bot Connection" icon={Wifi}>
        <div className="space-y-3">
          <Row label="Phoenix Base URL" sub="Your Vercel deployment URL">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded font-semibold",
                botEndpoint.includes("vercel.app") || botEndpoint.includes("localhost")
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-zinc-800 text-zinc-500"
              )}>
                {botEndpoint.includes("localhost") ? "LOCAL" : "VERCEL"}
              </span>
            </div>
          </Row>
          <div className="space-y-2">
            <label className="text-xs text-zinc-500">Base URL</label>
            <input
              type="text"
              value={botEndpoint}
              onChange={(e) => setBotEndpoint(e.target.value)}
              placeholder="https://your-dashboard.vercel.app"
              className="w-full bg-zinc-900 border border-[var(--t-border)] rounded px-3 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-500">MT5 Push Secret</label>
            <input
              type="password"
              value={botSecret}
              onChange={(e) => setBotSecret(e.target.value)}
              placeholder="Set MT5_PUSH_SECRET in your .env and match it here"
              className="w-full bg-zinc-900 border border-[var(--t-border)] rounded px-3 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500/50"
            />
            <p className="text-[10px] text-zinc-600">
              Must match <code className="text-zinc-500">MT5_PUSH_SECRET</code> in Vercel env and{" "}
              <code className="text-zinc-500">PhoenixSecret</code> in EA inputs
            </p>
          </div>
          <Row label="Verbose Bot Logs" sub="Log all MT5 push payloads to server console">
            <Toggle enabled={verboseLogs} onChange={setVerboseLogs} />
          </Row>
        </div>
      </Section>

      {/* ── Agent Settings ────────────────────────────────────────────── */}
      <Section title="Agent Pipeline" icon={Settings}>
        <Row label="Default Symbol" sub="Pre-selected instrument on Market Bias page">
          <select
            value={defaultSymbol}
            onChange={(e) => setDefaultSymbol(e.target.value)}
            className="bg-zinc-800 border border-[var(--t-border)] rounded px-2 py-1 text-xs text-zinc-300"
          >
            {["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "USOIL"].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </Row>
        <Row label="Default Timeframe" sub="Timeframe to analyse on Market Bias page">
          <select
            value={defaultTimeframe}
            onChange={(e) => setDefaultTimeframe(e.target.value)}
            className="bg-zinc-800 border border-[var(--t-border)] rounded px-2 py-1 text-xs text-zinc-300"
          >
            {["M15", "H1", "H4", "D1"].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </Row>
        <Row label="Agent Cache TTL" sub="How long to cache agent results (minutes)">
          <select
            value={agentCacheTTL}
            onChange={(e) => setAgentCacheTTL(e.target.value)}
            className="bg-zinc-800 border border-[var(--t-border)] rounded px-2 py-1 text-xs text-zinc-300"
          >
            {["1", "2", "5", "10", "15", "30"].map((v) => (
              <option key={v} value={v}>{v} min</option>
            ))}
          </select>
        </Row>
      </Section>

      {/* ── Notifications ─────────────────────────────────────────────── */}
      <Section title="Notifications" icon={Bell}>
        <Row label="Signal Alerts" sub="Notify when a new armed signal is logged">
          <Toggle enabled={signalAlerts} onChange={setSignalAlerts} />
        </Row>
        <Row label="High-Impact News" sub="Alert on news with impact score ≥ 8">
          <Toggle enabled={highImpactNews} onChange={setHighImpactNews} />
        </Row>
        <Row label="Trump Monitor Alerts" sub="Notify on new high-impact Trump posts">
          <Toggle enabled={trumpAlerts} onChange={setTrumpAlerts} />
        </Row>
        <Row label="Risk Gate Changes" sub="Alert when risk gate status changes">
          <Toggle enabled={riskGateAlerts} onChange={setRiskGateAlerts} />
        </Row>
      </Section>

      {/* ── Security ──────────────────────────────────────────────────── */}
      <Section title="Security" icon={Shield}>
        <div className="space-y-2 text-xs text-zinc-500 leading-relaxed">
          <p>
            MT5 bot pushes authenticate via the{" "}
            <code className="text-zinc-400">x-phoenix-secret</code> header.
            Set <code className="text-zinc-400">MT5_PUSH_SECRET</code> in Vercel env and match it in the EA.
          </p>
          <p className="text-zinc-600">
            <code className="text-zinc-500">ANTHROPIC_API_KEY</code> is server-side only — never exposed to the client.
          </p>
        </div>
      </Section>

      {/* ── Version footer ────────────────────────────────────────────── */}
      <div className="text-center py-2">
        <p className="text-[10px] text-zinc-700">
          Phoenix Trading Dashboard · Web · Next.js · Vercel · Firebase
        </p>
        <p className="text-[10px] text-zinc-800 mt-0.5">
          Android App {APP_VERSION.version} · {APP_VERSION.appId}
        </p>
      </div>
    </div>
  );
}
