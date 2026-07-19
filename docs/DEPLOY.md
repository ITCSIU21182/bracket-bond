# Deploying Bracket Bond

## What deploys where

| Piece | Where it lives | Status |
|---|---|---|
| **Solana program (the "contract")** | Solana **devnet** — not Railway (Railway hosts apps, not a validator) | ✅ deployed: `EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U` |
| **Frontend** (Next.js, includes the AI-pundit API route) | **Railway** (web service) | ready to deploy — config in `app/railway.json` |
| **Keeper** (autonomous settler worker) | **Railway** (worker service) | needs 3 inputs (see below) |

> The program is already live on devnet. To move it to **mainnet**, that's a
> separate `anchor deploy --provider.cluster mainnet` (needs SOL) — not a Railway step.

---

## Frontend → Railway

The frontend runs on realistic mock data out of the box, so it deploys and looks
complete with zero backend wiring. Two ways:

### Path A — connect the GitHub repo (recommended, no CLI/token)

1. Railway dashboard → **New Project → Deploy from GitHub repo** → pick
   `yukitran03/bracket-bond`.
2. Open the service → **Settings → Root Directory** = `app` (the Next app lives in
   `app/`; `app/railway.json` handles the rest).
3. **Variables** → add:
   - `NEXT_PUBLIC_RPC_URL = https://api.devnet.solana.com`
   - `NEXT_PUBLIC_PROGRAM_ID = EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U`
   - `NEXT_PUBLIC_MARKET_ID = 1`
   - `OPENAI_API_KEY = <a freshly-rotated key>` (server-side; optional — without it the
     pundit returns 501 and the rest of the app is unaffected)
4. **Settings → Networking → Generate Domain** → you get a public URL.

Railway (Nixpacks) auto-detects Next.js + pnpm, runs `pnpm install` + `pnpm build`,
and starts `pnpm start` (binds Railway's `$PORT`). First build ~2–3 min.

### Path B — Railway CLI (needs a valid token)

The token must be an **Account/Team token** (railway.com → *Account Settings →
Tokens*) or a **Project token** (*Project → Settings → Tokens*). Then:

```bash
export RAILWAY_API_TOKEN=<your_token>          # account/team token
cd app
railway init -n bracket-bond                   # create the project
railway up                                     # build + deploy from ./app
railway variables --set NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com \
  --set NEXT_PUBLIC_PROGRAM_ID=EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U \
  --set NEXT_PUBLIC_MARKET_ID=1
railway domain                                 # get the public URL
```

> Paste a valid token and I can run this for you. (The one shared earlier returned
> "Not Authorized" from both the CLI and Railway's API — regenerate it, and **rotate**
> it afterward since it was shared in chat.)

### Going fully live (optional)

To wire the frontend to a real on-chain market instead of mock data: `anchor build`
on a capable machine, copy `target/idl/bracket_bond.json` → `app/public/idl/`,
create a market on devnet, and set `NEXT_PUBLIC_MARKET_ID` to it. The mock UI stays
as the graceful fallback.

---

## Keeper → Railway (worker service)

The keeper is a long-lived worker (`pnpm keeper`). It needs **three inputs** before
it can settle anything:

1. **The built IDL** — `target/idl/bracket_bond.json` must be committed (it's
   `anchor build` output, currently gitignored). Commit it, or vendor it under a
   non-ignored path and adjust `scripts/lib/program.ts`.
2. **A funded devnet keypair** as a Railway secret — e.g. `ANCHOR_WALLET_JSON` (the
   raw keypair array) that a small pre-start step writes to a file, then
   `ANCHOR_WALLET=/app/keeper.json`. **This wallet need NOT be the authority** (that's
   the point — settlement is permissionless).
3. **A deployed market** to watch — `KEEPER_MARKET_IDS`.

Service config (Railway → New Service → same repo):
- **Root Directory** = repo root (`/`)
- **Start Command** = `pnpm keeper`
- **Variables**: `ANCHOR_PROVIDER_URL=https://api.devnet.solana.com`,
  `KEEPER_MARKET_IDS=<id>`, `TXLINE_BASE_URL=https://txline-dev.txodds.com`,
  `TXLINE_TOKEN_MINT=4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG`, plus the wallet
  secret from (2).

> Until the IDL is committed + a funded keypair is set, the keeper will start but
> can't load the program. Deploy the frontend first; add the keeper when those are
> ready.

---

## Security

- **Never commit** secrets. `.env`, `app/.env.local`, and keypair files are
  gitignored; set them as Railway **Variables** instead.
- **Rotate** the Railway token and the OpenAI key that were shared in chat.
- Devnet + play-money only; Bracket Bond escrows native SOL (the TxL token is never
  staked).
