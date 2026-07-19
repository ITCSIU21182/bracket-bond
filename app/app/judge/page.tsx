"use client";

import { useEffect, useState } from "react";
import { Gavel } from "lucide-react";
import { JudgeTimeline } from "@/components/JudgeTimeline";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { settlementFeed } from "@/lib/mockData";
import type { SettlementEvent } from "@/lib/types";

export default function JudgePage() {
  const [events, setEvents] = useState<SettlementEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const evs = settlementFeed(Date.now());
    setEvents(evs);
    setSelectedId(evs[0]?.id ?? null);
  }, []);

  const selected = events.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-10">
      <header className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand-2 ring-1 ring-brand/25">
          <Gavel className="h-5 w-5" />
        </span>
        <div>
          <h1 className="display text-4xl leading-none sm:text-5xl">Judge Mode</h1>
          <p className="mt-2 max-w-xl text-muted">
            Inspect any settled round end-to-end - source proof, on-chain CPI, elimination, bracket.
          </p>
        </div>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="eyebrow mb-3 text-muted-2">Settled rounds</div>
          <div className="space-y-2">
            {events.map((e) => {
              const active = e.id === selectedId;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                    active
                      ? "border-brand-2/50 bg-brand/[0.07]"
                      : "border-line bg-panel-2/30 hover:border-line-soft hover:bg-panel-2/50",
                  )}
                >
                  <span className="text-lg" aria-hidden>
                    {e.flag}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.team} eliminated</div>
                    <div className="truncate text-xs text-muted">{e.marketTitle}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {e.real && (
                      <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        live
                      </span>
                    )}
                    {e.wentToPenalties && (
                      <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-gold">
                        PK
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Detail */}
        <Card className="p-6 sm:p-8">
          {selected ? (
            <>
              <div className="mb-8 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-6">
                <div>
                  <div className="tnum text-xl font-semibold">{selected.fixture}</div>
                  <div className="mt-1 text-sm text-muted">
                    {selected.marketTitle} · {selected.round}
                  </div>
                </div>
                {selected.real && (
                  <span className="shrink-0 rounded-full border border-accent/40 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
                    verified on devnet
                  </span>
                )}
              </div>
              <JudgeTimeline event={selected} />
            </>
          ) : (
            <p className="text-muted">Select a settled round.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
