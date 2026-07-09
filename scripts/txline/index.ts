// Small end-to-end demo of the TxLINE client (odds + scores + proof).
// Run with: pnpm txline:demo   (requires a funded .env)

import "dotenv/config";
import { guestAuth } from "./auth";
import { streamMarks } from "./oddsStream";
import { streamScores, advancedParticipant, isFinished } from "./scoresStream";
import { fetchStatValidation } from "./statValidation";
import { KEY_PE_GOALS_P1 } from "./types";

export * from "./types";
export * from "./auth";
export * from "./sse";
export * from "./oddsStream";
export * from "./scoresStream";
export * from "./statValidation";

async function main() {
  const baseUrl = process.env.TXLINE_BASE_URL ?? "https://txline.txodds.com";
  const wallet = process.env.TXLINE_WALLET_PUBKEY ?? "";
  const fixtureId = process.argv[2];
  if (!fixtureId) {
    console.error("usage: pnpm txline:demo <fixtureId>");
    process.exit(1);
  }

  const auth = await guestAuth({ baseUrl, wallet, serviceLevel: Number(process.env.TXLINE_SERVICE_LEVEL ?? 1) });
  console.log("authed with TxLINE ✓");

  const ac = new AbortController();

  // Show the live mark moving.
  (async () => {
    for await (const m of streamMarks({ baseUrl, auth, fixtureId, signal: ac.signal })) {
      console.log(`odds seq=${m.seq}`, m.marks);
    }
  })().catch((e) => console.error("odds stream:", e.message));

  // Detect full time -> fetch settlement proof.
  for await (const s of streamScores({ baseUrl, auth, fixtureId, signal: ac.signal })) {
    console.log(`score seq=${s.seq} state=${s.gameState}`, s.goals, s.shootout ?? "");
    if (isFinished(s)) {
      const winner = advancedParticipant(s);
      console.log(`FINISHED — participant ${winner} advanced`);
      const proof = await fetchStatValidation({ baseUrl, auth, fixtureId, statKey: KEY_PE_GOALS_P1 });
      console.log("settlement proof ready:", { root: proof.root, nodes: proof.proof.length });
      ac.abort();
      break;
    }
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
