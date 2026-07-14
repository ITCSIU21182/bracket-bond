// Small retry-with-backoff wrapper. The TxLINE dev host is intermittently flaky
// (frequent ETIMEDOUT on ~1MB payloads), and a single timeout should not fail a
// whole run.

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; label?: string; baseDelayMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 4;
  const base = opts.baseDelayMs ?? 800;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        const wait = base * attempt;
        if (opts.label) {
          const msg = (e as any)?.message ?? e;
          console.warn(`[retry] ${opts.label}: attempt ${attempt}/${retries} failed (${msg}); retrying in ${wait}ms`);
        }
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}
