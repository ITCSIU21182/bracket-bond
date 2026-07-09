# Bracket Bond — Architecture

## 1. System overview

```
                        ┌──────────────────────────────────────────┐
                        │                 TxLINE                    │
                        │  (TxODDS verifiable feed, Solana-anchored) │
                        │  fixtures · odds SSE · scores SSE ·        │
                        │  stat-validation (+ daily Merkle root)     │
                        └───────────────┬───────────────┬───────────┘
                                        │ (read)        │ (proof)
                     odds/scores stream │               │ stat-validation
                                        ▼               ▼
   ┌───────────────┐        ┌──────────────────────────────────────┐        ┌──────────────────┐
   │   Frontend    │◀──────▶│         Relayer / client (TS)         │───────▶│  Solana program  │
   │  Next.js +    │  RPC   │  scripts/txline: auth, SSE ingest,    │  CPI   │  bracket-bond    │
   │  wallet       │        │  mark updates, settle_round driver    │        │  (Anchor)        │
   └───────────────┘        └──────────────────────────────────────┘        └──────────────────┘
          │  buy / sell / redeem (wallet-signed)                                    ▲
          └─────────────────────────────────────────────────────────────────────────┘
                                                                          Txoracle.validateStat (CPI)
```

Three moving parts:

- **On-chain program (`programs/bracket-bond`, Anchor/Rust)** — holds collateral, mints/burns outcome shares, settles rounds against a TxLINE proof, pays out. This is the trust anchor: money only moves here, and settlement only accepts a verified stat.
- **Relayer / client (`scripts/txline`, TypeScript)** — reads TxLINE (auth → odds/scores SSE → stat-validation), pushes the **oracle mark** on-chain, and drives `settle_round` when a round completes. Stateless; anyone could run it and the proof still has to check out.
- **Frontend (`app`, Next.js + Solana wallet adapter)** — the fan-facing market: browse, buy, watch the live mark, exit, redeem.

## 2. On-chain accounts

All PDAs are derived from stable seeds so the client can address them deterministically.

| Account | Seeds | Holds |
|---|---|---|
| `Config` | `["config"]` | global authority, oracle authority, protocol fee bps, `Txoracle` program id, settlement mode |
| `Market` | `["market", market_id]` | title, status (`Open`/`Resolved`), current round, outcome count, fee bps, total collateral, accumulated fees |
| `Outcome` | `["outcome", market, index]` | team id, status (`Alive`/`Eliminated`/`Won`), collateral in this pool, shares outstanding, last oracle mark (implied prob, fixed-point) |
| `Vault` | `["vault", market]` | System account PDA that custodies **all** market collateral (native SOL for the MVP) |
| `Position` | `["position", market, index, owner]` | owner, shares held in one outcome |

> **MVP collateral = native SOL (lamports)** held in `Vault`. This avoids SPL-token setup and keeps the solvency math a single lamport balance. The USDC/SPL path is a straight swap (documented, not built).

## 3. Instructions

| Instruction | Who | Effect |
|---|---|---|
| `initialize` | deployer | create `Config` (authority, oracle authority, fee bps, `Txoracle` id, settlement mode) |
| `create_market` | authority | create `Market` + `Vault`; register the outcome set (teams) and the hardcoded bracket path |
| `update_mark` | oracle authority | write the latest TxLINE-derived implied probability into each `Outcome.mark` (drives display + buy/sell price) |
| `buy` | anyone | deposit `lamports` collateral into an outcome; mint shares at `shares = lamports / mark`; update `Position` |
| `sell` *(upgrade)* | share holder | burn shares, withdraw `lamports = shares * mark` from that outcome's collateral (bounded by pool reserves — cannot go insolvent) |
| `settle_round` | oracle authority | for each outcome, take the round's advancement result **proven via `Txoracle.validateStat`**; mark losers `Eliminated`, move their collateral to survivors; advance the round; on the final round mark the winner `Won` and flip `Market` to `Resolved` |
| `redeem` | winner holder | after `Resolved`, burn winning shares for a pro-rata share of the winning outcome's collateral, minus protocol fee |

## 4. Settlement — the trust layer

`settle_round` is where the differentiator lives. It must never accept an unproven result.

**Settlement modes (`Config.settlement_mode`):**

- `Proof` *(production)* — `settle_round` performs a CPI to the **`Txoracle`** program's `validateStat` instruction, passing the stat + Merkle proof fetched from `/api/scores/stat-validation`. The CPI reconstructs the leaf, hashes up to the **daily Merkle root** published on Solana, and only returns success if it matches. Advancement predicates are expressed as stat comparisons (e.g. `goals(A) + shootout(A) > goals(B) + shootout(B)` → A advanced; ties resolved by the `5001`/`5002` shootout stats + phase `13`).
- `TrustedOracle` *(replay/demo + local tests)* — the `oracle authority` signs the result directly. Used only so the deterministic replay can run without a live daily root. The pitch is honest because the **same code path** runs the `Proof` verification when a root is available; the mode is a config flag, not a fork in the logic.

> **Integration note:** the exact `Txoracle` account metas / arg layout come from the TxLINE program IDL (`docs/txline-integration.md`). The CPI is wired as a dedicated `verify_stat()` helper with the account list marked `// TODO(IDL)` where the published IDL must be plugged in. Everything else — the market, the settlement state machine, redistribution, redemption — is independent of that detail and fully implemented.

## 5. Solvency invariant

**Invariant (must hold after every instruction):**

```
lamports(Vault) >= Σ Outcome.collateral   AND
Σ Outcome.collateral + Market.fees_accrued + Σ paid_out == Σ deposited
```

How each path preserves it:

- **buy** — adds `L` lamports to `Vault` and to `Outcome.collateral`. Mints `L / mark` shares. Conservative.
- **sell** — pays `shares * mark`, but **clamped to that outcome's `collateral`**. The pool can never pay more than it holds → no buyback hole.
- **settle_round** — moves an eliminated outcome's `collateral` into the survivors' pools. Pure transfer between outcomes; total is unchanged (conservative by construction).
- **redeem** — pays winners strictly from the winning outcome's `collateral`, taking `fee_bps` into `Market.fees_accrued` first.

No instruction may create a path that pays out more than `Vault` reserves. Tests assert the invariant after every op.

## 6. Oracle-priced mark (D2)

`Outcome.mark` is a fixed-point implied probability in `[0.0, 1.0]` scaled to `1e6` (so `0.42 → 420_000`). The relayer reads StablePrice from `/api/odds/stream`, converts decimal odds → implied probability, normalizes across outcomes, and calls `update_mark`. `buy`/`sell` price off `mark`, so the position visibly tracks the real match. `mark` is advisory for pricing only — **settlement never uses it**; settlement uses the proven score.

## 7. Data flow (one round)

```
kickoff ──▶ relayer streams /api/odds/stream ──▶ update_mark (loop)  ──▶ UI marks move live
                                                                          user buy/sell
full-time ─▶ relayer polls /api/scores/stream (gameState = ended / phase 13)
          ─▶ relayer fetches /api/scores/stat-validation (stat + proof)
          ─▶ settle_round(proof)  ──▶ program CPI Txoracle.validateStat  ──▶ eliminate + redistribute
final ────▶ settle_round marks winner ─▶ Market = Resolved ─▶ redeem
```

## 8. Build order (11 days, floor-first)

| Days | Deliverable |
|---|---|
| 1–2 | Anchor scaffold, `Config`/`Market`/`Outcome`/`Vault`/`Position`, `initialize`, `create_market`, `buy`. Localnet tests. |
| 3–4 | `update_mark` + relayer odds ingest; `settle_round` in `TrustedOracle` mode (eliminate + redistribute); `redeem`. **One full round settles end-to-end.** |
| 5–6 | Wire `Proof` mode: `verify_stat()` CPI to `Txoracle`; stat-validation fetch. Full 4-round arc (fallback: 2). |
| 7–8 | Frontend: market view, live mark, buy, settlement feed, redeem. `sell`/exit upgrade. |
| 9 | Replay harness over cached `fixtures/`; end-to-end dry run. |
| 10–11 | Polish, record ≤5-min demo, technical doc, deploy to devnet. |

## 9. Compliance

Submission runs on **devnet with play-money (native SOL on devnet)**. No real-value wagering. The USDC/mainnet path is a documented swap (SPL token collateral + the same instruction set). Jurisdictional compliance is the team's responsibility per the hackathon T&C.
