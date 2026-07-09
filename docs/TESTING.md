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
anchor keys sync        # replace placeholder program id
anchor build            # produces target/idl/bracket_bond.json
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

**Common fail:** `DeclaredProgramIdMismatch` → you skipped `anchor keys sync`;
re-run it and `anchor build`. `lock file version 4` → Solana CLI < 1.18.

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
line. This is the demo shown to judges (record ≤5 min).

---

## Tier 3 — PROOF-mode settlement (live TxLINE) — currently manual/blocked

Requires: a TxLINE World-Cup subscription (see `docs/worldcup`) and the
**Txoracle IDL JSON** (request via Telegram `TxLINEChat`). Steps:

1. Fill `TXLINE_*` activation fields + `TXORACLE_PROGRAM_ID` in `.env`.
2. `initialize` with `settlement_mode = 1` (PROOF).
3. Drive `settle_round` with a real proof: fetch via
   `scripts/txline/statValidation.ts → fetchStatValidation`, build the CPI with
   `buildValidateStatIx(txoracle, validation)`, pass `relayThroughSettleRound(ix)`
   into `settle_round` (+ a `ComputeBudget` instruction ~1.4M CU).

**Pass:** `settle_round` succeeds only when `validateStat` returns `true`; a
tampered stat/proof makes it revert with `ProofFailed`. **Blocked until** the
Txoracle IDL + a live subscription are available — report this tier as "not
runnable yet" if you lack those, don't fake it.

---

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
| Proof-enforced settlement | Tier 3 | 3 (blocked) |
| `sell` / exit-anytime | **not implemented** (see ROADMAP P1) | — |
| Frontend live reads/buy | **starter only** (see ROADMAP P1) | — |

## Reporting

Please report per tier: command run, pass/fail, and the last ~20 lines of output
on failure. Note your `solana --version` and `anchor --version`.
