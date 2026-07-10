# Setup, Build & Run

Everything needed to build, test, deploy, and demo Bracket Bond on another
machine.

## 1. Toolchain (exact)

| Tool | Version | Install |
|---|---|---|
| Rust | 1.79+ (tested 1.96) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Solana / Agave CLI | **Agave 4.0.2** (verified); 1.18+ min | `sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"` |
| Anchor | **0.31.x** | `cargo install --git https://github.com/coral-xyz/anchor avm && avm install 0.31.0 && avm use 0.31.0` |
| Node | 20+ | nvm / system |
| pnpm | 9+ | `npm i -g pnpm` |

> ⚠️ **Toolchain matters.** `Cargo.lock` pulls in edition-2024 crates, so
> `anchor build` needs platform-tools with Rust ≥ 1.85. `Anchor.toml` pins
> `solana_version = "4.0.2"` for exactly this — verified building + testing on
> **Agave 4.0.2 / platform-tools v1.53**. Very old CLIs (e.g. 1.17) fail earlier
> with `lock file version 4 ... Cargo needs to be updated`. Windows: use WSL2
> (Ubuntu) — `anchor build` / `solana-test-validator` don't run native on Windows.

## 2. Install dependencies

```bash
pnpm install            # root: anchor client, web3.js, test tooling
cd app && pnpm install && cd ..   # frontend
```

## 3. Program id / keypair

The program id in `Anchor.toml` and `declare_id!` is a placeholder. Generate your
own and sync:

```bash
anchor keys sync        # writes the new id into Anchor.toml + lib.rs
# then set BRACKET_BOND_PROGRAM_ID in .env to match
```

## 4. Build

```bash
anchor build            # compiles the program + generates target/idl/bracket_bond.json
```

The generated IDL at `target/idl/bracket_bond.json` is what the replay harness,
tests, and frontend load.

## 5. Test (localnet)

```bash
anchor test             # spins a local validator and runs tests/bracket-bond.ts
```

The test buys on two outcomes, eliminates one, finalizes, redeems, and asserts
the **solvency invariant** (the vault never underpays) throughout.

## 6. Deploy to devnet

```bash
solana config set --url devnet
solana-keygen new -o ~/.config/solana/id.json    # if you don't have a wallet
solana airdrop 2                                  # devnet faucet is often rate-limited
anchor deploy --provider.cluster devnet
```

## 7. Environment

```bash
cp .env.example .env
# fill in: ANCHOR_WALLET, BRACKET_BOND_PROGRAM_ID, TXORACLE_PROGRAM_ID,
#          TXLINE_BASE_URL, and (for live data) the activation fields.
```

## 8. Replay demo (the pitch)

Streams a real knockout run through the deployed program in fast-forward:

```bash
pnpm replay
```

You'll see each outcome's mark move from the (cached) odds timeline, each round
settle, and the winner redeem. Uses `TRUSTED_ORACLE` settlement mode so it runs
without a live daily root — the same `settle_round` path runs the proof CPI in
`PROOF` mode.

## 9. Enable PROOF-mode settlement (live TxLINE)

1. Complete the free World-Cup subscription (see `docs/worldcup` steps) and fill
   the `TXLINE_*` activation fields in `.env`.
2. Download the **Txoracle IDL** and load it client-side; set
   `TXORACLE_PROGRAM_ID` (devnet id is pre-filled in `.env.example`).
3. Deploy with `settlement_mode = 1` (PROOF) in `initialize`.
4. In `settle_round`, the client builds the `validateStat` instruction with
   `scripts/txline/statValidation.ts → buildValidateStatIx(txoracle, validation)`
   and passes `relayThroughSettleRound(ix)` in. Add a `ComputeBudget`
   instruction (~1.4M CU) to the settle transaction.

## 10. Frontend

```bash
cd app
cp .env.local.example .env.local   # or set NEXT_PUBLIC_RPC_URL + NEXT_PUBLIC_PROGRAM_ID
pnpm dev                           # http://localhost:3000
```

Copy `target/idl/bracket_bond.json` into `app/idl/` and wire a wallet-adapter
provider + `BracketBondClient` (see `app/README.md`).

## 11. TypeScript check

```bash
pnpm exec tsc --noEmit             # scripts + tests
cd app && pnpm exec tsc --noEmit   # frontend
```

## Common issues

- **`lock file version 4`** on `anchor build` → Solana CLI too old; upgrade to ≥1.18 / Agave 2.x.
- **`DeclaredProgramIdMismatch`** → run `anchor keys sync` and rebuild.
- **`insufficient funds`** on devnet → `solana airdrop 2` (repeat; devnet faucet is rate-limited).
- **Replay can't find IDL** → run `anchor build` first (generates `target/idl`).
