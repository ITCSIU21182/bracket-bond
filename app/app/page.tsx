"use client";

import dynamic from "next/dynamic";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useBracketBond } from "../lib/useBracketBond";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false },
);

const MARKET_ID = Number(process.env.NEXT_PUBLIC_MARKET_ID ?? 1);

// Shown until a wallet is connected and a market exists on the cluster.
const SAMPLE = [
  { index: 0, team: "Brazil", mark: 0.78, status: "alive" as const },
  { index: 1, team: "Argentina", mark: 0.3, status: "eliminated" as const },
  { index: 2, team: "France", mark: 0.12, status: "eliminated" as const },
];

export default function Page() {
  const { connected, market, outcomes, buy, sellAll } = useBracketBond(MARKET_ID);
  const live = outcomes.length > 0;

  return (
    <main>
      <div className="row">
        <div>
          <h1>Race to the Final</h1>
          <p className="sub">Settled by proof, not by vote. {live && market ? `Round ${market.round} · ${market.status}` : ""}</p>
        </div>
        <WalletMultiButton />
      </div>

      {live
        ? outcomes.map((o) => (
            <div className="card" key={o.index}>
              <div className="row">
                <span className="team">Team #{o.teamId}</span>
                <span className={`pill ${o.status === "alive" ? "alive" : "out"}`}>{o.status}</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <span className="mark">{(o.mark * 100).toFixed(0)}¢</span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button disabled={!connected || o.status !== "alive"} onClick={() => buy(o.index, 0.1 * LAMPORTS_PER_SOL)}>
                    Buy 0.1◎
                  </button>
                  <button disabled={!connected} onClick={() => sellAll(o.index)} title="Exit at the live mark">
                    Exit
                  </button>
                </span>
              </div>
            </div>
          ))
        : SAMPLE.map((o) => (
            <div className="card" key={o.index}>
              <div className="row">
                <span className="team">{o.team}</span>
                <span className={`pill ${o.status === "alive" ? "alive" : "out"}`}>{o.status}</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <span className="mark">{(o.mark * 100).toFixed(0)}¢</span>
                <button disabled title="Connect a wallet + deploy a market to go live">Buy</button>
              </div>
            </div>
          ))}

      <p className="note">
        {live
          ? "Live from the on-chain market. Each round settles via Txoracle.validateStat — no human oracle."
          : "Sample view. Connect a wallet and point NEXT_PUBLIC_MARKET_ID at a deployed market to go live (copy the built IDL to app/public/idl/bracket_bond.json)."}
      </p>
    </main>
  );
}
