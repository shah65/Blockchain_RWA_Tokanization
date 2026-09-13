use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod instructions;
use instructions::*;
// Replace with your own program id after `anchor build` + `anchor keys list`
declare_id!("5FfxQzVa58zNo4xFTHLzwCdmdgnxxVCujdwkSkQxLBDn");

#[program]
pub mod rwa_tokenization {
    use super::*;

    // ---- USER / ROLE SETUP -------------------------------------------------
    // Called ONCE per wallet, right after wallet-connect on first visit.
    // Creates a UserProfile PDA seeded by the wallet's pubkey, so the role
    // is permanently and cheaply checkable from the frontend afterwards
    // (just fetch the PDA — if it doesn't exist, show the "choose role" screen).
    
    pub fn init_user_profile(ctx: Context<InitUserProfile>, role: state::Role) -> Result<()> {
        instructions::init_user::user_handler(ctx, role)
    }

    // ---- BUSINESS ------------------------------------------------------------
    // Business owner creates a Business PDA. Only minimal, price-sensitive
    // data lives here (owner, total_tokens, price_per_token, counters).
    // Name/description/images go to Supabase (see backend/models/businessModel.js)
    // keyed by this business account's pubkey.
    // price_per_token is in USDC base units (USDC = 6 decimals, so $1.50 = 1_500_000).
    // Also creates the business's USDC escrow vault (see instructions/create_business.rs).
    pub fn create_business(
        ctx: Context<CreateBusiness>,
        business_id: u64,
        total_tokens: u64,
        price_per_token: u64,
    ) -> Result<()> {
        instructions::create_business::business_handler(ctx, business_id, total_tokens, price_per_token)
    }

    // ---- TOKEN SALE (USDC, via escrow vault) --------------------------------
    // Investor buys `amount` tokens of a business. USDC flows:
    //   investor -> vault (escrow) -> owner   (all atomic, same transaction)
    // Also records/updates an Investment PDA (seeded by business + investor)
    // tracking how much this specific investor holds.
    pub fn buy_tokens(ctx: Context<BuyTokens>, amount: u64) -> Result<()> {
        instructions::buy_tokens::tokens_handler(ctx, amount)
    }

    // ---- PROFIT DEPOSIT (business owner -> pool) --------------------------
    // Business owner deposits profit for a given month. Creates/updates a
    // ProfitDeposit PDA seeded by (business, year, month) holding the total
    // amount deposited + percentage share rules for that period.
    pub fn deposit_profit(
        ctx: Context<DepositProfit>,
        year: u16,
        month: u8,
        amount: u64,
    ) -> Result<()> {
        instructions::deposit_profit::deposit_handler(ctx, year, month, amount)
    }

    // ---- PROFIT CLAIM (investor pulls their share) -------------------------
    // Investor claims their proportional share of a given month's deposit,
    // based on (investor.tokens_owned / business.total_tokens_sold).
    pub fn claim_profit(ctx: Context<ClaimProfit>, year: u16, month: u8) -> Result<()> {
        instructions::claim_profit::profit_handler(ctx, year, month)
    }
}