# 🏆 Bracket Bond

**A World Cup prediction market where your position lives across the entire knockout run — and every round is settled by a cryptographic proof of the real match data, not a human committee.**

Buy into *"Team X reaches the final,"* watch it mark up and down live from real odds, exit anytime, and let a proof of the actual result — anchored on Solana by **TxLINE** — settle every round automatically on-chain.

> **Judge one-liner:** *"Polymarket settles by having humans agree. We settle by proving the real result — automatically, no dispute window — shaped as a bond that lives across the whole tournament."*

Built for the **TxODDS × Superteam World Cup Hackathon** — *Prediction Markets & Settlement* track ($18k USDT).

---

## Why this is different

Most prediction markets — Polymarket included — resolve through a **human-driven optimistic oracle**: someone proposes the outcome, there's a dispute window, and it can be challenged or stall. That is trust-*minimized*, not trust-*less*.

Bracket Bond settles on a **cryptographic proof of the actual match data, anchored on Solana by TxLINE** (`Txoracle.validateStat`), resolving automatically with **no human in the loop and no dispute window**. For an objective sports outcome ("did Brazil advance?") a math-proven settlement is strictly better than a vote.

To keep that claim honest, **every market is limited to objective, TxLINE-provable outcomes** — advancement, goals, cards, corners, penalty-shootout results. No subjective markets (a "controversial VAR call" would need an oracle and would dissolve the differentiator).

## The two things that make it a *product*

1. **Verifiable, automatic settlement** *(the headline)* — the moat fires up to **4× in one tournament**, once per knockout round.
2. **A tournament-long, exitable position** *(supporting)* — you hold a "bond" on a team's whole run, mark-to-market live from real odds, and can cash out any time.

## How it works

1. **Browse** the flagship market: *"Race to the Final."*
2. **Buy** an outcome for a team at the current price (e.g. `Brazil @ 0.42`).
3. **Watch** it mark up/down live as TxLINE odds move — before the broadcast even confirms.
4. **Exit** any time by selling back, or **hold**.
5. **Each round**, TxLINE *proves* who advanced; eliminated outcomes settle to zero and their collateral redistributes to survivors.
6. **Final** — winning-outcome holders redeem for a share of the pool; the protocol takes a small fee.

## Repo layout

```
bracket-bond/
├── docs/
│   ├── spec.md                 # Product spec (refined PRD)
│   ├── architecture.md         # System design, on-chain accounts, data flow, solvency
│   └── txline-integration.md   # Exact TxLINE endpoints + how each is used (verified)
├── programs/bracket-bond/      # Solana Anchor program (Rust) — the market + settlement
├── scripts/
│   ├── txline/                 # TxLINE client: auth, odds/scores SSE, stat-validation
│   └── replay/                 # Replay a real knockout run through the contract (demo)
├── app/                        # Frontend (Next.js + wallet adapter) — market UI
├── fixtures/                   # Cached feeds for the deterministic replay demo
└── tests/                      # Anchor / integration tests
```

## Quick start

> Prereqs: Rust 1.96+, Solana CLI 1.17+, Anchor 0.31+, Node 20+.

```bash
# 1. Install JS deps
pnpm install            # or: npm install

# 2. Build the program
anchor build

# 3. Run the local validator + tests
anchor test

# 4. Deploy to devnet (play-money — see docs/architecture.md §Compliance)
anchor deploy --provider.cluster devnet

# 5. Run the replay demo (streams a cached knockout run through the market)
pnpm replay -- --market race-to-final --team BRA
```

Configure TxLINE access in `.env` (copy `.env.example`). TxLINE's **free tier covers the World Cup**, so no token purchase is needed for this build.

## Status

This repository is scaffolded as the hackathon build kit: **docs + on-chain program + TxLINE client + replay harness**. See `docs/architecture.md` §Build order and the issue checklist for what is implemented vs. in-progress. Settlement uses **play-money / devnet** for the submission; the USDC/mainnet path is described in the docs only (see §Compliance).

## License

MIT — see [LICENSE](./LICENSE).
