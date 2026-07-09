// Fetch a stat + Merkle proof from TxLINE and build the real
// `Txoracle.validateStat` instruction, which Bracket Bond relays inside
// `settle_round` (PROOF mode).
//
// Verified against docs 2026-07-09:
//   GET /api/scores/stat-validation?fixtureId=&seq=&statKey=
//   Txoracle.validateStat(ts, fixtureSummary, fixtureProof[], mainTreeProof[],
//                         predicate, statA, statB?, op?) -> bool
//   account: dailyScoresMerkleRoots = PDA["daily_scores_roots", epochDay(u16 LE)]
//   epochDay = floor(minTimestampMs / 86_400_000)
//
// Program ids: devnet 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J
//              mainnet 9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { TxlineAuth } from "./auth";

const { BN } = anchor;

export interface ProofNode {
  hash: string; // 32-byte hex
  isRightSibling: boolean;
}

/** Response shape of GET /api/scores/stat-validation. */
export interface StatValidationResponse {
  summary: {
    fixtureId: number;
    updateStats: { updateCount: number; minTimestamp: number; maxTimestamp: number };
    eventStatsSubTreeRoot: string;
  };
  subTreeProof: ProofNode[];
  mainTreeProof: ProofNode[];
  statToProve: { key: number; value: number; period: number };
  eventStatRoot: string;
  statProof: ProofNode[];
  // present only for two-stat (difference) validations
  statToProve2?: { key: number; value: number; period: number };
  eventStatRoot2?: string;
  statProof2?: ProofNode[];
}

export interface FetchOpts {
  baseUrl: string;
  auth: TxlineAuth;
  fixtureId: number;
  seq: number;
  statKey: number;
}

export async function fetchStatValidation(o: FetchOpts): Promise<StatValidationResponse> {
  const url =
    `${o.baseUrl.replace(/\/$/, "")}/api/scores/stat-validation` +
    `?fixtureId=${o.fixtureId}&seq=${o.seq}&statKey=${o.statKey}`;
  const res = await fetch(url, { headers: o.auth.headers });
  if (!res.ok) throw new Error(`stat-validation ${res.status}`);
  return (await res.json()) as StatValidationResponse;
}

/** 32-byte hex -> number[] (Anchor encodes [u8; 32] from a byte array). */
export function toBytes32(hex: string): number[] {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const buf = Buffer.from(clean, "hex");
  if (buf.length !== 32) throw new Error(`expected 32-byte hash, got ${buf.length}`);
  return [...buf];
}

export function toProofNodes(nodes: ProofNode[]): { hash: number[]; isRightSibling: boolean }[] {
  return nodes.map((n) => ({ hash: toBytes32(n.hash), isRightSibling: n.isRightSibling }));
}

/** PDA holding the daily scores Merkle root for the day of `minTimestampMs`. */
export function dailyScoresPda(txoracleProgramId: PublicKey, minTimestampMs: number): PublicKey {
  const epochDay = Math.floor(minTimestampMs / (24 * 60 * 60 * 1000));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    txoracleProgramId,
  )[0];
}

/** GreaterThan comparison against a threshold (default: statA - statB > 0). */
export const PREDICATE_GT_ZERO = { threshold: 0, comparison: { greaterThan: {} } };
export const OP_SUBTRACT = { subtract: {} };

/**
 * Build the `validateStat` instruction from a stat-validation response using
 * the Txoracle program (its IDL). Pass the resulting instruction's data +
 * accounts into Bracket Bond's `settle_round` (see relayThroughSettleRound).
 *
 * For "did A advance?" use a two-stat difference: statA = advancing team's
 * goal stat, statB = opponent's, predicate = (A - B) > 0.
 */
export async function buildValidateStatIx(
  txoracle: anchor.Program,
  v: StatValidationResponse,
  opts?: { predicate?: any; op?: any },
): Promise<TransactionInstruction> {
  const fixtureSummary = {
    fixtureId: new BN(v.summary.fixtureId),
    updateStats: {
      updateCount: v.summary.updateStats.updateCount,
      minTimestamp: new BN(v.summary.updateStats.minTimestamp),
      maxTimestamp: new BN(v.summary.updateStats.maxTimestamp),
    },
    eventsSubTreeRoot: toBytes32(v.summary.eventStatsSubTreeRoot),
  };

  const statA = {
    statToProve: v.statToProve,
    eventStatRoot: toBytes32(v.eventStatRoot),
    statProof: toProofNodes(v.statProof),
  };

  const statB =
    v.statToProve2 && v.eventStatRoot2 && v.statProof2
      ? {
          statToProve: v.statToProve2,
          eventStatRoot: toBytes32(v.eventStatRoot2),
          statProof: toProofNodes(v.statProof2),
        }
      : null;

  const predicate = opts?.predicate ?? PREDICATE_GT_ZERO;
  const op = statB ? opts?.op ?? OP_SUBTRACT : null;
  const targetTs = new BN(v.summary.updateStats.minTimestamp);
  const pda = dailyScoresPda(txoracle.programId, v.summary.updateStats.minTimestamp);

  return txoracle.methods
    .validateStat(
      targetTs,
      fixtureSummary,
      toProofNodes(v.subTreeProof),
      toProofNodes(v.mainTreeProof),
      predicate,
      statA,
      statB,
      op,
    )
    .accounts({ dailyScoresMerkleRoots: pda })
    .instruction();
}

/**
 * Split a built validateStat instruction into the args Bracket Bond's
 * `settle_round(validate_ix_data)` expects: the raw ix data, and the ix's
 * accounts as `remaining_accounts`. `txoracleProgram` is passed as the named
 * account. The market program relays this CPI and requires the returned bool.
 */
export function relayThroughSettleRound(ix: TransactionInstruction) {
  return {
    validateIxData: ix.data,
    remainingAccounts: ix.keys, // AccountMeta[] for Txoracle.validateStat
    txoracleProgram: ix.programId,
  };
}
