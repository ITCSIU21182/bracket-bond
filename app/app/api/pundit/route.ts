// AI-pundit: a grounded chat over Bracket Bond's markets, TxLINE data, and how
// proof-settlement works. Server-side only - the OpenAI key never reaches the
// client. Read-only tools; the system prompt forbids inventing numbers.
//
// Requires OPENAI_API_KEY in a gitignored env file (see app/.env.local.example).
// Vercel AI SDK v4 (ai@4): tool({ parameters }), maxSteps, toDataStreamResponse.

import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { MARKETS, marketById, settlementFeed } from "@/lib/mockData";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = `You are the Bracket Bond Pundit - a concise, sharp analyst for a
proof-settled World Cup prediction market on Solana.

Rules:
- Ground every factual claim in a tool result. Never invent prices, marks, pool
  sizes, transaction hashes, or Merkle roots. If a tool doesn't have it, say so.
- Prefer the getMarketState / getSettlements / explainConcept tools over memory.
- Be brief (2-4 sentences), plain, and honest about limitations (e.g. TxLINE
  exposes team-level stats only - no per-kick shootout attribution).
- You explain and analyse; you never place trades or give financial advice.`;

// Curated, correct facts so the model grounds explanations rather than guessing.
const CONCEPTS: Record<string, string> = {
  settlement:
    "Each knockout round settles when a TxLINE Merkle proof of the real match data is verified on-chain. Bracket Bond relays Txoracle.validateStatV2 inside settle_round and applies the elimination only if the CPI returns true - no human oracle, no dispute window.",
  shootout:
    "Full-game goal stats (keys 1/2) exclude penalty-shootout goals, so a knockout level at full time went to penalties. Bracket Bond then proves the shootout winner with the penalty keys 6001/6002 (the live feed shifts the documented period table; +5000 is actually ET2, PE is +6000). Most rival markets punt on this and mis-settle a shootout as a draw.",
  permissionless:
    "PROOF-mode settlement is permissionless: anyone (or the autonomous keeper) can settle a round. It stays safe because the program pins the fixture and stat keys and builds the advancement predicate itself, so a caller can only eliminate the team that actually lost - never the winner.",
  txline:
    "TxLINE is TxODDS's verifiable data layer: REST + SSE feeds of fixtures/odds/scores, each update Merkle-rooted onto Solana so anyone can prove a stat was published and unaltered. Free tier covers the World Cup. It is deliberately thin - team-level stats only, no per-kick shootout attribution, no xG/player data.",
  market:
    "Bracket Bond is a single-pot parimutuel market: buy shares of a team at an oracle-priced mark, exit anytime at the live mark (clamped to the pot), and the surviving team's holders split the pot minus a small fee. Eliminated teams forfeit their stake to the pot.",
  exit:
    "You can sell your position before the tournament ends at the current mark (payout = shares × mark, clamped to the pool so the vault never underpays). This makes it a real tradeable market, not a locked bet.",
};

function marketSummary(id?: number) {
  const list = id ? [marketById(id)].filter(Boolean) : MARKETS;
  return list.map((m) => ({
    id: m!.id,
    title: m!.title,
    round: m!.roundLabel,
    status: m!.status,
    poolSol: m!.poolSol,
    feePct: m!.feeBps / 100,
    teams: m!.teams.map((t) => ({
      team: t.team,
      markCents: Math.round(t.mark * 100),
      status: t.status,
    })),
  }));
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      "The AI pundit isn't configured - set OPENAI_API_KEY in app/.env.local (server-side only).",
      { status: 501 },
    );
  }

  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: SYSTEM,
    messages,
    maxSteps: 6,
    tools: {
      getMarketState: tool({
        description:
          "Get current Bracket Bond markets: title, round, status, pool size, fee, and each team's mark (price of a $1 share, 0-1 implied probability) and status. Pass a marketId to focus one.",
        parameters: z.object({
          marketId: z.number().optional().describe("optional market id to focus"),
        }),
        execute: async ({ marketId }) => ({ markets: marketSummary(marketId) }),
      }),
      getSettlements: tool({
        description:
          "Get recent proof-settled rounds: which team was eliminated, the fixture and score, the advancement predicate that was proven, whether it went to penalties, and the on-chain transaction. The one flagged real:true is verified live on devnet.",
        parameters: z.object({
          marketId: z.number().optional(),
        }),
        execute: async ({ marketId }) => {
          const evs = settlementFeed(Date.now())
            .filter((e) => (marketId ? e.marketId === marketId : true))
            .map((e) => ({
              team: e.team,
              fixture: e.fixture,
              round: e.round,
              predicate: e.predicate,
              wentToPenalties: e.wentToPenalties,
              txSig: e.txSig,
              verifiedLiveOnDevnet: !!e.real,
            }));
          return { settlements: evs };
        },
      }),
      explainConcept: tool({
        description:
          "Explain how Bracket Bond / TxLINE works. Topics: settlement, shootout, permissionless, txline, market, exit.",
        parameters: z.object({
          topic: z.enum(["settlement", "shootout", "permissionless", "txline", "market", "exit"]),
        }),
        execute: async ({ topic }) => ({ topic, explanation: CONCEPTS[topic] }),
      }),
    },
  });

  return result.toDataStreamResponse();
}
