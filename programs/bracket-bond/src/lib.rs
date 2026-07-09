//! Bracket Bond — a World Cup prediction market whose rounds are settled by a
//! cryptographic proof of the real match data (TxLINE `Txoracle.validateStat`),
//! not a human oracle.
//!
//! Market model: a single shared collateral pot per market. Each outcome (team)
//! tracks only `shares_outstanding`; the winning outcome's holders split
//! `total_collateral - fees_accrued` pro-rata. Eliminated outcomes forfeit to
//! the pot, so redistribution is emergent and provably conservative.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_lang::solana_program::program::{get_return_data, invoke};
use anchor_lang::system_program::{self, Transfer};

pub mod errors;
pub mod state;

use errors::BracketError;
use state::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod bracket_bond {
    use super::*;

    /// Create the global config. `settlement_mode` selects proof vs trusted-oracle.
    pub fn initialize(
        ctx: Context<Initialize>,
        oracle_authority: Pubkey,
        txoracle_program: Pubkey,
        fee_bps: u16,
        settlement_mode: u8,
    ) -> Result<()> {
        require!(
            settlement_mode == state::settlement_mode::TRUSTED_ORACLE
                || settlement_mode == state::settlement_mode::PROOF,
            BracketError::InvalidSettlementMode
        );
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.oracle_authority = oracle_authority;
        config.txoracle_program = txoracle_program;
        config.fee_bps = fee_bps;
        config.settlement_mode = settlement_mode;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Create a market and its collateral vault.
    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        title: String,
        fee_bps: u16,
    ) -> Result<()> {
        require!(title.len() <= 64, BracketError::MathOverflow);
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.market_id = market_id;
        market.title = title;
        market.status = market_status::OPEN;
        market.round = 0;
        market.outcome_count = 0;
        market.alive_count = 0;
        market.fee_bps = fee_bps;
        market.total_collateral = 0;
        market.fees_accrued = 0;
        market.winner_index = -1;
        market.bump = ctx.bumps.market;
        market.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    /// Register one outcome (team) in a market. Authority only, while open.
    pub fn add_outcome(
        ctx: Context<AddOutcome>,
        index: u8,
        team_id: u32,
        initial_mark: u32,
    ) -> Result<()> {
        require!(
            ctx.accounts.market.status == market_status::OPEN,
            BracketError::MarketNotOpen
        );
        require!(
            (initial_mark as u128) >= 1 && (initial_mark as u128) <= MARK_SCALE,
            BracketError::InvalidMark
        );
        let outcome = &mut ctx.accounts.outcome;
        outcome.market = ctx.accounts.market.key();
        outcome.index = index;
        outcome.team_id = team_id;
        outcome.status = outcome_status::ALIVE;
        outcome.mark = initial_mark;
        outcome.shares_outstanding = 0;
        outcome.bump = ctx.bumps.outcome;

        let market = &mut ctx.accounts.market;
        market.outcome_count = market.outcome_count.checked_add(1).ok_or(BracketError::MathOverflow)?;
        market.alive_count = market.alive_count.checked_add(1).ok_or(BracketError::MathOverflow)?;
        Ok(())
    }

    /// Oracle pushes the latest TxLINE-derived implied probability (pricing only).
    pub fn update_mark(ctx: Context<UpdateMark>, _index: u8, mark: u32) -> Result<()> {
        require!(
            (mark as u128) >= 1 && (mark as u128) <= MARK_SCALE,
            BracketError::InvalidMark
        );
        ctx.accounts.outcome.mark = mark;
        Ok(())
    }

    /// Buy shares of an outcome at the current mark.
    /// `shares = amount * MARK_SCALE / mark`.
    pub fn buy(ctx: Context<Buy>, index: u8, amount: u64) -> Result<()> {
        require!(amount > 0, BracketError::ZeroAmount);
        require!(
            ctx.accounts.market.status == market_status::OPEN,
            BracketError::MarketNotOpen
        );
        require!(
            ctx.accounts.outcome.status == outcome_status::ALIVE,
            BracketError::OutcomeNotAlive
        );
        let mark = ctx.accounts.outcome.mark as u128;
        require!(mark >= 1 && mark <= MARK_SCALE, BracketError::InvalidMark);

        // Move collateral into the vault.
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        let shares = (amount as u128)
            .checked_mul(MARK_SCALE)
            .ok_or(BracketError::MathOverflow)?
            .checked_div(mark)
            .ok_or(BracketError::MathOverflow)?;

        let outcome = &mut ctx.accounts.outcome;
        outcome.shares_outstanding = outcome
            .shares_outstanding
            .checked_add(shares)
            .ok_or(BracketError::MathOverflow)?;

        let position = &mut ctx.accounts.position;
        position.market = ctx.accounts.market.key();
        position.outcome_index = index;
        position.owner = ctx.accounts.buyer.key();
        position.shares = position.shares.checked_add(shares).ok_or(BracketError::MathOverflow)?;
        position.bump = ctx.bumps.position;

        let market = &mut ctx.accounts.market;
        market.total_collateral = market
            .total_collateral
            .checked_add(amount)
            .ok_or(BracketError::MathOverflow)?;
        Ok(())
    }

    /// Eliminate an outcome for the current round.
    ///
    /// In `PROOF` mode this relays a `Txoracle.validateStat` CPI (built by the
    /// client from `/api/scores/stat-validation`) using `remaining_accounts`;
    /// the CPI fails if the proof does not verify against the on-chain root, so
    /// an unproven elimination cannot be applied. In `TRUSTED_ORACLE` mode the
    /// configured oracle authority signs directly (replay/demo/tests).
    pub fn settle_round<'info>(
        ctx: Context<'_, '_, '_, 'info, SettleRound<'info>>,
        validate_ix_data: Vec<u8>,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        require_keys_eq!(
            ctx.accounts.oracle_authority.key(),
            config.oracle_authority,
            BracketError::Unauthorized
        );

        if config.settlement_mode == state::settlement_mode::PROOF {
            require_keys_eq!(
                ctx.accounts.txoracle_program.key(),
                config.txoracle_program,
                BracketError::BadOracleProgram
            );
            let metas: Vec<AccountMeta> = ctx
                .remaining_accounts
                .iter()
                .map(|a| AccountMeta {
                    pubkey: *a.key,
                    is_signer: a.is_signer,
                    is_writable: a.is_writable,
                })
                .collect();
            let ix = Instruction {
                program_id: ctx.accounts.txoracle_program.key(),
                accounts: metas,
                data: validate_ix_data,
            };
            let mut infos = ctx.remaining_accounts.to_vec();
            infos.push(ctx.accounts.txoracle_program.to_account_info());
            // Errors here if the CPI itself fails. `validateStat` returns a bool
            // via return-data, so we must also require that bool to be `true`.
            invoke(&ix, &infos)?;
            let (ret_program, ret_data) = get_return_data().ok_or(BracketError::ProofFailed)?;
            require_keys_eq!(ret_program, config.txoracle_program, BracketError::BadOracleProgram);
            require!(ret_data.first() == Some(&1u8), BracketError::ProofFailed);
        }

        let market = &mut ctx.accounts.market;
        require!(market.status == market_status::OPEN, BracketError::MarketNotOpen);

        let outcome = &mut ctx.accounts.outcome;
        require!(outcome.status == outcome_status::ALIVE, BracketError::OutcomeNotAlive);
        outcome.status = outcome_status::ELIMINATED;

        market.alive_count = market.alive_count.checked_sub(1).ok_or(BracketError::MathOverflow)?;
        market.round = market.round.checked_add(1).ok_or(BracketError::MathOverflow)?;
        Ok(())
    }

    /// Mark the sole surviving outcome as the winner and resolve the market.
    pub fn finalize(ctx: Context<Finalize>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.oracle_authority.key(),
            ctx.accounts.config.oracle_authority,
            BracketError::Unauthorized
        );
        let market = &mut ctx.accounts.market;
        require!(market.status == market_status::OPEN, BracketError::MarketNotOpen);
        require!(market.alive_count == 1, BracketError::NotFinalizable);

        let outcome = &mut ctx.accounts.outcome;
        require!(outcome.status == outcome_status::ALIVE, BracketError::OutcomeNotAlive);
        outcome.status = outcome_status::WON;

        // Skim the protocol fee once, at resolution.
        let fee = (market.total_collateral as u128)
            .checked_mul(market.fee_bps as u128)
            .ok_or(BracketError::MathOverflow)?
            .checked_div(BPS_DENOM as u128)
            .ok_or(BracketError::MathOverflow)? as u64;
        market.fees_accrued = fee;
        market.winner_index = outcome.index as i16;
        market.status = market_status::RESOLVED;
        Ok(())
    }

    /// Redeem winning shares for a pro-rata slice of the pot (minus fees).
    pub fn redeem(ctx: Context<Redeem>, _index: u8) -> Result<()> {
        require!(
            ctx.accounts.market.status == market_status::RESOLVED,
            BracketError::MarketNotResolved
        );
        require!(
            ctx.accounts.outcome.status == outcome_status::WON,
            BracketError::NotWinner
        );
        let shares = ctx.accounts.position.shares;
        require!(shares > 0, BracketError::InsufficientShares);
        let outstanding = ctx.accounts.outcome.shares_outstanding;
        require!(outstanding > 0, BracketError::NoShares);

        let pool = ctx
            .accounts
            .market
            .total_collateral
            .checked_sub(ctx.accounts.market.fees_accrued)
            .ok_or(BracketError::MathOverflow)? as u128;

        let payout = shares
            .checked_mul(pool)
            .ok_or(BracketError::MathOverflow)?
            .checked_div(outstanding)
            .ok_or(BracketError::MathOverflow)? as u64;

        // Burn the position first (checks-effects), then pay from the vault PDA.
        ctx.accounts.position.shares = 0;

        let market_key = ctx.accounts.market.key();
        let vault_bump = ctx.accounts.market.vault_bump;
        let seeds: &[&[u8]] = &[b"vault", market_key.as_ref(), &[vault_bump]];
        let signer = &[seeds];
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.owner.to_account_info(),
                },
                signer,
            ),
            payout,
        )?;
        Ok(())
    }

    /// Authority withdraws accrued protocol fees after resolution.
    pub fn claim_fees(ctx: Context<ClaimFees>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.market.authority,
            BracketError::Unauthorized
        );
        require!(
            ctx.accounts.market.status == market_status::RESOLVED,
            BracketError::MarketNotResolved
        );
        let amount = ctx.accounts.market.fees_accrued;
        if amount == 0 {
            return Ok(());
        }
        ctx.accounts.market.fees_accrued = 0;

        let market_key = ctx.accounts.market.key();
        let vault_bump = ctx.accounts.market.vault_bump;
        let seeds: &[&[u8]] = &[b"vault", market_key.as_ref(), &[vault_bump]];
        let signer = &[seeds];
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.authority.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(seeds = [b"config"], bump = config.bump, has_one = authority)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = authority,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,
    /// CHECK: PDA system account that custodies collateral; created lazily on first transfer.
    #[account(seeds = [b"vault", market.key().as_ref()], bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct AddOutcome<'info> {
    #[account(mut, has_one = authority)]
    pub market: Account<'info, Market>,
    #[account(
        init,
        payer = authority,
        space = 8 + Outcome::INIT_SPACE,
        seeds = [b"outcome", market.key().as_ref(), &[index]],
        bump
    )]
    pub outcome: Account<'info, Outcome>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct UpdateMark<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [b"outcome", market.key().as_ref(), &[index]],
        bump = outcome.bump,
        constraint = outcome.market == market.key() @ BracketError::Unauthorized
    )]
    pub outcome: Account<'info, Outcome>,
    #[account(constraint = oracle_authority.key() == config.oracle_authority @ BracketError::Unauthorized)]
    pub oracle_authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct Buy<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [b"outcome", market.key().as_ref(), &[index]],
        bump = outcome.bump,
        constraint = outcome.market == market.key() @ BracketError::Unauthorized
    )]
    pub outcome: Account<'info, Outcome>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + Position::INIT_SPACE,
        seeds = [b"position", market.key().as_ref(), &[index], buyer.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleRound<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut, constraint = outcome.market == market.key() @ BracketError::Unauthorized)]
    pub outcome: Account<'info, Outcome>,
    pub oracle_authority: Signer<'info>,
    /// CHECK: verified against `config.txoracle_program` in PROOF mode; unused otherwise.
    pub txoracle_program: UncheckedAccount<'info>,
    // remaining_accounts: the accounts required by Txoracle.validateStat (PROOF mode).
}

#[derive(Accounts)]
pub struct Finalize<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut, constraint = outcome.market == market.key() @ BracketError::Unauthorized)]
    pub outcome: Account<'info, Outcome>,
    pub oracle_authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [b"outcome", market.key().as_ref(), &[index]],
        bump = outcome.bump,
        constraint = outcome.market == market.key() @ BracketError::Unauthorized
    )]
    pub outcome: Account<'info, Outcome>,
    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), &[index], owner.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == owner.key() @ BracketError::Unauthorized
    )]
    pub position: Account<'info, Position>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimFees<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
