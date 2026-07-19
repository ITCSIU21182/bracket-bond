import { cn } from "@/lib/cn";

/** Broadcast-style pulsing LIVE badge for open / in-play markets. */
export function LiveBadge({ className, label = "Live" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-danger",
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
      </span>
      {label}
    </span>
  );
}

/** "Powered by TxLINE / TxODDS" data-source chip. */
export function DataSource({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-2", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      Odds &amp; scores: TxLINE / TxODDS
    </span>
  );
}
