// Small end-to-end demo of the TxLINE client (odds + scores + proof).
// Run with: pnpm txline:demo   (requires a funded .env)

import "dotenv/config";
import { authenticate } from "./auth";
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
  const fixtureId = process.argv[2];
  if (!fixtureId) {
    console.error("usage: pnpm txline:demo <fixtureId>");
    process.exit(1);
  }

  // Requires a completed on-chain SERVICE_LEVEL subscription (see docs/worldcup).
  const auth = await authenticate(baseUrl, {
    txSig: process.env.TXLINE_TXSIG ?? "",
    signature: process.env.TXLINE_SIGNATURE ?? "",
    leagues: (process.env.TXLINE_LEAGUES ?? "").split(",").filter(Boolean).map(Number),
  });
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
      const proof = await fetchStatValidation({
        baseUrl,
        auth,
        fixtureId: Number(fixtureId),
        seq: s.seq,
        statKey: KEY_PE_GOALS_P1,
      });
      console.log("settlement proof ready:", {
        fixtureId: proof.summary.fixtureId,
        subTreeNodes: proof.subTreeProof.length,
        mainTreeNodes: proof.mainTreeProof.length,
      });
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
