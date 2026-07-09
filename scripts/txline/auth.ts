// TxLINE authentication (verified against docs 2026-07-09).
//
// Full flow for the free World-Cup tier (see docs/worldcup):
//   1. POST /auth/guest/start                     -> { token }   (JWT, 30-day)
//   2. On-chain: subscribe with SERVICE_LEVEL_ID = 1 (60s delay, any net) or
//      12 (real-time, mainnet). This is a Solana tx you send yourself; keep its
//      signature (txSig).
//   3. Sign an activation message with the same wallet (base64 signature).
//   4. POST /api/token/activate { txSig, signature, leagues } (Bearer JWT)
//                                                  -> { apiToken }
//
// Every data request then sends: Authorization: Bearer <jwt>, X-Api-Token: <apiToken>.

export interface TxlineAuth {
  jwt: string;
  apiToken: string;
  headers: Record<string, string>;
}

/** Step 1: start a guest session. No body; returns a 30-day JWT. */
export async function startGuestSession(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/guest/start`, { method: "POST" });
  if (!res.ok) throw new Error(`guest/start ${res.status}`);
  const { token } = (await res.json()) as { token: string };
  return token;
}

export interface ActivateOptions {
  /** signature of the on-chain SERVICE_LEVEL subscription transaction */
  txSig: string;
  /** base64-encoded wallet signature over the activation message */
  signature: string;
  /** league ids selected in the subscription (World Cup for the free tier) */
  leagues: number[];
}

/** Step 4: activate an API token against a completed subscription tx. */
export async function activateApiToken(
  baseUrl: string,
  jwt: string,
  opts: ActivateOptions,
): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/token/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error(`token/activate ${res.status}`);
  const { apiToken } = (await res.json()) as { apiToken: string };
  return apiToken;
}

/** Convenience wrapper once you already have a completed subscription. */
export async function authenticate(baseUrl: string, activate: ActivateOptions): Promise<TxlineAuth> {
  const jwt = await startGuestSession(baseUrl);
  const apiToken = await activateApiToken(baseUrl, jwt, activate);
  return {
    jwt,
    apiToken,
    headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
  };
}
