"use client";

export function ConvictionGauge({
  value,
  label = "CONVICTION",
}: {
  value: number;
  label?: string;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const color =
    value >= 70
      ? "#10b981"
      : value >= 40
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full -rotate-90"
        >
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          {/* Fill */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono" style={{ color }}>
            {value}
          </span>
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider">%</span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</span>
    </div>
  );
}
