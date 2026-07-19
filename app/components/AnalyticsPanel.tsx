"use client";

import { TrendingUp } from "lucide-react";
import { Card } from "./ui/Card";
import { StatTile } from "./StatTile";
import { BarChart } from "./charts/BarChart";
import { USAGE, volumeSeries } from "@/lib/mockData";
import { sol } from "@/lib/format";

/** Protocol usage/traffic summary - KPIs + 14-day volume, for the submission story. */
export function AnalyticsPanel() {
  return (
    <section>
      <div className="eyebrow mb-3 text-brand-2">Protocol activity</div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Total volume" value={sol(USAGE.totalVolumeSol)} accent="accent" />
          <StatTile label="Traders" value={USAGE.traders} />
          <StatTile label="Markets" value={USAGE.markets} />
          <StatTile label="Proof settlements" value={USAGE.proofSettlements} accent="accent" />
        </div>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="text-sm font-semibold">Volume · last 14 days</div>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
              <TrendingUp className="h-3.5 w-3.5" /> +{USAGE.volume24h}% 24h
            </span>
          </div>
          <BarChart data={volumeSeries()} color="#4785fc" unit="◎" height={130} />
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-muted-2">
            <span>14 days ago</span>
            <span>today</span>
          </div>
        </Card>
      </div>
    </section>
  );
}
