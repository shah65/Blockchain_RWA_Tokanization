// ============================================================================
// init_user.rs
// Called the FIRST time a wallet connects, right after they tap
// "I am a Business Owner" or "I am an Investor" on the frontend.
// This is the "account initialization where payer = the connecting wallet".
// ============================================================================

use anchor_lang::prelude::*;
use crate::state::{UserProfile, Role};

pub fn handler(ctx: Context<InitUserProfile>, role: Role) -> Result<()> {
    let profile = &mut ctx.accounts.user_profile;
    profile.wallet = ctx.accounts.wallet.key();
    profile.role = role;
    profile.kyc_verified = false; // flips true later via your KYC review flow
    profile.created_at = Clock::get()?.unix_timestamp;
    profile.bump = ctx.bumps.user_profile;

    // NOTE: after this succeeds, your frontend should immediately prompt the
    // user to fill out their KYC/profile metadata form, which is saved to
    // Supabase (see backend/controllers/userController.js -> saveProfile).
    Ok(())
}

#[derive(Accounts)]
pub struct InitUserProfile<'info> {
    // `wallet` is both the signer AND the payer for rent — this is the
    // "payer" account initialization pattern you asked about.
    #[account(mut)]
    pub wallet: Signer<'info>,

    #[account(
        init,
        payer = wallet,
        space = UserProfile::SIZE,
        seeds = [b"user_profile", wallet.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    pub system_program: Program<'info, System>,
}