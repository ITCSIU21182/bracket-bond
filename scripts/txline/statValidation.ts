// Fetch a stat + Merkle proof from TxLINE and format it for the on-chain
// `Txoracle.validateStat` CPI that Bracket Bond relays inside `settle_round`.
//
// The exact Txoracle instruction discriminator, account metas and arg layout
// come from the TxLINE program IDL (confirm via docs / Telegram TxLINEChat).
// Everything up to building that instruction is implemented here; the final
// `buildValidateStatIx` returns the pieces `settle_round` needs.

import { PublicKey, AccountMeta } from "@solana/web3.js";
import { TxlineAuth } from "./auth";
import { StatValidation } from "./types";

export interface StatValidationOptions {
  baseUrl: string;
  auth: TxlineAuth;
  fixtureId: string;
  statKey: number;
}

export async function fetchStatValidation(opts: StatValidationOptions): Promise<StatValidation> {
  const url =
    `${opts.baseUrl.replace(/\/$/, "")}/api/scores/stat-validation` +
    `?fixture=${encodeURIComponent(opts.fixtureId)}&key=${opts.statKey}`;
  const res = await fetch(url, { headers: opts.auth.headers });
  if (!res.ok) throw new Error(`stat-validation ${res.status}`);
  const p: any = await res.json();
  return {
    fixtureId: p.fixtureId ?? opts.fixtureId,
    statKey: opts.statKey,
    value: p.value,
    proof: p.proof ?? [],
    root: p.root,
    epochDay: p.epochDay,
  };
}

/** Hex string -> 32-byte buffer (leaf/root/proof nodes are 32-byte hashes). */
export function toBytes32(hex: string): Buffer {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const buf = Buffer.from(clean, "hex");
  if (buf.length !== 32) throw new Error(`expected 32-byte hash, got ${buf.length}`);
  return buf;
}

/** Proof node hex[] -> concatenated bytes for the on-chain verifier. */
export function toProofNodes(proof: string[]): Buffer {
  return Buffer.concat(proof.map(toBytes32));
}

export interface ValidateStatIx {
  /** instruction data passed to `settle_round(validate_ix_data)` */
  data: Buffer;
  /** accounts passed as `remaining_accounts` (Txoracle's required accounts) */
  remainingAccounts: AccountMeta[];
}

/**
 * Build the `validateStat` CPI payload. The PDA holding the daily root is
 * derived as `["daily_scores_roots", epochDay]` under the Txoracle program.
 *
 * TODO(IDL): prepend the real 8-byte Anchor discriminator for `validateStat`
 * and match the exact arg order from the published Txoracle IDL. The account
 * list below is the minimal expected set; confirm against the IDL.
 */
export function buildValidateStatIx(
  txoracleProgram: PublicKey,
  v: StatValidation,
): ValidateStatIx {
  const [rootPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), u32le(v.epochDay)],
    txoracleProgram,
  );

  // Placeholder arg encoding: [statKey u32][value i64][proofLen u32][proof..].
  const header = Buffer.alloc(4 + 8 + 4);
  header.writeUInt32LE(v.statKey, 0);
  header.writeBigInt64LE(BigInt(Math.trunc(v.value)), 4);
  header.writeUInt32LE(v.proof.length, 12);
  const data = Buffer.concat([header, toProofNodes(v.proof)]);

  const remainingAccounts: AccountMeta[] = [
    { pubkey: rootPda, isSigner: false, isWritable: false },
  ];

  return { data, remainingAccounts };
}

function u32le(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}
