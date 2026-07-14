// Discover a finished fixture + its final scores `seq`, so the smoke test can
// run turnkey. Empirical (from a real run):
//  - GET /api/fixtures/updates/{epochDay}/{hourOfDay} lists fixtures; a finished
//    match has GameState === 3 (this differs from the scores-stream phase codes
//    5/10/13). FixtureId may be packed as gameState*2^48 + pureId.
//  - GET /api/scores/historical/{fixtureId} is SSE; the final `Seq` comes from
//    the `game_finalised` event.

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
      const gameState = it.GameState ?? Number(packed / SHIFT);
      if (gameState !== 3) continue; // 3 = finished (fixtures/updates)
      const fixtureId = Number(packed % SHIFT);

      const events = await fetchHistoricalScores(host, auth, fixtureId).catch(() => [] as any[]);
      const seq = finalSeq(events);
      if (seq !== null) return { fixtureId, seq };
    }
  }
  return null;
}
