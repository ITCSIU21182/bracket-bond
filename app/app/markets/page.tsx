import { MarketCard } from "@/components/MarketCard";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { DemoBanner } from "@/components/DemoBanner";
import { MARKETS } from "@/lib/mockData";

export default function MarketsPage() {
  const featured = MARKETS[0];
  const rest = MARKETS.slice(1);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-5 pb-20 pt-10">
      <div>
        <h1 className="display text-4xl">Markets</h1>
        <p className="mt-1 text-muted">
          Proof-settled World Cup markets. Trade a position, exit anytime, watch rounds
          settle on-chain.
        </p>
      </div>

      <DemoBanner />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Featured</h2>
        <MarketCard market={featured} featured />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">All markets</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {rest.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      </section>

      <AnalyticsPanel />
    </div>
  );
}
