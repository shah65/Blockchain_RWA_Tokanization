use anchor_lang::prelude::*;

#[error_code]
pub enum RwaError {
    #[msg("Not enough tokens remaining for this business.")]
    NotEnoughTokensRemaining,

    #[msg("Amount must be greater than zero.")]
    InvalidAmount,

    #[msg("Only the business owner can perform this action.")]
    UnauthorizedOwner,

    #[msg("This business is not active.")]
    BusinessNotActive,

    #[msg("Investor has already claimed profit for this month.")]
    AlreadyClaimed,

    #[msg("Investor holds zero tokens in this business.")]
    NoInvestmentFound,

    #[msg("Profit pool for this month has been fully claimed already.")]
    ProfitPoolExhausted,

    #[msg("Math overflow.")]
    MathOverflow,
}