use anchor_lang::prelude::*;

#[error_code]
pub enum BracketError {
    #[msg("Market is not open")]
    MarketNotOpen,
    #[msg("Market is not resolved")]
    MarketNotResolved,
    #[msg("Outcome is not alive")]
    OutcomeNotAlive,
    #[msg("Outcome is not the winning outcome")]
    NotWinner,
    #[msg("Invalid mark: must be in 1..=MARK_SCALE")]
    InvalidMark,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient shares in position")]
    InsufficientShares,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Signer is not authorized")]
    Unauthorized,
    #[msg("Unknown settlement mode")]
    InvalidSettlementMode,
    #[msg("Cannot finalize while more than one outcome is still alive")]
    NotFinalizable,
    #[msg("Txoracle program account does not match config")]
    BadOracleProgram,
    #[msg("On-chain stat proof did not verify (validateStat returned false)")]
    ProofFailed,
    #[msg("Proof fixture does not match this outcome's expected fixture")]
    FixtureMismatch,
    #[msg("Outcome pool has no shares to redeem against")]
    NoShares,
}
