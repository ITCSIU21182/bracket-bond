// Fetch a stat + Merkle proof from TxLINE and build the real
// `Txoracle.validateStatV2` instruction, which Bracket Bond relays inside
// `settle_round` (PROOF mode). Mirrors the shapes in
// txodds/tx-on-chain/examples/devnet/scripts/subscription_scores_1stat.ts.

import * as anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { TxlineAuth } from "./auth";
import { withRetry } from "./net";
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
  return withRetry(async () => {
    const res = await fetch(url, { headers: o.auth.headers });
    if (!res.ok) throw new Error(`stat-validation ${res.status}`);
    return (await res.json()) as StatValidationResponse;
  }, { label: "stat-validation" });
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
  return strategy([binaryLeg(indexA, indexB, CMP.gt)]);
}

// --- Stat keys + shootout-aware advancement ---
export const KEY_GOALS_P1 = 1;
export const KEY_GOALS_P2 = 2;
export const KEY_PE_P1 = 6001; // see types.ts — PE goals live at +6000 (inferred)
export const KEY_PE_P2 = 6002;

const CMP = { gt: { greaterThan: {} }, lt: { lessThan: {} }, eq: { equalTo: {} } };
function binaryLeg(indexA: number, indexB: number, comparison: any) {
  return { binary: { indexA, indexB, op: { subtract: {} }, predicate: { threshold: 0, comparison } } };
}
function strategy(discretePredicates: any[]): any {
  return { geometricTargets: [], distancePredicate: null, discretePredicates };
}

/** Full-game goals are level (k1 == k2) → the tie went to a penalty shootout. */
export function levelAfterFullTime(a = 0, b = 1): any {
  return strategy([binaryLeg(a, b, CMP.eq)]);
}

/**
 * "Participant W won on penalties": level after full time AND more shootout goals.
 * Indexes reference the `stats` order requested via statKeys=[1,2,6001,6002]:
 * 0,1 = goals W/L; 2,3 = PE goals W/L.
 */
export function shootoutAdvance(goalsW: number, goalsL: number, peW: number, peL: number): any {
  return strategy([binaryLeg(goalsW, goalsL, CMP.eq), binaryLeg(peW, peL, CMP.gt)]);
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

export interface Advancement {
  winner: 0 | 1;
  loser: 0 | 1;
  wentToPenalties: boolean;
  /** the winning validateStatV2 instruction to relay through settle_round */
  ix: TransactionInstruction;
}

/**
 * Decide which participant ADVANCED — handling regulation/ET and penalty
 * shootouts — using the on-chain proof itself, and return the winning
 * validateStatV2 instruction. Full-game goals (keys 1/2) exclude shootout goals,
 * so a tie level at full time (`k1==k2`) means the match went to penalties;
 * we then prove the shootout winner with the PE keys (6001/6002).
 */
export async function determineAdvancement(
  txoracle: anchor.Program,
  o: { host: string; auth: TxlineAuth; fixtureId: number; seq: number },
): Promise<Advancement> {
  const reg = await fetchStatValidation({
    baseUrl: o.host,
    auth: o.auth,
    fixtureId: o.fixtureId,
    seq: o.seq,
    statKeys: [KEY_GOALS_P1, KEY_GOALS_P2],
  });

  const level = await viewValidateStatV2(txoracle, reg, levelAfterFullTime(0, 1));
  if (!level) {
    // Decided in regulation / extra time.
    const p1Won = await viewValidateStatV2(txoracle, reg, advancementStrategy(0, 1));
    const winner = (p1Won ? 0 : 1) as 0 | 1;
    const loser = (p1Won ? 1 : 0) as 0 | 1;
    const ix = await buildValidateStatV2Ix(txoracle, reg, advancementStrategy(winner, loser));
    return { winner, loser, wentToPenalties: false, ix };
  }

  // Level at full time → decided on penalties. Fetch goals + PE goals.
  const full = await fetchStatValidation({
    baseUrl: o.host,
    auth: o.auth,
    fixtureId: o.fixtureId,
    seq: o.seq,
    statKeys: [KEY_GOALS_P1, KEY_GOALS_P2, KEY_PE_P1, KEY_PE_P2],
  });
  const p1Won = await viewValidateStatV2(txoracle, full, shootoutAdvance(0, 1, 2, 3));
  const winner = (p1Won ? 0 : 1) as 0 | 1;
  const loser = (p1Won ? 1 : 0) as 0 | 1;
  const [gW, gL, peW, peL] = winner === 0 ? [0, 1, 2, 3] : [1, 0, 3, 2];
  const ix = await buildValidateStatV2Ix(txoracle, full, shootoutAdvance(gW, gL, peW, peL));
  return { winner, loser, wentToPenalties: true, ix };
}
