"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { SettlementFeedItem } from "@/components/SettlementFeedItem";
import { ProofReceipt } from "@/components/ProofReceipt";
import { FifaResults } from "@/components/FifaResults";
import { Card } from "@/components/ui/Card";
import { settlementFeed } from "@/lib/mockData";
import type { SettlementEvent } from "@/lib/types";
import type { FifaMatch, FifaTeam } from "@/lib/fifa";

export default function ActivityPage() {
  const [now, setNow] = useState(0);
  const [events, setEvents] = useState<SettlementEvent[]>([]);
  const [selected, setSelected] = useState<SettlementEvent | null>(null);
  const [matches, setMatches] = useState<FifaMatch[] | null>(null);
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
          setMatches(d.matches ?? []);
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

      {matches && matches.length > 0 && (
        <section>
          <div className="mb-5">
            <h2 className="display text-3xl">2026 knockout results</h2>
            <p className="mt-1 text-sm text-muted">
              Real match results - the actual data a proof would settle. Settlement stays on TxLINE.
            </p>
          </div>
          <FifaResults matches={matches} winner={winner} />
        </section>
      )}

      <ProofReceipt event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
