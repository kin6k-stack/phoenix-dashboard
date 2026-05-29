"use client";

import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSessions } from "@/lib/hooks";

const SESSION_LABELS = {
  sydney:   { label: "Sydney",   hours: "22:00–07:00 UTC", flag: "🇦🇺" },
  asia:     { label: "Asia",     hours: "00:00–09:00 UTC", flag: "🇯🇵" },
  london:   { label: "London",   hours: "08:00–17:00 UTC", flag: "🇬🇧" },
  "new-york": { label: "New York", hours: "13:00–22:00 UTC", flag: "🇺🇸" },
};

const VOL_COLORS = {
  low: "text-zinc-400",
  moderate: "text-amber-400",
  high: "text-orange-400",
  extreme: "text-red-400",
};

export default function SessionIntelligencePage() {
  const { data: sessions, currentSession, loading } = useSessions();

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Trading Sessions</h1>
        <p className="text-xs text-[var(--t-muted)] mt-0.5">
          Session intelligence — key moves, volatility, and carry-forward context
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-zinc-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => {
            const meta = SESSION_LABELS[session.session];
            const isActive = session.status === "active";
            const isOpening = session.status === "opening";

            return (
              <Card
                key={session.session}
                className={cn(
                  isActive
                    ? "border-emerald-500/30 shadow-[0_0_30px_rgba(0,200,100,0.05)]"
                    : ""
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{meta.flag}</span>
                        <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
                        {isActive && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping absolute" />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 relative" />
                            ACTIVE
                          </span>
                        )}
                        {isOpening && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">OPENING SOON</span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{meta.hours}</p>
                    </div>
                    <span className={cn("text-[10px] font-semibold uppercase", VOL_COLORS[session.volatilityTone])}>
                      {session.volatilityTone}
                    </span>
                  </div>

                  {session.keyMoves.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Key Moves</p>
                      <ul className="space-y-1">
                        {session.keyMoves.map((move, i) => (
                          <li key={i} className="text-[11px] text-zinc-400 flex items-start gap-1.5">
                            <span className="text-emerald-500 shrink-0 mt-0.5">→</span>
                            {move}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-500 leading-relaxed mb-2">{session.liquidityNotes}</p>

                  {session.carriesForward && (
                    <div className="border-t border-[var(--t-border)] pt-2 mt-2">
                      <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Carries Forward</p>
                      <p className="text-[11px] text-blue-400/70 leading-relaxed">{session.carriesForward}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
