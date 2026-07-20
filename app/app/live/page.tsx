"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Radio, ExternalLink, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/StatTile";
import { StatusPill } from "@/components/StatusPill";
import { MarkTicker } from "@/components/MarkTicker";
import { ProbBar } from "@/components/ProbBar";
import { LiveBadge } from "@/components/LiveBadge";
import { BracketBondClient, MarketView, OutcomeView } from "@/lib/bracketBond";
import { team } from "@/lib/teams";
import { cents, lamportsToSol } from "@/lib/format";

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID ?? "EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U";
const MARKET_ID = process.env.NEXT_PUBLIC_MARKET_ID;

type State =
  | { kind: "unconfigured" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; market: MarketView; outcomes: OutcomeView[]; pda: string };

export default function LivePage() {
  const { connection } = useConnection();
  const [state, setState] = useState<State>(
    MARKET_ID ? { kind: "loading" } : { kind: "unconfigured" },
  );

  useEffect(() => {
    if (!MARKET_ID) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/idl/bracket_bond.json");
        if (!res.ok) throw new Error("IDL not found at /idl/bracket_bond.json — the build machine must copy it there.");
        const idl = (await res.json()) as Idl;
        const wallet = {
          publicKey: Keypair.generate().publicKey,
          signTransaction: async (t: any) => t,
          signAllTransactions: async (t: any) => t,
        };
        const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
        const client = BracketBondClient.fromIdl(idl, new PublicKey(PROGRAM_ID), provider);
        const marketPda = client.market(Number(MARKET_ID));
        const market = await client.getMarket(marketPda);
        const outcomes: OutcomeView[] = [];
        for (let i = 0; i < 12; i++) {
          try {
            outcomes.push(await client.getOutcome(marketPda, i));
          } catch {
            break;
          }
        }
        if (!cancelled)
          setState({ kind: "ready", market, outcomes, pda: marketPda.toBase58() });
      } catch (e) {
        if (!cancelled) setState({ kind: "error", message: (e as Error)?.message ?? String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connection]);

  return (
    <div className="mx-auto max-w-4xl px-5 pb-20 pt-10">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/25">
          <Radio className="h-5 w-5" />
        </span>
        <div>
          <h1 className="display text-4xl">Live on-chain</h1>
          <p className="text-muted">Read straight from the Bracket Bond program on Solana devnet — no mock data.</p>
        </div>
      </div>

      <div className="mt-8">
        {state.kind === "unconfigured" && (
          <Card className="flex items-start gap-3 p-6 text-sm text-muted">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
            <div>
              <p className="text-text">No live market configured yet.</p>
              <p className="mt-1">
                On a machine with the Anchor toolchain: run <span className="tnum">pnpm create:market</span>,
                copy the built IDL to <span className="tnum">app/public/idl/bracket_bond.json</span>, and set{" "}
                <span className="tnum">NEXT_PUBLIC_MARKET_ID</span> — then this page reads that market live.
                See <span className="tnum">docs/AGENT-HANDOFF.md</span>.
              </p>
            </div>
          </Card>
        )}

        {state.kind === "loading" && (
          <Card className="p-6 text-sm text-muted">Reading market {MARKET_ID} from devnet…</Card>
        )}

        {state.kind === "error" && (
          <Card className="flex items-start gap-3 p-6 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div>
              <p className="font-medium text-text">Couldn&apos;t read market {MARKET_ID}.</p>
              <p className="mt-1 text-muted">{state.message}</p>
            </div>
          </Card>
        )}

        {state.kind === "ready" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="display text-3xl">{state.market.title}</h2>
                {state.market.status === "open" ? <LiveBadge label="On-chain" /> : (
                  <span className="rounded-full border border-gold/40 bg-gold/5 px-2.5 py-1 text-xs text-gold">resolved</span>
                )}
              </div>
              <a
                href={`https://solscan.io/account/${state.pda}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="tnum inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm text-accent hover:border-accent/50"
              >
                market on Solscan <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Pool" value={lamportsToSol(state.market.totalCollateral, 3)} />
              <StatTile label="Round" value={state.market.round} />
              <StatTile label="Alive" value={state.market.aliveCount} accent="accent" />
              <StatTile
                label="Winner"
                value={state.market.winnerIndex === null ? "-" : `#${state.market.winnerIndex}`}
                accent={state.market.winnerIndex === null ? "muted" : "gold"}
              />
            </div>

            <div className="space-y-2.5">
              {state.outcomes.map((o) => {
                const t = team(o.teamId);
                const eliminated = o.status === "eliminated";
                return (
                  <div
                    key={o.index}
                    className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 ${
                      eliminated ? "border-line/60 bg-panel-2/30 opacity-55" : "border-line bg-panel-2/40"
                    }`}
                  >
                    <span className="text-2xl">{t.flag}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${eliminated ? "line-through" : ""}`}>{t.name}</span>
                        <StatusPill status={o.status} />
                      </div>
                      <ProbBar value={o.mark} status={o.status} className="mt-2 max-w-[240px]" />
                    </div>
                    <MarkTicker value={o.mark} size="lg" className={eliminated ? "text-muted" : ""} />
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-muted-2">
              Live read via getProgramAccounts on {PROGRAM_ID.slice(0, 6)}…{PROGRAM_ID.slice(-4)} · Solana devnet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
