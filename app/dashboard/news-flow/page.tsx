"use client";

import { useState } from "react";
import { Newspaper, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LiveBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNews } from "@/lib/hooks";
import type { NewsItem, NewsCategory } from "@/types";

const CATEGORIES: { label: string; value: NewsCategory | "all" }[] = [
  { label: "ALL", value: "all" },
  { label: "CENTRAL BANKS", value: "central-banks" },
  { label: "ECONOMY", value: "economy" },
  { label: "TARIFFS", value: "tariffs" },
  { label: "GEOPOLITICS", value: "geopolitics" },
  { label: "INFLATION", value: "inflation" },
  { label: "CRYPTO", value: "crypto" },
  { label: "COMMODITIES", value: "commodities" },
];

const IMPACT_COLORS = {
  bullish: "text-emerald-400 bg-emerald-500/10",
  bearish: "text-red-400 bg-red-500/10",
  neutral: "text-zinc-400 bg-zinc-800",
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="p-3 bg-[var(--t-card)] border border-[var(--t-border)] rounded-lg hover:bg-white/[0.01] transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] text-zinc-500">{item.source}</span>
            <span className="text-[10px] text-zinc-600">·</span>
            <span className="text-[10px] text-zinc-600">{timeAgo(item.timestamp)}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", IMPACT_COLORS[item.goldImpact])}>
              GOLD {item.goldImpact.toUpperCase()}
            </span>
            <span className="text-[10px] text-zinc-600 ml-auto">{item.impactScore}/10</span>
          </div>
          <p className="text-sm text-foreground leading-snug mb-2">{item.headline}</p>
          <p className="text-[11px] text-zinc-500 leading-relaxed">{item.goldReasoning}</p>
        </div>
      </div>
    </div>
  );
}

export default function NewsFlowPage() {
  const [activeCategory, setActiveCategory] = useState<NewsCategory | "all">("all");
  const { data: news, loading } = useNews(activeCategory === "all" ? undefined : activeCategory, 60_000);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">News Flow</h1>
          <p className="text-xs text-[var(--t-muted)] mt-0.5">Macro news and headline tracker</p>
        </div>
        <LiveBadge label="LIVE FEED" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              "px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors",
              activeCategory === cat.value
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : news.length > 0 ? (
        <div className="space-y-2">
          {news.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Newspaper className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No headlines in this category</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
