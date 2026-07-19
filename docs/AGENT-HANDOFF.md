# Agent Handoff — backend + on-chain E2E verification

**For:** the machine/agent with the working Anchor toolchain (Agave 4.0.2, Anchor
0.31) and a funded **devnet** wallet. The dev machine that produced this work runs
solana-cli 1.17 (too old for `anchor build`), so the program + scripts were verified
only with `cargo check` + `tsc`. **Your job is to verify the BACKEND LOGIC and the
ON-CHAIN behavior end-to-end** — the settlement math, the proof CPI, permissionless
+ predicate binding, the keeper, redemption/solvency. **This is not a UI review;**
skip the frontend except the one optional smoke in §6.

---

## 0. Copy-paste prompt for the verifying agent

> You are on a machine with **Agave 4.0.2 + Anchor 0.31 + Node 20+ + pnpm** and a
> **funded devnet wallet** (`ANCHOR_WALLET`, `ANCHOR_PROVIDER_URL=https://api.devnet.solana.com`).
> You are verifying **Bracket Bond**, a proof-settled Solana prediction market — its
> **backend logic and on-chain behavior**, end to end. **Do not review the UI.**
>
> **Read first (to understand what you're verifying), in this order:**
> 1. `docs/AGENT-HANDOFF.md` (this file) — the test list + expected results.
> 2. `docs/TESTING.md` — granular tier-by-tier steps + pass criteria.
> 3. `programs/bracket-bond/src/lib.rs` — the program. Focus on `settle_round`,
>    `bind_advancement_proof`, `canonical_advancement_strategy`, `relay_validate`,
>    `finalize`, `buy`/`sell`/`redeem`, and the `SettleRound`/`Finalize` accounts.
> 4. `programs/bracket-bond/src/state.rs` — `Outcome.participant_slot`,
>    `settlement_mode`, the solvency model comment on `Market`.
> 5. `scripts/txline/statValidation.ts` — `determineAdvancement` (shootout-aware),
>    `relayThroughSettleRound`, the stat keys (goals 1/2, PE 6001/6002).
> 6. `scripts/txline/settle-proof.ts` and `scripts/agent/keeper.ts` — the drivers.
> 7. `AGENTS.md` — the invariant (settlement data = TxLINE only).
>
> **Then run the checklist in §3 of `docs/AGENT-HANDOFF.md`, in order.** For each
> test, run the exact command, compare to the expected result, and record: PASS/FAIL,
> the **evidence** (tx signatures, key log lines, account states, error codes), and
> anything surprising. Use a local `solana-test-validator` for tiers that don't need
> live data (A/B); the proof CPI tests (C/D) need **devnet** (live Txoracle daily
> roots + a real finished World Cup fixture). Do **not** fake a pass — if a fixture
> or the faucet is unavailable, say so and report how far you got.
>
> **Report back to me in the format in §5** (a table + evidence blocks), and include
> `solana --version` and `anchor --version`. Flag any place where the on-chain
> behavior diverges from what the code/docs claim — especially the adversarial
> "can't eliminate the winner" test (C2) and the compute-budget headroom (C3).

---

## 1. What you're verifying (the backend claims)

1. **Solvency + market math** — buy at mark, sell/exit at mark clamped to the pot,
   eliminated stake forfeits to the pot, winner redeems pro-rata minus fee; the
   vault never underpays. (`anchor test` asserts this.)
2. **Proof-enforced settlement** — in `PROOF` mode `settle_round` relays
   `Txoracle.validateStatV2` as a CPI and applies the elimination only if it returns
   `true`; a tampered proof reverts `ProofFailed`.
3. **Shootout-aware advancement** — full-game goals (keys 1/2) exclude shootout
   goals, so a level-at-FT knockout is proven via PE keys **6001/6002**.
4. **Trustless binding + permissionless** — `settle_round` (PROOF, bound outcome)
   parses the payload, **pins the stat keys**, and **rebuilds the advancement
   predicate on-chain** from `Outcome.participant_slot` (proving *the opponent
   advanced*), so **anyone** may settle but can only eliminate the team that lost.
5. **Autonomous keeper** — a non-authority worker settles finished fixtures + finalizes.

## 2. Setup

```bash
git pull                                   # or clone https://github.com/yukitran03/bracket-bond
pnpm install                               # root: scripts/tests
cp .env.example .env                        # set ANCHOR_WALLET, cluster, KEEPER_MARKET_IDS
anchor build                                # regenerates target/idl/bracket_bond.json
```
`postinstall` copies the fixed program keypair (id `EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U`).
If `anchor build` errors on edition-2024 / lockfile v4, confirm `Anchor.toml
[toolchain] solana_version = "4.0.2"`.

## 3. Backend + on-chain test checklist (run in order)

> **✅ Last run (devnet, 2026-07-20, commit 1b96b54): A–H + J all PASS; I = N/A
> (no live penalty-shootout fixture).** Highlights: F permissionless settle_round
> `2emcrff…` (settler ≠ authority); G eliminate-the-winner **reverts `ProofFailed`**;
> H consumed **195,734 / 1,400,000 CU**; J keeper auto-settled + finalised. Re-run to
> reconfirm, and try I when a StatusId-13 fixture is available.

| # | Test | Command | Expected / evidence | Status |
|---|------|---------|---------------------|--------|
| A1 | Program type-checks | `cargo check -p bracket-bond` | no `error[...]` | ✅ done on dev box |
| A2 | Scripts/tests type-check | `pnpm exec tsc --noEmit` | no `error TS` | ✅ done |
| B1 | Build + IDL | `anchor build` | `target/idl/bracket_bond.json` has 5-arg `add_outcome` + `participant_slot` | ⬜ |
| B2 | **Unit E2E + solvency** | `anchor test` | **2 passing**; asserts collateral, vault ≥ collateral, payout ≈ pot−fee, exit ≈ shares×mark | ⬜ |
| B3 | **Replay full loop** (TRUSTED_ORACLE) | deploy + `pnpm replay` | prints init→market→buys→per-round settle→mid-tournament exit→finalize→redeem; economics exact | ⬜ |
| C0 | **Proof path smoke** | `pnpm txline:demo` | `validateStatV2 → true\|false` (clean bool = Merkle proof verified vs on-chain daily root) | ⬜ |
| C1 | **PROOF settle, non-authority wallet** | `ANCHOR_WALLET=<other> pnpm settle:proof` | `outcome N status = 1 (eliminated)`; settler ≠ config authority; capture the `settle_round` tx sig | ⬜ |
| C2 | **Adversarial: can't eliminate the winner** | (see §4) point `outcome` at the winning team + relay any true proof | tx **REVERTS**; record the error (`StatKeyMismatch` / `ProofFailed` / a Txoracle predicate error) | ⬜ |
| C3 | **Compute-budget headroom** | inspect the C1 tx (`solana confirm -v <sig>`) | CU used < limit; the on-chain parse+rebuild fits alongside the ~1.4M-CU CPI. If it exceeds, raise `setComputeUnitLimit` in settle-proof.ts/keeper.ts | ⬜ |
| C4 | **Shootout settle** (if a StatusId-13 fixture exists) | `pnpm settle:proof <fixtureId> <seq>` | settles the shootout winner correctly (PE keys 6001/6002); note `wentToPenalties` | ⬜ |
| C5 | **Redeem on the proof-settled market** | redeem the winner (extend settle:proof or manual) | winner receives pot−fee; vault ≥ fees after; solvency holds | ⬜ |
| D1 | **Keeper auto-settle + finalize** | `KEEPER_MARKET_IDS=<id> pnpm keeper` | logs `⚑ settled market … outcome …` then `🏁 finalised …`, as a non-authority signer | ⬜ |

## 4. The adversarial test (C2) — most important

The security claim is that permissionless settle can eliminate **only the loser**.
To verify, try to break it:

1. Take a finished fixture where participant P **won**. In a scratch copy of
   `scripts/txline/settle-proof.ts`, keep the market creation but call
   `settleRound` with `outcome = pda.outcome(market, <winner index>)` while relaying
   a **true** proof for that fixture (e.g. the winner-advanced proof, or any
   trivially-true stat).
2. **Expected:** the tx reverts. The program rebuilds the predicate as "the opponent
   of the *winner* advanced" — which is **false** — so the `validateStatV2` CPI
   returns false → `ProofFailed` (or `StatKeyMismatch` if you also tamper the stat
   order). Record the exact error. **A success here is a critical bug — report it.**

## 5. Reporting format

Return this table with a Status per row + evidence blocks:

```
| # | Test | Status | Evidence |
| C1 | permissionless settle | PASS | settle_round tx: <sig> · settler <pubkey> ≠ authority <pubkey> · outcome.status=1 |
| C2 | can't eliminate winner | PASS | reverted with 0x… (ProofFailed) · tx <sig or simulation log> |
| C3 | CU headroom | PASS | consumed 1,180,431 of 1,400,000 CU |
...
env: solana <ver> · anchor <ver> · cluster devnet
```
For any FAIL: paste the last ~20 lines of output. If a fixture/faucet is
unavailable, say which tiers you ran on a local validator vs devnet.

## 6. (Optional) one non-UI backend smoke — the AI-pundit route

Not a UI test — verify the server route + tool-calling only:
```bash
cp app/.env.local.example app/.env.local     # set OPENAI_API_KEY (server-side)
pnpm -C app dev
curl -s -X POST http://localhost:3000/api/pundit -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"How does settlement work?"}]}' | head -c 400
```
**Pass:** a streamed grounded answer. Without the key → HTTP 501. Confirm the key
never reaches the client: `grep -r "sk-" app/.next` → nothing.

## 7. Security (do this)

- **Rotate the OpenAI key** shared earlier (compromised). Put the rotated key ONLY in
  `app/.env.local` (gitignored); it's read only in `app/app/api/pundit/route.ts`
  (server). Never commit it; never prefix with `NEXT_PUBLIC_`.
- Keep TxLINE JWT/API tokens server-side (keeper + scripts hold them).
- Play-money / devnet only; the TxL token is never staked (hackathon rule) — Bracket
  Bond escrows native SOL.

## 8. Known gotchas

- Fresh ledger per `settle:proof` — Config must be PROOF mode; a prior `anchor test`
  inits Config as TRUSTED_ORACLE on that ledger.
- `pnpm replay` creates market id 1; re-running on the same ledger fails on
  `create_market` (account in use) — restart the validator.
- Devnet faucet is often rate-limited → use `solana-test-validator` for A/B; C/D need
  devnet (live Txoracle daily roots + a real finished fixture).
- `add_outcome` now takes a trailing `participant_slot`; the settle/finalize signer
  account is `settler` (was `oracle_authority`). Callers/tests already updated.
- **Deploy upgrade gotcha:** the current binary (~369 KB) is larger than an
  earlier on-chain program, so `anchor deploy` upgrade can fail `invalid program
  argument`. Fix: `solana program extend EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U 120000`
  then redeploy, or deploy fresh with `--max-len`.
