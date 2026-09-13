use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use anchor_spl::token_interface::TokenInterface;
use crate::state::{Business, UserProfile, Role};
use crate::errors::RwaError;

pub fn business_handler(
    ctx: Context<CreateBusiness>,
    business_id: u64,
    total_tokens: u64,
    price_per_token: u64, // USDC base units, e.g. 1_500_000 = $1.50 (USDC has 6 decimals)
) -> Result<()> {
    require!(total_tokens > 0, RwaError::InvalidAmount);
    require!(price_per_token > 0, RwaError::InvalidAmount);
    require!(
        ctx.accounts.owner_profile.role == Role::BusinessOwner,
        RwaError::UnauthorizedOwner
    );

    let business = &mut ctx.accounts.business;
    business.owner = ctx.accounts.owner.key();
    business.business_id = business_id;
    business.total_tokens = total_tokens;
    business.tokens_sold = 0;
    business.price_per_token = price_per_token;
    business.usdc_mint = ctx.accounts.usdc_mint.key();
    business.vault_bump = ctx.bumps.vault;
    business.is_active = true;
    business.created_at = Clock::get()?.unix_timestamp;
    business.bump = ctx.bumps.business;

    Ok(())
}

#[derive(Accounts)]
#[instruction(business_id: u64)]
pub struct CreateBusiness<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"user_profile", owner.key().as_ref()],
        bump = owner_profile.bump
    )]
    pub owner_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = owner,
        space = Business::SIZE,
        seeds = [b"business", owner.key().as_ref(), business_id.to_le_bytes().as_ref()],
        bump
    )]
    pub business: Box<Account<'info, Business>>,  // Boxed to reduce stack

    pub usdc_mint: Box<Account<'info, Mint>>,     // now Account, not InterfaceAccount

    #[account(
        init,
        payer = owner,
        seeds = [b"vault", business.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = vault,
    )]
    pub vault: Box<Account<'info, TokenAccount>>, // Boxed, now Account

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}