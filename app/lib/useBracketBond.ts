"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { BracketBondClient, MarketView, OutcomeView } from "./bracketBond";

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
);

/**
 * Live market state + actions. Loads the IDL at runtime from
 * `/idl/bracket_bond.json` (copy it to `app/public/idl/` after `anchor build`).
 */
export function useBracketBond(marketId: number) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [client, setClient] = useState<BracketBondClient | null>(null);
  const [market, setMarket] = useState<MarketView | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomeView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) {
      setClient(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const idl = (await (await fetch("/idl/bracket_bond.json")).json()) as Idl;
      const provider = new AnchorProvider(connection, wallet, {});
      if (!cancelled) setClient(BracketBondClient.fromIdl(idl, PROGRAM_ID, provider));
    })().catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [connection, wallet]);

  const marketPda = useMemo(() => (client ? client.market(marketId) : null), [client, marketId]);

  const refresh = useCallback(async () => {
    if (!client || !marketPda) return;
    try {
      setMarket(await client.getMarket(marketPda));
      const os: OutcomeView[] = [];
      for (let i = 0; i < 8; i++) {
        try {
          os.push(await client.getOutcome(marketPda, i));
        } catch {
          break;
        }
      }
      setOutcomes(os);
      setError(null);
    } catch (e) {
      setError(String(e)); // market probably not created yet on this cluster
    }
  }, [client, marketPda]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const send = useCallback(
    async (build: () => Promise<import("@solana/web3.js").Transaction>) => {
      if (!client) return;
      const tx = await build();
      const sig = await (client.program.provider as AnchorProvider).sendAndConfirm(tx);
      await refresh();
      return sig;
    },
    [client, refresh],
  );

  const buy = useCallback(
    (index: number, lamports: number) =>
      send(() => client!.buy(marketPda!, index, lamports, wallet!.publicKey)),
    [send, client, marketPda, wallet],
  );

  const sellAll = useCallback(
    async (index: number) => {
      if (!client || !marketPda || !wallet) return;
      const shares = await client.getPosition(marketPda, index, wallet.publicKey);
      if (shares > 0n) return send(() => client.sell(marketPda, index, shares, wallet.publicKey));
    },
    [send, client, marketPda, wallet],
  );

  return { connected: !!wallet, market, outcomes, error, refresh, buy, sellAll };
}
