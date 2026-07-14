// Fetch a stat + Merkle proof from TxLINE and build the real
// `Txoracle.validateStatV2` instruction, which Bracket Bond relays inside
// `settle_round` (PROOF mode). Mirrors the shapes in
// txodds/tx-on-chain/examples/devnet/scripts/subscription_scores_1stat.ts.

import * as anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { TxlineAuth } from "./auth";
import txoracleIdl from "./idl/txoracle.json";

const { BN } = anchor;

export const TXORACLE_PROGRAM_ID = new PublicKey((txoracleIdl as any).address);

export interface ApiProofNode {
  hash: number[] | Buffer | Uint8Array;
  isRightSibling: boolean;
}

/** Response shape of GET /api/scores/stat-validation?fixtureId=&seq=&statKeys= */
export interface StatValidationResponse {
  summary: {
    fixtureId: number;
    updateStats: { updateCount: number; minTimestamp: number; maxTimestamp: number };
    eventStatsSubTreeRoot: number[] | Buffer;
  };
  subTreeProof: ApiProofNode[];
  mainTreeProof: ApiProofNode[];
  eventStatRoot: number[] | Buffer;
  statsToProve: any[]; // ScoreStat[] — one per requested statKey
  statProofs: ApiProofNode[][];
}

/** Load the Txoracle program from the vendored devnet IDL. */
export function loadTxoracle(provider: anchor.Provider): anchor.Program {
  return new anchor.Program(txoracleIdl as anchor.Idl, provider);
}

export interface FetchOpts {
  baseUrl: string; // host, e.g. https://txline-dev.txodds.com
  auth: TxlineAuth;
  fixtureId: number;
  seq: number;
  statKeys: number | number[];
}

export async function fetchStatValidation(o: FetchOpts): Promise<StatValidationResponse> {
  const keys = Array.isArray(o.statKeys) ? o.statKeys.join(",") : String(o.statKeys);
  const url =
    `${o.baseUrl.replace(/\/$/, "")}/api/scores/stat-validation` +
    `?fixtureId=${o.fixtureId}&seq=${o.seq}&statKeys=${keys}`;
  const res = await fetch(url, { headers: o.auth.headers });
  if (!res.ok) throw new Error(`stat-validation ${res.status}`);
  return (await res.json()) as StatValidationResponse;
}

const mapProof = (nodes: ApiProofNode[]) =>
  nodes.map((n) => ({ hash: Array.from(n.hash as any) as number[], isRightSibling: n.isRightSibling }));

/** PDA holding the daily scores Merkle root for the day of `minTimestampMs`. */
export function dailyScoresPda(txoracleProgramId: PublicKey, minTimestampMs: number): PublicKey {
  const epochDay = Math.floor(minTimestampMs / (24 * 60 * 60 * 1000));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    txoracleProgramId,
  )[0];
}

/** Build the `StatValidationInput` payload for validateStatV2. */
export function buildStatValidationInput(val: StatValidationResponse): any {
  return {
    ts: new BN(val.summary.updateStats.minTimestamp),
    fixtureSummary: {
      fixtureId: new BN(val.summary.fixtureId),
      updateStats: {
        updateCount: val.summary.updateStats.updateCount,
        minTimestamp: new BN(val.summary.updateStats.minTimestamp),
        maxTimestamp: new BN(val.summary.updateStats.maxTimestamp),
      },
      eventsSubTreeRoot: Array.from(val.summary.eventStatsSubTreeRoot as any),
    },
    fixtureProof: mapProof(val.subTreeProof),
    mainTreeProof: mapProof(val.mainTreeProof),
    eventStatRoot: Array.from(val.eventStatRoot as any),
    stats: val.statsToProve.map((stat, i) => ({ stat, statProof: mapProof(val.statProofs[i]) })),
  };
}

// --- Strategies (NDimensionalStrategy) ---

/** stat[index] `cmp` threshold. */
export function singleStatStrategy(
  index: number,
  threshold: number,
  comparison: any = { greaterThan: {} },
): any {
  return {
    geometricTargets: [],
    distancePredicate: null,
    discretePredicates: [{ single: { index, predicate: { threshold, comparison } } }],
  };
}

/**
 * "Participant A advanced": stat[indexA] − stat[indexB] > 0.
 * Request the two goal stats for the fixture (e.g. `statKeys=1,2`) so index 0/1
 * are participant 1/2 goals. For shootout ties add the shootout stats and adjust.
 */
export function advancementStrategy(indexA = 0, indexB = 1): any {
  return {
    geometricTargets: [],
    distancePredicate: null,
    discretePredicates: [
      {
        binary: {
          indexA,
          indexB,
          op: { subtract: {} },
          predicate: { threshold: 0, comparison: { greaterThan: {} } },
        },
      },
    ],
  };
}

/**
 * Build the `validateStatV2` instruction. Pass the result through
 * `relayThroughSettleRound` into Bracket Bond's `settle_round` (+ a
 * `ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })` on the tx).
 */
export async function buildValidateStatV2Ix(
  txoracle: anchor.Program,
  val: StatValidationResponse,
  strategy: any,
): Promise<TransactionInstruction> {
  const payload = buildStatValidationInput(val);
  const pda = dailyScoresPda(txoracle.programId, val.summary.updateStats.minTimestamp);
  return (txoracle.methods as any)
    .validateStatV2(payload, strategy)
    .accounts({ dailyScoresMerkleRoots: pda })
    .instruction();
}

/** Run validateStatV2 as a read-only view — returns the boolean directly. */
export async function viewValidateStatV2(
  txoracle: anchor.Program,
  val: StatValidationResponse,
  strategy: any,
): Promise<boolean> {
  const pda = dailyScoresPda(txoracle.programId, val.summary.updateStats.minTimestamp);
  return (txoracle.methods as any)
    .validateStatV2(buildStatValidationInput(val), strategy)
    .accounts({ dailyScoresMerkleRoots: pda })
    .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
    .view();
}

/** Split a built instruction into the args `settle_round` expects. */
export function relayThroughSettleRound(ix: TransactionInstruction) {
  return {
    validateIxData: ix.data,
    remainingAccounts: ix.keys, // AccountMeta[] for the Txoracle instruction
    txoracleProgram: ix.programId,
  };
}
