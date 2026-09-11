// ============================================================================
// state.rs — All on-chain account (PDA) definitions.
// ============================================================================
// RULE OF THUMB: if it's text, an image, or KYC data -> it does NOT belong
// here, it belongs in Supabase. On-chain accounts only hold numbers, pubkeys,
// enums, and timestamps that MUST be trustlessly verifiable (money math).
// ============================================================================

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    BusinessOwner,
    Investor,
}

// ----------------------------------------------------------------------------
// PDA #1: UserProfile
// Seeds: ["user_profile", wallet_pubkey]
// One per wallet. This is what tells the frontend, on every future visit,
// "this wallet already picked a role -> route them straight to their page."
// ----------------------------------------------------------------------------
#[account]
pub struct UserProfile {
    pub wallet: Pubkey,      // owner wallet
    pub role: Role,          // BusinessOwner | Investor
    pub kyc_verified: bool,  // flips true once your (future) KYC flow approves
    pub created_at: i64,
    pub bump: u8,
}
impl UserProfile {
    // discriminator(8) + pubkey(32) + role(1) + bool(1) + i64(8) + bump(1)
    pub const SIZE: usize = 8 + 32 + 1 + 1 + 8 + 1;
}

// ----------------------------------------------------------------------------
// PDA #2: Business
// Seeds: ["business", owner_pubkey, business_id.to_le_bytes()]
// business_id lets one owner create multiple businesses.
// ----------------------------------------------------------------------------
#[account]
pub struct Business {
    pub owner: Pubkey,
    pub business_id: u64,
    pub total_tokens: u64,       // total supply of "shares" for this business
    pub tokens_sold: u64,        // running counter, incremented on every buy
    pub price_per_token: u64,    // in USDC base units (USDC has 6 decimals, so 1.50 USDC = 1_500_000)
    pub usdc_mint: Pubkey,       // the USDC mint this business accepts (devnet vs mainnet USDC differ!)
    pub vault_bump: u8,          // bump for the vault PDA that escrows incoming USDC
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}
impl Business {
    // discriminator + owner + id + total + sold + price + mint + vault_bump + active + created_at + bump
    pub const SIZE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 32 + 1 + 1 + 8 + 1;

    pub fn tokens_remaining(&self) -> u64 {
        self.total_tokens.saturating_sub(self.tokens_sold)
    }
}

// ----------------------------------------------------------------------------
// PDA #3: Investment
// Seeds: ["investment", business_pubkey, investor_pubkey]
// One per (business, investor) pair — accumulates if they buy more than once.
// This answers "who bought how much of which business."
// ----------------------------------------------------------------------------
#[account]
pub struct Investment {
    pub business: Pubkey,
    pub investor: Pubkey,
    pub tokens_owned: u64,
    pub total_invested: u64,   // lamports spent, cumulative
    pub last_claim_year: u16,  // guards against double-claiming a month's profit
    pub last_claim_month: u8,
    pub created_at: i64,
    pub bump: u8,
}
impl Investment {
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 8 + 2 + 1 + 8 + 1;
}

// ----------------------------------------------------------------------------
// PDA #4: ProfitDeposit
// Seeds: ["profit", business_pubkey, year.to_le_bytes(), [month]]
// One per (business, year, month). Owner deposits into this; investors then
// claim their proportional share out of it via `claim_profit`.
// ----------------------------------------------------------------------------
#[account]
pub struct ProfitDeposit {
    pub business: Pubkey,
    pub year: u16,
    pub month: u8,
    pub total_deposited: u64,
    pub total_claimed: u64,       // running counter so you can't overpay claims
    pub investor_share_bps: u16,  // e.g. 7000 = 70.00% of profit goes to investors
    pub deposited_at: i64,
    pub bump: u8,
}
impl ProfitDeposit {
    pub const SIZE: usize = 8 + 32 + 2 + 1 + 8 + 8 + 2 + 8 + 1;
}