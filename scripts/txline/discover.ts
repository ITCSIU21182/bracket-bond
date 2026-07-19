// Discover a finished fixture + its final scores `seq`, so the smoke test can
// run turnkey. Empirical (from a real run):
//  - GET /api/fixtures/updates/{epochDay}/{hourOfDay} lists fixtures. Finished
//    signals are inconsistent (GameState / StatusId), so we treat them as HINTS
//    and let the `game_finalised` event be the real authority. FixtureId may be
//    packed as gameState*2^48 + pureId.
//  - GET /api/scores/historical/{fixtureId} is SSE; the settle `Seq` is the
//    `game_finalised` event's Seq (StatusId 10 = finished-after-ET, 13 = penalties).

import { TxlineAuth } from "./auth";
import { withRetry } from "./net";
import { fetchHistoricalScores, finalSeq } from "./scoresStream";

const MS_PER_HOUR = 3_600_000;
const SHIFT = 1n << 48n;

export interface DiscoveredFixture {
  fixtureId: number;
  seq: number;
}

/** Scan the last `hours` of fixture updates for a finished match + its final seq. */
export async function discoverFinishedFixture(
  host: string,
  auth: TxlineAuth,
  nowMs: number,
  hours = 168, // WC matches can be several days back — scan a week by default
): Promise<DiscoveredFixture | null> {
  const api = `${host.replace(/\/$/, "")}/api`;

  for (let i = 0; i < hours; i++) {
    const t = nowMs - i * MS_PER_HOUR;
    const epochDay = Math.floor(t / (24 * MS_PER_HOUR));
    const hourOfDay = new Date(t).getUTCHours();

    let items: any[];
    try {
      items = await withRetry(async () => {
        const res = await fetch(`${api}/fixtures/updates/${epochDay}/${hourOfDay}`, { headers: auth.headers });
        if (!res.ok) throw new Error(`fixtures/updates ${res.status}`);
        return (await res.json()) as any[];
      }, { retries: 2 });
    } catch {
      continue; // transient after retries — skip this hour
    }

    for (const it of items ?? []) {
      const packed = BigInt(Math.trunc(Number(it.FixtureId)));
      const statusId = Number(it.StatusId ?? 0);
      const gameState = Number(it.GameState ?? Number(packed / SHIFT));
      // Candidate filter only — the game_finalised event (finalSeq) is the authority.
      const maybeFinished = [5, 10, 13].includes(statusId) || [3, 5, 10, 13].includes(gameState);
      if (!maybeFinished) continue;
      const fixtureId = Number(packed % SHIFT);

      const events = await fetchHistoricalScores(host, auth, fixtureId).catch(() => [] as any[]);
      const seq = finalSeq(events);
      if (seq !== null) return { fixtureId, seq }; // only genuinely finalised fixtures
    }
  }
  return null;
}
