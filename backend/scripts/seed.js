require("dotenv").config();
const fs = require("fs");
const os = require("os");
const path = require("path");
const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");
const splToken = require("@solana/spl-token");

(async () => {
  const RPC = process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899";
  const connection = new Connection(RPC, "confirmed");
  console.log("RPC:", RPC);

  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  const secret = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));

  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    commitment: "confirmed",
  });
  const idl = require("../src/idl/solana_rwa_fyp.json");
  const program = new anchor.Program(idl, new PublicKey(process.env.PROGRAM_ID), provider);

  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), wallet.publicKey.toBuffer()],
    program.programId
  );
  console.log("Wallet:     ", wallet.publicKey.toBase58());
  console.log("Profile PDA:", profilePda.toBase58());

  try {
    await program.account.userProfile.fetch(profilePda);
    console.log("✅ Profile exists");
  } catch {
    console.log("Creating UserProfile...");
    await program.methods
      .initUserProfile({ businessOwner: {} })
      .accounts({
        wallet: wallet.publicKey,
        userProfile: profilePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✅ UserProfile created");
  }

  const usdcMint = await splToken.createMint(connection, wallet, wallet.publicKey, null, 6);
  console.log("✅ USDC mint:", usdcMint.toBase58());

  const BUSINESS_ID = 1;
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(BigInt(BUSINESS_ID));
  const [businessPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("business"), wallet.publicKey.toBuffer(), idBuf],
    program.programId
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), businessPda.toBuffer()],
    program.programId
  );

  try {
    await program.account.business.fetch(businessPda);
    console.log("✅ Business exists:", businessPda.toBase58());
  } catch {
    console.log("Creating Business...");
    await program.methods
      .createBusiness(new anchor.BN(BUSINESS_ID), new anchor.BN(1000), new anchor.BN(1_500_000))
      .accounts({
        owner: wallet.publicKey,
        ownerProfile: profilePda,
        business: businessPda,
        usdcMint: usdcMint,
        vault: vaultPda,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Business created");
  }

  console.log("");
  console.log("=====================================================");
  console.log("BUSINESS PDA (copy this for curl test):");
  console.log(businessPda.toBase58());
  console.log("");
  console.log("USDC MINT (copy this to frontend .env later):");
  console.log(usdcMint.toBase58());
  console.log("=====================================================");
})().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});