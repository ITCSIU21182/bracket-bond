# Roadmap — remaining work

Deadline: **2026-07-19 23:59 UTC**. Priorities: **P0** = required for a credible
submission, **P1** = makes it strong, **P2** = polish/nice-to-have.

## ✅ Done (baseline in repo)

- Anchor program: `initialize · create_market · add_outcome · update_mark · buy ·
  settle_round (proof-enforced via get_return_data) · finalize · redeem · claim_fees`;
  single-pot solvency model. Compiles (`cargo check`).
- TxLINE client: guest auth flow, odds/scores SSE, **real `validateStat` CPI builder**
  (correct response shape, PDA, predicate).
- Replay harness + end-to-end **solvency test**.
- Frontend starter (Next.js) + client lib.
- Docs: spec, architecture, txline-integration, SETUP, TESTING, this file.
- TypeScript clean across scripts/tests/app.

---

## P0 — required

- [ ] **Build on a capable machine.** Solana CLI ≥1.18/Agave 2.x, `anchor keys sync`,
      `anchor build`. _Accept:_ `target/idl/bracket_bond.json` generated.
- [ ] **`anchor test` green.** _Accept:_ `1 passing`, solvency asserts hold (Tier 1).
- [ ] **Deploy devnet + `pnpm replay` end-to-end.** _Accept:_ replay prints full
      run incl. redeem payout (Tier 2). Record it.
- [ ] **Get the Txoracle IDL** (Telegram `TxLINEChat`) and load it client-side so
      `buildValidateStatIx` runs against the real program. _Accept:_ a real
      `stat-validation` response builds a `validateStat` ix that `.view()` returns
      `true` for a finished WC fixture.
- [ ] **PROOF-mode settlement once, for real.** Settle one real knockout tie via
      `settle_round` in `PROOF` mode. _Accept:_ succeeds on a valid proof, reverts
      `ProofFailed` on a tampered one (Tier 3).
- [ ] **Confirm SSE payload field names** (odds/scores) and fix
      `oddsStream.ts`/`scoresStream.ts` parsers. _Accept:_ `pnpm txline:demo <fixtureId>`
      prints live marks + detects full-time.
- [ ] **Replace placeholder program id** everywhere; `.env` filled.
- [ ] **Demo video ≤5 min** + brief technical doc listing exact TxLINE endpoints used
      (submission requirement).

## P1 — strong

- [x] **`sell` / exit-anytime** — DONE: `sell` instruction (mark-priced, clamped to
      the pot), solvency test, and a mid-tournament exit in the replay. _Re-run Tier 1
      to confirm on hardware._
- [x] **Frontend live** — DONE (mostly): wallet-adapter providers, `BracketBondClient`
      reads, real `buy` + `Exit` (sellAll) txns wired (`app/lib/useBracketBond.ts`).
      _Still TODO:_ live `connection.onAccountChange` subscription (currently refreshes
      after each tx), and copy the built IDL to `app/public/idl/bracket_bond.json`.
- [ ] **Multi-round arc (4 rounds)** in the flagship market + `ComputeBudget` ix in the
      settle tx. _Accept:_ replay runs a 4-round bracket.
- [ ] **Guards & polish:** cap `add_outcome` count, reject buys after first settlement
      if desired, event logs (`emit!`) for indexing.

## P2 — polish

- [ ] **Proof-receipt collectible:** mint each settled round's proof as a shareable NFT.
- [ ] AI-pundit / notifications on big odds shifts (display only — no settlement).
- [ ] Nicer UI (team will redesign).

---

## Suggested order for the other-machine agent

1. Tier 0 → Tier 1 (`anchor test`) → Tier 2 (`pnpm replay`). Report results.
2. Tier 3 proof path: `pnpm txline:demo` (needs funded devnet wallet). ✅ verified.
3. Full on-chain settle: `pnpm settle:proof` (see Definition of Done).

---

## Definition of Done → submission (deadline 2026-07-19)

The technical core is verified live (Tier 0–2 + the Tier 3 proof path on a real WC
match). What's left is the full loop + packaging:

- [x] **Full on-chain PROOF settle** — ✅ DONE on devnet: `pnpm settle:proof`
      eliminated a real knockout outcome (Norway v England, fixture 18213979, P2
      won 2-1) by cryptographic proof. `settle_round` tx
      `65jgF1VB5X6PNg75dQvtzhHqU438s8n5TDG3QTSqevR4cUr75eEfqK9NWefYQETxVeYTqgJxzL3vcinuf2XmZLGw`.
- [ ] **Public devnet deploy** of the program (needs devnet SOL). _Accept:_ a
      program id + a deployed market others can hit.
- [ ] **Frontend live** on the deployed market (copy the built IDL to
      `app/public/idl/bracket_bond.json`, set `app/.env.local`); wallet connects,
      Buy/Exit work.
- [ ] **Demo video ≤5 min** (replay + a real proof settle) per `docs/spec.md §8`.
- [ ] **Superteam Earn submission**: repo link, deployed/devnet link, a short
      technical doc listing the exact TxLINE endpoints used, + the API-experience
      feedback field.
- [ ] **Compliance check**: play-money/devnet only; no real TxLINE data committed
      (✓ synthetic fixtures); confirm the brief permits AI-assisted code.

**Known limitation to mention (or harden if time):** `settle_round` requires the
relayed proof to return `true` but does not yet **bind** it to the eliminated
outcome/fixture — the oracle authority pairs them (the `settle:proof` driver does).
Binding the proof's fixture + predicate to the market outcome on-chain is the next
hardening step.
