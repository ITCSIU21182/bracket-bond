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
        p["6001"] !== undefined || p["6002"] !== undefined
          ? [p["6001"] ?? 0, p["6002"] ?? 0]
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

/**
 * Full historical score log for a fixture — the reliable way to learn the exact
 * message shape. Note: the live `/scores/stream` mostly emits heartbeats when no
 * match is close to running, so use this to develop against.
 */
export async function fetchHistoricalScores(
  baseUrl: string,
  auth: TxlineAuth,
  fixtureId: number,
  retries = 3,
): Promise<any[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/scores/historical/${fixtureId}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: auth.headers });
      if (!res.ok) throw new Error(`scores/historical ${res.status}`);
      // Response is SSE ("data: {…}" lines), not a JSON array — parse the events.
      return parseSseEvents(await res.text());
    } catch (e) {
      if (attempt >= retries) throw e; // ~1MB payloads sometimes ETIMEDOUT — retry
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

function parseSseEvents(text: string): any[] {
  const events: any[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("data:")) continue;
    const json = t.slice(5).trim();
    if (!json || json === "[DONE]") continue;
    try {
      events.push(JSON.parse(json));
    } catch {
      /* skip malformed line */
    }
  }
  return events;
}

/**
 * The scores `seq` to validate against: the `game_finalised` event's `Seq`, or
 * `null` if the match isn't finalised. Never use `max(seq)` — a later, non-final
 * event can arrive after finalisation with the same score (a real feed trap).
 */
export function finalSeq(events: any[]): number | null {
  const finalised = [...events].reverse().find((e) => /final/i.test(String(e.Action ?? "")));
  return finalised?.Seq !== undefined ? Number(finalised.Seq) : null;
}
