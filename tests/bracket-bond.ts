// End-to-end test on a local validator: buy on two outcomes, eliminate one,
// finalize, redeem — and assert the solvency invariant holds throughout.
//
//   anchor test

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import { pdas } from "../scripts/lib/program";

const TRUSTED_ORACLE = 0;

describe("bracket-bond", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.BracketBond as anchor.Program;
  const wallet = provider.wallet.publicKey;
  const pda = pdas(program.programId);

  const marketId = Math.floor(Math.random() * 1_000_000);
  const config = pda.config();
  const market = pda.market(marketId);
  const vault = pda.vault(market);

  it("runs a full market end-to-end and stays solvent", async () => {
    try {
      await program.methods
        .initialize(wallet, SystemProgram.programId, 200, TRUSTED_ORACLE)
        .accounts({ config, authority: wallet, systemProgram: SystemProgram.programId })
        .rpc();
    } catch {
      /* config may already exist across test runs */
    }

    await program.methods
      .createMarket(new anchor.BN(marketId), "Race to the Final — test", 200)
      .accounts({ config, market, vault, authority: wallet, systemProgram: SystemProgram.programId })
      .rpc();

    for (const [index, mark] of [
      [0, 400000],
      [1, 300000],
    ] as const) {
      await program.methods
        .addOutcome(index, 1000 + index, mark, new anchor.BN(0), index)
        .accounts({
          market,
          outcome: pda.outcome(market, index),
          authority: wallet,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    // Buy on both outcomes.
    const buys: Array<[number, number]> = [
      [0, 0.4 * LAMPORTS_PER_SOL],
      [1, 0.2 * LAMPORTS_PER_SOL],
    ];
    for (const [index, lamports] of buys) {
      await program.methods
        .buy(index, new anchor.BN(lamports))
        .accounts({
          market,
          outcome: pda.outcome(market, index),
          position: pda.position(market, index, wallet),
          vault,
          buyer: wallet,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    const totalIn = 0.6 * LAMPORTS_PER_SOL;
    let m = await (program.account as any).market.fetch(market);
    assert.equal(Number(m.totalCollateral), totalIn, "collateral tracked");
    const vaultBal = await provider.connection.getBalance(vault);
    assert.isAtLeast(vaultBal, totalIn, "vault holds >= collateral (solvent)");

    // Eliminate outcome 1 (loser).
    await program.methods
      .settleRound(Buffer.alloc(0))
      .accounts({
        config,
        market,
        outcome: pda.outcome(market, 1),
        settler: wallet,
        txoracleProgram: SystemProgram.programId,
      })
      .rpc();

    // Finalize: outcome 0 is the sole survivor.
    await program.methods
      .finalize()
      .accounts({ config, market, outcome: pda.outcome(market, 0), settler: wallet })
      .rpc();

    m = await (program.account as any).market.fetch(market);
    assert.equal(m.status, 1, "market resolved");
    assert.equal(m.winnerIndex, 0, "winner is outcome 0");

    // Redeem: winner gets pool minus fee. Loser's stake was forfeited to the pot.
    const before = await provider.connection.getBalance(wallet);
    await program.methods
      .redeem(0)
      .accounts({
        market,
        outcome: pda.outcome(market, 0),
        position: pda.position(market, 0, wallet),
        vault,
        owner: wallet,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const after = await provider.connection.getBalance(wallet);
    const fee = (totalIn * 200) / 10000;
    // Winner redeems ~ (totalIn - fee), since they hold all winning shares.
    assert.approximately(after - before, totalIn - fee, 0.01 * LAMPORTS_PER_SOL, "pro-rata payout");

    const vaultAfter = await provider.connection.getBalance(vault);
    assert.isAtLeast(vaultAfter, fee, "vault never underpays (solvency held)");
  });

  it("lets a holder exit early at the mark and stays solvent", async () => {
    const id2 = Math.floor(Math.random() * 1_000_000);
    const m2 = pda.market(id2);
    const v2 = pda.vault(m2);

    await program.methods
      .createMarket(new anchor.BN(id2), "Exit test", 200)
      .accounts({ config, market: m2, vault: v2, authority: wallet, systemProgram: SystemProgram.programId })
      .rpc();
    for (const [index, mark] of [
      [0, 400000],
      [1, 300000],
    ] as const) {
      await program.methods
        .addOutcome(index, 1000 + index, mark, new anchor.BN(0), index)
        .accounts({ market: m2, outcome: pda.outcome(m2, index), authority: wallet, systemProgram: SystemProgram.programId })
        .rpc();
    }

    // Buy 0.4 SOL on outcome 0 @ 0.40 → 1e9 shares.
    await program.methods
      .buy(0, new anchor.BN(0.4 * LAMPORTS_PER_SOL))
      .accounts({
        market: m2,
        outcome: pda.outcome(m2, 0),
        position: pda.position(m2, 0, wallet),
        vault: v2,
        buyer: wallet,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const om: any = await (program.account as any).outcome.fetch(pda.outcome(m2, 0));
    const shares = BigInt(om.sharesOutstanding.toString());

    // Sell half back at the same mark → ~0.2 SOL.
    const before = await provider.connection.getBalance(wallet);
    await program.methods
      .sell(0, new anchor.BN((shares / 2n).toString()))
      .accounts({
        market: m2,
        outcome: pda.outcome(m2, 0),
        position: pda.position(m2, 0, wallet),
        vault: v2,
        seller: wallet,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const after = await provider.connection.getBalance(wallet);
    assert.approximately(after - before, 0.2 * LAMPORTS_PER_SOL, 0.01 * LAMPORTS_PER_SOL, "exit pays ~shares×mark");

    const mm: any = await (program.account as any).market.fetch(m2);
    assert.approximately(Number(mm.totalCollateral), 0.2 * LAMPORTS_PER_SOL, 2000, "pot reduced by the exit");
    const v2bal = await provider.connection.getBalance(v2);
    assert.isAtLeast(v2bal, Number(mm.totalCollateral), "vault >= tracked collateral (solvent)");
  });
});
