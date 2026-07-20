import Link from "next/link";
import { FlaskConical, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Amber "Demo" pill for illustrative (non-on-chain) market data. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold",
        className,
      )}
    >
      Demo
    </span>
  );
}

/** Honest banner: the market data is illustrative; the real, differentiating part
 *  (proof settlement) is verified on-chain. */
export function DemoBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-2.5 text-sm",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 rounded-md bg-gold/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
        <FlaskConical className="h-3 w-3" /> Demo data
      </span>
      <span className="text-muted">
        Illustrative market — the World Cup isn&apos;t live, so marks are simulated. The real part,{" "}
        <span className="text-text">settlement by proof</span>, is verified on-chain.
      </span>
      <Link href="/activity" className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
        See the real settlement <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
