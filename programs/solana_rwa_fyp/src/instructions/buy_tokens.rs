use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use anchor_spl::token_interface::{self, TokenInterface, TransferChecked};
use crate::state::{Business, Investment, UserProfile, Role};
use crate::errors::RwaError;

pub fn tokens_handler(ctx: Context<BuyTokens>, amount: u64) -> Result<()> {
    require!(amount > 0, RwaError::InvalidAmount);

    // ── Lazily initialize the investor's UserProfile on their first purchase.
    //    Signing up (picking a role) is free — the wallet only pays when it
    //    actually does something on-chain.
    let profile = &mut ctx.accounts.investor_profile;
    if profile.wallet == Pubkey::default() {
        profile.wallet = ctx.accounts.investor.key();
        profile.role = Role::Investor;
        profile.kyc_verified = false;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.bump = ctx.bumps.investor_profile;
    } else {
        require!(profile.role == Role::Investor, RwaError::UnauthorizedOwner);
    }

    let business = &mut ctx.accounts.business;
    require!(business.is_active, RwaError::BusinessNotActive);
    require!(
        business.tokens_remaining() >= amount,
        RwaError::NotEnoughTokensRemaining
    );

    let cost = amount
        .checked_mul(business.price_per_token)
        .ok_or(RwaError::MathOverflow)?;

    let decimals = ctx.accounts.usdc_mint.decimals;

    // ---- investor's USDC -> vault (escrow)
    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.investor_token_account.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.investor.to_account_info(),
            },
        ),
        cost,
        decimals,
    )?;

    // ---- credit the investor with tokens
    business.tokens_sold = business
        .tokens_sold
        .checked_add(amount)
        .ok_or(RwaError::MathOverflow)?;

    let investment = &mut ctx.accounts.investment;
    if investment.investor == Pubkey::default() {
        investment.business = business.key();
        investment.investor = ctx.accounts.investor.key();
        investment.tokens_owned = 0;
        investment.total_invested = 0;
        investment.last_claim_year = 0;
        investment.last_claim_month = 0;
        investment.created_at = Clock::get()?.unix_timestamp;
        investment.bump = ctx.bumps.investment;
    }
    investment.tokens_owned = investment
        .tokens_owned
        .checked_add(amount)
        .ok_or(RwaError::MathOverflow)?;
    investment.total_invested = investment
        .total_invested
        .checked_add(cost)
        .ok_or(RwaError::MathOverflow)?;

    // ---- vault (escrow) -> owner's USDC account
    let business_key = business.key();
    let vault_bump = business.vault_bump;
    let vault_seeds: &[&[u8]] = &[b"vault", business_key.as_ref(), &[vault_bump]];
    let signer_seeds: &[&[&[u8]]] = &[vault_seeds];

    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
                to: ctx.accounts.owner_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        ),
        cost,
        decimals,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    /// Created lazily on the investor's first purchase. Anchor will create
    /// this PDA if it doesn't exist and charge the investor for rent.
    #[account(
        init_if_needed,
        payer = investor,
        space = UserProfile::SIZE,
        seeds = [b"user_profile", investor.key().as_ref()],
        bump
    )]
    pub investor_profile: Account<'info, UserProfile>,

    #[account(mut, has_one = usdc_mint)]
    pub business: Box<Account<'info, Business>>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = investor,
    )]
    pub investor_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"vault", business.key().as_ref()],
        bump = business.vault_bump,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    /// CHECK: must equal business.owner — used only to validate owner_token_account.
    #[account(address = business.owner)]
    pub owner: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = owner,
    )]
    pub owner_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = investor,
        space = Investment::SIZE,
        seeds = [b"investment", business.key().as_ref(), investor.key().as_ref()],
        bump
    )]
    pub investment: Box<Account<'info, Investment>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}