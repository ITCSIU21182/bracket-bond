// P0 smoke test: subscribe → activate → fetch a stat proof → validateStatV2.view()
// Proves the full TxLINE settlement path works before wiring it into settle_round.
//
// Run (funded devnet ANCHOR_WALLET):
//   pnpm txline:demo <fixtureId> <seq> [statKeys=1,2]

import "dotenv/config";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, ComputeBudgetProgram, PublicKey } from "@solana/web3.js";
import { authenticate } from "./auth";
import { subscribeFreeTier } from "./subscribe";
import {
  loadTxoracle,
  fetchStatValidation,
  buildStatValidationInput,
  dailyScoresPda,
  advancementStrategy,
  singleStatStrategy,
} from "./statValidation";
import { discoverFinishedFixture } from "./discover";

export * from "./types";
export * from "./auth";
export * from "./sse";
export * from "./oddsStream";
export * from "./scoresStream";
export * from "./statValidation";
export * from "./subscribe";
export * from "./discover";

async function main() {
  const host = process.env.TXLINE_BASE_URL ?? "https://txline-dev.txodds.com";
  const tokenMint = new PublicKey(
    process.env.TXLINE_TOKEN_MINT ?? "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
  );
  const argFixture = Number(process.argv[2]);
  const argSeq = Number(process.argv[3]);
  const statKeys = (process.argv[4] ?? "1,2").split(",").map(Number);

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const txoracle = loadTxoracle(provider);
  const wallet = (provider.wallet as any).payer as Keypair;

  console.log("1/4 subscribing (free World Cup tier)…");
  const txSig = await subscribeFreeTier(txoracle, wallet, provider.connection, {
    tokenMint,
    serviceLevelId: 1,
    weeks: 4,
  });
  console.log("    subscribed:", txSig);

  console.log("2/4 activating API token…");
  const auth = await authenticate(host, { txSig, wallet, leagues: [] });
  console.log("    apiToken:", auth.apiToken.slice(0, 10) + "…");

  let fixtureId = argFixture;
  let seq = argSeq;
  if (!fixtureId || !seq) {
    console.log("    no <fixtureId> <seq> given — discovering a finished match…");
    const found = await discoverFinishedFixture(host, auth, Date.now());
    if (!found) {
      console.error("no finished fixture found in the last 24h — pass <fixtureId> <seq> explicitly");
      process.exit(1);
    }
    fixtureId = found.fixtureId;
    seq = found.seq;
    console.log(`    discovered fixture ${fixtureId} @ seq ${seq}`);
  }

  console.log("3/4 fetching stat-validation proof…");
  const val = await fetchStatValidation({ baseUrl: host, auth, fixtureId, seq, statKeys });
  console.log("    stats:", val.statsToProve.length, "@ ts", val.summary.updateStats.minTimestamp);

  console.log("4/4 validateStatV2.view() on-chain…");
  const strategy = statKeys.length >= 2 ? advancementStrategy(0, 1) : singleStatStrategy(0, 0);
  const isValid = await (txoracle.methods as any)
    .validateStatV2(buildStatValidationInput(val), strategy)
    .accounts({ dailyScoresMerkleRoots: dailyScoresPda(txoracle.programId, val.summary.updateStats.minTimestamp) })
    .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
    .view();

  console.log(`\nvalidateStatV2 → ${isValid}`);
  console.log(isValid ? "✓ proof verified on-chain — settle_round can use this." : "✗ proof rejected.");
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
