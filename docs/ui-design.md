# Bracket Bond — UI Design Spec

A build brief for the frontend, written to be pasted into **Lovable** (or any
AI app builder). Direction: **sleek dark fintech, proof-as-hero**, with
Robinhood-grade micro-interactions. Build with **mock data first** — we wire the
Solana program + TxLINE afterward.

> The one thing no competitor nails: the *moment a market resolves*. Polymarket's
> trade flow is "emotionally flat" (no confirmation animation, no engagement
> layer). Bracket Bond turns **"proof verified"** into the satisfying hero moment,
> and marks that **tick and count up like Robinhood**.

---

## A. Design system

**Vibe:** dark charcoal canvas, one confident green accent, generous space, tabular
numerals, subtle motion. Premium, calm, data-legible — not neon, not cluttered.

**Color tokens**

| Token | Hex | Use |
| --- | --- | --- |
| `bg` | `#0b0e14` | app background |
| `panel` | `#141922` | cards |
| `panel-2` | `#1a2028` | nested / hover |
| `line` | `#232a36` | borders, dividers |
| `text` | `#e6e9ef` | primary text |
| `muted` | `#8a93a6` | secondary text |
| `accent` | `#37d67a` | brand green — CTAs, "alive", proof ✓, up |
| `accent-dim` | `#1f9d55` | pressed / light-mode accent |
| `danger` | `#ff5c72` | "eliminated", down, destructive |
| `gold` | `#f5c451` | "won" / winner |

**Type:** Inter or Geist Sans for UI; **tabular / monospace numerals** for all
marks, prices, amounts (`font-variant-numeric: tabular-nums`, or JetBrains Mono).
Marks render large and animated.

**Radius / depth:** cards `rounded-2xl` (16px), `1px` `line` borders, soft shadow,
a faint green glow only on the proof moment and primary CTAs.

**Motion (framer-motion):**
- **Mark counter** counts up/down to its new value; the digit flashes `accent`
  (up) or `danger` (down) for ~400ms on change.
- **Probability bar** animates width changes with a spring.
- **Trade confirm** — button morphs to a spinner then a ✓ with a green ripple.
- **Proof reveal** — a check-path draws in, a soft green glow pulses once, the tx
  hash slides in. This is the signature interaction; make it feel earned.
- Respect `prefers-reduced-motion`.

**Core components:** `MarketCard`, `OutcomeRow`, `MarkTicker`, `ProbBar`,
`StatusPill` (alive/eliminated/won), `TradeSheet`, `PositionCard`, `StatTile`,
`SettlementFeedItem`, `ProofReceipt`, `WalletButton`, `BracketMini`.

**Tech for Lovable:** React + TypeScript + Tailwind + shadcn/ui + framer-motion +
lucide icons. Dark theme only (with a light toggle optional). Mock data modules;
no real wallet/RPC yet.

---

## B. Pages

### 1. Landing (`/`) — optional, great for the demo
**Purpose:** 8-second pitch, then into the markets.

```
┌───────────────────────────────────────────────┐
│  Bracket Bond                      [Launch app] │
│                                                 │
│   Hold a World Cup position that                │
│   settles itself — by proof, not by vote.       │
│   ▸ proof-settled · exit anytime · on Solana    │
│                                                 │
│   [ Enter markets ]   ✓ settled by proof, live  │
│                       tx 65jgF1VB…  →           │
└───────────────────────────────────────────────┘
```
Big gradient headline (green→teal), one line of sub, two chips, a live "proof
verified" ticker citing the real settle tx. Background: faint radial green glow,
a ghosted bracket graphic.

### 2. Markets — home (`/markets`)
**Purpose:** browse markets; the flagship **"Race to the Final"** is featured.

```
┌ Markets ───────────────────────────  [◎ Connect]┐
│  Featured                                        │
│  ┌────────────────────────────────────────────┐ │
│  │ Race to the Final · Round of 8 · open       │ │
│  │ pool 12.4◎ · 8 teams · settles by proof     │ │
│  │ Brazil 78¢  Argentina 52¢  France 30¢  …    │ │  ← mini animated marks
│  │                              [ View market ] │ │
│  └────────────────────────────────────────────┘ │
│  All markets                                     │
│  ▸ Golden Boot · ▸ Total goals O/U · …           │
└──────────────────────────────────────────────────┘
```
**Components:** `MarketCard` (title, round chip, status pill, pool `StatTile`,
inline `MarkTicker`s for top outcomes, CTA). **States:** loading (skeleton
cards), empty ("no open markets"), connected vs not.

### 3. Market detail (`/markets/[id]`) — the core screen
**Purpose:** trade, watch marks live, see your position, and watch rounds settle
by proof.

```
┌ Race to the Final ───────────── Round of 8 · open ┐
│ pool 12.4◎   your position 1.2◎ (+0.18)   fee 2%  │  ← StatTiles
├───────────────────────────────┬───────────────────┤
│ Outcomes                      │  Bracket           │
│ ┌───────────────────────────┐ │   R8 ─ SF ─ Final  │
│ │🇧🇷 Brazil   78¢ ↗  alive   │ │   Brazil ●───┐     │
│ │ ██████████░░░  [Buy][Exit] │ │   Spain  ○   │     │
│ ├───────────────────────────┤ │   …               │
│ │🇦🇷 Argentina 52¢ ↘ alive   │ ├───────────────────┤
│ │ ██████░░░░░░  [Buy][Exit]  │ │  Settlement feed   │
│ ├───────────────────────────┤ │  ✓ ESP eliminated  │
│ │🇪🇸 Spain     0¢   eliminated│ │    proof · tx 4f3a→│
│ └───────────────────────────┘ │  ✓ FRA eliminated  │
│                               │    proof · tx a9d→ │
└───────────────────────────────┴───────────────────┘
```
**Left — outcomes list:** each `OutcomeRow` = flag + team, big **animated mark**
(¢), tick arrow, `ProbBar`, `StatusPill`, `[Buy]` `[Exit]`. Eliminated rows dim +
strike; won row glows gold.
**Right — Bracket mini** (`BracketMini`, teams advancing) + **Settlement feed**
(this market's `SettlementFeedItem`s, each opening a `ProofReceipt`).
**Interactions:** Buy/Exit open the `TradeSheet`; marks stream and animate;
when a round settles, the eliminated row animates to 0 + a feed item slides in
with the proof reveal.
**States:** not-connected (Buy/Exit prompt connect), open vs resolved (show
Redeem on the winning row when resolved).

### 4. Trade sheet (drawer/modal)
**Purpose:** buy or exit, with a satisfying confirm.

```
┌ Buy · Brazil ──────────────────────┐
│  Amount   [ 0.50 ◎ ]  ½  max        │
│  Price (mark)          0.78         │
│  You get               0.641 shares │
│  Fee (2%)              0.010 ◎      │
│  ─────────────────────────────────  │
│  [        Confirm buy        ]  →✓  │  ← morphs to spinner → green ✓ ripple
└─────────────────────────────────────┘
```
Sell/Exit variant: shows shares to sell, payout at mark, "clamped to pool" note.
**States:** input validation, insufficient balance, submitting, success (ripple +
toast), error.

### 5. Portfolio (`/portfolio`)
**Purpose:** all your positions, value, P&L, exit/redeem.

```
┌ Portfolio ───────────────  total 3.9◎ · P&L +0.42 ┐
│ ┌ Race to the Final ─────────────────────────────┐│
│ │🇧🇷 Brazil  0.64 sh · now 0.50◎ · +0.12  [Exit]  ││
│ │🇦🇷 Argentina 0.30 sh · now 0.16◎ · −0.04 [Exit] ││
│ └────────────────────────────────────────────────┘│
│ ┌ Resolved ──────────────────────────────────────┐│
│ │🇧🇷 Brazil WON · 0.49◎ claimable   [ Redeem ]    ││
│ └────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```
`PositionCard`s grouped by market; P&L colored; `Redeem` on winners. Empty state:
"No positions yet — browse markets."

### 6. Activity / Proof feed (`/activity`) + Proof Receipt (modal)
**Purpose:** the differentiator, showcased. A global stream of proof-settled
rounds; each opens the **ProofReceipt** — the hero moment.

```
Activity                          Proof Receipt (modal)
✓ Race to Final · ESP eliminated  ┌───────────────────────────┐
  proof verified · 2m ago  →      │        ✓  (green draw)     │
✓ Golden Boot · resolved          │  Settled by proof          │
  proof verified · 1h ago  →      │  Norway 1 – 2 England      │
                                  │  predicate: A−B > 0 → false│
                                  │  Merkle root  0x9f2c…      │
                                  │  tx 65jgF1VB…  [Solscan →] │
                                  │  no human oracle, no dispute│
                                  └───────────────────────────┘
```
`SettlementFeedItem`: ✓ + market + what was eliminated + "proof verified" + time +
chevron. `ProofReceipt`: the check-draw reveal, the match + score, the predicate,
the Merkle root (truncated), the **on-chain tx link**, the tagline. This is the
screen that wins the demo.

---

## C. Component quick-specs

| Component | Notes |
| --- | --- |
| `MarkTicker` | large tabular number in ¢; count-up on change; flash accent/danger; tiny ↗/↘ |
| `ProbBar` | filled bar = implied prob; spring width; accent fill, dims when eliminated |
| `StatusPill` | `alive` (accent outline) · `eliminated` (danger, strike) · `won` (gold, glow) |
| `TradeSheet` | amount + ½/max, price, shares, fee, confirm-with-ripple; buy/sell variants |
| `SettlementFeedItem` | ✓ + text + "proof verified" + time + opens `ProofReceipt` |
| `ProofReceipt` | the hero reveal: check-draw, match, predicate, Merkle root, tx link |
| `WalletButton` | connect / address+balance; from @solana/wallet-adapter later |
| `StatTile` | label + big tabular value (pool, P&L, fee) |
| `BracketMini` | compact knockout tree; advancing teams solid, eliminated dimmed |

---

## D. Lovable prompts

### Master prompt (paste first)

> Build a **dark, premium prediction-market web app** called **Bracket Bond** with
> React + TypeScript + Tailwind + shadcn/ui + framer-motion + lucide icons. Use
> **mock data** (no real backend/wallet yet).
>
> **Design system:** dark only. Background `#0b0e14`, cards `#141922`, borders
> `#232a36`, text `#e6e9ef`, muted `#8a93a6`, one green accent `#37d67a` (CTAs,
> "alive", up, proof ✓), danger `#ff5c72` (eliminated, down), gold `#f5c451`
> (winner). Inter for UI; **tabular numerals** for all marks/prices/amounts.
> Cards `rounded-2xl`, 1px borders, soft shadow; a faint green glow only on
> primary CTAs and the proof moment. Generous spacing, calm, data-legible.
>
> **Signature motion:** market "marks" (implied probabilities shown in ¢) **count
> up/down** to new values and **flash green (up) / red (down)** for ~400ms on
> change — Robinhood-style. Probability bars animate with a spring. Trade confirm
> morphs button → spinner → green ✓ ripple. The **proof-verified** moment draws a
> check path, pulses a green glow once, and slides in a tx hash. Respect
> reduced-motion.
>
> **Pages:** (1) Landing — gradient headline "Hold a World Cup position that
> settles itself — by proof, not by vote", CTA into markets, a live "proof
> verified · tx 65jgF1VB…" chip. (2) Markets — a featured **"Race to the Final"**
> card + a grid of markets; each card shows round, status, pool, and inline
> animated marks for its top teams. (3) Market detail — left: a list of team
> outcomes, each with flag, a large animated mark, a probability bar, a status
> pill (alive/eliminated/won), and Buy/Exit buttons; right: a compact knockout
> bracket + a **settlement feed** where each item says "TEAM eliminated · proof
> verified" and opens a Proof Receipt. Header shows pool / your position / fee as
> stat tiles. (4) Trade sheet (drawer) — amount with ½/max, price, shares you get,
> 2% fee, confirm-with-ripple; buy and exit variants. (5) Portfolio — your
> positions grouped by market with value and colored P&L, Exit buttons, and a
> Redeem button on resolved winners. (6) Activity — a global stream of
> proof-settled rounds; clicking one opens the **Proof Receipt** modal.
>
> **Proof Receipt (the hero screen):** a big animated green check, "Settled by
> proof", the match + score (e.g. "Norway 1 – 2 England"), the predicate
> ("goals A − B > 0 → false"), a truncated Merkle root, an on-chain transaction
> link, and the line "no human oracle, no dispute window." Make it feel premium
> and earned.
>
> Make it fully responsive (desktop dashboard → mobile). Seed realistic mock data:
> a "Race to the Final" market with Brazil/Argentina/France/Spain, live-ish marks,
> one eliminated team, a couple of settlement feed items with tx hashes.

### Per-page refinement prompts (after the app scaffolds)

- **Market detail:** "On the market detail page, make each outcome row: flag +
  team name, a large tabular mark in ¢ that animates and flashes on change, a
  spring-animated probability bar, a status pill, and Buy/Exit. Dim + strike
  eliminated rows; glow the winner gold. Right column: a compact knockout bracket
  and a settlement feed of proof events."
- **Proof Receipt:** "Design the Proof Receipt modal as the emotional peak: an
  SVG check that draws in over ~600ms, a one-time green glow pulse, then the match
  score, predicate, truncated Merkle root, and a monospace tx hash with a
  'View on Solscan' link. Tagline: 'Settled by proof — no human oracle.'"
- **Trade sheet:** "Make the confirm button morph into a spinner then a green
  check with a radial ripple, then show a success toast. Add ½ and max amount
  chips and live share/fee math."
- **Marks:** "Extract a `MarkTicker` component that count-animates to its value
  and flashes accent/danger on increase/decrease, with a small ↗/↘ indicator."

---

## E2. Competitive UX additions (from rival analysis — see `docs/competitors.md`)

Add these to stand out from the other proof-settled markets:

- **Judge Mode (`/judge`)** — a verified-replay page (borrow predict9ja's flagship):
  pick a settled round, and walk **source proof → `validate_stat_v2` CPI tx →
  bracket progression**, with the Merkle root, the predicate (incl. the shootout
  path), and a Solscan link. Judges reward inspectable settlement; make this a
  headline screen. Lovable prompt: *"Add a Judge Mode page that, for a settled
  round, shows a step timeline: TxLINE proof received → validateStatV2 verified
  on-chain (tx link) → outcome eliminated → bracket advanced, each step with its
  data receipt. Clean, technical, trustworthy."*
- **Live TxLINE reference odds beside your mark** (borrow world-cup's OddsPanel) —
  shows market context and that pricing is data-driven.
- **Status lifecycle as a design-system** (borrow matchlock): outcome states
  `alive → eliminated → won` (and market `open → resolved`) with dedicated color
  tokens + badges, used consistently everywhere.
- **Reward the settlement moment**: sonner toast + a subtle confetti + the proof
  reveal — make claim/settle feel great.
- **"Challenge a friend"** shareable link that opens a market with your position
  highlighted (natural virality for brackets).
- **Telegram alert** when your bracket outcome settles / a proof lands.
- Security note for wiring: **keep the TxLINE JWT/API token server-side** (a keeper
  proxy) — several rivals leak them in the client bundle; don't.

## E. Wiring notes (for when the design comes back)

Once Lovable's UI is in, swap mock data for the real client:
- Reads/writes → `app/lib/bracketBond.ts` (`BracketBondClient`) + the
  `useBracketBond` hook. Wallet → `@solana/wallet-adapter-react` providers
  (already scaffolded in `app/app/providers.tsx`).
- Live marks → subscribe to each `Outcome` PDA with `connection.onAccountChange`.
- Settlement feed / Proof Receipt → the `settle_round` tx + the TxLINE proof
  (`scripts/txline`), linking the real devnet transaction (e.g. `65jgF1VB…`).
- Program id `EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U` (devnet); copy the
  built IDL to `app/public/idl/bracket_bond.json`.
