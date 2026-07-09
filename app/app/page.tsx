"use client";

import { useState } from "react";

// Starter market view. Replace the sample data with live reads via
// `BracketBondClient` (lib/bracketBond.ts) once a wallet/provider is wired,
// and subscribe to each Outcome PDA with `connection.onAccountChange` so the
// marks tick live from TxLINE odds.

type Status = "alive" | "eliminated" | "won";
interface Outcome { index: number; team: string; mark: number; status: Status }

const SAMPLE: Outcome[] = [
  { index: 0, team: "Brazil", mark: 0.78, status: "alive" },
  { index: 1, team: "Argentina", mark: 0.3, status: "eliminated" },
  { index: 2, team: "France", mark: 0.12, status: "eliminated" },
  { index: 3, team: "Spain", mark: 0.12, status: "eliminated" },
];

const FEED = [
  "Quarter-finals · Spain eliminated on penalties — proof ✓",
  "Semi-finals · France eliminated — proof ✓",
  "Final decider · Argentina eliminated — proof ✓  → Brazil wins",
];

export default function Page() {
  const [outcomes] = useState<Outcome[]>(SAMPLE);

  return (
    <main>
      <h1>Race to the Final</h1>
      <p className="sub">Hold a position across the whole knockout run. Settled by proof, not by vote.</p>

      {outcomes.map((o) => (
        <div className="card" key={o.index}>
          <div className="row">
            <span className="team">{o.team}</span>
            <span className={`pill ${o.status === "alive" ? "alive" : "out"}`}>
              {o.status === "alive" ? "alive" : "out"}
            </span>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="mark">{(o.mark * 100).toFixed(0)}¢</span>
            <button disabled={o.status !== "alive"} title="Connect a wallet to buy">
              Buy
            </button>
          </div>
        </div>
      ))}

      <div className="card">
        <div className="feed">
          <div style={{ marginBottom: 8, color: "var(--text)" }}>Settlement feed</div>
          {FEED.map((f, i) => (
            <div key={i}>
              • {f.split("proof ✓")[0]}
              {f.includes("proof ✓") && <b>proof ✓</b>}
              {f.split("proof ✓")[1]}
            </div>
          ))}
        </div>
      </div>

      <p className="note">
        Every elimination above is an on-chain proof event (<code>Txoracle.validateStat</code>). No human
        oracle, no dispute window. Wire <code>lib/bracketBond.ts</code> to make this live.
      </p>
    </main>
  );
}
