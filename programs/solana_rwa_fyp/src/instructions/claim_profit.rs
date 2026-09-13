use anchor_lang::prelude::*;
use crate::state::{Business, Investment, ProfitDeposit};
use crate::errors::RwaError;

pub fn profit_handler(ctx: Context<ClaimProfit>, year: u16, month: u8) -> Result<()> {
    let investment = &mut ctx.accounts.investment;
    require!(investment.tokens_owned > 0, RwaError::NoInvestmentFound);

    // Prevent double-claiming the same month.
    require!(
        !(investment.last_claim_year == year && investment.last_claim_month == month),
        RwaError::AlreadyClaimed
    );

    let business = &ctx.accounts.business;
    let deposit = &mut ctx.accounts.profit_deposit;

    let investor_pool = (deposit.total_deposited as u128)
        .checked_mul(deposit.investor_share_bps as u128)
        .ok_or(RwaError::MathOverflow)?
        / 10_000u128;

    let share = investor_pool
        .checked_mul(investment.tokens_owned as u128)
        .ok_or(RwaError::MathOverflow)?
        / (business.tokens_sold.max(1) as u128);

    let share_u64: u64 = share.try_into().map_err(|_| RwaError::MathOverflow)?;

    require!(
        deposit.total_claimed.checked_add(share_u64).ok_or(RwaError::MathOverflow)?
            <= deposit.total_deposited,
        RwaError::ProfitPoolExhausted
    );

    // Pay out directly from the ProfitDeposit PDA (which holds the SOL from
    // deposit_profit) to the investor's wallet.
    **deposit.to_account_info().try_borrow_mut_lamports()? -= share_u64;
    **ctx.accounts.investor.to_account_info().try_borrow_mut_lamports()? += share_u64;

    deposit.total_claimed = deposit.total_claimed.checked_add(share_u64).ok_or(RwaError::MathOverflow)?;
    investment.last_claim_year = year;
    investment.last_claim_month = month;

    Ok(())
}

#[derive(Accounts)]
#[instruction(year: u16, month: u8)]
pub struct ClaimProfit<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    pub business: Account<'info, Business>,

    #[account(
        mut,
        seeds = [b"investment", business.key().as_ref(), investor.key().as_ref()],
        bump = investment.bump
    )]
    pub investment: Account<'info, Investment>,

    #[account(
        mut,
        seeds = [b"profit", business.key().as_ref(), &year.to_le_bytes(), &[month]],
        bump = profit_deposit.bump
    )]
    pub profit_deposit: Account<'info, ProfitDeposit>,
}