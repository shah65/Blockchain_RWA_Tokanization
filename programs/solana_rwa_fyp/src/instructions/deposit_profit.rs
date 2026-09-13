use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::{Business, ProfitDeposit};
use crate::errors::RwaError;

pub fn deposit_handler(ctx: Context<DepositProfit>, year: u16, month: u8, amount: u64) -> Result<()> {
    require!(amount > 0, RwaError::InvalidAmount);
    require!(
        ctx.accounts.business.owner == ctx.accounts.owner.key(),
        RwaError::UnauthorizedOwner
    );

    // Move the profit SOL into the ProfitDeposit PDA itself, so it acts as
    // a vault that `claim_profit` later pays out of.
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: ctx.accounts.profit_deposit.to_account_info(),
            },
        ),
        amount,
    )?;

    let deposit = &mut ctx.accounts.profit_deposit;
    deposit.business = ctx.accounts.business.key();
    deposit.year = year;
    deposit.month = month;
    deposit.total_deposited = deposit
        .total_deposited
        .checked_add(amount)
        .ok_or(RwaError::MathOverflow)?;
    deposit.investor_share_bps = 7000; // default 70% — pass as ix arg if you want it configurable per deposit
    deposit.deposited_at = Clock::get()?.unix_timestamp;
    deposit.bump = ctx.bumps.profit_deposit;

    Ok(())
}

#[derive(Accounts)]
#[instruction(year: u16, month: u8)]
pub struct DepositProfit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub business: Account<'info, Business>,

    #[account(
        init,
        payer = owner,
        space = ProfitDeposit::SIZE,
        seeds = [b"profit", business.key().as_ref(), &year.to_le_bytes(), &[month]],
        bump
    )]
    pub profit_deposit: Account<'info, ProfitDeposit>,

    pub system_program: Program<'info, System>,
}