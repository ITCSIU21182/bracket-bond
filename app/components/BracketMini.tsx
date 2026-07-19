import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { cents } from "@/lib/format";
import type { Market } from "@/lib/types";

/** Illustrative compact knockout tree: top alive teams feed two semis → final. */
export function BracketMini({ market }: { market: Market }) {
  const alive = market.teams
    .filter((t) => t.status !== "eliminated")
    .sort((a, b) => b.mark - a.mark);
  const slots = alive.slice(0, 4);
  const leader = slots[0];

  const Node = ({ i }: { i: number }) => {
    const t = slots[i];
    if (!t) return <div className="h-9 rounded-lg border border-dashed border-line/60" />;
    return (
      <div className="flex h-9 items-center gap-2 rounded-lg border border-line bg-panel-2/50 px-2.5 text-sm">
        <span aria-hidden>{t.flag}</span>
        <span className="truncate">{t.team}</span>
        <span className="tnum ml-auto text-xs text-muted">{cents(t.mark)}</span>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-3 text-xs uppercase tracking-wide text-muted">Road to the final</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-2">
        <div className="space-y-2">
          <Node i={0} />
          <Node i={1} />
        </div>
        <div className="h-16 w-4 rounded-l-none border-y border-r border-line/60" />
        <div />

        <div className="col-span-3 my-1 flex items-center justify-center">
          {leader ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/5 px-3 py-1.5 text-sm shadow-glow-gold">
              <Trophy className="h-4 w-4 text-gold" />
              <span aria-hidden>{leader.flag}</span>
              <span className="font-medium">{leader.team}</span>
              <span className="tnum text-xs text-muted">favourite</span>
            </div>
          ) : null}
        </div>

        <div />
        <div className="h-16 w-4 rounded-r-none border-y border-l border-line/60" />
        <div className="space-y-2">
          <Node i={2} />
          <Node i={3} />
        </div>
      </div>
    </div>
  );
}
