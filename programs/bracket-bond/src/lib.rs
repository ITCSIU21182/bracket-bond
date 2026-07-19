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

declare_id!("EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U");

// TxLINE full-game goal stat keys (participant 1 / 2) and penalty-shootout goal
// keys. Mirrors `scripts/txline/statValidation.ts`. Full-game goals exclude
// shootout goals, so a knockout level at full time went to penalties.
const KEY_GOALS_P1: u32 = 1;
const KEY_GOALS_P2: u32 = 2;
const KEY_PE_P1: u32 = 6001;
const KEY_PE_P2: u32 = 6002;

// `Txoracle` borsh enum discriminators (see `scripts/txline/idl/txoracle.json`).
const CMP_GREATER_THAN: u8 = 0; // Comparison::GreaterThan
const CMP_EQUAL_TO: u8 = 2; // Comparison::EqualTo
const BINARY_PREDICATE: u8 = 1; // StatPredicate::Binary
const OP_SUBTRACT: u8 = 1; // BinaryExpression::Subtract
const PROOF_NODE_LEN: usize = 33; // [u8; 32] hash + bool is_right_sibling

/// A bounds-checked forward cursor over a `validateStatV2` instruction's borsh
/// bytes. Every read returns `ProofFailed` on truncation rather than panicking,
/// so a malformed relay can never abort the program uncleanly.
struct Cursor<'a> {
    data: &'a [u8],
    pos: usize,
}

impl<'a> Cursor<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { data, pos: 0 }
    }
    fn skip(&mut self, n: usize) -> Result<()> {
        self.pos = self.pos.checked_add(n).ok_or(BracketError::ProofFailed)?;
        require!(self.pos <= self.data.len(), BracketError::ProofFailed);
        Ok(())
    }
    fn read_u32(&mut self) -> Result<u32> {
        let end = self.pos.checked_add(4).ok_or(BracketError::ProofFailed)?;
        require!(end <= self.data.len(), BracketError::ProofFailed);
        let v = u32::from_le_bytes(self.data[self.pos..end].try_into().unwrap());
        self.pos = end;
        Ok(v)
    }
    fn read_i64(&mut self) -> Result<i64> {
        let end = self.pos.checked_add(8).ok_or(BracketError::ProofFailed)?;
        require!(end <= self.data.len(), BracketError::ProofFailed);
        let v = i64::from_le_bytes(self.data[self.pos..end].try_into().unwrap());
        self.pos = end;
        Ok(v)
    }
    /// Skip a `Vec<ProofNode>`: a u32 length prefix then `len * 33` bytes.
    fn skip_proof_vec(&mut self) -> Result<()> {
        let len = self.read_u32()? as usize;
        self.skip(len.checked_mul(PROOF_NODE_LEN).ok_or(BracketError::ProofFailed)?)
    }
}

/// Parse a relayed `validateStatV2` payload, bind it to `expected_fixture`, pin
/// the stat keys to the canonical advancement layout, and replace whatever
/// strategy the caller supplied with a program-built predicate that proves *the
/// opponent of `slot` advanced*. Returns the rebuilt instruction data.
///
/// This is what makes PROOF settlement safe to open to anyone: the program —
/// not the caller — decides the predicate, so a permissionless settler can only
/// eliminate the team that actually lost the bound fixture, never the winner.
///
/// Layout after the 8-byte discriminator (see `StatValidationInput` in the IDL):
/// `ts: i64` | `fixture_summary` (60) | `fixture_proof: Vec<ProofNode>` |
/// `main_tree_proof: Vec<ProofNode>` | `event_stat_root: [u8;32]` |
/// `stats: Vec<StatLeaf>` | `strategy`.
fn bind_advancement_proof(data: &[u8], expected_fixture: u64, slot: u8) -> Result<Vec<u8>> {
    require!(slot <= 1, BracketError::InvalidParticipantSlot);
    let mut c = Cursor::new(data);
    c.skip(8)?; // instruction discriminator
    c.skip(8)?; // payload.ts
    let fixture_id = c.read_i64()?; // fixture_summary.fixture_id
    require!(fixture_id as u64 == expected_fixture, BracketError::FixtureMismatch);
    // rest of fixture_summary: update_stats (u32 + i64 + i64 = 20) + root (32).
    c.skip(20 + 32)?;
    c.skip_proof_vec()?; // fixture_proof
    c.skip_proof_vec()?; // main_tree_proof
    c.skip(32)?; // event_stat_root
    let n_stats = c.read_u32()? as usize;
    let mut keys: Vec<u32> = Vec::with_capacity(n_stats);
    for _ in 0..n_stats {
        let key = c.read_u32()?; // stat.key
        c.skip(8)?; // stat.value (i32) + stat.period (i32)
        c.skip_proof_vec()?; // stat_proof
        keys.push(key);
    }
    let payload_end = c.pos;

    let strategy = canonical_advancement_strategy(&keys, slot)?;
    let mut out = Vec::with_capacity(payload_end + strategy.len());
    out.extend_from_slice(&data[..payload_end]);
    out.extend_from_slice(&strategy);
    Ok(out)
}

/// Borsh-encode the `NDimensionalStrategy` proving that the opponent of `slot`
/// advanced, pinning the stat keys to the canonical order. Two stats ⇒ decided
/// in regulation/ET (keys 1,2); four stats ⇒ penalty shootout (keys 1,2,6001,6002).
fn canonical_advancement_strategy(keys: &[u32], slot: u8) -> Result<Vec<u8>> {
    let this = slot; // this outcome's team (the one being eliminated)
    let opp = 1 - slot; // its opponent — the one the proof must show advanced
    let mut s: Vec<u8> = Vec::new();
    s.extend_from_slice(&0u32.to_le_bytes()); // geometric_targets: empty vec
    s.push(0); // distance_predicate: None
    match keys.len() {
        2 => {
            require!(
                keys[0] == KEY_GOALS_P1 && keys[1] == KEY_GOALS_P2,
                BracketError::StatKeyMismatch
            );
            s.extend_from_slice(&1u32.to_le_bytes()); // 1 discrete predicate
            push_binary(&mut s, opp, this, CMP_GREATER_THAN); // goals_opp − goals_this > 0
        }
        4 => {
            require!(
                keys[0] == KEY_GOALS_P1
                    && keys[1] == KEY_GOALS_P2
                    && keys[2] == KEY_PE_P1
                    && keys[3] == KEY_PE_P2,
                BracketError::StatKeyMismatch
            );
            s.extend_from_slice(&2u32.to_le_bytes()); // 2 discrete predicates
            push_binary(&mut s, opp, this, CMP_EQUAL_TO); // level at full time
            push_binary(&mut s, 2 + opp, 2 + this, CMP_GREATER_THAN); // pe_opp − pe_this > 0
        }
        _ => return err!(BracketError::StatKeyMismatch),
    }
    Ok(s)
}

/// Push one `StatPredicate::Binary { index_a, index_b, op: Subtract,
/// predicate: { threshold: 0, comparison } }` in borsh form.
fn push_binary(s: &mut Vec<u8>, index_a: u8, index_b: u8, comparison: u8) {
    s.push(BINARY_PREDICATE);
    s.push(index_a);
    s.push(index_b);
    s.push(OP_SUBTRACT);
    s.extend_from_slice(&0i32.to_le_bytes()); // predicate.threshold
    s.push(comparison); // predicate.comparison
}

/// Relay a (rebuilt) `validateStatV2` instruction to `Txoracle` and require it
/// to return `true` — the proof must verify against the on-chain daily root.
fn relay_validate<'info>(
    txoracle_program: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    data: Vec<u8>,
    config_txoracle: Pubkey,
) -> Result<()> {
    require_keys_eq!(txoracle_program.key(), config_txoracle, BracketError::BadOracleProgram);
    let metas: Vec<AccountMeta> = remaining_accounts
        .iter()
        .map(|a| AccountMeta {
            pubkey: *a.key,
            is_signer: a.is_signer,
            is_writable: a.is_writable,
        })
        .collect();
    let ix = Instruction {
        program_id: txoracle_program.key(),
        accounts: metas,
        data,
    };
    let mut infos = remaining_accounts.to_vec();
    infos.push(txoracle_program.clone());
    invoke(&ix, &infos)?;
    let (ret_program, ret_data) = get_return_data().ok_or(BracketError::ProofFailed)?;
    require_keys_eq!(ret_program, config_txoracle, BracketError::BadOracleProgram);
    require!(ret_data.first() == Some(&1u8), BracketError::ProofFailed);
    Ok(())
}

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
        expected_fixture_id: u64,
        participant_slot: u8,
    ) -> Result<()> {
        require!(
            ctx.accounts.market.status == market_status::OPEN,
            BracketError::MarketNotOpen
        );
        require!(
            (initial_mark as u128) >= 1 && (initial_mark as u128) <= MARK_SCALE,
            BracketError::InvalidMark
        );
        require!(participant_slot <= 1, BracketError::InvalidParticipantSlot);
        let outcome = &mut ctx.accounts.outcome;
        outcome.market = ctx.accounts.market.key();
        outcome.index = index;
        outcome.team_id = team_id;
        outcome.status = outcome_status::ALIVE;
        outcome.mark = initial_mark;
        outcome.shares_outstanding = 0;
        outcome.expected_fixture_id = expected_fixture_id;
        outcome.participant_slot = participant_slot;
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

    /// Exit a position before resolution: sell shares back at the current mark.
    /// `payout = shares * mark / MARK_SCALE`, clamped to the pot so the vault can
    /// never underpay (a late "bank-run" seller may receive less than mark).
    pub fn sell(ctx: Context<Sell>, _index: u8, shares: u128) -> Result<()> {
        require!(
            ctx.accounts.market.status == market_status::OPEN,
            BracketError::MarketNotOpen
        );
        require!(
            ctx.accounts.outcome.status == outcome_status::ALIVE,
            BracketError::OutcomeNotAlive
        );
        let held = ctx.accounts.position.shares;
        require!(shares > 0 && shares <= held, BracketError::InsufficientShares);
        let mark = ctx.accounts.outcome.mark as u128;
        require!(mark >= 1 && mark <= MARK_SCALE, BracketError::InvalidMark);

        let raw = shares
            .checked_mul(mark)
            .ok_or(BracketError::MathOverflow)?
            .checked_div(MARK_SCALE)
            .ok_or(BracketError::MathOverflow)? as u64;
        let payout = raw.min(ctx.accounts.market.total_collateral);

        // Effects (checks-effects-interactions).
        ctx.accounts.outcome.shares_outstanding = ctx
            .accounts
            .outcome
            .shares_outstanding
            .checked_sub(shares)
            .ok_or(BracketError::MathOverflow)?;
        ctx.accounts.position.shares = held.checked_sub(shares).ok_or(BracketError::MathOverflow)?;
        ctx.accounts.market.total_collateral = ctx
            .accounts
            .market
            .total_collateral
            .checked_sub(payout)
            .ok_or(BracketError::MathOverflow)?;

        // Interaction: pay from the vault PDA.
        let market_key = ctx.accounts.market.key();
        let vault_bump = ctx.accounts.market.vault_bump;
        let seeds: &[&[u8]] = &[b"vault", market_key.as_ref(), &[vault_bump]];
        let signer = &[seeds];
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
                signer,
            ),
            payout,
        )?;
        Ok(())
    }

    /// Eliminate an outcome for the current round.
    ///
    /// Authority model, by `settlement_mode`:
    /// - `TRUSTED_ORACLE`: the configured oracle authority signs directly
    ///   (replay/demo/tests).
    /// - `PROOF`, outcome bound to a fixture (`expected_fixture_id != 0`):
    ///   **permissionless** — anyone may settle. The program pins the fixture and
    ///   stat keys and builds the advancement predicate itself, so the relayed
    ///   `Txoracle.validateStatV2` proof can only eliminate the team that lost.
    /// - `PROOF`, unbound outcome (`expected_fixture_id == 0`): no binding is
    ///   possible, so it falls back to the oracle authority (legacy pairing).
    pub fn settle_round<'info>(
        ctx: Context<'_, '_, '_, 'info, SettleRound<'info>>,
        validate_ix_data: Vec<u8>,
    ) -> Result<()> {
        let config = &ctx.accounts.config;

        if config.settlement_mode == state::settlement_mode::PROOF {
            let expected = ctx.accounts.outcome.expected_fixture_id;
            let data = if expected != 0 {
                // Bound → permissionless. Rebind the proof to this fixture and
                // force the predicate to "the opponent of this outcome advanced".
                bind_advancement_proof(
                    &validate_ix_data,
                    expected,
                    ctx.accounts.outcome.participant_slot,
                )?
            } else {
                // Unbound → require the oracle authority; relay as supplied.
                require_keys_eq!(
                    ctx.accounts.settler.key(),
                    config.oracle_authority,
                    BracketError::Unauthorized
                );
                validate_ix_data
            };
            relay_validate(
                &ctx.accounts.txoracle_program.to_account_info(),
                ctx.remaining_accounts,
                data,
                config.txoracle_program,
            )?;
        } else {
            // TRUSTED_ORACLE: only the configured oracle authority may settle.
            require_keys_eq!(
                ctx.accounts.settler.key(),
                config.oracle_authority,
                BracketError::Unauthorized
            );
        }

        let market = &mut ctx.accounts.market;
        require!(market.status == market_status::OPEN, BracketError::MarketNotOpen);

        let outcome = &mut ctx.accounts.outcome;
        require!(outcome.status == outcome_status::ALIVE, BracketError::OutcomeNotAlive);
        outcome.status = outcome_status::ELIMINATED;
        let outcome_index = outcome.index;
        let fixture_id = outcome.expected_fixture_id;

        market.alive_count = market.alive_count.checked_sub(1).ok_or(BracketError::MathOverflow)?;
        market.round = market.round.checked_add(1).ok_or(BracketError::MathOverflow)?;
        emit!(RoundSettled {
            market: market.key(),
            outcome_index,
            fixture_id,
            round: market.round,
        });
        Ok(())
    }

    /// Mark the sole surviving outcome as the winner and resolve the market.
    ///
    /// Permissionless in `PROOF` mode (the outcome is deterministic once a single
    /// outcome remains alive); oracle-authority-gated in `TRUSTED_ORACLE`.
    pub fn finalize(ctx: Context<Finalize>) -> Result<()> {
        let config = &ctx.accounts.config;
        if config.settlement_mode == state::settlement_mode::TRUSTED_ORACLE {
            require_keys_eq!(
                ctx.accounts.settler.key(),
                config.oracle_authority,
                BracketError::Unauthorized
            );
        }
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
        emit!(MarketResolved {
            market: market.key(),
            winner_index: outcome.index,
        });
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
#[instruction(index: u8)]
pub struct Sell<'info> {
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
        seeds = [b"position", market.key().as_ref(), &[index], seller.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == seller.key() @ BracketError::Unauthorized
    )]
    pub position: Account<'info, Position>,
    #[account(mut, seeds = [b"vault", market.key().as_ref()], bump = market.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub seller: Signer<'info>,
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
    /// The settler. In PROOF mode with a bound outcome this is permissionless
    /// (anyone); in TRUSTED_ORACLE or for an unbound outcome it must equal
    /// `config.oracle_authority` (enforced in the handler).
    pub settler: Signer<'info>,
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
    /// Permissionless in PROOF mode; must equal `config.oracle_authority` in
    /// TRUSTED_ORACLE (enforced in the handler).
    pub settler: Signer<'info>,
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

// ---------------------------------------------------------------------------
// Events (for the live settlement feed + indexing)
// ---------------------------------------------------------------------------

#[event]
pub struct RoundSettled {
    pub market: Pubkey,
    pub outcome_index: u8,
    pub fixture_id: u64,
    pub round: u8,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub winner_index: u8,
}
