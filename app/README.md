# Bracket Bond — Frontend

A Next.js (App Router) starter for the market UI. This is intentionally a
**starter**: the client library (`lib/bracketBond.ts`) is the load-bearing part
— it derives PDAs, reads market/outcome state, and builds the `buy` transaction.
Wire it into the page components and a wallet-adapter provider.

## Run

```bash
cd app
pnpm install
pnpm dev   # http://localhost:3000
```

Set the program id + RPC in `.env.local`:

```
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U
```

## Screens (intended)

1. **Market** — the flagship "Race to the Final": each outcome (team) with its
   live mark (from `update_mark`, driven by TxLINE odds), a buy control, and
   your position value.
2. **Settlement feed** — a live log of round settlements ("outcome X eliminated —
   proof ✓"), the moment that sells the differentiator.
3. **Redeem** — after resolution, claim the winning payout.

## What to wire next

- Wrap the app in `@solana/wallet-adapter-react` `ConnectionProvider` +
  `WalletProvider` (see the adapter docs).
- Copy the generated IDL to `app/idl/bracket_bond.json` after `anchor build`.
- Subscribe to account changes (`connection.onAccountChange`) on each `Outcome`
  PDA so marks update live without polling.
