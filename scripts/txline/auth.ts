// TxLINE guest authentication.
//
// Flow (per docs): POST /auth/guest/start  -> JWT
//                  POST /api/token/activate -> X-Api-Token
// Free World-Cup tier uses service level 1 or 12 and needs no TxL purchase,
// but all tiers require a Solana wallet to identify the caller.

export interface TxlineAuth {
  jwt: string;
  apiToken: string;
  headers: Record<string, string>;
}

export interface AuthOptions {
  baseUrl: string;
  /** Solana wallet public key (base58) used to identify the guest session. */
  wallet: string;
  /** Free World-Cup service level: 1 or 12. */
  serviceLevel?: number;
}

export async function guestAuth(opts: AuthOptions): Promise<TxlineAuth> {
  const base = opts.baseUrl.replace(/\/$/, "");

  // 1) Start a guest session.
  const startRes = await fetch(`${base}/auth/guest/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet: opts.wallet }),
  });
  if (!startRes.ok) throw new Error(`guest/start ${startRes.status}`);
  const { jwt } = (await startRes.json()) as { jwt: string };

  // 2) Activate an API token for the free World-Cup tier.
  const actRes = await fetch(`${base}/api/token/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ serviceLevel: opts.serviceLevel ?? 1 }),
  });
  if (!actRes.ok) throw new Error(`token/activate ${actRes.status}`);
  const { apiToken } = (await actRes.json()) as { apiToken: string };

  return {
    jwt,
    apiToken,
    headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
  };
}
