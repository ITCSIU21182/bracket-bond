# Bracket Bond — Product Spec

> Refined from the original PRD, with the architecture and data-scope decisions locked after verifying the TxLINE API surface.

## 1. One-liner

A World Cup prediction market where you hold a position that lives across the entire knockout run — buy into *"Team X reaches the final,"* watch it mark up and down live from real odds, cash out anytime, and let a cryptographic proof of the real match data settle every round automatically on-chain.

- **Hackathon:** TxODDS × Superteam Earn — *Prediction Markets & Settlement* track, **$18k USDT**.
- **Team size:** ≤ 3. **Deadline:** 2026-07-19 23:59 UTC.
- **Settlement token:** play-money / devnet (see §7 Compliance).

## 2. The core differentiator (do not invert the order)

1. **Headline — verifiable, automatic settlement.** No human oracle, no dispute window. Objective sports outcomes are settled by proving the real result via `Txoracle.validateStat` on Solana.
2. **Supporting — a tournament-long, exitable position.** You watch the proof settle your bond round by round.

**Honesty boundary:** markets are limited to **objective, TxLINE-provable outcomes** (advancement, goals, cards, corners, shootout results). No subjective markets — those would need an oracle and would dissolve the differentiator.

## 3. Locked decisions

These were the two biggest risks in the original PRD. Both are now resolved to de-risk the ~11-day build.

### D1 — Market mechanism: **N per-team binary pools first, categorical AMM as an upgrade**

The flagship *"Race to the Final"* is modeled as **N independent binary outcomes** ("Team reaches the final: YES"), not a single categorical LMSR market. Each outcome is a simple, solvent pool.

- **Why:** a true N-outcome categorical market with literal cross-outcome redistribution needs LMSR (heavy math) and a global solvency proof. N binary pools are individually solvent and trivial to reason about, and still tell the whole story: when a team is eliminated its YES settles to 0; the surviving teams' markets re-price. "Rolling redistribution" becomes **emergent** rather than a bespoke mechanic.
- **Upgrade path:** a categorical AMM with explicit redistribution is a *Should/Could*, layered on only after the core settles end-to-end.

### D2 — Pricing: **oracle-priced mark, not pure trade-driven AMM**

The live price of each outcome is driven by the **TxLINE odds stream** (the de-margined StablePrice implied probability), not purely by trade flow.

- **Why:** with thin hackathon liquidity a pure constant-product/AMM price would *not* track real odds, so the "watch it mark up/down with the match" experience would not actually happen. Letting TxLINE odds set the mark makes the core promise real. Reserves back solvency; the pool never pays out more than it holds.

## 4. User flow

1. **Browse** the flagship market: *"Race to the Final"* for a set of knockout teams.
2. **Buy** an outcome token for a team at the current oracle mark (e.g. `Brazil @ 0.42`).
3. **Watch** it mark up/down live as TxLINE odds move.
4. **Exit** any time by selling back at the live mark *(upgrade)*, or **hold**.
5. **Each round**, TxLINE proves who advanced; eliminated outcomes settle to zero, their collateral redistributes to survivors.
6. **Final** — winning-outcome holders redeem for a share of the pool; protocol takes a small fee.

## 5. Data scope — the trust rule

> **The mental test for any data point: does money or the official result depend on it?**
> **Yes → TxLINE only. No → any API is fine.**

| Purpose | Source |
|---|---|
| Bracket structure, fixtures, kickoff | **TxLINE** fixtures |
| Live mark / initial price | **TxLINE** `/api/odds/stream` (StablePrice) |
| Advancement, goals, cards, corners, shootout | **TxLINE** `/api/scores/stream` |
| **Settlement proof** | **TxLINE** `/api/scores/stat-validation` → on-chain `validateStat` |
| Flags, kit colors, cosmetic flavor | any free API / static assets (display only) |

Note: per verification (2026-07-08), the TxLINE penalty feed is **team-total goals only** (`5001`/`5002`) plus phase `13` (ended after shootout) — **no per-kick or per-player data**. Markets are therefore team/total/threshold level only. This is by design and keeps every settled market provable.

## 6. Scope (MoSCoW) — completeness is scored

**Must (demoable core):**
- One flagship market (*Race to the Final*) with a fixed, hardcoded knockout bracket path.
- Buy at the oracle mark; deposit collateral; mint outcome shares.
- On-chain proof settlement per round: elimination → zero-out → redistribute to survivors.
- Final redemption + protocol fee.
- **Replay-driven demo** (see §8) — non-negotiable; matches end at the deadline.
- Play-money / devnet.

**Should:**
- Exit anytime (sell back at the live mark) — restores the full "bond" feel.
- Full 4-round arc (fallback: compress to 2 rounds).
- Live match-center UI dressed with cosmetic stats.

**Could:**
- Mint each settled round's proof as a shareable "verified receipt" collectible.
- AI pundit / notifications on big odds shifts.

**Won't (this version):**
- General market factory / many simultaneous markets.
- Real USDC on mainnet.
- Peer-to-peer order book.

**Primary build risk:** the settlement + redistribution accounting. Mitigation: ONE market, hardcoded bracket, get one full round settling end-to-end before adding rounds 2–4.

## 7. Compliance

Use **play-money or devnet tokens** for the submission; describe the USDC/mainnet path in docs only. This sidesteps gambling-law questions entirely while demoing identically. Per the hackathon T&C, jurisdictional compliance is the team's responsibility.

## 8. Demo plan (matches end before judging)

The tournament is over by judging (final 2026-07-19, judging ~07-29), so the demo cannot rely on live activity. A **replay mode** streams a real knockout run through the contract in fast-forward:

1. Pick a real team's actual knockout path.
2. Replay the odds timeline → show the position marking up and down live.
3. Show a **mid-tournament exit** at the live price (proves the exitable-bond claim).
4. Trigger each round's **on-chain proof settlement** on camera — narrate *"no human, no dispute, settled by proof."*
5. Show final redemption + fee.

Keep it ≤ 5 minutes. Cache all feeds (`fixtures/`); never depend on a live external API mid-demo.

## 9. Success criteria (track rubric)

- **Core Functionality** → market ingests live/replayed TxLINE odds + scores and executes buy/settle/redeem end-to-end.
- **User Experience & Use Case** → a fan can buy, watch, (exit,) and get paid without understanding the plumbing; the tournament arc makes it engaging.
- **Code Quality & Logic** → deterministic settlement, solvency invariant provably held, the `validateStat` CPI cleanly integrated and documented.

**Submission checklist:** demo video (≤5 min), public repo, deployed link / devnet endpoint, a brief technical doc listing exact TxLINE endpoints used, and the API-experience feedback field.

## 10. Open decisions for the team

1. Bracket size for the flagship market (4 rounds ideal, 2 as fallback).
2. Which real team's run to use for the replay demo.
3. Whether to ship the "proof receipt" collectible as the memorable extra.
4. Exit (D2 upgrade): ship in submission, or document-only if time is tight.
