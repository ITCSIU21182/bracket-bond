import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-panel shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
