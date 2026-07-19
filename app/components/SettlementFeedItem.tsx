"use client";

import { ChevronRight, CheckCircle2 } from "lucide-react";
import { ago } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { SettlementEvent } from "@/lib/types";

export function SettlementFeedItem({
  event,
  now,
  onClick,
  showMarket = false,
}: {
  event: SettlementEvent;
  now: number;
  onClick: () => void;
  showMarket?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-line bg-panel-2/30 px-3.5 py-3 text-left transition-colors hover:border-accent/40 hover:bg-panel-2/60",
        event.real && "border-accent/30 bg-accent/[0.03]",
      )}
    >
      <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <span aria-hidden>{event.flag}</span>
          <span className="truncate">
            {event.team} eliminated
            {showMarket && <span className="text-muted"> · {event.marketTitle}</span>}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <span className="text-accent">proof verified</span>
          {event.wentToPenalties && <span className="text-gold">· shootout</span>}
          {event.real && <span className="text-accent">· live</span>}
          <span>· {ago(event.tsMs, now)}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </button>
  );
}
