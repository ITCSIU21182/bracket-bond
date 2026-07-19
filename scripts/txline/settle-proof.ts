// Full on-chain PROOF settlement, end to end, on a real finished World Cup match:
//   subscribe → activate → discover a finished fixture → determine the winner via
//   the on-chain proof itself → create a 2-outcome market in PROOF mode → settle
//   the losing outcome by relaying validateStatV2 through settle_round.
//
// Prereqs: Bracket Bond deployed on the target cluster, a funded ANCHOR_WALLET,
// and the program's Config either absent or already in PROOF mode (settle_round
// only relays the CPI when settlement_mode == PROOF). Use a fresh deploy/cluster.
//
// Run:
//   ANCHOR_WALLET=<key> ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
//     pnpm settle:proof            # or: pnpm settle:proof <fixtureId> <seq>
//
// NOTE (known limitation): settle_round requires the relayed proof to return
// true but does not bind it to the eliminated outcome/fixture — the oracle
// authority must pair them (this driver does). Hardening that binding is future
// work (see docs/ROADMAP.md).

import "dotenv/config";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, ComputeBudgetProgram } from "@solana/web3.js";
import { loadProgram, pdas } from "../lib/program";
import {
  loadTxoracle,
  TXORACLE_PROGRAM_ID,
  determineAdvancement,
  relayThroughSettleRound,
} from "./statValidation";
import { authenticate } from "./auth";
import { subscribeFreeTier } from "./subscribe";
import { discoverFinishedFixture } from "./discover";
import { withRetry } from "./net";

const PROOF = 1;

async function main() {
  const host = process.env.TXLINE_BASE_URL ?? "https://txline-dev.txodds.com";
  const tokenMint = new PublicKey(
    process.env.TXLINE_TOKEN_MINT ?? "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
  );

  const { program, provider } = loadProgram();
  const txoracle = loadTxoracle(provider);
  const wallet = (provider.wallet as any).payer as Keypair;
  const me = provider.wallet.publicKey;
  const pda = pdas(program.programId);
  const log = (s: string) => console.log(s);

  log("1) TxLINE subscribe + activate…");
  const txSig = await withRetry(
    () => subscribeFreeTier(txoracle, wallet, provider.connection, { tokenMint }),
    { label: "subscribe", retries: 3 },
  );
  const auth = await authenticate(host, { txSig, wallet, leagues: [] });

  let fixtureId = Number(process.argv[2]);
  let seq = Number(process.argv[3]);
  if (!fixtureId || !seq) {
    const found = await discoverFinishedFixture(host, auth, Date.now());
    if (!found) throw new Error("no finished fixture found in the last 24h");
    ({ fixtureId, seq } = found);
  }
  log(`2) fixture ${fixtureId} @ seq ${seq}`);

  // Let the proof itself decide who advanced (regulation/ET or penalty shootout).
  log("3) determining advancement via on-chain proof…");
  const adv = await determineAdvancement(txoracle, { host, auth, fixtureId, seq });
  const { winner, loser } = adv;
  log(`   participant ${winner} advanced${adv.wentToPenalties ? " (on penalties)" : ""} → eliminate outcome ${loser}`);

  // Fresh 2-outcome market in PROOF mode.
  const marketId = Math.floor(Date.now() % 1_000_000);
  const config = pda.config();
  const market = pda.market(marketId);
  const vault = pda.vault(market);

  try {
    await program.methods
      .initialize(me, TXORACLE_PROGRAM_ID, 200, PROOF)
      .accounts({ config, authority: me, systemProgram: SystemProgram.programId })
      .rpc();
    log("4) config initialized (PROOF mode)");
  } catch {
    log("4) config already exists — it MUST be PROOF mode for this test (else redeploy fresh)");
  }

  await program.methods
    .createMarket(new anchor.BN(marketId), `Proof settle ${fixtureId}`, 200)
    .accounts({ config, market, vault, authority: me, systemProgram: SystemProgram.programId })
    .rpc();
  for (const idx of [0, 1]) {
    await program.methods
      .addOutcome(idx, idx, 500000, new anchor.BN(fixtureId))
      .accounts({ market, outcome: pda.outcome(market, idx), authority: me, systemProgram: SystemProgram.programId })
      .rpc();
  }
  log("   market created, 2 outcomes");

  // settle_round eliminates the loser, relaying the winning-advancement proof.
  log("5) settle_round (PROOF): relaying validateStatV2 on-chain…");
  const relay = relayThroughSettleRound(adv.ix);
  await program.methods
    .settleRound(relay.validateIxData)
    .accounts({
      config,
      market,
      outcome: pda.outcome(market, loser),
      oracleAuthority: me,
      txoracleProgram: relay.txoracleProgram,
    })
    .remainingAccounts(relay.remainingAccounts)
    .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
    .rpc();

  const o: any = await (program.account as any).outcome.fetch(pda.outcome(market, loser));
  log(`   outcome ${loser} status = ${o.status} (1 = eliminated)`);
  console.log(
    o.status === 1
      ? "\n✅ PROOF-mode settlement worked: a knockout outcome was eliminated by cryptographic proof, on-chain, no human oracle."
      : "\n✗ unexpected outcome status",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
