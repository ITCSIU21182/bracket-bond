"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft, Play } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/StatTile";
import { OutcomeRow } from "@/components/OutcomeRow";
import { BracketMini } from "@/components/BracketMini";
import { SettlementFeedItem } from "@/components/SettlementFeedItem";
import { LiveBadge, DataSource } from "@/components/LiveBadge";
import { DemoBadge, DemoBanner } from "@/components/DemoBanner";
import { ProofReceipt } from "@/components/ProofReceipt";
import { TradeSheet, type TradeMode } from "@/components/TradeSheet";
import { AreaChart } from "@/components/charts/AreaChart";
import { marketById, markHistory, mockPositions, settlementFeed } from "@/lib/mockData";
import type { Market, SettlementEvent, TeamOutcome } from "@/lib/types";
import { cents, sol } from "@/lib/format";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function MarketDetail() {
  const params = useParams();
  const id = Number(params.id);
  const base = useMemo(() => marketById(id), [id]);
  if (!base) notFound();

  const { connected } = useWallet();
  const [market, setMarket] = useState<Market>(() => structuredClone(base!));
  const [feed, setFeed] = useState<SettlementEvent[]>([]);
  const [now, setNow] = useState(0);
  const [proofEvent, setProofEvent] = useState<SettlementEvent | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; mode: TradeMode; outcome: TeamOutcome | null }>({
    open: false,
    mode: "buy",
    outcome: null,
  });

  // Mark-history chart: pick an outcome (default the current leader). Built from
  // stable base data so it doesn't redraw when live marks jitter.
  const aliveBase = base!.teams.filter((t) => t.status !== "eliminated");
  const [chartIdx, setChartIdx] = useState(
    () => [...base!.teams].sort((a, b) => b.mark - a.mark)[0].index,
  );
  const chartOutcome = base!.teams.find((t) => t.index === chartIdx) ?? base!.teams[0];
  const history = useMemo(
    () => markHistory(base!.id * 10 + chartOutcome.index, chartOutcome.mark),
    [base, chartOutcome.index, chartOutcome.mark],
  );

  // Init clock + this market's settlement feed (client-only to avoid hydration drift).
  useEffect(() => {
    const t = Date.now();
    setNow(t);
    setFeed(settlementFeed(t).filter((e) => e.marketId === id));
  }, [id]);

  // Live clock for relative timestamps.
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Make marks feel live: gently jitter alive outcomes so the tickers animate.
  useEffect(() => {
    if (market.status !== "open") return;
    const iv = setInterval(() => {
      setMarket((m) => ({
        ...m,
        teams: m.teams.map((t) =>
          t.status === "alive"
            ? { ...t, mark: clamp(t.mark + (Math.random() - 0.5) * 0.05, 0.03, 0.96) }
            : t,
        ),
      }));
    }, 2600);
    return () => clearInterval(iv);
  }, [market.status]);

  const resolved = market.status === "resolved";

  const openSheet = useCallback((mode: TradeMode, outcome: TeamOutcome) => {
    setSheet({ open: true, mode, outcome });
  }, []);

  const confirmTrade = useCallback(async () => {
    // Mock settlement latency. Live mode swaps this for the real client tx.
    await sleep(900);
  }, []);

  const onRedeem = useCallback((o: TeamOutcome) => {
    toast.success(`Redeemed ${o.team}`, { description: "winning shares → pro-rata slice of the pot" });
  }, []);

  // Demo control: replay the next elimination as a proof event (matches are over
  // by judging, so this reproduces the signature settle moment on demand).
  const replaySettlement = useCallback(() => {
    setMarket((m) => {
      const alive = m.teams.filter((t) => t.status === "alive");
      if (alive.length <= 1) {
        toast.info("Only the finalist remains.");
        return m;
      }
      const loser = alive.reduce((a, b) => (a.mark <= b.mark ? a : b));
      const ev: SettlementEvent = {
        id: `replay-${loser.index}-${Date.now()}`,
        marketId: m.id,
        marketTitle: m.title,
        team: loser.team,
        flag: loser.flag,
        fixture: `${loser.team} 0 - 1 opponent`,
        fixtureId: loser.fixtureId ?? 0,
        predicate: "goals(opp) − goals(this) > 0  →  true",
        merkleRoot: "0x" + Math.abs(hash(loser.team)).toString(16).padStart(40, "0").slice(0, 40),
        txSig: `REPLAY${Math.abs(hash(loser.team + Date.now()))}devnetPROOFsettleRoundExampleTx`,
        tsMs: Date.now(),
        wentToPenalties: false,
        round: m.roundLabel,
      };
      setFeed((f) => [ev, ...f]);
      setProofEvent(ev);
      return {
        ...m,
        teams: m.teams.map((t) => (t.index === loser.index ? { ...t, status: "eliminated", mark: 0 } : t)),
      };
    });
  }, []);

  const aliveCount = market.teams.filter((t) => t.status !== "eliminated").length;
  const yourPositionSol = connected
    ? mockPositions()
        .filter((p) => p.marketId === id)
        .reduce((s, p) => s + p.valueSol, 0)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-10">
      <Link href="/markets" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" /> Markets
      </Link>

      <DemoBanner className="mt-4" />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display text-4xl sm:text-5xl">{market.title}</h1>
            {!resolved && (market.live ? <LiveBadge /> : <DemoBadge />)}
          </div>
          <p className="mt-1 text-muted">{market.subtitle}</p>
          <DataSource className="mt-2.5" />
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-sm ${
            resolved ? "border-gold/40 bg-gold/5 text-gold" : "border-accent/40 bg-accent/5 text-accent"
          }`}
        >
          {market.roundLabel} · {market.status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Pool" value={sol(market.poolSol)} />
        <StatTile label="24h volume" value={sol(market.volume24hSol ?? 0)} accent="accent" />
        <StatTile
          label="Your position"
          value={connected ? sol(yourPositionSol) : "-"}
          accent={connected ? "accent" : "muted"}
        />
        <StatTile label="Teams alive" value={aliveCount} />
        <StatTile label="Fee" value={`${(market.feeBps / 100).toFixed(0)}%`} accent="muted" />
      </div>

      {/* Mark-history chart */}
      <Card className="mt-6 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="eyebrow text-muted-2">Mark history · implied probability</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl leading-none">{chartOutcome.flag}</span>
              <span className="font-semibold">{chartOutcome.team}</span>
              <span className="tnum font-semibold text-brand-2">{cents(chartOutcome.mark)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {aliveBase.map((o) => (
              <button
                key={o.index}
                onClick={() => setChartIdx(o.index)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                  o.index === chartIdx
                    ? "border-brand-2/60 bg-brand/10 text-text"
                    : "border-line text-muted hover:border-line-soft hover:text-text",
                )}
              >
                {o.flag} {o.team}
              </button>
            ))}
          </div>
        </div>
        <AreaChart points={history} color="#4785fc" height={180} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Left: outcomes */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Outcomes</h2>
            <span className="text-xs text-muted">mark = implied “reaches the final”</span>
          </div>
          <div className="space-y-2.5">
            {market.teams.map((o) => (
              <OutcomeRow
                key={o.index}
                outcome={o}
                resolved={resolved}
                connected={connected}
                onBuy={(t) => openSheet("buy", t)}
                onExit={(t) => openSheet("exit", t)}
                onRedeem={onRedeem}
              />
            ))}
          </div>
        </div>

        {/* Right: bracket + settlement feed */}
        <div className="space-y-6">
          <Card className="p-5">
            <BracketMini market={market} />
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Settlement feed</h2>
              {!resolved && (
                <button
                  onClick={replaySettlement}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-accent/50 hover:text-text"
                  title="Replay the next elimination as a proof event"
                >
                  <Play className="h-3 w-3" /> Replay a settlement
                </button>
              )}
            </div>
            <div className="space-y-2">
              {feed.length === 0 && <p className="text-sm text-muted">No settlements yet this market.</p>}
              {feed.map((e) => (
                <SettlementFeedItem key={e.id} event={e} now={now} onClick={() => setProofEvent(e)} />
              ))}
            </div>
          </Card>
        </div>
      </div>

      <TradeSheet
        open={sheet.open}
        mode={sheet.mode}
        outcome={sheet.outcome}
        feeBps={market.feeBps}
        connected={connected}
        positionShares={0.64}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onConfirm={confirmTrade}
      />
      <ProofReceipt event={proofEvent} onClose={() => setProofEvent(null)} />
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
