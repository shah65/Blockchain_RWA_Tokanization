use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use anchor_spl::token_interface::TokenInterface;
use crate::state::{Business, UserProfile, Role};
use crate::errors::RwaError;

pub fn business_handler(
    ctx: Context<CreateBusiness>,
    business_id: u64,
    total_tokens: u64,
    price_per_token: u64, // USDC base units (6 decimals, so $1.50 = 1_500_000)
) -> Result<()> {
    require!(total_tokens > 0, RwaError::InvalidAmount);
    require!(price_per_token > 0, RwaError::InvalidAmount);

    // ── Lazily initialize the owner's UserProfile if this is their first
    //    on-chain action. Signing up (picking a role) is now free — no
    //    transaction is sent until they create their first business.
    let profile = &mut ctx.accounts.owner_profile;
    if profile.wallet == Pubkey::default() {
        profile.wallet = ctx.accounts.owner.key();
        profile.role = Role::BusinessOwner;
        profile.kyc_verified = false;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.bump = ctx.bumps.owner_profile;
    } else {
        // Returning owner — enforce that the role matches.
        require!(
            profile.role == Role::BusinessOwner,
            RwaError::UnauthorizedOwner
        );
    }

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

    /// Created lazily the first time this owner does an on-chain action.
    /// The owner pays rent for this PDA inside the same transaction that
    /// creates the business — one signature, one fee.
    #[account(
        init_if_needed,
        payer = owner,
        space = UserProfile::SIZE,
        seeds = [b"user_profile", owner.key().as_ref()],
        bump
    )]
    pub owner_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = owner,
        space = Business::SIZE,
        seeds = [b"business", owner.key().as_ref(), business_id.to_le_bytes().as_ref()],
        bump
    )]
    pub business: Box<Account<'info, Business>>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = owner,
        seeds = [b"vault", business.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = vault,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}