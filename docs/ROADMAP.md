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
- [x] **AI-pundit** — DONE: a grounded chat (`app/app/api/pundit`, Vercel AI SDK +
      gpt-4o-mini, read-only tools, server-side key) explains markets/TxLINE/settlement.
- [x] **Professional UI** — DONE: full rebuild (Tailwind + framer-motion) — Landing,
      Markets, Market detail, Portfolio, Activity + Proof Receipt, Judge Mode, and
      the pundit widget, with the signature proof-reveal / mark-ticker motion.

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

**Trustless binding (DONE):** `settle_round` (PROOF mode) binds the relayed proof
to each outcome end to end — it requires `expected_fixture_id` to match, **pins the
stat keys** to the canonical advancement layout, and **rebuilds the predicate
on-chain** from the outcome's `participant_slot` (proving *the opponent advanced*),
discarding the caller's strategy. Because the program decides the predicate,
settlement is now **permissionless** (anyone / the keeper can settle a bound
outcome) while a caller can only eliminate the team that actually lost. Every
settlement emits a `RoundSettled` event (live feed + indexing). Verify on devnet
per `docs/TESTING.md` Tier 4a (incl. the adversarial "can't eliminate the winner"
check + CU budget).

## What's next (pitch "v2" — rides 2026 trends)

- **Autonomous auto-settler agent — SHIPPED** (`scripts/agent/keeper.ts`): a
  long-lived worker that watches TxLINE and auto-settles the instant a proof exists,
  permissionlessly. Next: add a market-maker leg that arbs marks vs live odds —
  reaches into the **Trading Tools & Agents** track ($16K) and the 2026 agents
  narrative (packageable as an ElizaOS plugin).
- **x402 "settlement-as-a-service":** expose proof-settlement as an x402 endpoint so
  other Solana markets pay per-call to settle objectively — a hot 2026 agentic-payments
  primitive and a strong expansion story.
- **Proof-receipt NFT:** mint each settled round's proof as a shareable "verified
  receipt" — touches the Consumer & Fan track and adds virality.

## Competitive edge (from competitor analysis — see `docs/competitors.md`)

The track is crowded with proof-settled markets; "we CPI into `validate_stat`" is
not a differentiator. Ranked plan to win:

- [x] **Shootout-aware settlement** — `determineAdvancement` handles regulation/ET
      + penalties (PE keys 6001/6002). **Every rival punts on this** → our moat.
- [ ] **Resolve a real shootout on devnet** (find a StatusId-13 fixture) — rivals
      only have synthetic tests.
- [x] **Judge Mode page** — DONE: `/judge` walks proof → `validateStatV2` CPI →
      elimination → bracket, with a Solscan link (`app/app/judge/page.tsx`).
- [x] **Keeper + permissionless `settle_round`** — DONE: PROOF-mode settle is
      permissionless with on-chain predicate binding; `scripts/agent/keeper.ts`
      auto-advances rounds + finalises. Beats authority-gated rivals. (Devnet
      verify: Tier 4a/4b.)
- [x] **Keep TxLINE + OpenAI secrets server-side** — the keeper + the pundit route
      (`app/app/api/pundit`) hold tokens server-side; nothing sensitive in the client bundle.
- [ ] Live TxLINE **reference odds** beside the mark; optional small rake; Telegram
      settle alerts; commit-reveal privacy.

**Framing:** the *only* real, tradeable, tournament-long market (solvent parimutuel
+ exit) that settles knockout ties correctly, **including penalty shootouts**.
