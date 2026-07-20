// Create a REAL on-chain "Race to the Final" market on devnet, so the frontend's
// /live page can read genuine on-chain state (outcomes, marks, pool) instead of
// mock data. Run on a machine with the Anchor toolchain + a funded devnet wallet.
//
// Run:
//   ANCHOR_WALLET=<key> ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
//     LIVE_MARKET_ID=777 pnpm create:market
//
// Then set NEXT_PUBLIC_MARKET_ID=<that id> in Railway and copy the built IDL to
// app/public/idl/bracket_bond.json (see docs/AGENT-HANDOFF.md). Settlement of a
// round by real proof is a separate step (pnpm settle:proof).

import "dotenv/config";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { loadProgram, pdas } from "../lib/program";
import { TXORACLE_PROGRAM_ID } from "./statValidation";
import { RACE_TO_FINAL, TEAMS } from "../lib/teams";

const PROOF = 1;
const MARKET_ID = Number(process.env.LIVE_MARKET_ID ?? 777);

async function main() {
  const { program, provider } = loadProgram();
  const me = provider.wallet.publicKey;
  const pda = pdas(program.programId);
  const config = pda.config();
  const market = pda.market(MARKET_ID);
  const vault = pda.vault(market);

  // Config (idempotent). PROOF mode so future settlements go through the proof CPI.
  try {
    await program.methods
      .initialize(me, TXORACLE_PROGRAM_ID, 200, PROOF)
      .accounts({ config, authority: me, systemProgram: SystemProgram.programId })
      .rpc();
    console.log("• config initialized (PROOF mode)");
  } catch {
    console.log("• config already exists (ok)");
  }

  await program.methods
    .createMarket(new anchor.BN(MARKET_ID), "Race to the Final", 200)
    .accounts({ config, market, vault, authority: me, systemProgram: SystemProgram.programId })
    .rpc();
  console.log(`• market ${MARKET_ID} created`);

  for (const o of RACE_TO_FINAL) {
    // expected_fixture_id = 0 (display market); bind + settle via pnpm settle:proof.
    await program.methods
      .addOutcome(o.index, o.teamId, o.mark, new anchor.BN(0), 0)
      .accounts({
        market,
        outcome: pda.outcome(market, o.index),
        authority: me,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`  + outcome ${o.index} ${TEAMS[o.teamId]?.name ?? o.teamId} @ ${(o.mark / 1e6).toFixed(2)}`);
  }

  // A couple of real buys so the pool is non-zero on-chain.
  for (const [idx, sol] of [[0, 0.05], [2, 0.03]] as const) {
    await program.methods
      .buy(idx, new anchor.BN(Math.floor(sol * LAMPORTS_PER_SOL)))
      .accounts({
        market,
        outcome: pda.outcome(market, idx),
        position: pda.position(market, idx, me),
        vault,
        buyer: me,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`  ↳ bought ${sol}◎ on outcome ${idx}`);
  }

  console.log(`\n✅ Live market ready on-chain.`);
  console.log(`   Set in Railway:  NEXT_PUBLIC_MARKET_ID=${MARKET_ID}`);
  console.log(`   Market PDA:      ${market.toBase58()}`);
  console.log(`   Solscan:         https://solscan.io/account/${market.toBase58()}?cluster=devnet`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
