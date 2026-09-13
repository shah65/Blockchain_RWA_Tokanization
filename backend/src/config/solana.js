// backend/src/config/solana.js
// Purpose: expose a read-only Solana connection + Anchor program so the
// backend can fetch on-chain Business / Investment / ProfitDeposit PDAs.

const { Connection, clusterApiUrl, PublicKey } = require("@solana/web3.js");
const { Program, AnchorProvider } = require("@coral-xyz/anchor");
require("dotenv").config();

// ---- Connection ----
const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
const connection = new Connection(RPC_URL, "confirmed");

// ---- Program ID ----
const PROGRAM_ID = process.env.PROGRAM_ID;
if (!PROGRAM_ID) {
  throw new Error("[solana] PROGRAM_ID missing in .env — set it after `anchor deploy`.");
}

// ---- Anchor Program (read-only) ----
// We load the IDL that `anchor build` produced. Copy it here once with:
//   cp target/idl/solana_rwa_fyp.json backend/src/idl/
const idl = require("../idl/solana_rwa_fyp.json");

// Read-only provider — no wallet, backend never signs on-chain.
const provider = new AnchorProvider(
  connection,
  { publicKey: PublicKey.default },
  { commitment: "confirmed" }
);

const program = new Program(idl, new PublicKey(PROGRAM_ID), provider);

module.exports = { connection, PROGRAM_ID, program };