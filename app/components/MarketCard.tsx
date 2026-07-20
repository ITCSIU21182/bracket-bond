import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Card } from "./ui/Card";
import { MarkTicker } from "./MarkTicker";
import { LiveBadge } from "./LiveBadge";
import { DemoBadge } from "./DemoBanner";
import { cn } from "@/lib/cn";
import { sol } from "@/lib/format";
import type { Market } from "@/lib/types";

export function MarketCard({ market, featured = false }: { market: Market; featured?: boolean }) {
  const top = [...market.teams]
    .filter((t) => t.status !== "eliminated")
    .sort((a, b) => b.mark - a.mark)
    .slice(0, featured ? 5 : 3);
  const aliveCount = market.teams.filter((t) => t.status !== "eliminated").length;

  return (
    <Link href={`/markets/${market.id}`} className="group block">
      <Card
        className={cn(
          "p-5 transition-all duration-200 hover:border-brand-2/40 hover:shadow-glow-blue",
          featured && "p-6",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className={cn(featured ? "display text-3xl" : "text-base font-semibold tracking-tight")}>
                {market.title}
              </h3>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
                  market.status === "open"
                    ? "border-accent/40 bg-accent/5 text-accent"
                    : "border-gold/40 bg-gold/5 text-gold",
                )}
              >
                {market.status}
              </span>
              {market.status === "open" && (market.live ? <LiveBadge /> : <DemoBadge />)}
            </div>
            <p className="mt-1 text-sm text-muted">{market.subtitle}</p>
          </div>
          <span className="rounded-lg border border-line bg-panel-2 px-2.5 py-1 text-xs text-muted">
            {market.roundLabel}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span className="tnum">
            <span className="text-muted">pool </span>
            <span className="font-semibold">{sol(market.poolSol)}</span>
          </span>
          <span className="text-muted">·</span>
          <span className="tnum">
            <span className="text-muted">24h vol </span>
            <span className="font-semibold">{sol(market.volume24hSol ?? 0)}</span>
          </span>
          <span className="text-muted">·</span>
          <span className="text-muted">{aliveCount} teams alive</span>
          <span className="text-muted">·</span>
          <span className="inline-flex items-center gap-1 text-accent">
            <ShieldCheck className="h-3.5 w-3.5" /> settles by proof
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line/70 pt-4">
          {top.map((t) => (
            <span key={t.index} className="inline-flex items-center gap-1.5 text-sm">
              <span aria-hidden>{t.flag}</span>
              <span className="text-muted">{t.team}</span>
              <MarkTicker value={t.mark} size="sm" showArrow={false} />
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end text-sm font-medium text-accent">
          View market
          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}
