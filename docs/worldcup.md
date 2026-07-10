# TxLINE World Cup free tier

How to get live (or 60s-delayed) World Cup data from TxLINE at no cost. Summary
of `https://txline-docs.txodds.com/documentation/worldcup` (verified 2026-07-09).

## Service levels

| Level | Data | Net |
|---|---|---|
| **1** | World Cup + International Friendlies, **60-second delay** | devnet or mainnet |
| **12** | World Cup + International Friendlies, **real-time** | mainnet only |

Both are **free** (no TxL token purchase), **no rate limits**, usable
commercially, and include full historical data.

## API base URLs

- Mainnet: `https://txline.txodds.com`
- Devnet: `https://txline-dev.txodds.com`

## Subscribe (4 steps)

1. **Configure** network + a Solana wallet (devnet or mainnet).
2. **Subscribe on-chain**: send the subscription transaction with
   `SERVICE_LEVEL_ID = 1` (or `12`). Keep the tx signature (`txSig`). The
   Txoracle program ids are in [txline-integration.md](./txline-integration.md).
3. **Sign** the activation message with the same wallet (base64 signature).
4. **Activate**: `POST /api/token/activate` with `{ txSig, signature, leagues }`
   and the guest JWT (`POST /auth/guest/start` → `{ token }`) → returns
   `{ apiToken }`.

Then every request sends `Authorization: Bearer <jwt>` + `X-Api-Token: <apiToken>`.
See `scripts/txline/auth.ts` (`startGuestSession` / `activateApiToken` /
`authenticate`) and fill the `TXLINE_*` fields in `.env`.

## What you can call

- Fixtures: `GET /api/fixtures/snapshot?competitionId=`
- Odds: `GET /api/odds/snapshot/{fixtureId}` · stream `GET /api/odds/stream`
- Scores: `GET /api/scores/snapshot/{fixtureId}` · stream `GET /api/scores/stream`
- Settlement proof: `GET /api/scores/stat-validation?fixtureId=&seq=&statKey=`

## Compliance reminder

The data is licensed for the hackathon only — do not redistribute it or commit
real feed dumps (see the compliance note in [txline-integration.md](./txline-integration.md)).
