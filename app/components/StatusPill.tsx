import { cn } from "@/lib/cn";
import type { OutcomeStatus } from "@/lib/types";

const STYLES: Record<OutcomeStatus, string> = {
  alive: "text-accent border-accent/50 bg-accent/5",
  eliminated: "text-danger border-danger/40 bg-danger/5 line-through",
  won: "text-gold border-gold/50 bg-gold/5 shadow-glow-gold",
};

const LABELS: Record<OutcomeStatus, string> = {
  alive: "alive",
  eliminated: "eliminated",
  won: "won",
};

export function StatusPill({ status, className }: { status: OutcomeStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
