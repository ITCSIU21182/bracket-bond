# Testing / Verification Runbook

A self-contained guide to verify Bracket Bond end-to-end. Written so another
person (or agent) on a capable machine can run it and report results. Do the
tiers in order; each says what to run and **what a pass looks like**.

Prereqs: see `docs/SETUP.md` §1 (Rust, **Solana CLI ≥ 1.18**, Anchor 0.31, Node 20+, pnpm).

```bash
git clone https://github.com/yukitran03/bracket-bond && cd bracket-bond
pnpm install
(cd app && pnpm install)
cp .env.example .env      # edit later for devnet/live tiers
```

---

## Tier 0 — Static checks (no network, no wallet)

```bash
cargo check -p bracket-bond          # program type-checks
pnpm exec tsc --noEmit               # scripts + tests type-check
pnpm -C app exec tsc --noEmit        # frontend type-checks
```

**Pass:** all three finish with no `error:` lines (Rust prints warnings only;
tsc prints nothing). **Fail signal:** any `error[...]` / `error TS...`.

---

## Tier 1 — Program build + functional test (localnet, offline)

```bash
anchor build            # uses the fixed keypair (via postinstall); makes target/idl/bracket_bond.json
anchor test             # boots a local validator + runs tests/bracket-bond.ts
```

**Pass:** `anchor test` prints `bracket-bond ✓ runs a full market end-to-end and
stays solvent` and `1 passing`.

This exercises the **full core feature set** in `TRUSTED_ORACLE` mode:
`initialize → create_market → add_outcome ×N → buy ×2 → settle_round (eliminate)
→ finalize → redeem`, and asserts:
- `total_collateral` equals the sum of buys,
- the vault holds ≥ collateral at all times (**solvency invariant**),
- the winner's payout ≈ pool − fee (loser's stake forfeited to the pot),
- the vault never underpays.

**Common fail:** `DeclaredProgramIdMismatch (4100)` → a stale keypair in
`target/deploy/` from an earlier run. The id is fixed via
`keys/bracket_bond-keypair.json` (copied by `postinstall`); if it mismatches, run
`cp keys/bracket_bond-keypair.json target/deploy/` then `anchor build` again.
`lock file version 4` / edition-2024 build errors → use the pinned Agave 4.0.2
(`Anchor.toml [toolchain] solana_version`).

---

## Tier 2 — Deploy + replay demo (devnet)

```bash
solana config set --url devnet
solana airdrop 2                     # repeat if rate-limited
anchor deploy --provider.cluster devnet
# set BRACKET_BOND_PROGRAM_ID in .env to the deployed id
pnpm replay
```

**Pass:** `pnpm replay` prints the run — config init, market created, outcomes
listed, two buys, then per round: odds `seq` lines with moving marks, a
`⚑ settled by proof → outcome N eliminated` line, then `finalized`, then
`redeemed winning position → +X.XXX SOL`, ending with the "no human, no dispute"
line. Economics must be exact (pot − fee to winner; loser's stake forfeited).
This is the demo shown to judges (record ≤5 min).

> **Devnet faucet blocked?** The devnet airdrop is frequently rate-limited
> (0 SOL), which blocks `anchor deploy` there. Run Tier 2 on a **local validator**
> instead (`solana-test-validator` + `ANCHOR_PROVIDER_URL=http://127.0.0.1:8899`,
> or reuse the `anchor test` validator) — it exercises the identical code paths
> (real deploy + replay) and is what was verified.

---

## Tier 3 — PROOF-mode settlement (live TxLINE, devnet) — NOW RUNNABLE

The Txoracle devnet IDL is vendored and the subscribe/activate/validate flow is
wired (from `txodds/tx-on-chain`). This has **not been run anywhere yet** — it is
the key thing to verify. Report exactly what happens; do not fake a pass.

**Prereqs:** a **funded devnet wallet** (`ANCHOR_WALLET`, needs some SOL for the
subscription tx), `ANCHOR_PROVIDER_URL=https://api.devnet.solana.com`, and `.env`
from `.env.example` (devnet TxLINE host + Txoracle id are pre-filled).

**Step A — smoke test the proof path** (`scripts/txline/index.ts`):

1. Find a **finished World Cup fixture** on devnet: query
   `GET /api/fixtures/updates/{epochDay}/{hourOfDay}` (scan the last ~12h, as in
   the tx-on-chain `fixture_validation_view_only.ts`) to get a `FixtureId` + a
   scores `seq` (or use `/api/scores/historical/{fixtureId}`).
2. Run:
   ```bash
   ANCHOR_WALLET=<keypair.json> ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
     pnpm txline:demo <fixtureId> <seq> 1,2
   ```
   **Pass:** prints `1/4 subscribing… ✓`, `2/4 activating… apiToken…`,
   `3/4 stat-validation…`, and finally **`validateStatV2 → true`**. That proves
   the whole TxLINE proof path end-to-end (subscribe → activate → fetch → on-chain
   `.view()`).

**Step B — enforce it on-chain** (optional, full loop): deploy Bracket Bond, call
`initialize` with `settlement_mode = 1` (PROOF), then drive `settle_round` with the
built instruction — `buildValidateStatV2Ix(txoracle, val, advancementStrategy())`
+ `relayThroughSettleRound(ix)`, plus a `ComputeBudget` (~1.4M CU) on the tx.
**Pass:** `settle_round` succeeds only when the proof verifies; a tampered
stat/proof reverts with `ProofFailed`.

**Likely first-run issues to report:** exact `subscribe` account names, live
`stat-validation` field names, or `NDimensionalStrategy` shape — send ~30 lines of
the failing log so they can be reconciled against the vendored IDL.

---

## P1 — sell/exit + live frontend (added 2026-07-13; re-run to confirm)

After `git pull` + `pnpm install` (root and `app/`):

- **Program `sell`:** `anchor test` should now show **2 passing** — the original
  plus `lets a holder exit early at the mark and stays solvent` (buys 0.4◎ @0.40,
  sells half → ~0.2◎ back, pot drops to ~0.2◎, vault ≥ collateral).
- **Replay exit:** `pnpm replay` now prints, after the Quarter-finals settle,
  `↔ mid-tournament EXIT: sold half at the live mark → +X.XXX SOL (held the rest)`,
  and the final redeem is on the *remaining* half (smaller than the earlier +0.490).
  > `pnpm replay` creates market id 1; re-running on the same ledger fails on
  > `create_market` (account in use) — restart `solana-test-validator` for a fresh run.
- **Frontend:** `pnpm -C app exec tsc --noEmit` clean and `pnpm -C app build`
  passes. To see it *live*: copy the built IDL to `app/public/idl/bracket_bond.json`,
  set `app/.env.local` (from `.env.local.example`) to a deployed market + cluster,
  `pnpm -C app dev`, connect Phantom → outcomes render live with **Buy / Exit**. With
  no market it shows the sample view (still builds/runs).

## Feature checklist

| Feature | How to verify | Tier |
|---|---|---|
| Program compiles | `cargo check` | 0 |
| TS types (client/tests/app) | `tsc --noEmit` ×3 | 0 |
| Create market + outcomes | `anchor test` | 1 |
| Buy at oracle mark | `anchor test` | 1 |
| Round settlement (eliminate) | `anchor test` / replay | 1–2 |
| Emergent redistribution (loser → pot) | `anchor test` payout assert | 1 |
| Finalize + winner resolution | `anchor test` | 1 |
| Redeem pro-rata + fee | `anchor test` | 1 |
| Solvency invariant holds | `anchor test` asserts | 1 |
| Live mark from odds (replay) | `pnpm replay` | 2 |
| Proof-enforced settlement (validateStatV2) | `pnpm txline:demo` → `true` | 3 (runnable; needs devnet wallet + WC fixture) |
| `sell` / exit-anytime | `anchor test` (2nd test) + replay exit line | 1–2 |
| Frontend live reads/buy/exit | `app` tsc + `next build`; live needs a deployed market + IDL | 0 / 2 |

## Reporting

Please report per tier: command run, pass/fail, and the last ~20 lines of output
on failure. Note your `solana --version` and `anchor --version`.
