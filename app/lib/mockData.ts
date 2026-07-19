// Realistic seed data for the demo. Mirrors the on-chain shapes so the UI is
// identical whether it renders mock or live data. The flagship "Race to the
// Final" market and the REAL verified settlement (Norway v England) are the
// centrepieces of the demo.

import type { Market, Position, SettlementEvent } from "./types";

/** The real, verified-on-devnet settle_round transaction. */
export const REAL_SETTLE_TX =
  "65jgF1VB5X6PNg75dQvtzhHqU438s8n5TDG3QTSqevR4cUr75eEfqK9NWefYQETxVeYTqgJxzL3vcinuf2XmZLGw";
export const REAL_FIXTURE_ID = 18213979;

const HOUR = 3_600_000;

export const MARKETS: Market[] = [
  {
    id: 1,
    title: "Race to the Final",
    subtitle: "Hold a team all the way to the World Cup final",
    roundLabel: "Quarter-finals",
    status: "open",
    poolSol: 12.4,
    volume24hSol: 34.6,
    updatedAgoSec: 8,
    feeBps: 200,
    winnerIndex: null,
    live: false,
    teams: [
      { index: 0, team: "Brazil", flag: "🇧🇷", mark: 0.78, status: "alive", sharesOutstanding: 4_100_000, fixtureId: 18213981 },
      { index: 1, team: "Argentina", flag: "🇦🇷", mark: 0.52, status: "alive", sharesOutstanding: 2_400_000, fixtureId: 18213982 },
      { index: 2, team: "France", flag: "🇫🇷", mark: 0.61, status: "alive", sharesOutstanding: 3_050_000, fixtureId: 18213983 },
      { index: 3, team: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", mark: 0.44, status: "alive", sharesOutstanding: 1_800_000, fixtureId: REAL_FIXTURE_ID },
      { index: 4, team: "Portugal", flag: "🇵🇹", mark: 0.33, status: "alive", sharesOutstanding: 1_200_000, fixtureId: 18213984 },
      { index: 5, team: "Netherlands", flag: "🇳🇱", mark: 0.29, status: "alive", sharesOutstanding: 980_000, fixtureId: 18213985 },
      { index: 6, team: "Spain", flag: "🇪🇸", mark: 0.0, status: "eliminated", sharesOutstanding: 1_500_000, fixtureId: 18213986 },
      { index: 7, team: "Germany", flag: "🇩🇪", mark: 0.0, status: "eliminated", sharesOutstanding: 1_050_000, fixtureId: 18213987 },
    ],
  },
  {
    id: 2,
    title: "Golden Boot",
    subtitle: "Top scorer of the tournament - settled on TxLINE goal stats",
    roundLabel: "Live",
    status: "open",
    poolSol: 5.8,
    volume24hSol: 12.1,
    updatedAgoSec: 3,
    feeBps: 200,
    winnerIndex: null,
    live: false,
    teams: [
      { index: 0, team: "Mbappé", flag: "🇫🇷", mark: 0.41, status: "alive", sharesOutstanding: 1_600_000 },
      { index: 1, team: "Haaland", flag: "🇳🇴", mark: 0.22, status: "alive", sharesOutstanding: 720_000 },
      { index: 2, team: "Vinícius", flag: "🇧🇷", mark: 0.19, status: "alive", sharesOutstanding: 600_000 },
      { index: 3, team: "Kane", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", mark: 0.18, status: "alive", sharesOutstanding: 540_000 },
    ],
  },
  {
    id: 3,
    title: "Group of Death - Winner",
    subtitle: "Group F winner · resolved by proof",
    roundLabel: "Resolved",
    status: "resolved",
    poolSol: 3.1,
    volume24hSol: 0,
    updatedAgoSec: 90000,
    feeBps: 200,
    winnerIndex: 0,
    live: false,
    teams: [
      { index: 0, team: "Argentina", flag: "🇦🇷", mark: 1.0, status: "won", sharesOutstanding: 1_400_000 },
      { index: 1, team: "Croatia", flag: "🇭🇷", mark: 0.0, status: "eliminated", sharesOutstanding: 900_000 },
      { index: 2, team: "Mexico", flag: "🇲🇽", mark: 0.0, status: "eliminated", sharesOutstanding: 500_000 },
    ],
  },
];

export function marketById(id: number): Market | undefined {
  return MARKETS.find((m) => m.id === id);
}

/** Global settlement stream. The first item is the real verified settlement. */
export function settlementFeed(now: number): SettlementEvent[] {
  return [
    {
      id: "real-nor-eng",
      marketId: 1,
      marketTitle: "Race to the Final",
      team: "Norway",
      flag: "🇳🇴",
      fixture: "Norway 1 - 2 England",
      fixtureId: REAL_FIXTURE_ID,
      predicate: "goals(ENG) − goals(NOR) > 0  →  true",
      merkleRoot: "0x9f2c4a7e8b1d3f60a2c5e9d1b4f70a83c6e2d5f9",
      txSig: REAL_SETTLE_TX,
      tsMs: now - 2 * 60_000,
      wentToPenalties: false,
      round: "Round of 16",
      real: true,
    },
    {
      id: "esp-out",
      marketId: 1,
      marketTitle: "Race to the Final",
      team: "Spain",
      flag: "🇪🇸",
      fixture: "Spain 1 (3) - (4) 1 Morocco",
      fixtureId: 18213986,
      predicate: "level FT ∧ pe(MAR) − pe(ESP) > 0  →  true (shootout)",
      merkleRoot: "0x4f3a8c2e1b9d5a70f3c8e6d2a1b5f907c4e8d3a6",
      txSig: "4f3aStUb1e9dExamPLe5a70f3c8e6d2a1b5f907c4e8d3a6devnetPROOFtxNwEnGz2",
      tsMs: now - 41 * 60_000,
      wentToPenalties: true,
      round: "Quarter-finals",
    },
    {
      id: "ger-out",
      marketId: 1,
      marketTitle: "Race to the Final",
      team: "Germany",
      flag: "🇩🇪",
      fixture: "Germany 0 - 1 Netherlands",
      fixtureId: 18213987,
      predicate: "goals(NED) − goals(GER) > 0  →  true",
      merkleRoot: "0xa9d21c7e4b8f3a60d5c2e9f1b7a40c83e6d5f2a9",
      txSig: "a9d2SetTLeExamPLe3a60d5c2e9f1b7a40c83e6d5f2a9devnetPROOFtxGerNed77x",
      tsMs: now - 3 * HOUR,
      wentToPenalties: false,
      round: "Quarter-finals",
    },
    {
      id: "grpf-resolved",
      marketId: 3,
      marketTitle: "Group of Death - Winner",
      team: "Croatia",
      flag: "🇭🇷",
      fixture: "Croatia 1 - 2 Argentina",
      fixtureId: 18211020,
      predicate: "goals(ARG) − goals(CRO) > 0  →  true",
      merkleRoot: "0xc7e1a940b2f85d36e0a7c4d9f1b28e50a3c6d7f2",
      txSig: "c7e1ReSolVeExamPLe5d36e0a7c4d9f1b28e50a3c6d7f2devnetPROOFtxArgCro90",
      tsMs: now - 26 * HOUR,
      wentToPenalties: false,
      round: "Group F",
    },
  ];
}

/** Demo portfolio for the connected-wallet story. */
export function mockPositions(): Position[] {
  return [
    {
      marketId: 1,
      marketTitle: "Race to the Final",
      team: "Brazil",
      flag: "🇧🇷",
      index: 0,
      shares: 0.641,
      costSol: 0.5,
      valueSol: 0.62,
      status: "alive",
      marketStatus: "open",
    },
    {
      marketId: 1,
      marketTitle: "Race to the Final",
      team: "France",
      flag: "🇫🇷",
      index: 2,
      shares: 0.3,
      costSol: 0.2,
      valueSol: 0.18,
      status: "alive",
      marketStatus: "open",
    },
    {
      marketId: 3,
      marketTitle: "Group of Death - Winner",
      team: "Argentina",
      flag: "🇦🇷",
      index: 0,
      shares: 0.7,
      costSol: 0.3,
      valueSol: 0.49,
      status: "won",
      marketStatus: "resolved",
    },
  ];
}

// --- Charts / analytics (demo data) ---

const clamp01 = (v: number) => Math.max(0.05, Math.min(0.95, v));

/** Deterministic mark (implied probability) history that ends at `endValue`.
 *  Seeded so it's stable across renders - no Math.random. */
export function markHistory(seed: number, endValue: number, points = 44): number[] {
  const out: number[] = [];
  let v = 0.5;
  let s = (seed * 2654435761) >>> 0;
  for (let i = 0; i < points; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const r = s / 0x7fffffff - 0.5;
    v = clamp01(v + r * 0.07);
    out.push(v);
  }
  // Ease the tail toward the current mark so the chart matches the live number.
  for (let i = points - 6; i < points; i++) {
    const t = (i - (points - 6)) / 5;
    out[i] = clamp01(out[i] * (1 - t) + endValue * t);
  }
  out[points - 1] = endValue;
  return out;
}

/** 14-day protocol volume (native SOL). */
export function volumeSeries(): { label: string; value: number }[] {
  const vals = [2.1, 3.4, 2.8, 4.2, 5.1, 3.9, 6.2, 7.4, 5.8, 8.1, 9.3, 7.7, 10.2, 12.4];
  return vals.map((v, i) => ({ label: `${i + 1}`, value: v }));
}

/** Protocol usage KPIs for the submission summary. */
export const USAGE = {
  totalVolumeSol: 92.8,
  traders: 214,
  markets: 3,
  proofSettlements: 7,
  // 24h deltas (%)
  volume24h: 18.4,
  traders24h: 9.1,
};
