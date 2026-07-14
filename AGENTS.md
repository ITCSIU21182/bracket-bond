# AGENTS.md — orientation for an AI agent working on this repo

You are looking at **Bracket Bond**: a proof-settled World Cup prediction market
on Solana for the TxODDS × Superteam hackathon. Read this first, then
`docs/TESTING.md` to verify it and `docs/ROADMAP.md` for what's left.

## What it is (30 seconds)

"Race to the Final": users buy a position on a team advancing through the
knockout run; each round is settled by a **cryptographic proof** of the real
match data (`Txoracle.validateStat` on Solana), not a human oracle. See
`README.md` and `docs/spec.md`.

## Where things are

| Path | What |
|---|---|
| `programs/bracket-bond/src/` | the Solana program: `lib.rs` (instructions + accounts), `state.rs`, `errors.rs` |
| `scripts/txline/` | TxLINE client: `auth`, `oddsStream`, `scoresStream`, `statValidation` (builds the real `validateStat` CPI), `types` |
| `scripts/replay/replay.ts` | demo driver: runs a real knockout run through the program |
| `scripts/lib/program.ts` | program loader + PDA helpers |
| `tests/bracket-bond.ts` | end-to-end + solvency test |
| `app/` | Next.js frontend starter (`lib/bracketBond.ts` is the client) |
| `fixtures/knockout-run.json` | synthetic sample run for the replay/demo |
| `docs/` | `spec`, `architecture`, `txline-integration`, `SETUP`, `TESTING`, `ROADMAP` |

## Ground rules (important)

- **Settlement data = TxLINE only.** Never settle money on any other data source.
  Cosmetic/display data can come from anywhere. (Keeps the "provable" claim honest.)
- **Markets are team/total/threshold level only** — TxLINE penalty data is
  team-total (`5001`/`5002`) + phase `13`, no per-kick/per-player. Don't add
  markets you can't settle from TxLINE.
- **Hackathon compliance:** TxLINE Data is licensed for the hackathon only — do
  **not** commit real feed data (only synthetic `fixtures/knockout-run.json`;
  real caches go in gitignored `fixtures/cache/`).

## Known environment gotchas

- **`anchor build` needs Solana CLI ≥ 1.18 / Agave 2.x.** On 1.17 it fails with
  `lock file version 4`. `cargo check -p bracket-bond` works on any recent Rust.
- Run **`anchor keys sync`** before building to replace the placeholder program id.
- **Offline-testable path** uses `settlement_mode = TRUSTED_ORACLE` (0). The
  **`PROOF` mode** (1) needs the Txoracle IDL + a live TxLINE subscription — see
  `docs/txline-integration.md` "Still to confirm".

## Verified state

Verified end-to-end on Ubuntu 26.04 (WSL2) · Rust 1.97 · **Agave 4.0.2** ·
platform-tools v1.53 · Anchor 0.31 · Node 20 · pnpm 9:

- Tier 0: `cargo check` + `tsc --noEmit` ×3 → clean.
- Tier 1: `anchor build` + `anchor test` → **1 passing** (solvency asserts hold).
- Tier 2: deploy + `pnpm replay` → full run on **localnet** (real deploy + replay;
  economics exact: pot − fee to winner, loser's stake forfeited). Devnet deploy
  blocked only by faucet rate-limits (infra, not code).
- Frontend `next build` → passes.
- Tier 3 (PROOF mode) → blocked by design: needs the Txoracle IDL + a live TxLINE
  subscription. CPI code is in place and shape-correct.

`Anchor.toml` pins `solana_version = "4.0.2"` so `anchor build` uses a
platform-tools new enough for the edition-2024 crates in `Cargo.lock`.

**Added since that run (only `cargo check` + `tsc` were run here — needs Tier 1
re-run + the new Tier 3 smoke test on hardware):** `sell`/exit-anytime + solvency
test + replay exit; live frontend wiring; and the **real TxLINE flow** wired from
`txodds/tx-on-chain` (vendored devnet IDL, `validateStatV2`, guest+nacl auth,
on-chain free-tier `subscribe`). **Tier 3 verified live 2026-07-13** on real WC
fixture 18213979 — `validateStatV2` returned a clean boolean (proof verified
on-chain). `pnpm txline:demo` auto-discovers a finished fixture. Program id is now
fixed (committed keypair in `keys/`) — no `anchor keys sync` needed.
