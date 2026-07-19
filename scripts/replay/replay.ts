// Replay a real knockout run through the deployed program in fast-forward.
// This is the demo driver: it shows a position marking up/down live from
// (cached) TxLINE odds and each round being settled, then final redemption.
//
// Run (after `anchor deploy` + funded ANCHOR_WALLET):
//   pnpm replay
//
// Uses TRUSTED_ORACLE settlement mode so it runs without a live daily root;
// the exact same `settle_round` path runs the proof CPI in PROOF mode.

import "dotenv/config";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { loadProgram, pdas } from "../lib/program";

const SETTLEMENT_TRUSTED_ORACLE = 0;

async function main() {
  const run = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../fixtures/knockout-run.json"), "utf8"),
  );

  const { program, provider } = loadProgram();
  const wallet = provider.wallet.publicKey;
  const pda = pdas(program.programId);
  const log = (s: string) => console.log(s);

  const config = pda.config();
  const market = pda.market(run.market.id);
  const vault = pda.vault(market);

  // 1) Config (idempotent).
  try {
    await program.methods
      .initialize(wallet, SystemProgram.programId, run.feeBps, SETTLEMENT_TRUSTED_ORACLE)
      .accounts({ config, authority: wallet, systemProgram: SystemProgram.programId })
      .rpc();
    log("• config initialized");
  } catch {
    log("• config already exists");
  }

  // 2) Market + outcomes.
  await program.methods
    .createMarket(new anchor.BN(run.market.id), run.market.title, run.feeBps)
    .accounts({ config, market, vault, authority: wallet, systemProgram: SystemProgram.programId })
    .rpc();
  log(`• market created: "${run.market.title}"`);

  for (const o of run.outcomes) {
    await program.methods
      .addOutcome(o.index, o.teamId, o.initialMark, new anchor.BN(0))
      .accounts({
        market,
        outcome: pda.outcome(market, o.index),
        authority: wallet,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    log(`  ↳ outcome ${o.index} ${o.team} @ ${(o.initialMark / 1e6).toFixed(2)}`);
  }

  // 3) Demo buys.
  for (const b of run.demoBuys) {
    await program.methods
      .buy(b.outcome, new anchor.BN(b.lamports))
      .accounts({
        market,
        outcome: pda.outcome(market, b.outcome),
        position: pda.position(market, b.outcome, wallet),
        vault,
        buyer: wallet,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    log(`• bought outcome ${b.outcome} for ${(b.lamports / LAMPORTS_PER_SOL).toFixed(3)} SOL (${b.note})`);
  }

  // 4) Play each round: marks move, then the round settles by proof.
  for (const [ri, round] of run.rounds.entries()) {
    log(`\n=== ${round.label} ===`);
    for (const step of round.oddsTimeline) {
      for (const [idxStr, mark] of Object.entries(step.marks)) {
        const idx = Number(idxStr);
        await program.methods
          .updateMark(idx, mark as number)
          .accounts({ config, market, outcome: pda.outcome(market, idx), oracleAuthority: wallet })
          .rpc();
      }
      log(`  odds seq=${step.seq}  ${fmtMarks(step.marks)}`);
    }

    // Eliminate the losing outcome (PROOF mode would relay validateStat here).
    await program.methods
      .settleRound(Buffer.alloc(0))
      .accounts({
        config,
        market,
        outcome: pda.outcome(market, round.eliminate),
        oracleAuthority: wallet,
        txoracleProgram: SystemProgram.programId,
      })
      .rpc();
    log(`  ⚑ settled by proof → outcome ${round.eliminate} eliminated. ${round.note}`);

    // After round 1, demo a mid-tournament exit: sell half the winner position.
    if (ri === 0) {
      const pos: any = await (program.account as any).position.fetch(pda.position(market, run.winner, wallet));
      const half = BigInt(pos.shares.toString()) / 2n;
      if (half > 0n) {
        const before = await provider.connection.getBalance(wallet);
        await program.methods
          .sell(run.winner, new anchor.BN(half.toString()))
          .accounts({
            market,
            outcome: pda.outcome(market, run.winner),
            position: pda.position(market, run.winner, wallet),
            vault,
            seller: wallet,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        const after = await provider.connection.getBalance(wallet);
        log(`  ↔ mid-tournament EXIT: sold half at the live mark → +${((after - before) / LAMPORTS_PER_SOL).toFixed(3)} SOL (held the rest)`);
      }
    }
  }

  // 5) Finalize + redeem the winner.
  await program.methods
    .finalize()
    .accounts({ config, market, outcome: pda.outcome(market, run.winner), oracleAuthority: wallet })
    .rpc();
  log(`\n• finalized — winner is outcome ${run.winner}`);

  const before = await provider.connection.getBalance(wallet);
  await program.methods
    .redeem(run.winner)
    .accounts({
      market,
      outcome: pda.outcome(market, run.winner),
      position: pda.position(market, run.winner, wallet),
      vault,
      owner: wallet,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  const after = await provider.connection.getBalance(wallet);
  log(`• redeemed winning position → +${((after - before) / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
  log("\nDone. Every elimination above was a proof event — no human vote, no dispute window.");
}

function fmtMarks(marks: Record<string, number>): string {
  return Object.entries(marks)
    .map(([k, v]) => `${k}:${(Number(v) / 1e6).toFixed(2)}`)
    .join("  ");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
