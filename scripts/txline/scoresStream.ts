// Live scores -> advancement detection. Team-level only (verified: TxLINE
// exposes team-total goals + shootout goals 5001/5002 + phase codes; there is
// no per-kick or per-player penalty data).

import { sseStream } from "./sse";
import { TxlineAuth } from "./auth";
import {
  ScoreUpdate,
  PHASE_ENDED,
  PHASE_ENDED_ET,
  PHASE_ENDED_SHOOTOUT,
} from "./types";

export interface ScoresStreamOptions {
  baseUrl: string;
  auth: TxlineAuth;
  fixtureId: string;
  signal?: AbortSignal;
}

export async function* streamScores(opts: ScoresStreamOptions): AsyncGenerator<ScoreUpdate> {
  const url = `${opts.baseUrl.replace(/\/$/, "")}/api/scores/stream?fixture=${encodeURIComponent(
    opts.fixtureId,
  )}`;
  for await (const msg of sseStream(url, opts.auth.headers, opts.signal)) {
    let p: any;
    try {
      p = JSON.parse(msg.data);
    } catch {
      continue;
    }
    if (!p || p.gameState === undefined) continue;
    yield {
      fixtureId: p.fixtureId ?? opts.fixtureId,
      seq: p.seq ?? 0,
      ts: p.ts ?? 0,
      gameState: p.gameState,
      goals: [p.goals?.[0] ?? 0, p.goals?.[1] ?? 0],
      shootout:
        p["5001"] !== undefined || p["5002"] !== undefined
          ? [p["5001"] ?? 0, p["5002"] ?? 0]
          : undefined,
    };
  }
}

export function isFinished(s: ScoreUpdate): boolean {
  return (
    s.gameState === PHASE_ENDED ||
    s.gameState === PHASE_ENDED_ET ||
    s.gameState === PHASE_ENDED_SHOOTOUT
  );
}

/**
 * Which participant (0 or 1) advanced, from a finished match.
 * Regulation/ET goals decide; a shootout (phase 13 / 5001-5002) breaks ties.
 * Returns null if the match is not finished or is a draw with no shootout.
 */
export function advancedParticipant(s: ScoreUpdate): 0 | 1 | null {
  if (!isFinished(s)) return null;
  let a = s.goals[0];
  let b = s.goals[1];
  if (s.gameState === PHASE_ENDED_SHOOTOUT && s.shootout) {
    a += s.shootout[0];
    b += s.shootout[1];
  }
  if (a > b) return 0;
  if (b > a) return 1;
  return null;
}
