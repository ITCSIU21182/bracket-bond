// Offline pundit: curated, factual answers about how Bracket Bond works. Used when
// the server LLM route is unavailable (e.g. no OPENAI_API_KEY). Concept-only — it
// never states market numbers, so it stays honest without a data source.

const ANSWERS: { match: RegExp; text: string }[] = [
  {
    match: /shootout|penalt|luân lưu/i,
    text:
      "Penalty shootouts are handled explicitly. TxLINE exposes separate shootout stat keys, so when a knockout goes to penalties the proof carries the shootout legs and the program compares those - not just the 90-minute score. A team that draws in regulation but wins on penalties settles as the winner.",
  },
  {
    match: /permissionless|anyone.*(settle|call)|who.*settle/i,
    text:
      "Settlement is permissionless - any wallet can submit the settle transaction, not just an authority. It's safe because the program binds the proof to the exact fixture, pins the stat keys, and rebuilds the honest 'did the opponent advance?' predicate on-chain. A caller can only submit the one correct proof; they can't eliminate the winning team.",
  },
  {
    match: /txline|txodds|oracle/i,
    text:
      "TxLINE is TxODDS' on-chain oracle. It publishes match stats (goals, shootout results) as signed data under a daily Merkle root, so a contract can verify a result with a proof instead of trusting a person. Bracket Bond settles every knockout round from TxLINE.",
  },
  {
    match: /exit|sell|cash.?out|redeem|thoát|bán/i,
    text:
      "You can exit a position before a match settles: selling shares back to the pool returns your stake adjusted for the outcome's current price, so you can lock in a profit or cut a loss instead of waiting. The settlement fee is only taken at settle time - buying is fee-free.",
  },
  {
    match: /settle|proof|how.*work|resolve|cách|hoạt động/i,
    text:
      "Bracket Bond settles each match on-chain by a cryptographic proof, not a human oracle. When a fixture finishes, the result comes from TxLINE as a signed stat with a Merkle proof. The program rebuilds the advancement predicate itself and only accepts a matching proof, so anyone can settle but no one can mis-settle. The losing team's shares go to zero and the pot is paid pro-rata to the winners.",
  },
  {
    match: /market|trade|buy|mark|price|odds|share|mua|kèo/i,
    text:
      "Each market is a single parimutuel pot on a knockout bracket. You buy shares in the team you think advances; the price shown is that team's implied probability (the cost of a $1 share). When a round settles by proof, eliminated teams go to zero and the pot is split across the surviving shares.",
  },
];

const DEFAULT =
  "I can explain how Bracket Bond settles matches by proof, penalty shootouts, why settlement is permissionless, exiting a position early, and TxLINE. Ask me about any of those.";

export function localAnswer(question: string): string {
  const q = question || "";
  for (const a of ANSWERS) if (a.match.test(q)) return a.text;
  return DEFAULT;
}
