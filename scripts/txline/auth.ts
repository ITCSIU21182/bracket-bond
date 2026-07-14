// TxLINE authentication (verified against txodds/tx-on-chain examples/devnet).
//
// Flow for the free World-Cup tier:
//   1. POST {host}/auth/guest/start                 -> { token }  (30-day JWT)
//   2. On-chain: subscribe(serviceLevelId=1, weeks)  (see ./subscribe.ts) -> txSig
//   3. POST {host}/api/token/activate                -> { token }  (X-Api-Token)
//      body { txSig, walletSignature, leagues }, signed over `${txSig}:${leagues}:${jwt}`
//   Then every data request sends: Authorization: Bearer <jwt>, X-Api-Token: <apiToken>

import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import { withRetry } from "./net";

/** TxLINE token endpoints may return a JSON object OR a plain-text token. */
async function readToken(res: Response): Promise<string> {
  const text = (await res.text()).trim();
  if (text && text[0] !== "{" && text[0] !== "[") return text.replace(/^"|"$/g, ""); // plain-text token
  try {
    const d: any = JSON.parse(text);
    return d.token ?? d.apiToken ?? d.jwt ?? text;
  } catch {
    return text;
  }
}

export interface TxlineAuth {
  jwt: string;
  apiToken: string;
  headers: Record<string, string>;
}

export function headersFor(jwt: string, apiToken: string): Record<string, string> {
  return { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken };
}

/** Step 1: guest session (no body); returns a 30-day JWT. */
export async function startGuestSession(host: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(`${host.replace(/\/$/, "")}/auth/guest/start`, { method: "POST" });
    if (!res.ok) throw new Error(`guest/start ${res.status}`);
    return readToken(res);
  }, { label: "guest/start" });
}

export interface ActivateArgs {
  host: string;
  jwt: string;
  /** signature of the on-chain subscription tx */
  txSig: string;
  /** the subscribing wallet (signs the activation message) */
  wallet: Keypair;
  /** league ids selected in the subscription */
  leagues: number[];
}

/** Step 3: activate an API token against a completed subscription tx. */
export async function activateApiToken(a: ActivateArgs): Promise<string> {
  const messageString = `${a.txSig}:${a.leagues.join(",")}:${a.jwt}`;
  const signature = Buffer.from(
    nacl.sign.detached(new TextEncoder().encode(messageString), a.wallet.secretKey),
  ).toString("base64");

  return withRetry(async () => {
    const res = await fetch(`${a.host.replace(/\/$/, "")}/api/token/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${a.jwt}` },
      body: JSON.stringify({ txSig: a.txSig, walletSignature: signature, leagues: a.leagues }),
    });
    if (!res.ok) throw new Error(`token/activate ${res.status}`);
    return readToken(res); // endpoint returns a plain-text token, not JSON
  }, { label: "token/activate" });
}

/** Guest JWT + activation, given a completed subscription tx signature. */
export async function authenticate(
  host: string,
  opts: { txSig: string; wallet: Keypair; leagues: number[]; jwt?: string },
): Promise<TxlineAuth> {
  const jwt = opts.jwt ?? (await startGuestSession(host));
  const apiToken = await activateApiToken({ host, jwt, txSig: opts.txSig, wallet: opts.wallet, leagues: opts.leagues });
  return { jwt, apiToken, headers: headersFor(jwt, apiToken) };
}
