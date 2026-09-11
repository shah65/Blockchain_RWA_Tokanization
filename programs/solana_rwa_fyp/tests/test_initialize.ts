// ============================================================================
// rwa_tokenization.ts - Complete Test Suite
// ============================================================================

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaRwaFyp } from "../target/types/solana_rwa_fyp";
import {
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    createMint,
    createAccount,
    mintTo,
    getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

// Helper to find PDA
function findPda(seeds: (Uint8Array | Buffer)[], programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        seeds.map(s => Buffer.from(s)),
        programId
    );
}

describe("rwa_tokenization", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolanaRwaFyp as Program<SolanaRwaFyp>;

    // Test keypairs
    const businessOwner = Keypair.generate();
    const investor = Keypair.generate();
    const user2 = Keypair.generate();

    // USDC mint (simulated)
    let usdcMint: PublicKey;
    let businessOwnerTokenAccount: PublicKey;
    let investorTokenAccount: PublicKey;

    // PDAs
    let businessPda: PublicKey;
    let businessBump: number;
    let vaultPda: PublicKey;
    let vaultBump: number;
    let userProfilePda: PublicKey;
    let userProfileBump: number;
    let investmentPda: PublicKey;
    let investmentBump: number;
    let profitDepositPda: PublicKey;
    let profitDepositBump: number;

    const BUSINESS_ID = new anchor.BN(1);
    const TOTAL_TOKENS = new anchor.BN(1000);
    const PRICE_PER_TOKEN = new anchor.BN(1_500_000); // $1.50 USDC
    const BUY_AMOUNT = new anchor.BN(100);
    const PROFIT_AMOUNT = new anchor.BN(10_000_000_000); // 10 SOL in lamports

    before(async () => {
        // Airdrop SOL to test accounts
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(businessOwner.publicKey, 10_000_000_000),
            "confirmed"
        );
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(investor.publicKey, 10_000_000_000),
            "confirmed"
        );
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(user2.publicKey, 10_000_000_000),
            "confirmed"
        );

        // Create USDC mint
        usdcMint = await createMint(
            provider.connection,
            businessOwner,
            businessOwner.publicKey,
            null,
            6 // USDC decimals
        );

        // Create USDC token accounts
        businessOwnerTokenAccount = (
            await getOrCreateAssociatedTokenAccount(
                provider.connection,
                businessOwner,
                usdcMint,
                businessOwner.publicKey
            )
        ).address;

        investorTokenAccount = (
            await getOrCreateAssociatedTokenAccount(
                provider.connection,
                investor,
                usdcMint,
                investor.publicKey
            )
        ).address;

        // Mint USDC to investor
        await mintTo(
            provider.connection,
            businessOwner,
            usdcMint,
            investorTokenAccount,
            businessOwner,
            10_000_000_000 // 10,000 USDC
        );

        // Find PDAs
        [userProfilePda, userProfileBump] = findPda(
            [Buffer.from("user_profile"), businessOwner.publicKey.toBuffer()],
            program.programId
        );

        [businessPda, businessBump] = findPda(
            [
                Buffer.from("business"),
                businessOwner.publicKey.toBuffer(),
                new anchor.BN(BUSINESS_ID).toArrayLike(Buffer, "le", 8),
            ],
            program.programId
        );

        [vaultPda, vaultBump] = findPda(
            [Buffer.from("vault"), businessPda.toBuffer()],
            program.programId
        );

        [investmentPda, investmentBump] = findPda(
            [
                Buffer.from("investment"),
                businessPda.toBuffer(),
                investor.publicKey.toBuffer(),
            ],
            program.programId
        );

        [profitDepositPda, profitDepositBump] = findPda(
            [
                Buffer.from("profit"),
                businessPda.toBuffer(),
                new anchor.BN(2026).toArrayLike(Buffer, "le", 2),
                Buffer.from([9]), // September
            ],
            program.programId
        );
    });

    it("Initializes user profile as Business Owner", async () => {
        await program.methods
            .initUserProfile({ businessOwner: {} })
            .accounts({
                wallet: businessOwner.publicKey,
                userProfile: userProfilePda,
                systemProgram: SystemProgram.programId,
            })
            .signers([businessOwner])
            .rpc();

        const profile = await program.account.userProfile.fetch(userProfilePda);
        assert.equal(profile.wallet.toString(), businessOwner.publicKey.toString());
        assert.equal(profile.role.businessOwner, true);
        assert.equal(profile.kycVerified, false);
    });

    it("Initializes investor profile", async () => {
        const [investorProfilePda] = findPda(
            [Buffer.from("user_profile"), investor.publicKey.toBuffer()],
            program.programId
        );

        await program.methods
            .initUserProfile({ investor: {} })
            .accounts({
                wallet: investor.publicKey,
                userProfile: investorProfilePda,
                systemProgram: SystemProgram.programId,
            })
            .signers([investor])
            .rpc();

        const profile = await program.account.userProfile.fetch(investorProfilePda);
        assert.equal(profile.wallet.toString(), investor.publicKey.toString());
        assert.equal(profile.role.investor, true);
    });

    it("Creates a business", async () => {
        await program.methods
            .createBusiness(BUSINESS_ID, TOTAL_TOKENS, PRICE_PER_TOKEN)
            .accounts({
                owner: businessOwner.publicKey,
                ownerProfile: userProfilePda,
                business: businessPda,
                usdcMint: usdcMint,
                vault: vaultPda,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([businessOwner])
            .rpc();

        const business = await program.account.business.fetch(businessPda);
        assert.equal(business.owner.toString(), businessOwner.publicKey.toString());
        assert.equal(business.businessId.toString(), BUSINESS_ID.toString());
        assert.equal(business.totalTokens.toString(), TOTAL_TOKENS.toString());
        assert.equal(business.pricePerToken.toString(), PRICE_PER_TOKEN.toString());
        assert.equal(business.tokensSold.toString(), "0");
        assert.equal(business.isActive, true);
    });

    it("Buys tokens", async () => {
        // Get initial balances
        const initialVaultBalance = await provider.connection.getTokenAccountBalance(vaultPda);
        const initialOwnerBalance = await provider.connection.getTokenAccountBalance(
            businessOwnerTokenAccount
        );

        await program.methods
            .buyTokens(BUY_AMOUNT)
            .accounts({
                investor: investor.publicKey,
                investorProfile: await findPda(
                    [Buffer.from("user_profile"), investor.publicKey.toBuffer()],
                    program.programId
                ).then(([pda]) => pda),
                business: businessPda,
                usdcMint: usdcMint,
                investorTokenAccount: investorTokenAccount,
                vault: vaultPda,
                owner: businessOwner.publicKey,
                ownerTokenAccount: businessOwnerTokenAccount,
                investment: investmentPda,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([investor])
            .rpc();

        // Verify business updated
        const business = await program.account.business.fetch(businessPda);
        assert.equal(business.tokensSold.toString(), BUY_AMOUNT.toString());

        // Verify investment created/updated
        const investment = await program.account.investment.fetch(investmentPda);
        assert.equal(investment.business.toString(), businessPda.toString());
        assert.equal(investment.investor.toString(), investor.publicKey.toString());
        assert.equal(investment.tokensOwned.toString(), BUY_AMOUNT.toString());

        // Verify vault received USDC
        const vaultBalance = await provider.connection.getTokenAccountBalance(vaultPda);
        assert.equal(vaultBalance.value.uiAmount, 0); // Should be 0 after transfer to owner

        // Verify owner received USDC
        const ownerBalance = await provider.connection.getTokenAccountBalance(
            businessOwnerTokenAccount
        );
        const expectedCost = BUY_AMOUNT.toNumber() * PRICE_PER_TOKEN.toNumber();
        assert(ownerBalance.value.amount > initialOwnerBalance.value.amount);
    });

    it("Deposits profit", async () => {
        const year = 2026;
        const month = 9;

        await program.methods
            .depositProfit(year, month, PROFIT_AMOUNT)
            .accounts({
                owner: businessOwner.publicKey,
                business: businessPda,
                profitDeposit: profitDepositPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([businessOwner])
            .rpc();

        const deposit = await program.account.profitDeposit.fetch(profitDepositPda);
        assert.equal(deposit.business.toString(), businessPda.toString());
        assert.equal(deposit.year, year);
        assert.equal(deposit.month, month);
        assert.equal(deposit.totalDeposited.toString(), PROFIT_AMOUNT.toString());
        assert.equal(deposit.totalClaimed.toString(), "0");
        assert.equal(deposit.investorShareBps, 7000);
    });

    it("Claims profit as investor", async () => {
        const year = 2026;
        const month = 9;

        // Get initial SOL balance of investor
        const initialBalance = await provider.connection.getBalance(investor.publicKey);

        await program.methods
            .claimProfit(year, month)
            .accounts({
                investor: investor.publicKey,
                business: businessPda,
                investment: investmentPda,
                profitDeposit: profitDepositPda,
            })
            .signers([investor])
            .rpc();

        // Verify investment updated
        const investment = await program.account.investment.fetch(investmentPda);
        assert.equal(investment.lastClaimYear, year);
        assert.equal(investment.lastClaimMonth, month);

        // Verify profit deposit updated
        const deposit = await program.account.profitDeposit.fetch(profitDepositPda);
        assert(deposit.totalClaimed.toNumber() > 0);

        // Verify investor received SOL
        const finalBalance = await provider.connection.getBalance(investor.publicKey);
        assert(finalBalance > initialBalance);
    });

    it("Fails to claim profit twice", async () => {
        const year = 2026;
        const month = 9;

        try {
            await program.methods
                .claimProfit(year, month)
                .accounts({
                    investor: investor.publicKey,
                    business: businessPda,
                    investment: investmentPda,
                    profitDeposit: profitDepositPda,
                })
                .signers([investor])
                .rpc();
            assert.fail("Should have failed");
        } catch (error) {
            assert(error.toString().includes("AlreadyClaimed"));
        }
    });

    it("Fails to buy tokens when business not active", async () => {
        // This would require deactivating the business first
        // You'd need to add a deactivate_business instruction
    });

    it("Fails when non-owner tries to deposit profit", async () => {
        const year = 2026;
        const month = 10;

        const [profitDepositPda2] = findPda(
            [
                Buffer.from("profit"),
                businessPda.toBuffer(),
                new anchor.BN(year).toArrayLike(Buffer, "le", 2),
                Buffer.from([month]),
            ],
            program.programId
        );

        try {
            await program.methods
                .depositProfit(year, month, new anchor.BN(1000))
                .accounts({
                    owner: investor.publicKey,
                    business: businessPda,
                    profitDeposit: profitDepositPda2,
                    systemProgram: SystemProgram.programId,
                })
                .signers([investor])
                .rpc();
            assert.fail("Should have failed");
        } catch (error) {
            assert(error.toString().includes("UnauthorizedOwner"));
        }
    });

    it("Fails when investor tries to buy without profile", async () => {
        const [user2ProfilePda] = findPda(
            [Buffer.from("user_profile"), user2.publicKey.toBuffer()],
            program.programId
        );

        const [user2InvestmentPda] = findPda(
            [
                Buffer.from("investment"),
                businessPda.toBuffer(),
                user2.publicKey.toBuffer(),
            ],
            program.programId
        );

        // Create token account for user2
        const user2TokenAccount = (
            await getOrCreateAssociatedTokenAccount(
                provider.connection,
                user2,
                usdcMint,
                user2.publicKey
            )
        ).address;

        // Mint USDC to user2
        await mintTo(
            provider.connection,
            businessOwner,
            usdcMint,
            user2TokenAccount,
            businessOwner,
            1_000_000_000
        );

        try {
            await program.methods
                .buyTokens(new anchor.BN(10))
                .accounts({
                    investor: user2.publicKey,
                    investorProfile: user2ProfilePda,
                    business: businessPda,
                    usdcMint: usdcMint,
                    investorTokenAccount: user2TokenAccount,
                    vault: vaultPda,
                    owner: businessOwner.publicKey,
                    ownerTokenAccount: businessOwnerTokenAccount,
                    investment: user2InvestmentPda,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([user2])
                .rpc();
            assert.fail("Should have failed");
        } catch (error) {
            // Should fail because user2 doesn't have a profile
            assert(error.toString().includes("Account does not exist"));
        }
    });
});