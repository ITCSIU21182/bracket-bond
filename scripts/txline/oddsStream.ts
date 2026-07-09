// Live StablePrice odds -> outcome marks (implied probability).
// Feeds the on-chain `update_mark` instruction. Pricing only, never settlement.

import { sseStream } from "./sse";
import { TxlineAuth } from "./auth";
import { OddsUpdate, decimalsToMarks } from "./types";

export interface OddsStreamOptions {
  baseUrl: string;
  auth: TxlineAuth;
  fixtureId: string;
  signal?: AbortSignal;
}

/** Async-iterate normalized odds updates for a fixture. */
export async function* streamOdds(opts: OddsStreamOptions): AsyncGenerator<OddsUpdate> {
  const url = `${opts.baseUrl.replace(/\/$/, "")}/api/odds/stream?fixture=${encodeURIComponent(
    opts.fixtureId,
  )}`;
  for await (const msg of sseStream(url, opts.auth.headers, opts.signal)) {
    let parsed: any;
    try {
      parsed = JSON.parse(msg.data);
    } catch {
      continue;
    }
    // Expected shape (StablePrice): { fixtureId, seq, ts, prices: { "1": 2.4, "X": 3.1, "2": 3.0 } }
    if (!parsed || !parsed.prices) continue;
    yield {
      fixtureId: parsed.fixtureId ?? opts.fixtureId,
      seq: parsed.seq ?? 0,
      ts: parsed.ts ?? 0,
      decimals: parsed.prices as Record<string, number>,
    };
  }
}

/** Convenience: yield ready-to-write marks per outcome key. */
export async function* streamMarks(
  opts: OddsStreamOptions,
): AsyncGenerator<{ seq: number; marks: Record<string, number> }> {
  for await (const u of streamOdds(opts)) {
    yield { seq: u.seq, marks: decimalsToMarks(u.decimals) };
  }
}
