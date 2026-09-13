use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use anchor_spl::token_interface::{self,TokenInterface, TransferChecked};
use crate::state::{Business, Investment, UserProfile};
use crate::errors::RwaError;

pub fn tokens_handler(ctx: Context<BuyTokens>, amount: u64) -> Result<()> {
    require!(amount > 0, RwaError::InvalidAmount);

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

    // ---- STEP 2: investor's USDC -> vault (escrow) 
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

    // ---- STEP 3: credit the investor with tokens ---------------------------
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

    // ---- STEP 4: vault (escrow) -> owner's USDC account --------------------
    // The vault's "authority" is itself (a PDA) 
    // so the PROGRAM signs this transfer on the vault's behalf using the
    // vault's own seeds, not any human's signature.
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
    pub investor: Signer<'info>, // payer for the Investment PDA rent too

    #[account(
        seeds = [b"user_profile", investor.key().as_ref()],
        bump = investor_profile.bump
    )]
    pub investor_profile: Account<'info, UserProfile>,

    #[account(mut, has_one = usdc_mint)]
    pub business: Box<Account<'info, Business>>,     // Boxed

    pub usdc_mint: Box<Account<'info, Mint>>,        // now Account

    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = investor,
    )]
    pub investor_token_account: Box<Account<'info, TokenAccount>>, // Boxed, now Account

    #[account(
        mut,
        seeds = [b"vault", business.key().as_ref()],
        bump = business.vault_bump,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,    // Boxed, now Account

    /// CHECK: must equal business.owner — used only to validate owner_token_account below.
    #[account(address = business.owner)]
    pub owner: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = owner,
    )]
    pub owner_token_account: Box<Account<'info, TokenAccount>>, // Boxed, now Account

    #[account(
        init_if_needed,
        payer = investor,
        space = Investment::SIZE,
        seeds = [b"investment", business.key().as_ref(), investor.key().as_ref()],
        bump
    )]
    pub investment: Box<Account<'info, Investment>>, // Boxed

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}