import { cn } from "@/lib/utils";

type BiasType = "bullish" | "bearish" | "neutral" | "blocked" | "live";

const biasStyles: Record<BiasType, string> = {
  bullish:
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  bearish:
    "bg-red-500/10 text-red-400 border border-red-500/20",
  neutral:
    "bg-zinc-800/80 text-zinc-400 border border-zinc-700/30",
  blocked:
    "bg-red-500/10 text-red-400 border border-red-500/30 font-semibold tracking-wide",
  live:
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
};

interface BadgeProps {
  variant?: BiasType;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        biasStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      {label}
    </span>
  );
}
