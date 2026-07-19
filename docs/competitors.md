# Competitive landscape & how Bracket Bond wins

Analysis of other **Prediction Markets & Settlement** track submissions (cloned +
read, 2026-07). The track is crowded with proof-settled markets — "we CPI into
`validate_stat`" is no longer a differentiator. Our edge is **market design +
correct knockout settlement + polish**.

## The field

| Project | What it is | Settle | Market? | Key gap |
|---|---|---|---|---|
| **ShroudLine** | Privacy market (Arcium MPC-encrypted picks) + proof settle | CPI `validate_stat_v2`, on-chain strategy w/ key-pinning | ❌ fixed **2× payout → insolvent**, no odds | no sell/exit; authority-gated resolver; shootout only unit-tested |
| **world-cup-2026-prediction-market** | H/D/A single-match market | CPI `validate_stat` **v1**, permissionless | ✅ parimutuel SOL, no fee | 1 bet/user, **no exit**; **no shootout** (→ Draw); secrets in client |
| **predict9ja** | Verifiable-settlement *demo* (superb polish, /judge replay) | **read-only `.view()`**, off-chain resolve, demo credits | ❌ fake credits, fixed quotes | not a real on-chain settlement; no shootout |
| veil-txline, settleline, resolvekit, settlement-court, chiku524/txline-predict, proofplay | more proof-settled markets / settlement tooling | mostly CPI/verify | mixed | (not all inspected) |

Other tracks (field awareness): **matchlock** (P2P USDT duel, most polished UI — React19/Tailwind4/shadcn/framer-motion, status-lifecycle design system), corner-clash (fan corner game), Goal-Line (predictions + Telegram), sharp-movement-detector (odds agent).

## The convergent gap → our moat

**Every rival punts on penalty shootouts.** TxLINE full-game goal stats (keys 1/2)
exclude shootout goals, so a knockout decided on penalties looks *level* and
naive predicates settle it as a **Draw** — wrong for an advancement product.
For a "Race to the Final" bracket, resolving *who advanced* (incl. shootouts) is
the whole point. We now handle it (see [settlement](../docs-site/content/docs/settlement.mdx)):

- Regulation/ET: `Binary(goalsA − goalsB > 0)`.
- Shootout: `Binary(goalsA − goalsB == 0)` AND `Binary(peA − peB > 0)`, PE keys **6001/6002** (+6000 — the docs' +5000 is actually ET2, per the live-feed period shift).

**To win the settlement narrative: resolve a real shootout on devnet** (rivals
only have synthetic tests). StatusId `13` = finished-on-penalties finds one.

## Where Bracket Bond wins

1. **A real, tradeable market.** Single-pot **parimutuel is solvent by
   construction** + **buy/sell-exit at a live mark** = secondary liquidity and
   price discovery. ShroudLine's fixed-2× is insolvent exactly when the crowd is
   right; world-cup/predict9ja lock you to one bet with no exit. **Nobody else has
   exit.**
2. **Tournament-progression product.** "Hold a team's whole knockout run" —
   multi-round, compounding. Everyone else is single-match H/D/A.
3. **Correct knockout settlement** incl. shootouts (the moat above).
4. **`validate_stat_v2`** (the n-dimensional path the track calls out) — world-cup
   still uses v1.
5. Real devnet **settle tx** already proven.

## Where rivals win (and our answer)

- **ShroudLine: privacy (Arcium MPC).** Our answer: transparency *is* the market —
  hidden picks can never surface live odds. Optional cheap **commit-reveal** narrows
  the front-running gap if time allows.
- **ShroudLine: full automation** (worker auto-creates + resolves the schedule).
  Answer: add a **keeper** that auto-advances bracket rounds.
- **world-cup: permissionless resolver** (any signer). Answer: make our
  `settle_round` permissionless too (rely on the proof, not an authority).
- **predict9ja: /judge verified-replay page.** Answer: build a **"Judge Mode"**
  page — proof → CPI settle tx → bracket progression, inspectable.

## Action plan (ranked)

1. ✅ **Shootout-aware settlement** (done in `scripts/txline` — `determineAdvancement`).
2. **Resolve a real shootout on devnet** (find a StatusId-13 fixture) — proves the moat.
3. **Judge Mode page** in the UI (borrow predict9ja) — inspectable proof/tx/bracket.
4. **Keeper + permissionless `settle_round`** — match ShroudLine's automation, beat their authority-gating.
5. **Keep TxLINE secrets server-side** (rivals leak JWT/API token in the client bundle).
6. **Live TxLINE reference odds** beside the mark (borrow world-cup's OddsPanel).
7. Optional: small rake (read as a real venue); Telegram settle alerts; commit-reveal privacy.

## Pitch framing

> Everyone else built a proof-settled *guessing game*. Bracket Bond is a real,
> tradeable, tournament-long **market** — solvent parimutuel odds you can exit
> anytime — and the only one that settles knockout ties **correctly, including
> penalty shootouts**, verified on-chain by TxLINE. No admin, no dispute window.
