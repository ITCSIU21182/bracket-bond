"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Radio,
  ExternalLink,
  Droplets,
  Wallet,
  ShoppingCart,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/StatTile";
import { StatusPill } from "@/components/StatusPill";
import { MarkTicker } from "@/components/MarkTicker";
import { ProbBar } from "@/components/ProbBar";
import { LiveBadge } from "@/components/LiveBadge";
import { Button } from "@/components/ui/Button";
import { WalletButton } from "@/components/WalletButton";
import { TradeSheet } from "@/components/TradeSheet";
import { useBracketBond } from "@/lib/useBracketBond";
import { team } from "@/lib/teams";
import { cents, lamportsToSol, solscanTx, truncate } from "@/lib/format";
import type { OutcomeView } from "@/lib/bracketBond";
import type { TeamOutcome } from "@/lib/types";

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID ?? "EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U";
const MARKET_ID = process.env.NEXT_PUBLIC_MARKET_ID || "777";
const FAUCET = "https://faucet.solana.com/";

export default function LivePage() {
  const bb = useBracketBond(Number(MARKET_ID));
  const [sheet, setSheet] = useState<{ open: boolean; outcome: OutcomeView | null }>({
    open: false,
    outcome: null,
  });

  const asTeamOutcome = (o: OutcomeView): TeamOutcome => {
    const t = team(o.teamId);
    return {
      index: o.index,
      team: t.name,
      flag: t.flag,
      mark: o.mark,
      status: o.status,
      sharesOutstanding: Number(o.sharesOutstanding),
    };
  };

  const confirmBuy = useCallback(
    async (amt: number) => {
      if (!sheet.outcome) return;
      return await bb.buy(sheet.outcome.index, Math.floor(amt * 1e9));
    },
    [bb, sheet.outcome],
  );

  const runTx = useCallback(
    async (verb: string, name: string, fn: () => Promise<string>) => {
      const id = toast.loading(`${verb} ${name}…`);
      try {
        const sig = await fn();
        toast.success(`${verb === "Exiting" ? "Exited" : "Redeemed"} ${name}`, {
          id,
          description: "Confirmed on devnet",
          action: { label: "Solscan", onClick: () => window.open(solscanTx(sig), "_blank") },
        });
      } catch (e) {
        toast.error(`${verb} failed`, { id, description: String((e as Error)?.message ?? e).slice(0, 110) });
      }
    },
    [],
  );

  const resolved = bb.market?.status === "resolved";
  const balanceSol = bb.balance === null ? null : bb.balance / 1e9;
  const lowBalance = bb.connected && balanceSol !== null && balanceSol < 0.02;

  return (
    <div className="mx-auto max-w-4xl px-5 pb-20 pt-10">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/25">
          <Radio className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="display text-4xl">Live on-chain market</h1>
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
              Real · Solana devnet
            </span>
          </div>
          <p className="mt-1 text-muted">
            This is the real market - every buy and exit is a signed transaction on Solana. The{" "}
            <Link href="/markets" className="text-brand-2 hover:underline">
              Markets
            </Link>{" "}
            tab is a labelled demo.
          </p>
        </div>
      </div>

      {/* Wallet / how-to bar */}
      <div className="mt-6">
        {bb.connected ? (
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-panel-2 text-accent">
                <Wallet className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <div className="tnum text-sm font-medium">
                  {bb.walletPubkey ? truncate(bb.walletPubkey.toBase58(), 4, 4) : ""}
                </div>
                <div className="tnum text-xs text-muted">
                  {balanceSol === null ? "-" : `${balanceSol.toFixed(3)} ◎ on devnet`}
                </div>
              </div>
            </div>
            <a
              href={FAUCET}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                lowBalance
                  ? "border-gold/50 bg-gold/10 text-gold hover:border-gold/70"
                  : "border-line bg-panel-2 text-muted hover:text-text"
              }`}
            >
              <Droplets className="h-3.5 w-3.5" />
              {lowBalance ? "Low balance - get devnet SOL" : "Devnet faucet"}
            </a>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-semibold">Connect a wallet to trade</div>
                <p className="mt-0.5 text-sm text-muted">Phantom or Coin98, set to Solana devnet.</p>
              </div>
              <WalletButton />
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm text-muted sm:flex-row sm:items-center sm:gap-4">
              <Step n="1" icon={<Wallet className="h-3.5 w-3.5" />} label="Connect (devnet)" />
              <ArrowRight className="hidden h-3.5 w-3.5 text-muted-2 sm:block" />
              <Step
                n="2"
                icon={<Droplets className="h-3.5 w-3.5" />}
                label={
                  <a href={FAUCET} target="_blank" rel="noreferrer" className="text-brand-2 hover:underline">
                    Get free devnet SOL
                  </a>
                }
              />
              <ArrowRight className="hidden h-3.5 w-3.5 text-muted-2 sm:block" />
              <Step n="3" icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Buy a team" />
            </div>
          </Card>
        )}
      </div>

      {/* Market */}
      <div className="mt-6">
        {!bb.market && !bb.error && (
          <Card className="p-6 text-sm text-muted">Loading the live market from Solana…</Card>
        )}

        {!bb.market && bb.error && (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-panel-2 text-muted-2">
              <Radio className="h-6 w-6" />
            </span>
            <p className="text-text">No live market is running right now.</p>
            <p className="max-w-md text-sm text-muted">
              When a market is live on-chain, its real state streams here straight from Solana. In the
              meantime, explore the markets to see how it works.
            </p>
            <Link href="/markets" className="mt-1 text-sm font-medium text-accent hover:underline">
              Browse markets →
            </Link>
          </Card>
        )}

        {bb.market && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="display text-3xl">{bb.market.title}</h2>
                {resolved ? (
                  <span className="rounded-full border border-gold/40 bg-gold/5 px-2.5 py-1 text-xs text-gold">
                    resolved
                  </span>
                ) : (
                  <LiveBadge label="On-chain" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => bb.refresh()}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel-2 text-muted transition-colors hover:text-text"
                  aria-label="Refresh"
                  title="Refresh from chain"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                {bb.marketPda && (
                  <a
                    href={`https://solscan.io/account/${bb.marketPda.toBase58()}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="tnum inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm text-accent hover:border-accent/50"
                  >
                    market on Solscan <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Pool" value={lamportsToSol(bb.market.totalCollateral, 3)} />
              <StatTile label="Round" value={bb.market.round} />
              <StatTile label="Alive" value={bb.market.aliveCount} accent="accent" />
              <StatTile
                label="Winner"
                value={bb.market.winnerIndex === null ? "-" : `#${bb.market.winnerIndex}`}
                accent={bb.market.winnerIndex === null ? "muted" : "gold"}
              />
            </div>

            <div className="space-y-2.5">
              {bb.outcomes.map((o) => {
                const t = team(o.teamId);
                const eliminated = o.status === "eliminated";
                const won = o.status === "won";
                const held = (bb.positions[o.index] ?? 0n) > 0n;
                return (
                  <div
                    key={o.index}
                    className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
                      won
                        ? "border-gold/40 bg-gold/[0.04]"
                        : eliminated
                          ? "border-line/60 bg-panel-2/30 opacity-55"
                          : "border-line bg-panel-2/40"
                    }`}
                  >
                    <span className="text-2xl" aria-hidden>
                      {t.flag}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${eliminated ? "line-through" : ""}`}>{t.name}</span>
                        <StatusPill status={o.status} />
                        {held && (
                          <span className="rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                            held
                          </span>
                        )}
                      </div>
                      <ProbBar value={o.mark} status={o.status} className="mt-2 max-w-[240px]" />
                    </div>

                    <div className="hidden w-16 flex-col items-end sm:flex">
                      <MarkTicker value={o.mark} size="lg" className={eliminated ? "text-muted" : ""} />
                    </div>

                    <div className="flex w-[132px] shrink-0 justify-end gap-2">
                      {resolved ? (
                        won && held ? (
                          <Button size="sm" variant="success" onClick={() => runTx("Redeeming", t.name, () => bb.redeem(o.index))}>
                            Redeem
                          </Button>
                        ) : won ? (
                          <span className="text-xs text-gold">winner</span>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )
                      ) : eliminated ? (
                        <span className="text-xs text-muted">out</span>
                      ) : (
                        <>
                          <Button size="sm" variant="success" onClick={() => setSheet({ open: true, outcome: o })}>
                            Buy
                          </Button>
                          {held && (
                            <Button size="sm" variant="secondary" onClick={() => runTx("Exiting", t.name, () => bb.sellAll(o.index))}>
                              Exit
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-muted-2">
              Real market on {PROGRAM_ID.slice(0, 6)}…{PROGRAM_ID.slice(-4)} · Solana devnet · play money.
              Winning shares redeem from the pot after the round settles by proof.
            </p>
          </div>
        )}
      </div>

      <TradeSheet
        open={sheet.open}
        mode="buy"
        outcome={sheet.outcome ? asTeamOutcome(sheet.outcome) : null}
        feeBps={200}
        connected={bb.connected}
        onClose={() => setSheet({ open: false, outcome: null })}
        onConfirm={confirmBuy}
      />
    </div>
  );
}

function Step({ n, icon, label }: { n: string; icon: React.ReactNode; label: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-panel-2 text-[11px] font-semibold text-muted-2">
        {n}
      </span>
      <span className="inline-flex items-center gap-1.5 text-text">
        {icon}
        {label}
      </span>
    </span>
  );
}
