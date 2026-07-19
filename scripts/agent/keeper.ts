// Autonomous settlement keeper.
//
// A long-lived worker (run it on Railway/EC2, not serverless) that watches
// TxLINE for finished World Cup fixtures and settles the corresponding Bracket
// Bond rounds the instant a proof exists — PERMISSIONLESSLY, with its own wallet,
// never the oracle authority. This is the "runs itself" story and the settlement
// path is fully deterministic: no LLM decides who advanced, the on-chain proof
// does.
//
// It reuses the exact settlement surface as the manual driver
// (scripts/txline/statValidation.ts): determineAdvancement handles regulation/ET
// and penalty shootouts (PE keys 6001/6002) and returns the winning
// validateStatV2 instruction; settle_round (PROOF mode) rebuilds the advancement
// predicate on-chain from each outcome's participant_slot, so relaying is safe.
//
// Prereqs: program deployed + `anchor build` (target/idl present), a funded
// ANCHOR_WALLET (the keeper — need NOT be the authority), Config in PROOF mode,
// and markets whose outcomes are bound to fixtures (expected_fixture_id != 0).
//
// Run:
//   ANCHOR_WALLET=<keeper.json> ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
//     KEEPER_MARKET_IDS=1,2 pnpm keeper

import "dotenv/config";
import { ComputeBudgetProgram, Keypair, PublicKey } from "@solana/web3.js";
import { loadProgram, pdas } from "../lib/program";
import {
  loadTxoracle,
  determineAdvancement,
  relayThroughSettleRound,
} from "../txline/statValidation";
import { authenticate } from "../txline/auth";
import { subscribeFreeTier } from "../txline/subscribe";
import { fetchHistoricalScores, finalSeq } from "../txline/scoresStream";
import { withRetry } from "../txline/net";

const POLL_MS = Number(process.env.KEEPER_POLL_MS ?? 30_000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (s: string) => console.log(`[keeper ${new Date().toISOString()}] ${s}`);

async function main() {
  const host = process.env.TXLINE_BASE_URL ?? "https://txline-dev.txodds.com";
  const tokenMint = new PublicKey(
    process.env.TXLINE_TOKEN_MINT ?? "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
  );
  const marketIds = (process.env.KEEPER_MARKET_IDS ?? "1")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));

  const { program, provider } = loadProgram();
  const txoracle = loadTxoracle(provider);
  const wallet = (provider.wallet as any).payer as Keypair;
  const me = provider.wallet.publicKey;
  const pda = pdas(program.programId);
  const acct = program.account as any;

  log("authenticating to TxLINE (subscribe + activate)…");
  const txSig = await withRetry(
    () => subscribeFreeTier(txoracle, wallet, provider.connection, { tokenMint }),
    { label: "subscribe", retries: 3 },
  );
  const auth = await authenticate(host, { txSig, wallet, leagues: [] });

  log(`started. settler=${me.toBase58()} (permissionless), markets=[${marketIds}], poll=${POLL_MS}ms`);

  // In-memory guard against re-attempting the same fixture within a run; the
  // on-chain OutcomeNotAlive check is the real idempotency backstop.
  const seenFinal = new Set<string>();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (const id of marketIds) {
      try {
        await tick(id);
      } catch (e) {
        log(`market ${id}: ${(e as Error)?.message ?? e}`);
      }
    }
    await sleep(POLL_MS);
  }

  async function tick(marketId: number) {
    const marketPda = pda.market(marketId);
    const market = await acct.market.fetch(marketPda).catch(() => null);
    if (!market || market.status !== 0) return; // resolved or missing

    for (let i = 0; i < market.outcomeCount; i++) {
      const o = await acct.outcome.fetch(pda.outcome(marketPda, i)).catch(() => null);
      if (!o || o.status !== 0) continue; // not alive
      const fixtureId = Number(o.expectedFixtureId);
      if (!fixtureId) continue; // unbound — not keeper-settleable

      // Is the fixture finalised? (game_finalised Seq is the authority.)
      const events = await fetchHistoricalScores(host, auth, fixtureId).catch(() => [] as any[]);
      const seq = finalSeq(events);
      if (seq === null) continue; // still in play

      // Determine who advanced via the proof itself (also pre-checks the proof
      // through .view(), so we never pay for a settle that would revert).
      const adv = await determineAdvancement(txoracle, { host, auth, fixtureId, seq });
      const key = `${marketId}:${i}:${fixtureId}`;
      if (o.participantSlot !== adv.loser) continue; // this outcome advanced
      if (seenFinal.has(key)) continue;

      const relay = relayThroughSettleRound(adv.ix);
      try {
        const sig = await program.methods
          .settleRound(relay.validateIxData)
          .accounts({
            config: pda.config(),
            market: marketPda,
            outcome: pda.outcome(marketPda, i),
            settler: me,
            txoracleProgram: relay.txoracleProgram,
          })
          .remainingAccounts(relay.remainingAccounts)
          .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
          .rpc();
        seenFinal.add(key);
        log(`⚑ settled market ${marketId} outcome ${i} (fixture ${fixtureId}${adv.wentToPenalties ? ", shootout" : ""}) → ${sig}`);
      } catch (e) {
        log(`settle market ${marketId} outcome ${i}: ${(e as Error)?.message ?? e}`);
      }
    }

    // Finalise once a single outcome remains (permissionless in PROOF mode).
    const fresh = await acct.market.fetch(marketPda);
    if (fresh.status === 0 && fresh.aliveCount === 1) {
      for (let i = 0; i < fresh.outcomeCount; i++) {
        const oo = await acct.outcome.fetch(pda.outcome(marketPda, i)).catch(() => null);
        if (oo && oo.status === 0) {
          await program.methods
            .finalize()
            .accounts({ config: pda.config(), market: marketPda, outcome: pda.outcome(marketPda, i), settler: me })
            .rpc();
          log(`🏁 finalised market ${marketId} → winner outcome ${i}`);
          break;
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
