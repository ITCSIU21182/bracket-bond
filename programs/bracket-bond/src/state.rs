use anchor_lang::prelude::*;

/// Implied-probability fixed-point scale. `0.42` is stored as `420_000`.
pub const MARK_SCALE: u128 = 1_000_000;
/// Basis-points denominator for fees.
pub const BPS_DENOM: u64 = 10_000;

/// Market lifecycle.
pub mod market_status {
    pub const OPEN: u8 = 0;
    pub const RESOLVED: u8 = 1;
}

/// Per-outcome lifecycle.
pub mod outcome_status {
    pub const ALIVE: u8 = 0;
    pub const ELIMINATED: u8 = 1;
    pub const WON: u8 = 2;
}

/// How a round is allowed to settle.
pub mod settlement_mode {
    /// The oracle authority signs the result directly (replay/demo, local tests).
    pub const TRUSTED_ORACLE: u8 = 0;
    /// A `Txoracle.validateStat` CPI must succeed for the settlement to apply.
    pub const PROOF: u8 = 1;
}

/// Global program configuration (one per deployment).
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub oracle_authority: Pubkey,
    pub txoracle_program: Pubkey,
    pub fee_bps: u16,
    pub settlement_mode: u8,
    pub bump: u8,
}

/// A single prediction market, e.g. "Race to the Final".
///
/// Solvency model (single shared pot): all collateral lives in the `Vault`
/// PDA and is tracked here as `total_collateral`. Each `Outcome` only tracks
/// its `shares_outstanding`. Eliminated outcomes forfeit to the pot; the
/// winning outcome's holders split `total_collateral - fees_accrued` pro-rata
/// by shares. Redistribution is therefore emergent and provably conservative:
/// the sum of all redemptions can never exceed the pot.
#[account]
#[derive(InitSpace)]
pub struct Market {
    pub authority: Pubkey,
    pub market_id: u64,
    #[max_len(64)]
    pub title: String,
    pub status: u8,
    pub round: u8,
    pub outcome_count: u8,
    pub alive_count: u8,
    pub fee_bps: u16,
    pub total_collateral: u64,
    pub fees_accrued: u64,
    /// Index of the winning outcome, or `-1` while unresolved.
    pub winner_index: i16,
    pub bump: u8,
    pub vault_bump: u8,
}

/// One outcome (team) inside a market.
#[account]
#[derive(InitSpace)]
pub struct Outcome {
    pub market: Pubkey,
    pub index: u8,
    pub team_id: u32,
    pub status: u8,
    /// Latest TxLINE-derived implied probability (scaled by `MARK_SCALE`).
    /// Used only to price `buy`/`sell` — never for settlement.
    pub mark: u32,
    pub shares_outstanding: u128,
    /// The TxLINE fixture whose result decides this outcome's elimination this
    /// round. `settle_round` (PROOF mode) requires the relayed proof to be for
    /// this fixture, so an oracle can't prove match A but eliminate a team from
    /// match B. `0` = unbound (TRUSTED_ORACLE demos/tests).
    pub expected_fixture_id: u64,
    pub bump: u8,
}

/// A user's holding in one outcome of one market.
#[account]
#[derive(InitSpace)]
pub struct Position {
    pub market: Pubkey,
    pub outcome_index: u8,
    pub owner: Pubkey,
    pub shares: u128,
    pub bump: u8,
}
