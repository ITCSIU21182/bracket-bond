// Program loader + PDA helpers shared by the replay harness and tests.

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export function pdas(programId: PublicKey) {
  const u64le = (id: number | bigint) => {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(BigInt(id));
    return b;
  };
  const config = () => PublicKey.findProgramAddressSync([Buffer.from("config")], programId)[0];
  const market = (id: number | bigint) =>
    PublicKey.findProgramAddressSync([Buffer.from("market"), u64le(id)], programId)[0];
  const vault = (market: PublicKey) =>
    PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], programId)[0];
  const outcome = (market: PublicKey, index: number) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("outcome"), market.toBuffer(), Buffer.from([index])],
      programId,
    )[0];
  const position = (market: PublicKey, index: number, owner: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("position"), market.toBuffer(), Buffer.from([index]), owner.toBuffer()],
      programId,
    )[0];
  return { config, market, vault, outcome, position };
}

/** Load the program from the Anchor env + generated IDL (after `anchor build`). */
export function loadProgram(): { program: anchor.Program; provider: anchor.AnchorProvider } {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const programId = new PublicKey(
    process.env.BRACKET_BOND_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  );
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const idl = require("../../target/idl/bracket_bond.json");
  idl.address = programId.toBase58();
  const program = new anchor.Program(idl as anchor.Idl, provider);
  return { program, provider };
}
