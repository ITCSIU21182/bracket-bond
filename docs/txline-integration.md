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

### Settlement proof (`/api/scores/stat-validation` → `Txoracle.validateStatV2`)

**Program ids (Txoracle):** devnet `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` · mainnet `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` (v1.5.5). The **devnet IDL is vendored** at `scripts/txline/idl/txoracle.json` (Apache-2.0, from `txodds/tx-on-chain`).

**Endpoint:** `GET /api/scores/stat-validation?fixtureId=&seq=&statKeys=1,2` returns:
`summary { fixtureId, updateStats { updateCount, minTimestamp, maxTimestamp }, eventStatsSubTreeRoot }`, `subTreeProof[]`, `mainTreeProof[]`, `eventStatRoot`, `statsToProve[]` (one `ScoreStat` per requested key), `statProofs[][]`. Proof nodes `{ hash, isRightSibling }` → `hash` mapped with `Array.from`.

**Instruction:** `validateStatV2(payload: StatValidationInput, strategy: NDimensionalStrategy) -> bool`, run via `.view()` (read-only simulation), ~1.4M CU.
- `payload = { ts, fixtureSummary { fixtureId, updateStats, eventsSubTreeRoot }, fixtureProof, mainTreeProof, eventStatRoot, stats: [{ stat, statProof }] }`.
- account: `dailyScoresMerkleRoots` = PDA `["daily_scores_roots", epochDay as u16 LE]`, `epochDay = floor(minTimestamp_ms / 86_400_000)`.
- `strategy` picks the predicate. **"Did A advance?"** = request the two goal stats (`statKeys=1,2`) and use a **binary** predicate: `{ binary: { indexA: 0, indexB: 1, op: { subtract: {} }, predicate: { threshold: 0, comparison: { greaterThan: {} } } } }` (goals A − goals B > 0). Single-stat: `{ single: { index, predicate } }`.

Helpers (`scripts/txline/statValidation.ts`): `loadTxoracle`, `fetchStatValidation`, `buildStatValidationInput`, `advancementStrategy`, `singleStatStrategy`, `buildValidateStatV2Ix`, `dailyScoresPda`. `scripts/txline/index.ts` is a runnable smoke test of the whole path.

**How Bracket Bond uses it (trustless):** the client builds the `validateStatV2` instruction from the vendored IDL and passes its data + accounts into `settle_round` (`Proof` mode). The program **relays the CPI and requires the returned `bool` to be `true`** via `get_return_data()` — an unproven/false result reverts (`ProofFailed`). Add a `ComputeBudget` (~1.4M CU) to the settle tx.

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
- On-chain `subscribe(serviceLevelId, weeks)` on the Txoracle program (Token-2022 ATA; level 1 = free) → `txSig`. Ported to `scripts/txline/subscribe.ts`.
- `POST /api/token/activate` (Bearer JWT) with `{ txSig, walletSignature, leagues[] }`, where `walletSignature` = base64 nacl sig over `${txSig}:${leagues.join(",")}:${jwt}` → `{ token }`.
- Every data request: `Authorization: Bearer <jwt>` + `X-Api-Token: <apiToken>`.
- Snapshots: `GET /api/fixtures/snapshot?competitionId=`, `GET /api/odds/snapshot/{fixtureId}`, `GET /api/scores/snapshot/{fixtureId}`. Streams: `GET /api/odds/stream`, `GET /api/scores/stream` (SSE).

## Compliance (hackathon terms)

- **Original work only**, built during the hackathon; only attributed open-source libs allowed as pre-existing code. Open to natural persons.
- **TxLINE Data is licensed for the hackathon only** — do not redistribute/publish it or use it to build competing products; license ends when the hackathon concludes. → we commit **synthetic** sample fixtures only (`fixtures/knockout-run.json`); real feed caches stay in `fixtures/cache/` (gitignored).
- You retain ownership; TxODDS gets a licence to showcase winners. No FIFA branding.
- Multi-track: may enter multiple, but **win at most one prize**.
- Provide judges a free, testable environment (our devnet deploy + `SETUP.md` cover this).

## Resolved via `txodds/tx-on-chain` (2026-07-13)

TxLINE pointed us to the **`txodds/tx-on-chain`** examples repo (Apache-2.0). From it we now have:
- The Txoracle **devnet IDL** (vendored) + the real `validateStatV2` / `subscribe` shapes.
- The **auth + free-tier subscription** flow (guest JWT `token` → on-chain `subscribe(1, 4)` with a Token-2022 ATA → `/api/token/activate` signed over `${txSig}:${leagues}:${jwt}`), ported to `scripts/txline/{auth,subscribe}.ts`.
- Endpoints: `/scores/stat-validation`, `/scores/historical/{id}`, `/odds|scores/stream`, `/fixtures/snapshot`.

Still to confirm:
1. Exact live SSE payload field names — the stream mostly heartbeats when idle, so develop against `/scores/historical` (`fetchHistoricalScores` helper).
2. Daily-root publish cadence during the World Cup (settlement finality timing).
