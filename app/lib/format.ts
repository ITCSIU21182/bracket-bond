// Display formatters. All monetary values are native SOL (◎).

export const LAMPORTS = 1_000_000_000;

/** Implied probability [0,1] → price string (a $1 share), e.g. 0.78 → "$0.78". */
export function cents(prob: number): string {
  return `$${prob.toFixed(2)}`;
}

/** SOL with the ◎ glyph and fixed precision. */
export function sol(amount: number, dp = 2): string {
  return `${amount.toFixed(dp)}◎`;
}

export function lamportsToSol(lamports: bigint | number, dp = 3): string {
  const n = typeof lamports === "bigint" ? Number(lamports) : lamports;
  return sol(n / LAMPORTS, dp);
}

/** Signed P&L, e.g. +0.12 / −0.04, for coloring. */
export function signed(amount: number, dp = 2): string {
  const s = amount >= 0 ? "+" : "−";
  return `${s}${Math.abs(amount).toFixed(dp)}`;
}

/** Truncate a base58 / hex string in the middle: 65jgF1VB…mZLGw. */
export function truncate(s: string, head = 6, tail = 4): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/** "2m ago" relative time from an epoch-ms timestamp, given a `now`. */
export function ago(tsMs: number, now: number): string {
  const s = Math.max(0, Math.floor((now - tsMs) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const solscanTx = (sig: string, cluster = "devnet") =>
  `https://solscan.io/tx/${sig}?cluster=${cluster}`;
