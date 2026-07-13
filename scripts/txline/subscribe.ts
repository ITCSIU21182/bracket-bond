// On-chain subscription for the free World-Cup tier.
// Mirrors txodds/tx-on-chain examples/devnet/common/users.ts (setupUser).
// serviceLevelId 1 costs 0 TxL but still needs a Token-2022 ATA + subscribe tx.

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

export interface SubscribeOpts {
  /** TxL token mint (devnet: 4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG). */
  tokenMint: PublicKey;
  /** 1 = free World Cup (60s delay). */
  serviceLevelId?: number;
  /** subscription length; must be a positive multiple of 4. */
  weeks?: number;
}

/** Complete the on-chain subscription; returns the tx signature for activation. */
export async function subscribeFreeTier(
  txoracle: anchor.Program,
  wallet: Keypair,
  connection: Connection,
  opts: SubscribeOpts,
): Promise<string> {
  const serviceLevelId = opts.serviceLevelId ?? 1;
  const weeks = opts.weeks ?? 4;
  if (weeks < 4 || weeks % 4 !== 0) throw new Error(`weeks must be a positive multiple of 4 (got ${weeks})`);

  // 1) Ensure the user's Token-2022 ATA exists.
  const ata = getAssociatedTokenAddressSync(opts.tokenMint, wallet.publicKey, false, TOKEN_2022_PROGRAM_ID);
  if (!(await connection.getAccountInfo(ata))) {
    const createTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        ata,
        wallet.publicKey,
        opts.tokenMint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
    await sendAndConfirmTransaction(connection, createTx, [wallet], { commitment: "confirmed" });
  }

  // 2) Subscribe on-chain.
  const [pricingMatrix] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], txoracle.programId);
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], txoracle.programId);
  const tokenTreasuryVault = getAssociatedTokenAddressSync(opts.tokenMint, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID);

  const tx: Transaction = await (txoracle.methods as any)
    .subscribe(serviceLevelId, weeks)
    .accounts({
      user: wallet.publicKey,
      pricingMatrix,
      tokenMint: opts.tokenMint,
      userTokenAccount: ata,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const bh = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = bh.blockhash;
  tx.feePayer = wallet.publicKey;
  tx.sign(wallet);
  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(
    { signature: sig, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight },
    "confirmed",
  );
  return sig;
}
