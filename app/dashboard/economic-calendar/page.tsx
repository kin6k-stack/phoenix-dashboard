"use client";

import { CalendarDays, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LiveBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCalendar } from "@/lib/hooks";

const IMPACT_STYLES = {
  high:   "bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded",
  medium: "bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded",
  low:    "bg-zinc-800 text-zinc-500 text-[9px] px-1.5 py-0.5 rounded",
};

const GOLD_IMPACT_COLORS = {
  bullish: "text-emerald-400",
  bearish: "text-red-400",
  neutral: "text-zinc-500",
};

function timeUntil(ts: number) {
  const diff = ts - Date.now();
  if (diff < 0) return "Past";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function EconomicCalendarPage() {
  const { data, summary, loading } = useCalendar();

  const upcoming = data.filter((e) => e.status === "upcoming");
  const completed = data.filter((e) => e.status === "completed");

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Economic Calendar</h1>
          <p className="text-xs text-[var(--t-muted)] mt-0.5">High-impact events — auto-analyzed for Gold & USD impact</p>
        </div>
        <LiveBadge />
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Gold Bias</p>
              <p className={cn("text-sm font-bold uppercase", GOLD_IMPACT_COLORS[summary.goldBias as keyof typeof GOLD_IMPACT_COLORS])}>
                {summary.goldBias}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Bullish Events</p>
              <p className="text-sm font-bold text-emerald-400">{summary.bullishCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Bearish Events</p>
              <p className="text-sm font-bold text-red-400">{summary.bearishCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-zinc-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={IMPACT_STYLES[event.impact]}>{event.impact.toUpperCase()}</span>
                            <span className="text-[10px] text-zinc-500">{event.currency}</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{event.event}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-[10px] text-amber-400">
                            <Clock className="h-3 w-3" />
                            {timeUntil(event.utcTimestamp)}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{event.time} UTC</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                        {[
                          { label: "Forecast", value: event.forecast ?? "—" },
                          { label: "Previous", value: event.previous ?? "—" },
                          { label: "Actual",   value: event.actual   ?? "—" },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-zinc-900 rounded p-2">
                            <p className="text-[9px] text-zinc-600 uppercase">{label}</p>
                            <p className="text-xs font-mono font-semibold text-foreground mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">
                            Gold Impact:{" "}
                            <span className={GOLD_IMPACT_COLORS[event.goldImpact]}>
                              {event.goldImpact.toUpperCase()}
                            </span>
                          </p>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">{event.goldReasoning}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Trade Implication</p>
                          <p className="text-[11px] text-emerald-400/80 leading-relaxed">{event.tradeImplication}</p>
                        </div>
                      </div>

                      {event.affectedAssets.length > 0 && (
                        <div className="flex gap-1 mt-3 flex-wrap">
                          {event.affectedAssets.map((a) => (
                            <span key={a} className="text-[9px] text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full">{a}</span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Completed</h2>
              <div className="space-y-2">
                {completed.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-3 bg-[var(--t-card)] border border-[var(--t-border)] rounded-lg opacity-60">
                    <span className={IMPACT_STYLES[event.impact]}>{event.impact.toUpperCase()}</span>
                    <span className="text-xs text-zinc-400 flex-1">{event.event}</span>
                    <span className="text-xs font-mono text-zinc-500">{event.actual ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
