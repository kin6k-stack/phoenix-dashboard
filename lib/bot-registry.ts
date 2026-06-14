// ─────────────────────────────────────────────────────────────────────────────
//  lib/bot-registry.ts
//  SINGLE SOURCE OF TRUTH for all Phoenix bot metadata.
//
//  STANDARD: whenever a bot is updated, do TWO things here before deploying:
//    1. Bump the top-level `version` field to the new version string.
//    2. Prepend a new entry to `changelog` — { version, date, note }.
//
//  bot-hub-view.tsx imports BOT_REGISTRY and reads from it directly.
//  Nothing bot-specific lives in the view file.
// ─────────────────────────────────────────────────────────────────────────────

export interface BotChangelogEntry {
  version: string
  date:    string
  note:    string
}

export interface BotConfig {
  [key: string]: string
}

export interface BotRegistryEntry {
  id:        string
  name:      string
  version:   string        // current deployed version — bump on every release
  magic:     number
  symbol:    string
  timeframe: string
  color:     string
  glow:      string
  icon:      string
  firestore: string        // must match the `bot` field sent by the EA's BOT_INIT webhook
  config:    BotConfig     // strategy config shown on the Overview tab
  changelog: BotChangelogEntry[]  // newest entry FIRST — index 0 = current
}

// ─────────────────────────────────────────────────────────────────────────────
//  REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
export const BOT_REGISTRY: BotRegistryEntry[] = [

  // ── Gold Sentinel Apex ────────────────────────────────────────────────────
  {
    id:        "apex",
    name:      "Gold Sentinel Apex",
    version:   "v5.14",
    magic:     88802,
    symbol:    "XAUUSDm",
    timeframe: "M15",
    color:     "#f59e0b",
    glow:      "rgba(245,158,11,0.4)",
    icon:      "🦅",
    firestore: "Gold Sentinel Apex",
    config: {
      "Mode":       "CRT M15 Sniper",
      "Anchor":     "03:00 broker (pre-London H1)",
      "Entry":      "M15 close inside range + EMA8",
      "SL":         "Sweep wick + 10 pts padding",
      "TP":         "Opposite range extreme (static)",
      "BE":         "35% of TP distance",
      "Stagnation": "2 M15 bars (30 min)",
      "Filters":    "H4 bias + ADX ≥22 (optional)",
    },
    changelog: [
      { version:"v5.14",  date:"Jun 2026", note:"Ghost Shield banks dynamic banker lot at TP1. All ecosystem fixes applied — bot, outcome, direction fields in webhook. VPS staging folder ready." },
      { version:"v5.13",  date:"Jun 2026", note:"RemoteConfig wired — live dashboard toggles (HTF bias, OB, prem/dis, spread, daily caps, Shield RR, kill-switch). 15-min heartbeat. Falls back to inputs if Firestore unreachable." },
      { version:"v5.12",  date:"Jun 2026", note:"Heartbeat fix (was going offline after 10 min). Full OPENED payload (tp1+tp2). CLOSED sends tpReached+isRunner. PHX_Memory — day-lock + Ghost Shield runner survive re-add/restart." },
      { version:"v5.11",  date:"Jun 2026", note:"M15 sniper + Precision Drawdown Kill. Shared PHX_SMC_Core + PHX_Telegram includes. Live balance compounding." },
      { version:"v5.1",   date:"Jun 2026", note:"CRT rebuild — 4-state machine (IDLE→RANGE→SWEEP→TRADE). M15 sniper. 35% BE. 2-bar stagnation fuse. ADX + H4 bias preserved." },
      { version:"v5.0",   date:"Jun 2026", note:"SMC rebuild — OB+FVG+Sweep+H4 bias. Trailing Runner restored." },
      { version:"v4.44",  date:"May 2026", note:"Session filter 03-20 NY. Fixed Runner 3R. BE at 1R. Server guard." },
      { version:"v4.40",  date:"Apr 2026", note:"ADX threshold 25. DoubleShot enabled. London block partial." },
      { version:"v4.0",   date:"Mar 2026", note:"Initial institutional version. Trailing stop active." },
    ],
  },

  // ── Phoenix Gold Scalper Engine ───────────────────────────────────────────
  {
    id:        "hybrid",
    name:      "Phoenix Gold Scalper Engine",
    version:   "v2.4 PROD",
    magic:     88803,
    symbol:    "XAUUSDm",
    timeframe: "M5",
    color:     "#f97316",
    glow:      "rgba(249,115,22,0.4)",
    icon:      "🔥",
    firestore: "Phoenix Gold Scalper Engine",
    config: {
      "Mode":        "5m Zone Scalper — data-validated",
      "Zones":       "PDH/PDL + H4/H1/M15 swings (64 max)",
      "Entry":       "Pin bar / engulfing at zone",
      "Trend":       "EMA 150/250 gate · PDH/PDL counter OK",
      "SL":          "ATR x1.2 · 1.5–8.0 pt band",
      "TP1":         "1:1 RR — banker lot closes (validated 74.2%)",
      "TP2":         "2:1 RR — runner continues from BE",
      "Runner":      "07-16 UTC peak · 0.02 off-peak / 0.03 peak",
      "Sessions":    "Asia · London · NY · Friday kill 20:00",
      "Memory":      "PHX_Memory — survives re-add/restart",
    },
    changelog: [
      { version:"v2.4 PROD", date:"Jun 2026", note:"Production deployment. Webhook v5.6 ecosystem fixes: bot + outcome + direction fields in OPENED/CLOSED payloads. OnTradeTransaction catches TP2 and SL runner closes. BOT_NAME/BOT_VER constants centralised. Startup Telegram cleaned up." },
      { version:"v2.4",      date:"Jun 2026", note:"Confirmed best version across all testing — 125 trades Jan–Apr 2026: PF 1.354, Sharpe 2.26, +$364.20. v2.5–v2.8 all tested (sweep reject, round gate, D1 bias, Asia block, day scaling) and reverted — filters derived from Telegram signal study don't translate to mechanical zone detection. v2.4 entry logic declared final." },
      { version:"v2.3",      date:"Jun 2026", note:"Dual-lot model: banker lot closes at TP1, runner continues to TP2. Optimizer top-2 merged across 125-trade run — banker=0.01, runner=0.02 off-peak / 0.03 peak (07-16 UTC). Peak runner Sharpe 13.51, PF 1.289." },
      { version:"v2.2",      date:"Jun 2026", note:"Wide 3-column orange HUD. Day W/L + consecutive loss streak tracking. Nearest zone label in panel. Footer bar with live session + trend + zone count." },
      { version:"v2.1",      date:"Jun 2026", note:"PHX_Memory integration — runner/state survive re-add & terminal restart. 10-min heartbeat (BOT_INIT logged once). OnTradeTransaction flag-clear. Webhook sends tp1+tp2+lot." },
      { version:"v2.0",      date:"Jun 2026", note:"Data-validated rebuild — M15 (56%) + H1 (33%) swing zones, MAX_ZONES→64. Session runner 07-16 UTC: bank 50% at TP1, run rest to TP2 at BE. Exit model from 631-signal study." },
      { version:"v1.0",      date:"May 2026", note:"Initial 5m demand/supply zone scalper. Ghost Shield BE. EMA 150/250 trend gate. Pin bar / engulfing entries. ATR-based SL 1.5–8.0 pt." },
    ],
  },

  // ── Phoenix NQ Engine ─────────────────────────────────────────────────────
  {
    id:        "nq",
    name:      "Phoenix NQ Engine",
    version:   "v2.2",
    magic:     88801,
    symbol:    "USTECm",
    timeframe: "M5",
    color:     "#06b6d4",
    glow:      "rgba(6,182,212,0.4)",
    icon:      "⚡",
    firestore: "Phoenix NQ Engine",
    config: {
      "Mode":       "CRT M5 NQ",
      "Anchor":     "08:00 AM NY (pre-open H1)",
      "Entry":      "M5 close inside range + EMA8",
      "SL":         "Sweep wick + 5 pts padding",
      "TP":         "Opposite range extreme (static)",
      "BE":         "50% of TP distance",
      "Stagnation": "3 M5 bars (15 min)",
      "Filters":    "H1 bias optional",
    },
    changelog: [
      { version:"v2.2", date:"Jun 2026", note:"Heartbeat fix (15-min BOT_INIT). OPENED sends tp1. CLOSED sends tpReached+isRunner. PHX_Memory — Drawdown Kill survives re-add; no double-entry on re-attach." },
      { version:"v2.1", date:"Jun 2026", note:"CRT rebuild — 4-state machine (IDLE→RANGE→SWEEP→TRADE). Pre-NY H1 anchor. 50% BE. 3-bar stagnation fuse. Invalidation candle rule." },
      { version:"v2.0", date:"Jun 2026", note:"SMC rebuild — 1-bar open delay. BOS confirmation. OB + H1 bias." },
      { version:"v1.9", date:"May 2026", note:"Lot reduced 0.10→0.03. consecutiveLoss lookback 7d→2d." },
      { version:"v1.6", date:"Apr 2026", note:"SuperTrend + MACD + EMA150/250. News filter. EOD kill." },
      { version:"v1.0", date:"Mar 2026", note:"Initial NQ momentum engine." },
    ],
  },

]
