<div align="center">

<img src="app/public/brand/logo.png" alt="Bracket Bond" width="96" />

# Bracket Bond

**Hold a World Cup position that settles itself — by proof, not by vote.**

A tradeable, tournament-long prediction market on **Solana**, where every knockout
round resolves on a **cryptographic proof of the real match data** (TxLINE /
TxODDS) — including penalty shootouts. No human oracle, no dispute window.

Built for the **TxODDS × Superteam World Cup Hackathon** — *Prediction Markets &
Settlement*.

[Settlement](docs-site/content/docs/settlement.mdx) ·
[Testing](docs/TESTING.md) ·
[Agent handoff](docs/AGENT-HANDOFF.md) ·
[Demo script](docs/DEMO.md) ·
[Roadmap](docs/ROADMAP.md)

</div>

---

## Why it's different

Most prediction markets answer *"who decides the result?"* with people — a proposer,
a dispute window, token-holder voters. That's trust-*minimized*, not trust-*less*.
For an objective sports outcome ("did Brazil advance?"), a **math-proven settlement**
is strictly better than a vote.

Bracket Bond settles each knockout round on a **TxLINE Merkle proof of the real
match data**, verified on-chain via a CPI into TxODDS's `Txoracle` program. The
elimination applies **only if the proof verifies**.

| | Bracket Bond | Typical rivals |
|---|---|---|
| Settlement | Cryptographic proof (on-chain CPI) | Human oracle / vote / dispute window |
| Penalty shootouts | ✅ Settled correctly (PE keys 6001/6002) | ❌ Usually mis-settled as a draw |
| Tradeable | ✅ Buy + **exit anytime** at the live mark | Often locked until resolution |
| Who can settle | ✅ **Permissionless** (anyone / a keeper) | Authority-gated |
| Can the winner be wrongly eliminated? | ❌ Reverts — predicate is rebuilt on-chain | — |

## ✅ Verified on-chain (devnet)

Backend + on-chain behavior was verified end-to-end on devnet (full log:
[`docs/AGENT-HANDOFF.md`](docs/AGENT-HANDOFF.md)):

- **Permissionless settle** from a non-authority wallet —
  [`settle_round` tx `2emcrff…`](https://solscan.io/tx/2emcrffBsuuX3t2M7EH6Au2Uzkvr2j29yMx5twmPjVn8YaQAcnWbU5ZvRyEf5nJurb81N4GVVCq69oLZvWimeZCa?cluster=devnet)
  (settler ≠ config authority).
- **Can't eliminate the winner** — pointing settlement at the winning team **reverts
  `ProofFailed`** (the program rebuilds the predicate on-chain and doesn't trust the
  caller's strategy).
- **Compute budget** — the on-chain parse + predicate-rebuild + the ~1.4M-CU proof
  CPI fit in **195,734 / 1,400,000 CU**.
- **First proof settle** (Norway v England, fixture 18213979) —
  [`tx 65jgF1VB…`](https://solscan.io/tx/65jgF1VB5X6PNg75dQvtzhHqU438s8n5TDG3QTSqevR4cUr75eEfqK9NWefYQETxVeYTqgJxzL3vcinuf2XmZLGw?cluster=devnet).

Program id (devnet): `EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U`.

## How settlement works

1. TxLINE hashes every scores update into a Merkle tree and posts a **daily root**
   to Solana (a PDA under the `Txoracle` program).
2. A settler (anyone, or the autonomous keeper) fetches the stat + Merkle proof for
   the finished fixture and calls `settle_round`.
3. In `PROOF` mode, `settle_round` **rebuilds the advancement predicate on-chain**
   from the outcome's stored `participant_slot`, **pins the stat keys** (full-game
   goals `1`/`2`, penalty-shootout goals `6001`/`6002`), and relays
   `Txoracle.validate_stat_v2` as a CPI. The elimination applies only if the CPI
   returns `true`.
4. Because the *program* decides the predicate, settlement is permissionless yet a
   caller can only eliminate the team that actually **lost**.

**Shootout correctness:** full-game goal stats exclude shootout goals, so a knockout
level at full time went to penalties. Bracket Bond then proves the shootout winner
with the PE keys `6001`/`6002` — the case nearly every rival mis-handles.

## Architecture

```
Anchor program (programs/bracket-bond)   single-pot parimutuel market;
  initialize · create_market · add_outcome · update_mark · buy · sell ·
  settle_round (proof CPI + on-chain predicate binding) · finalize · redeem
        |
        +-- CPI --> Txoracle.validate_stat_v2 (TxLINE daily Merkle root)
        |
TxLINE client (scripts/txline)   auth · subscribe · odds/scores SSE ·
  stat-validation · determineAdvancement (shootout-aware)
        |
Autonomous keeper (scripts/agent/keeper.ts)   watches finished fixtures ->
  determineAdvancement -> permissionless settle_round -> finalize
        |
Frontend (app/)   Next.js + Tailwind + framer-motion; markets, trade sheet,
  proof receipts, Judge Mode, charts, and an AI-pundit chat (server-side key)
```

## Features

- **Single-pot parimutuel** market with a solvency invariant (the vault never
  underpays); buy at an oracle-priced mark, **exit anytime** at the live mark.
- **Proof-enforced, permissionless settlement** with on-chain predicate + stat-key
  binding.
- **Shootout-aware** advancement (regulation / ET / penalties).
- **Autonomous keeper** — settles the instant a proof exists (deterministic; no LLM
  in the settlement path).
- **AI-pundit** chat grounded on TxLINE data + settlement (OpenAI, server-side key).
- **Judge Mode** — inspect any settled round: proof → CPI → elimination → bracket.
- Professional dark UI with live marks, proof-reveal animations, and mark-history +
  usage charts.

## Quickstart

**Backend / on-chain** (Rust, Agave/Solana ≥ 4.0.2, Anchor 0.31, Node 20+, pnpm):

```bash
git clone https://github.com/yukitran03/bracket-bond && cd bracket-bond
pnpm install
cp .env.example .env            # ANCHOR_WALLET, cluster, KEEPER_MARKET_IDS
anchor build                    # regenerates target/idl/bracket_bond.json
anchor test                     # 2 passing (solvency asserts)
pnpm replay                     # full-loop demo (deploy or local validator first)
pnpm settle:proof               # full on-chain PROOF settle on a real WC fixture
pnpm keeper                     # autonomous keeper
```

**Frontend** (runs on mock data — no wallet/chain needed to explore):

```bash
pnpm -C app install
cp app/.env.local.example app/.env.local   # optional: OPENAI_API_KEY for the pundit
pnpm -C app dev                            # http://localhost:3000
```

Full verification steps + the copy-paste agent prompt: **[`docs/AGENT-HANDOFF.md`](docs/AGENT-HANDOFF.md)**.

## Repo layout

| Path | What |
|---|---|
| `programs/bracket-bond/` | Anchor program (Rust) |
| `scripts/txline/` | TxLINE client + `settle:proof` driver |
| `scripts/agent/keeper.ts` | Autonomous settlement keeper |
| `scripts/replay/` | Replay-driven demo |
| `tests/` | `anchor test` (solvency + exit) |
| `app/` | Next.js frontend + AI-pundit route |
| `docs/` | testing, handoff, demo, roadmap |
| `docs-site/` | Fumadocs documentation site |

## Security & compliance

- Play-money / **devnet only**. Bracket Bond escrows **native SOL** — the TxL token
  is never staked (hackathon rule).
- Settlement data comes from **TxLINE only** (see `AGENTS.md`).
- Secrets (TxLINE tokens, `OPENAI_API_KEY`) stay **server-side** in gitignored
  `.env` files — never in the client bundle.

## License

MIT.
