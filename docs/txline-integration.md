# TxLINE Integration

> What TxLINE actually exposes and exactly how Bracket Bond uses each piece. Verified against the public docs & OpenAPI (`https://txline-docs.txodds.com/llms.txt`) as of 2026-07-08.

## What TxLINE is

TxLINE is TxODDS' **verifiable, Solana-anchored** sports-data feed: fixtures, odds, scores, and settlement, where **every update is hashed and a Merkle root is published to Solana** so any client or smart contract can prove a value was published at a timestamp and hasn't been altered. **Free tier covers the World Cup + International Friendlies**, which is all we need.

## Endpoints we use

| Endpoint | Protocol | Bracket Bond uses it for |
|---|---|---|
| `POST /auth/guest/start` | REST | obtain a guest JWT (all tiers need a Solana wallet) |
| `POST /api/token/activate` | REST | activate the `X-Api-Token` (free WC tier — no TxL purchase) |
| `/api/odds/stream` | **SSE** | live StablePrice odds → the oracle **mark** (implied probability) |
| `/api/scores/stream` | **SSE** | live score / `gameState` → detect full-time, advancement, shootout |
| `/api/scores/stat-validation` | REST | the **stat + Merkle proof** used to settle a round on-chain |
| fixtures snapshot | REST | bracket structure, team list, kickoff times |

### Auth

Two headers on every data request:

```
Authorization: Bearer ${jwt}          # from /auth/guest/start
X-Api-Token:  ${apiToken}             # from /api/token/activate
```

Free World-Cup access = service levels **1 or 12**, no TxL token purchase required. See `scripts/txline/auth.ts`.

### Odds → mark (`/api/odds/stream`)

- SSE stream (`Accept: text/event-stream`, `gzip` supported). Fields include `id`, `event`, `data`, plus per-message `seq` / `ts`.
- **StablePrice** = TxODDS' consensus pricing engine: aggregates global bookmakers, **de-margins**, and filters outliers → a clean *fair* probability.
- We convert decimal odds → implied probability, normalize across the market's outcomes, and push to `update_mark`. **Pricing only — never settlement.**

### Scores → advancement (`/api/scores/stream`)

Team-level aggregates + game phase. Verified encodings we rely on:

| Key / phase | Meaning |
|---|---|
| `Goals` (per participant) | regulation/ET goals |
| `5001` / `5002` | **Participant 1 / 2 penalty-shootout goals** (running total) |
| phase `5` | Ended (finished) |
| phase `10` | Ended after Extra Time |
| phase `13` | **Ended after Penalty Shootout** |
| `YellowCards`, `RedCards`, `Corners` | available for other objective markets |

**Advancement predicate:** team A advances iff
`Goals(A) [+ 5001 if shootout] > Goals(B) [+ 5002 if shootout]`, with phase `13` signalling a shootout decided tie. All team-level → all provable.

### Settlement proof (`/api/scores/stat-validation` → `Txoracle.validateStat`)

- TxLINE builds a **hierarchical Merkle tree** (stat → event subtree → fixture → main tree) and publishes **daily Merkle roots** to Solana, stored in PDAs like `daily_scores_roots[epoch_day]`.
- `/api/scores/stat-validation` returns the stat, its proof nodes, and a fixture summary.
- On-chain, the **`Txoracle`** program's `validateStat` instruction (read-only, ~1.4M CU) reconstructs the leaf, hashes up the proof, and compares against the published root. It can verify a single stat, or predicates like `statA - statB > 0` — exactly what "did A advance?" needs.
- Bracket Bond calls this via CPI inside `settle_round` (`Proof` mode). Helpers `toBytes32()` / `toProofNodes()` format the proof for on-chain use (see `scripts/txline/statValidation.ts`).

## Known limitations (design-shaping)

Verified from the OpenAPI + soccer-feed docs:

- **Penalty data is team-total only** (`5001`/`5002`) + phase `13`. There is **no per-kick event, no taker/player id, no scored-vs-missed per kick, no attempts counter.** → Bracket Bond only offers **team/total/threshold** markets (advancement, totals, cards, corners, shootout winner). No "player X scores" or strict per-kick markets — they aren't settleable from TxLINE.
- **On-chain roots are daily**, so a fully on-chain proof may only be available once the day's root is posted. Live gameplay uses the signed SSE feed; the trustless on-chain proof anchors settlement when the root lands. Our replay controls timing so the demo shows the proof path cleanly.

## Files

- `scripts/txline/auth.ts` — guest JWT + api token
- `scripts/txline/oddsStream.ts` — SSE odds → normalized implied probabilities
- `scripts/txline/scoresStream.ts` — SSE scores → advancement/phase detection
- `scripts/txline/statValidation.ts` — fetch stat + proof, format for the `validateStat` CPI
- `scripts/txline/types.ts` — shared payload types

## Open items to confirm with TxLINE (Telegram `TxLINEChat`)

1. Exact `Txoracle` program id (mainnet/devnet) + `validateStat` account metas / arg layout (to finish the CPI).
2. Whether a richer per-kick penalty feed exists beyond the public schema (would unlock finer markets — not required for this build).
3. Daily-root publish cadence during the World Cup (affects settlement finality timing).
