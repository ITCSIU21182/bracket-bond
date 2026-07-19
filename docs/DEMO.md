# Demo video — ≤5 min, step by step

A shot-by-shot script for the submission video. Two modes:

- **Mode A (recommended, reliable):** record the polished UI on mock data + show the
  **real on-chain settle tx on Solscan**. No live devnet interaction to go wrong.
- **Mode B (optional, higher impact):** also record a terminal running
  `pnpm settle:proof` for a *live* proof settle. Do this only if the TxLINE host +
  devnet are cooperating that day.

Target length **4:30–5:00**. Narration is written word-for-word — read it at a calm
pace. Keep each scene tight; the whole thing should feel fast.

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
> "Every prediction market has the same hard problem: who decides the result?
> Polymarket answers with people — a proposer, a dispute window, voters. Bracket
> Bond answers with math. It's a World Cup market on Solana where every knockout
> round settles on a cryptographic proof of the real match data. No human oracle,
> no dispute window."

**Check:** the hero renders, the countdown ticks, the "Settled by proof — live on
devnet" badge is visible.

### Scene 2 — The market (0:25–1:15) · Markets → Race to the Final
**Do:** click **Enter markets**. Point out the **LIVE** badge + 24h volume on the
featured card. Click **Race to the Final**. Let the marks tick (they animate). Point
at the **Mark-history chart**, the **odds** under each team, the bracket, and the
settlement feed.

**Say:**
> "This is the flagship market — hold a team all the way to the final. Marks move
> live from TxLINE odds; you can see each team's implied probability and decimal
> odds, the price history, and the bracket. And crucially: it's a real market — you
> can exit any time, you're not locked in."

**Check:** marks animate; the chart draws; LIVE badge pulses; "Odds & scores:
TxLINE / TxODDS" chip shows.

### Scene 3 — Trade (1:15–1:55) · Buy + Exit
**Do:** click **Buy** on the top team → the trade sheet opens. Note "no fee on buy",
the share math. Click **Confirm buy** → the button morphs to a spinner → green check
→ confetti + toast. Then click **Exit** on any team to show the sell side.

**Say:**
> "Buying takes a position at the oracle-priced mark — no fee on the way in; the two
> percent protocol fee is taken from the pot at settlement. Exit sells back at the
> live mark, clamped to the pool so the vault can never underpay. That solvency
> invariant is asserted in the on-chain tests."

**Check:** confirm animation + confetti + toast fire; the numbers in the sheet match
(shares = amount ÷ mark).

### Scene 4 — The moment: proof settlement (1:55–2:45) · Replay + Proof Receipt
**Do:** in the market's **Settlement feed**, click **Replay a settlement** → a team
drops to eliminated and the **Proof Receipt** opens (check draws in, glow pulses).
Read it. Then go to **Activity** → open the **real** entry (Norway v England,
"verified live on devnet").

**Say:**
> "Here's the moment no competitor nails — settlement. When a round resolves, the
> losing team is eliminated by a proof. This receipt shows the match, the predicate
> that was proven, the Merkle root, and the on-chain transaction. And this one is
> real: Norway versus England, settled by cryptographic proof on devnet."

**Check:** the proof-reveal animates; the Proof Receipt shows predicate + Merkle
root + a Solscan link; the real entry is marked "verified live on devnet".

### Scene 5 — Judge Mode + the trustless claim (2:45–3:30) · /judge → Solscan
**Do:** open **Judge Mode**. Walk the timeline (proof → validateStatV2 → elimination
→ bracket). Click **View settle_round on Solscan** → cut to Tab 2 (the permissionless
tx). Point at *Program logs* / success.

**Say:**
> "Judge Mode lets anyone verify a settlement end to end: the TxLINE proof, the
> on-chain validateStatV2 call, the elimination, the bracket. And settlement is
> permissionless — this transaction was sent by a wallet that is not the market
> authority. Yet nobody can cheat it: if you point settlement at the winning team,
> the program rebuilds the predicate on-chain and the transaction reverts. We
> verified that on devnet — permissionless settle works, and eliminating the winner
> fails, in under two hundred thousand compute units."

**Check:** Solscan shows the tx succeeded; you can read `Program … success` in logs.

### Scene 6 — Agent + close (3:30–4:30)
**Do:** open the **AI-pundit** (✦ bottom-right); ask *"How does settlement work?"* —
let it answer. Mention the autonomous keeper. Return to the Landing; end on the
footer wordmark.

**Say:**
> "It even runs itself: an autonomous keeper settles the instant a proof exists, and
> an AI pundit — grounded only on real TxLINE data — explains the markets. Bracket
> Bond: a real, tradeable World Cup market that settles a shootout correctly, by
> proof, not by vote. Thanks for watching."

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
