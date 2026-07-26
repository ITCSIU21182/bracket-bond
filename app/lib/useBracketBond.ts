"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { BracketBondClient, MarketView, OutcomeView } from "./bracketBond";

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U",
);

// A no-op wallet so the client can READ on-chain state before the user connects.
function readOnlyWallet() {
  const kp = Keypair.generate();
  return {
    publicKey: kp.publicKey,
    signTransaction: async (t: any) => t,
    signAllTransactions: async (t: any) => t,
  };
}

/**
 * Live market state + real on-chain actions against the deployed program.
 * Reads work with or without a wallet; buy/sell/redeem require a connected wallet
 * and send a real, signed devnet transaction via the provider.
 * Requires the IDL at `/idl/bracket_bond.json` (copied after `anchor build`).
 */
export function useBracketBond(marketId: number) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [client, setClient] = useState<BracketBondClient | null>(null);
  const [market, setMarket] = useState<MarketView | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomeView[]>([]);
  const [positions, setPositions] = useState<Record<number, bigint>>({});
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/idl/bracket_bond.json");
        if (!res.ok) throw new Error("IDL not found at /idl/bracket_bond.json.");
        const idl = (await res.json()) as Idl;
        const provider = new AnchorProvider(connection, (wallet ?? readOnlyWallet()) as any, {
          commitment: "confirmed",
        });
        if (!cancelled) setClient(BracketBondClient.fromIdl(idl, PROGRAM_ID, provider));
      } catch (e) {
        if (!cancelled) {
          setError((e as Error)?.message ?? String(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connection, wallet]);

  const marketPda = useMemo(() => (client ? client.market(marketId) : null), [client, marketId]);

  const refresh = useCallback(async () => {
    if (!client || !marketPda) return;
    try {
      const m = await client.getMarket(marketPda);
      const os: OutcomeView[] = [];
      for (let i = 0; i < 12; i++) {
        try {
          os.push(await client.getOutcome(marketPda, i));
        } catch {
          break;
        }
      }
      const pos: Record<number, bigint> = {};
      let bal: number | null = null;
      if (wallet) {
        for (const o of os) pos[o.index] = await client.getPosition(marketPda, o.index, wallet.publicKey);
        bal = await connection.getBalance(wallet.publicKey);
      }
      setMarket(m);
      setOutcomes(os);
      setPositions(pos);
      setBalance(bal);
      setError(null);
    } catch (e) {
      setError((e as Error)?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [client, marketPda, wallet, connection]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const send = useCallback(
    async (build: () => Promise<Transaction>): Promise<string> => {
      if (!client) throw new Error("The market client isn't ready yet.");
      const tx = await build();
      const sig = await (client.program.provider as AnchorProvider).sendAndConfirm(tx);
      await refresh();
      return sig;
    },
    [client, refresh],
  );

  const buy = useCallback(
    (index: number, lamports: number) => {
      if (!client || !marketPda || !wallet) throw new Error("Connect a wallet first.");
      return send(() => client.buy(marketPda, index, lamports, wallet.publicKey));
    },
    [send, client, marketPda, wallet],
  );

  const sellAll = useCallback(
    async (index: number) => {
      if (!client || !marketPda || !wallet) throw new Error("Connect a wallet first.");
      const shares = await client.getPosition(marketPda, index, wallet.publicKey);
      if (shares <= 0n) throw new Error("You have no position to exit here.");
      return send(() => client.sell(marketPda, index, shares, wallet.publicKey));
    },
    [send, client, marketPda, wallet],
  );

  const redeem = useCallback(
    (winnerIndex: number) => {
      if (!client || !marketPda || !wallet) throw new Error("Connect a wallet first.");
      return send(() => client.redeem(marketPda, winnerIndex, wallet.publicKey));
    },
    [send, client, marketPda, wallet],
  );

  return {
    connected: !!wallet,
    walletPubkey: wallet?.publicKey ?? null,
    market,
    outcomes,
    positions,
    balance,
    error,
    loading,
    refresh,
    buy,
    sellAll,
    redeem,
    marketPda: marketPda ?? null,
  };
}
