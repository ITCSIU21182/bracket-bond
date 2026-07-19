// View models shared across the UI. The live client (bracketBond.ts) maps
// on-chain accounts into these same shapes, so pages don't care whether the
// data is mock or live.

export type OutcomeStatus = "alive" | "eliminated" | "won";
export type MarketStatus = "open" | "resolved";

export interface TeamOutcome {
  index: number;
  team: string;
  flag: string; // emoji
  /** implied probability in [0,1] (the on-chain "mark"). */
  mark: number;
  status: OutcomeStatus;
  /** shares outstanding across all holders (for pool math / display). */
  sharesOutstanding: number;
  /** the TxLINE fixture that decides this team's current round. */
  fixtureId?: number;
}

export interface Market {
  id: number;
  title: string;
  subtitle: string;
  roundLabel: string;
  status: MarketStatus;
  poolSol: number;
  feeBps: number;
  teams: TeamOutcome[];
  winnerIndex: number | null;
  /** true once wired to a deployed on-chain market. */
  live?: boolean;
}

export interface SettlementEvent {
  id: string;
  marketId: number;
  marketTitle: string;
  team: string;
  flag: string;
  /** e.g. "Norway 1 - 2 England". */
  fixture: string;
  fixtureId: number;
  /** the advancement predicate that was proven, human-readable. */
  predicate: string;
  merkleRoot: string;
  txSig: string;
  tsMs: number;
  wentToPenalties: boolean;
  round: string;
  /** true = the real, verified-on-devnet settlement. */
  real?: boolean;
}

export interface Position {
  marketId: number;
  marketTitle: string;
  team: string;
  flag: string;
  index: number;
  shares: number;
  costSol: number;
  valueSol: number;
  status: OutcomeStatus;
  marketStatus: MarketStatus;
}
