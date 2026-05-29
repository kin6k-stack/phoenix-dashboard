"use client";

import { Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LiveBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCatalysts } from "@/lib/hooks";

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function CatalystsPage() {
  const { data: catalysts, loading } = useCatalysts(60_000);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Catalysts</h1>
          <p className="text-xs text-[var(--t-muted)] mt-0.5">Live and recent market-moving drivers</p>
        </div>
        <LiveBadge />
      </div>

      {/* Live TV Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-sm font-semibold">Live TV</h3>
          </div>
          <div className="aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-[var(--t-border)]">
            <iframe
              src="https://www.youtube.com/embed/live_stream?channel=UCIALMKvObZNtJ6AmdCLP7Lg&autoplay=1"
              className="w-full h-full"
              title="Bloomberg Live"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </CardContent>
      </Card>

      {/* Catalyst Events */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Breaking / Active</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 bg-zinc-900 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : catalysts.length > 0 ? (
          <div className="space-y-3">
            {catalysts.map((cat) => (
              <Card key={cat.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Zap className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      cat.impactScore >= 7 ? "text-red-400" : "text-amber-400"
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          cat.impactScore >= 7
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                        )}>
                          {cat.impactScore}/10
                        </span>
                        <span className="text-[10px] text-zinc-600">{cat.source} · {timeAgo(cat.timestamp)}</span>
                      </div>
                      <p className="text-sm text-foreground font-medium mb-1">{cat.headline}</p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">{cat.summary}</p>
                      {cat.affectedAssets.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {cat.affectedAssets.map((a) => (
                            <span key={a} className="text-[9px] text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full">{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Zap className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No active catalysts</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
