// Shared TxLINE payload types + constants.
// Verified against TxLINE docs (https://txline-docs.txodds.com) 2026-07-08.

export const MARK_SCALE = 1_000_000; // implied-probability fixed point (0.42 -> 420_000)

// Soccer feed phase codes.
export const PHASE_ENDED = 5;
export const PHASE_ENDED_ET = 10;
export const PHASE_ENDED_SHOOTOUT = 13;

// Penalty-shootout stat keys (team totals only — no per-kick data exists).
export const KEY_PE_GOALS_P1 = 5001;
export const KEY_PE_GOALS_P2 = 5002;

/** One StablePrice odds snapshot for a fixture's outcomes. */
export interface OddsUpdate {
  fixtureId: string;
  seq: number;
  ts: number;
  /** outcome key -> decimal odds (e.g. 2.40) */
  decimals: Record<string, number>;
}

/** One live score snapshot. */
export interface ScoreUpdate {
  fixtureId: string;
  seq: number;
  ts: number;
  gameState: number;
  goals: [number, number];
  /** penalty-shootout goals per participant, when a shootout is under way */
  shootout?: [number, number];
}

// Stat-validation / proof types live in ./statValidation.ts (they mirror the
// Txoracle IDL shapes used to build the on-chain validateStat instruction).

/** Convert decimal odds to an implied probability in [0, 1]. */
export function impliedProbability(decimal: number): number {
  if (decimal <= 1) return 1;
  return 1 / decimal;
}

/**
 * Turn a set of decimal odds into per-outcome marks scaled by MARK_SCALE.
 * Note: "reaches the final" outcomes are NOT mutually exclusive (two teams
 * make the final), so we deliberately do NOT normalise to sum to 1 — each
 * mark is that team's standalone implied probability, clamped to [1, MARK_SCALE].
 */
export function decimalsToMarks(decimals: Record<string, number>): Record<string, number> {
  const marks: Record<string, number> = {};
  for (const [key, dec] of Object.entries(decimals)) {
    const p = impliedProbability(dec);
    marks[key] = Math.min(MARK_SCALE, Math.max(1, Math.round(p * MARK_SCALE)));
  }
  return marks;
}
