import { cn } from "@/lib/cn";

export function StatTile({
  label,
  value,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "accent" | "gold" | "danger" | "muted";
  className?: string;
}) {
  const color =
    accent === "accent"
      ? "text-accent"
      : accent === "gold"
        ? "text-gold"
        : accent === "danger"
          ? "text-danger"
          : "text-text";
  return (
    <div className={cn("rounded-xl border border-line bg-panel-2/50 px-4 py-3", className)}>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("tnum mt-0.5 text-lg font-semibold", color)}>{value}</div>
    </div>
  );
}
