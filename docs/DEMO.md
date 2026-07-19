# Demo video — ≤5 min, step by step

A shot-by-shot script for the submission video. Two modes:

- **Mode A (recommended, reliable):** record the polished UI on mock data + show the
  **real on-chain settle tx on Solscan**. No live devnet interaction to go wrong.
- **Mode B (optional, higher impact):** also record a terminal running
  `pnpm settle:proof` for a *live* proof settle. Do this only if the TxLINE host +
  devnet are cooperating that day.

Target length **4:30–5:00**. Narration is written word-for-word — read it like a
founder who believes it: warm, confident, unhurried. Not a spec readout. Let the
product breathe on screen while you talk; the story should carry from one scene into
the next.

---

## 0. Before you hit record (5 min of prep)

1. **Start the app:** `pnpm -C app dev` → open `http://localhost:3000`. Hard-refresh.
   Optional: set `OPENAI_API_KEY` in `app/.env.local` so the pundit answers on camera.
2. **Open these tabs** (so you can cut between them without fumbling):
   - Tab 1: `http://localhost:3000` (the app)
   - Tab 2: the real settle tx on Solscan —
     `https://solscan.io/tx/2emcrffBsuuX3t2M7EH6Au2Uzkvr2j29yMx5twmPjVn8YaQAcnWbU5ZvRyEf5nJurb81N4GVVCq69oLZvWimeZCa?cluster=devnet`
   - Tab 3 (optional): the first settle tx `65jgF1VB…` on Solscan
3. **Recorder:** QuickTime (Cmd-Shift-5) or OBS. Record at **1080p**, 30fps, the
   browser maximized. Hide bookmarks bar + notifications. Cursor visible.
4. **Browser zoom** ~110% so text reads on small screens.
5. Do one silent dry-run of the click path below so the timing is smooth.

---

## The script (scene by scene)

### Scene 1 — Hook (0:00–0:25) · on the Landing page
**Do:** land on `/`. Slowly scroll the hero (trophy + countdown), pause on the
headline. Hover **Enter markets** (the shine sweeps).

**Say:**
> "Sports have a beautiful property: the result is a fact. Brazil either advanced or
> they didn't — nobody needs to vote on it. So we built a World Cup market that
> settles the way facts should be settled: by proof. This is Bracket Bond — a
> tradeable market on Solana where every knockout round is decided by a
> cryptographic proof of the real match data, the moment the match ends."

**Check:** the hero renders, the countdown ticks, the "Settled by proof — live on
devnet" badge is visible.

### Scene 2 — The market (0:25–1:15) · Markets → Race to the Final
**Do:** click **Enter markets**. Point out the **LIVE** badge + 24h volume on the
featured card. Click **Race to the Final**. Let the marks tick (they animate). Point
at the **Mark-history chart**, the **odds** under each team, the bracket, and the
settlement feed.

**Say:**
> "Here's the flagship: Race to the Final — pick a team and hold it all the way.
> Everything you're seeing is alive. The marks move with the real odds from TxLINE;
> you get each team's implied probability and decimal odds, the price history, the
> bracket. And it's a genuine market — you're never locked in. You can take profit or
> cut a position whenever you want."

**Check:** marks animate; the chart draws; LIVE badge pulses; "Odds & scores:
TxLINE / TxODDS" chip shows.

### Scene 3 — Trade (1:15–1:55) · Buy + Exit
**Do:** click **Buy** on the top team → the trade sheet opens. Note "no fee on buy",
the share math. Click **Confirm buy** → the button morphs to a spinner → green check
→ confetti + toast. Then click **Exit** on any team to show the sell side.

**Say:**
> "Let's take a position. Buying is instant, and there's no fee on the way in — the
> small protocol fee only comes out of the pot at settlement, so it's paid by the
> eventual winner. And this is the part people love: exit sells straight back at the
> live mark, clamped to the pool, which means the vault can never owe more than it
> holds. That solvency guarantee isn't a line in a doc — it's asserted in the
> on-chain tests."

**Check:** confirm animation + confetti + toast fire; the numbers in the sheet match
(shares = amount ÷ mark).

### Scene 4 — The moment: proof settlement (1:55–2:45) · Replay + Proof Receipt
**Do:** in the market's **Settlement feed**, click **Replay a settlement** → a team
drops to eliminated and the **Proof Receipt** opens (check draws in, glow pulses).
Read it. Then go to **Activity** → open the **real** entry (Norway v England,
"verified live on devnet").

**Say:**
> "Now the moment everything is built around: settlement. When a round ends, the
> losing team is eliminated by a proof — and here's the receipt. The exact match,
> the predicate that was proven, the Merkle root, and the transaction that carried it
> on-chain. And this one isn't a mock-up: Norway versus England, a real knockout,
> settled by cryptographic proof on Solana devnet. No committee, no waiting."

**Check:** the proof-reveal animates; the Proof Receipt shows predicate + Merkle
root + a Solscan link; the real entry is marked "verified live on devnet".

### Scene 5 — Judge Mode + the trustless claim (2:45–3:30) · /judge → Solscan
**Do:** open **Judge Mode**. Walk the timeline (proof → validateStatV2 → elimination
→ bracket). Click **View settle_round on Solscan** → cut to Tab 2 (the permissionless
tx). Point at *Program logs* / success.

**Say:**
> "Anyone can check our work — that's the whole point. Judge Mode replays a
> settlement end to end: the TxLINE proof, the on-chain verification, the
> elimination, the bracket. And settlement is open — this transaction was sent by an
> ordinary wallet, not the market's owner. But open doesn't mean exploitable: the
> program rebuilds the winning condition on-chain, so if you tried to knock out the
> team that actually won, the transaction simply reverts. We proved both on devnet —
> permissionless settle works, cheating fails — in a small fraction of the compute
> budget. Fast, cheap, and honest."

**Check:** Solscan shows the tx succeeded; you can read `Program … success` in logs.

### Scene 6 — Agent + close (3:30–4:30)
**Do:** open the **AI-pundit** (✦ bottom-right); ask *"How does settlement work?"* —
let it answer. Mention the autonomous keeper. Return to the Landing; end on the
footer wordmark.

**Say:**
> "And it even runs itself. An autonomous keeper settles the instant a proof exists,
> and an AI pundit — grounded only on real TxLINE data — helps people understand
> what's happening. This is what verifiable data makes possible: a market that prices
> in real time, trades like a real market, and settles itself on the truth. Bracket
> Bond turns TxODDS's data into a settlement layer for Solana — and this is just the
> first fixture. Thanks for watching."

**Check:** the pundit streams a grounded answer (needs the key); otherwise skip the
ask and just show the widget + narrate.

---

## Mode B — optional live on-chain insert (add ~30s, replaces part of Scene 5)

If devnet + TxLINE are healthy, record a terminal alongside the browser:

```bash
ANCHOR_WALLET=<a_funded_non-authority_key.json> \
  ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
  pnpm settle:proof 18213979 1184
```

**Say:** "…and here it is live — a non-authority wallet settling a real World Cup
knockout by proof, on devnet, right now."

**Check:** the terminal prints `outcome N status = 1 (eliminated)` + the ✅ line and a
`settle_round` tx signature. Paste that signature into Solscan to show success.

---

## How to check the whole thing is right (before you publish)

- **UI:** every page 200s (`curl -s -o /dev/null -w "%{http_code}" localhost:3000/markets`),
  marks animate, trade sheet math is consistent (shares = amount ÷ mark), proof
  reveal + confetti fire.
- **On-chain claims are real:** the two Solscan links resolve and show **Success**;
  the permissionless tx's signer ≠ the config authority (see `docs/AGENT-HANDOFF.md`
  for the exact pubkeys).
- **No overclaiming:** the UI runs on realistic mock data for the flagship 8-team
  bracket; the *proof settlement* shown in Activity/Judge is the real devnet tx.
  Say "mock market, real proof" if asked — don't imply the mock market is on-chain.

## Recording tips

- Record in **one take per scene**, then stitch — easier than one perfect 5-min take.
- Keep the cursor moving deliberately; pause 1s after each click so viewers track it.
- Cut dead air; aim to *undershoot* 5:00 (4:30 is great).
- Add captions for the key claims ("settled by proof", "permissionless", "reverts if
  you target the winner") — judges skim.
- Export 1080p H.264, upload unlisted to YouTube, put the link in the submission.
