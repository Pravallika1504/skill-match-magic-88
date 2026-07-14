import { cn } from "@/lib/utils";

export function ScoreRing({ score, size = 96, label }: { score: number; size?: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color =
    clamped >= 80 ? "text-success" : clamped >= 60 ? "text-primary" : clamped >= 40 ? "text-warning" : "text-destructive";
  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn("fill-none transition-all duration-700", color)}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-bold tabular-nums", color)}>{clamped}</span>
        {label && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
