"use client";

import { useState } from "react";
import { CircleUser } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LiveBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTrump } from "@/lib/hooks";
import type { TrumpPolicyCategory } from "@/types";

const FILTER_TAGS: (TrumpPolicyCategory | "ALL")[] = [
  "ALL", "Tariffs", "China", "Fed", "Crypto", "Oil", "Trade-Policy", "Geopolitics", "Iran",
];

const SENTIMENT_COLORS = {
  bullish: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  bearish: "text-red-400 bg-red-500/10 border-red-500/20",
  neutral: "text-zinc-400 bg-zinc-800 border-zinc-700/30",
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TrumpMonitorPage() {
  const [activeFilter, setActiveFilter] = useState<TrumpPolicyCategory | "ALL">("ALL");
  const { data: posts, meta, loading } = useTrump(120_000);

  const filtered = activeFilter === "ALL"
    ? posts
    : posts.filter((p) => p.policyCategory === activeFilter);

  const maxThemeCount = meta ? Math.max(...Object.values(meta.themeCounts)) : 1;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trump Monitor</h1>
          <p className="text-xs text-[var(--t-muted)] mt-0.5">Policy posts and market impact tracker</p>
        </div>
        <LiveBadge />
      </div>

      {/* Impact + Themes */}
      {meta && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Trump Impact Score</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black font-mono text-amber-400">{meta.avgImpact}</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{meta.avgImpact > 7 ? "HIGH IMPACT" : meta.avgImpact > 4 ? "MEDIUM IMPACT" : "LOW IMPACT"}</p>
                  <p className="text-[10px] text-zinc-500">{meta.avgImpact}/10 average</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Current Themes</p>
              <div className="space-y-1.5">
                {Object.entries(meta.themeCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([theme, count]) => (
                    <div key={theme} className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 w-24 shrink-0">{theme}</span>
                      <div className="flex-1 h-1 bg-zinc-800 rounded-full">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${(count / maxThemeCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 w-4 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tags */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveFilter(tag)}
            className={cn(
              "px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors",
              activeFilter === tag
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-zinc-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded border",
                      SENTIMENT_COLORS[post.sentimentClassification]
                    )}>
                      {post.impactScore >= 7 ? "HIGH" : "MEDIUM"} IMPACT
                    </span>
                    <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                      {post.policyCategory}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CircleUser className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-[10px] text-zinc-500">Trump · {timeAgo(post.timestamp)}</span>
                    <span className="text-[10px] text-zinc-600">via {post.source}</span>
                  </div>
                </div>

                <p className="text-sm text-foreground leading-relaxed mb-3">"{post.content}"</p>

                <div className="border-t border-[var(--t-border)] pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Why it matters</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{post.whyItMatters}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Potential reaction</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{post.potentialReaction}</p>
                  </div>
                </div>

                {post.affectedAssets.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {post.affectedAssets.map((a) => (
                      <span key={a} className="text-[9px] text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
