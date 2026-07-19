"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/StatTile";
import { StatusPill } from "@/components/StatusPill";
import { mockPositions } from "@/lib/mockData";
import { cn } from "@/lib/cn";
import { signed, sol } from "@/lib/format";

export default function PortfolioPage() {
  const { connected } = useWallet();
  const positions = useMemo(() => (connected ? mockPositions() : []), [connected]);

  const totalValue = positions.reduce((s, p) => s + p.valueSol, 0);
  const totalPnl = positions.reduce((s, p) => s + (p.valueSol - p.costSol), 0);

  const byMarket = useMemo(() => {
    const map = new Map<string, typeof positions>();
    for (const p of positions) {
      const arr = map.get(p.marketTitle) ?? [];
      arr.push(p);
      map.set(p.marketTitle, arr);
    }
    return [...map.entries()];
  }, [positions]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 pb-20 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl">Portfolio</h1>
          <p className="mt-1 text-muted">Your positions, value, and P&amp;L.</p>
        </div>
        {connected && (
          <div className="flex gap-3">
            <StatTile label="Total value" value={sol(totalValue)} />
            <StatTile
              label="P&L"
              value={signed(totalPnl)}
              accent={totalPnl >= 0 ? "accent" : "danger"}
            />
          </div>
        )}
      </div>

      {!connected ? (
        <Card className="grid place-items-center gap-3 p-12 text-center">
          <p className="text-muted">Connect a wallet to see your positions.</p>
          <Link href="/markets" className="text-sm font-medium text-accent hover:underline">
            Browse markets →
          </Link>
        </Card>
      ) : (
        byMarket.map(([title, rows]) => (
          <Card key={title} className="overflow-hidden">
            <div className="border-b border-line px-5 py-3 text-sm font-semibold">{title}</div>
            <div className="divide-y divide-line/60">
              {rows.map((p) => {
                const pnl = p.valueSol - p.costSol;
                return (
                  <div key={`${p.marketId}-${p.index}`} className="flex items-center gap-4 px-5 py-4">
                    <span className="text-2xl" aria-hidden>{p.flag}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.team}</span>
                        <StatusPill status={p.status} />
                      </div>
                      <div className="tnum mt-0.5 text-sm text-muted">
                        {p.shares.toFixed(3)} sh · cost {sol(p.costSol)} · now {sol(p.valueSol)}
                      </div>
                    </div>
                    <span className={cn("tnum text-sm font-medium", pnl >= 0 ? "text-accent" : "text-danger")}>
                      {signed(pnl)}
                    </span>
                    {p.marketStatus === "resolved" && p.status === "won" ? (
                      <Button size="sm" variant="success" onClick={() => toast.success(`Redeemed ${p.team}`)}>
                        Redeem
                      </Button>
                    ) : p.status === "alive" ? (
                      <Button size="sm" variant="secondary" onClick={() => toast(`Exit ${p.team} from the market page`)}>
                        Exit
                      </Button>
                    ) : (
                      <span className="w-[68px] text-right text-xs text-muted">-</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
