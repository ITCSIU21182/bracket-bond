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

**Program ids (Txoracle):** devnet `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` · mainnet `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` (v1.5.5).

**Endpoint:** `GET /api/scores/stat-validation?fixtureId=&seq=&statKey=` returns:
`summary { fixtureId, updateStats { updateCount, minTimestamp, maxTimestamp }, eventStatsSubTreeRoot }`, `subTreeProof[]`, `mainTreeProof[]`, `statToProve`, `eventStatRoot`, `statProof[]` (+ `statToProve2`/`eventStatRoot2`/`statProof2` for two-stat). Proof nodes are `{ hash: hex32, isRightSibling: bool }`.

**Instruction:** `validateStat(ts: i64, fixtureSummary, fixtureProof: ProofNode[], mainTreeProof: ProofNode[], predicate, statA, statB?, op?) -> bool`
- discriminator `[107, 197, 232, 90, 191, 136, 105, 185]` (there is also `validateStatV2`).
- account: `dailyScoresMerkleRoots` = PDA `["daily_scores_roots", epochDay as u16 LE]`, `epochDay = floor(minTimestamp_ms / 86_400_000)`.
- "did A advance?" = two-stat difference: `statA` (advancing team's goals+shootout), `statB` (opponent), `predicate = GreaterThan(0)`, `op = Subtract`.

**How Bracket Bond uses it (trustless):** the client builds the `validateStat` instruction from the Txoracle IDL (`scripts/txline/statValidation.ts` → `buildValidateStatIx`), and passes its data + accounts into `settle_round` (`Proof` mode). The program **relays the CPI and requires the returned `bool` to be `true`** via `get_return_data()` — so an unproven or false result cannot settle a round. (Docs also show an off-chain `.view()` for a read-only check; we enforce it on-chain instead.) The CPI costs ~1.4M CU → add a `ComputeBudget` instruction to the settle transaction.

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

## Auth & endpoints (verified 2026-07-09)

- API base: mainnet `https://txline.txodds.com`, devnet `https://txline-dev.txodds.com`.
- `POST /auth/guest/start` → `{ token }` (JWT, 30-day). No body.
- Free World-Cup tier: on-chain subscribe with `SERVICE_LEVEL_ID = 1` (60s delay, any net) or `12` (real-time, mainnet). No token purchase, no rate limits, commercial use allowed.
- `POST /api/token/activate` (Bearer JWT) with `{ txSig, signature (base64 wallet sig), leagues[] }` → `{ apiToken }`.
- Every data request: `Authorization: Bearer <jwt>` + `X-Api-Token: <apiToken>`.
- Snapshots: `GET /api/fixtures/snapshot?competitionId=`, `GET /api/odds/snapshot/{fixtureId}`, `GET /api/scores/snapshot/{fixtureId}`. Streams: `GET /api/odds/stream`, `GET /api/scores/stream` (SSE).

## Compliance (hackathon terms)

- **Original work only**, built during the hackathon; only attributed open-source libs allowed as pre-existing code. Open to natural persons.
- **TxLINE Data is licensed for the hackathon only** — do not redistribute/publish it or use it to build competing products; license ends when the hackathon concludes. → we commit **synthetic** sample fixtures only (`fixtures/knockout-run.json`); real feed caches stay in `fixtures/cache/` (gitignored).
- You retain ownership; TxODDS gets a licence to showcase winners. No FIFA branding.
- Multi-track: may enter multiple, but **win at most one prize**.
- Provide judges a free, testable environment (our devnet deploy + `SETUP.md` cover this).

## Still to confirm with TxLINE (Telegram `TxLINEChat`)

1. Exact SSE payload field names for `odds/stream` / `scores/stream` (our parsers use best-guess keys; historical scores are `{ seq, ts, gameState }`).
2. The Txoracle **IDL JSON** (to load the program client-side for `buildValidateStatIx`).
3. Daily-root publish cadence during the World Cup (affects settlement finality timing).
