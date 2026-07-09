// Framework-agnostic client for the Bracket Bond program.
// Derives PDAs, reads market/outcome state, and builds transactions.

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";

export const MARK_SCALE = 1_000_000;

export interface OutcomeView {
  index: number;
  teamId: number;
  status: "alive" | "eliminated" | "won";
  /** implied probability in [0,1] */
  mark: number;
  sharesOutstanding: bigint;
}

export interface MarketView {
  title: string;
  status: "open" | "resolved";
  round: number;
  aliveCount: number;
  totalCollateral: bigint;
  winnerIndex: number | null;
}

const OUTCOME_STATUS = ["alive", "eliminated", "won"] as const;

export class BracketBondClient {
  constructor(
    public program: anchor.Program,
    public programId: PublicKey,
  ) {}

  static fromIdl(idl: anchor.Idl, programId: PublicKey, provider: anchor.Provider) {
    (idl as any).address = programId.toBase58();
    return new BracketBondClient(new anchor.Program(idl, provider), programId);
  }

  // --- PDAs ---
  private u64le(id: number | bigint) {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(BigInt(id));
    return b;
  }
  market(id: number | bigint) {
    return PublicKey.findProgramAddressSync([Buffer.from("market"), this.u64le(id)], this.programId)[0];
  }
  vault(market: PublicKey) {
    return PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], this.programId)[0];
  }
  outcome(market: PublicKey, index: number) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("outcome"), market.toBuffer(), Buffer.from([index])],
      this.programId,
    )[0];
  }
  position(market: PublicKey, index: number, owner: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("position"), market.toBuffer(), Buffer.from([index]), owner.toBuffer()],
      this.programId,
    )[0];
  }

  // --- Reads ---
  async getMarket(market: PublicKey): Promise<MarketView> {
    const m: any = await this.program.account.market.fetch(market);
    return {
      title: m.title,
      status: m.status === 0 ? "open" : "resolved",
      round: m.round,
      aliveCount: m.aliveCount,
      totalCollateral: BigInt(m.totalCollateral.toString()),
      winnerIndex: m.winnerIndex < 0 ? null : m.winnerIndex,
    };
  }

  async getOutcome(market: PublicKey, index: number): Promise<OutcomeView> {
    const o: any = await this.program.account.outcome.fetch(this.outcome(market, index));
    return {
      index: o.index,
      teamId: o.teamId,
      status: OUTCOME_STATUS[o.status],
      mark: o.mark / MARK_SCALE,
      sharesOutstanding: BigInt(o.sharesOutstanding.toString()),
    };
  }

  // --- Writes ---
  async buy(market: PublicKey, index: number, lamports: number, buyer: PublicKey) {
    return this.program.methods
      .buy(index, new anchor.BN(lamports))
      .accounts({
        market,
        outcome: this.outcome(market, index),
        position: this.position(market, index, buyer),
        vault: this.vault(market),
        buyer,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
  }

  async redeem(market: PublicKey, winnerIndex: number, owner: PublicKey) {
    return this.program.methods
      .redeem(winnerIndex)
      .accounts({
        market,
        outcome: this.outcome(market, winnerIndex),
        position: this.position(market, winnerIndex, owner),
        vault: this.vault(market),
        owner,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
  }
}

export function connection(): Connection {
  return new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
}
