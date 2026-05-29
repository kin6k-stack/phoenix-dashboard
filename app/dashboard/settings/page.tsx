"use client";

import { useState } from "react";
import { Settings, Monitor, Bell, Wifi, Shield, Save, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform",
          enabled ? "translate-x-4.5" : "translate-x-0.5"
        )}
        style={{ transform: enabled ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="h-4 w-4 text-blue-400" />
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

  // Display
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("5");
  const [compactMode, setCompactMode] = useState(false);
  const [showMockBadge, setShowMockBadge] = useState(true);

  // Notifications
  const [signalAlerts, setSignalAlerts] = useState(true);
  const [highImpactNews, setHighImpactNews] = useState(true);
  const [trumpAlerts, setTrumpAlerts] = useState(true);
  const [riskGateAlerts, setRiskGateAlerts] = useState(true);

  // Bot Connection
  const [botSecret, setBotSecret] = useState("");
  const [botEndpoint, setBotEndpoint] = useState("https://your-dashboard.vercel.app");
  const [verboseLogs, setVerboseLogs] = useState(false);

  // Agent
  const [defaultSymbol, setDefaultSymbol] = useState("XAUUSD");
  const [defaultTimeframe, setDefaultTimeframe] = useState("H1");
  const [agentCacheTTL, setAgentCacheTTL] = useState("5");

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

      {/* Display */}
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
        <Row label="Show Mock Data Badge" sub="Display indicator when using seeded mock data (no MT5 connection)">
          <Toggle enabled={showMockBadge} onChange={setShowMockBadge} />
        </Row>
      </Section>

      {/* MT5 Bot Connection */}
      <Section title="MT5 Bot Connection" icon={Wifi}>
        <div className="space-y-3">
          <Row label="Phoenix Base URL" sub="Your Vercel deployment URL — set this in PhoenixBridge EA">
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
              Must match <code className="text-zinc-500">MT5_PUSH_SECRET</code> in your Vercel env variables and <code className="text-zinc-500">PhoenixSecret</code> in the EA inputs
            </p>
          </div>
          <Row label="Verbose Bot Logs" sub="Log all MT5 push payloads to server console">
            <Toggle enabled={verboseLogs} onChange={setVerboseLogs} />
          </Row>
        </div>
      </Section>

      {/* Agent Settings */}
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
        <Row label="Agent Cache TTL" sub="How long to cache agent results before auto-refresh (minutes)">
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

      {/* Notifications */}
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
        <Row label="Risk Gate Changes" sub="Alert when risk gate status changes (CLEAR ↔ BLOCKED)">
          <Toggle enabled={riskGateAlerts} onChange={setRiskGateAlerts} />
        </Row>
      </Section>

      {/* Security / Info */}
      <Section title="Security" icon={Shield}>
        <div className="space-y-2 text-xs text-zinc-500 leading-relaxed">
          <p>
            The Phoenix Dashboard authenticates MT5 bot pushes using the <code className="text-zinc-400">x-phoenix-secret</code> header.
            Set <code className="text-zinc-400">MT5_PUSH_SECRET</code> in your Vercel environment variables and match it in the EA <code className="text-zinc-400">PhoenixSecret</code> input.
          </p>
          <p className="text-zinc-600">
            The <code className="text-zinc-500">ANTHROPIC_API_KEY</code> is kept server-side only and never exposed to the client. Agent results are cached for the configured TTL before triggering a new API call.
          </p>
        </div>
      </Section>

      {/* Version */}
      <div className="text-center py-2">
        <p className="text-[10px] text-zinc-700">Phoenix Trading Dashboard v2.0 · Cyber-Industrial</p>
        <p className="text-[10px] text-zinc-800 mt-0.5">Next.js 14 · Vercel · Firebase-ready · MT5 bridge active</p>
      </div>
    </div>
  );
}
