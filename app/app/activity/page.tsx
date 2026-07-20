"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Trophy, CheckCircle2 } from "lucide-react";
import { SettlementFeedItem } from "@/components/SettlementFeedItem";
import { ProofReceipt } from "@/components/ProofReceipt";
import { Card } from "@/components/ui/Card";
import { settlementFeed } from "@/lib/mockData";
import type { SettlementEvent } from "@/lib/types";
import type { FifaResult, FifaTeam } from "@/lib/fifa";

export default function ActivityPage() {
  const [now, setNow] = useState(0);
  const [events, setEvents] = useState<SettlementEvent[]>([]);
  const [selected, setSelected] = useState<SettlementEvent | null>(null);
  const [results, setResults] = useState<FifaResult[] | null>(null);
  const [winner, setWinner] = useState<FifaTeam | null>(null);

  useEffect(() => {
    const t = Date.now();
    setNow(t);
    setEvents(settlementFeed(t));
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetch("/api/fifa")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setResults(d.results ?? []);
          setWinner(d.winner ?? null);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-5 pb-20 pt-10">
      <section className="space-y-6">
        <div>
          <h1 className="display text-4xl">Activity</h1>
          <p className="mt-1 text-muted">
            Every knockout round, settled by a cryptographic proof. Tap one to open its receipt.
          </p>
        </div>

        <Card className="flex items-center gap-3 border-accent/25 bg-accent/[0.03] p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-accent" />
          <p className="text-sm text-muted">
            The top entry is <span className="text-text">verified live on devnet</span> - a real
            knockout eliminated by proof, no human oracle.
          </p>
        </Card>

        <div className="space-y-2.5">
          {events.map((e) => (
            <SettlementFeedItem key={e.id} event={e} now={now} showMarket onClick={() => setSelected(e)} />
          ))}
        </div>
      </section>

      {/* Real knockout results from the FIFA API (display data, not on-chain settlement) */}
      {results && results.length > 0 && (
        <section>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="display text-2xl">2026 knockout results</h2>
            <span className="eyebrow text-muted-2">source: FIFA API</span>
          </div>
          <p className="mb-4 text-sm text-muted">
            Real match results (scores, shootouts, winner) from the FIFA API - the actual data a
            proof would settle. Odds/marks aren&apos;t from here; settlement stays on TxLINE.
          </p>

          {winner && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/[0.06] px-4 py-3 shadow-glow-gold">
              <Trophy className="h-5 w-5 text-gold" />
              <span className="text-sm">
                Champion: <span aria-hidden>{winner.flag}</span> <span className="font-semibold">{winner.name}</span>
              </span>
            </div>
          )}

          <div className="space-y-2">
            {[...results].reverse().map((r) => (
              <div
                key={r.fixtureId}
                className="flex items-center gap-3 rounded-xl border border-line bg-panel-2/30 px-3.5 py-3"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-muted-2" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <span aria-hidden>{r.flag}</span>
                    <span className="truncate">{r.team} eliminated</span>
                  </div>
                  <div className="tnum mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="text-text">{r.fixture}</span>
                    <span>· {r.round}</span>
                    {r.wentToPenalties && <span className="text-gold">· pens {r.pens}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ProofReceipt event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
