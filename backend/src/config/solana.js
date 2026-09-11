const { Connection, clusterApiUrl } = require("@solana/web3.js");
require("dotenv").config();

const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
const connection = new Connection(RPC_URL, "confirmed");

const PROGRAM_ID = process.env.PROGRAM_ID;
if (!PROGRAM_ID) {
  console.warn("[solana] PROGRAM_ID not set in .env — on-chain reads will fail.");
}

module.exports = { connection, PROGRAM_ID };