// ============================================================================
// src/config/web3.js
// Solana configuration
// ============================================================================

import {
  Connection,
  clusterApiUrl,
  PublicKey,
} from "@solana/web3.js";

import { AnchorProvider, Program } from "@coral-xyz/anchor";

import idl from "./idl/rwa_tokenization.json";

// ============================================================================
// Environment configuration
// ============================================================================

export const RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL ||
  clusterApiUrl("devnet");

// -----------------------------------------------------------------------------
// Program ID
// -----------------------------------------------------------------------------
// Keep this optional while Solana is not configured.
// -----------------------------------------------------------------------------

const programIdValue = import.meta.env.VITE_PROGRAM_ID;

export const PROGRAM_ID = programIdValue
  ? new PublicKey(programIdValue)
  : null;

// -----------------------------------------------------------------------------
// USDC mint
// -----------------------------------------------------------------------------
// Optional for now because you have not configured your USDC mint yet.
// -----------------------------------------------------------------------------

const usdcMintValue = import.meta.env.VITE_USDC_MINT;

export const USDC_MINT = usdcMintValue
  ? new PublicKey(usdcMintValue)
  : null;

// ============================================================================
// Solana connection
// ============================================================================

export const connection = new Connection(
  RPC_URL,
  "confirmed"
);

// ============================================================================
// Anchor Program
// ============================================================================

export function getProgram(walletCtx) {
  console.log("[web3] getProgram called with:", walletCtx);

  // useWallet() gives you a Wallet Standard wrapper ({ adapter, readyState, ... }).
  // AnchorProvider needs the actual signer interface, which lives on `.adapter`.
  const adapterWallet = walletCtx?.adapter ?? walletCtx;
  console.log("[web3] resolved adapterWallet:", adapterWallet);

  if (!adapterWallet || !adapterWallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  if (!PROGRAM_ID) {
    throw new Error(
      "Solana program ID is not configured. Set VITE_PROGRAM_ID in .env"
    );
  }

  if (idl.address && idl.address !== PROGRAM_ID.toBase58()) {
    console.warn(
      "[web3] idl.address does not match VITE_PROGRAM_ID:",
      idl.address,
      "vs",
      PROGRAM_ID.toBase58()
    );
  }

  const provider = new AnchorProvider(connection, adapterWallet, {
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });
  console.log("[web3] provider created:", provider);

  // Anchor >=0.30 reads the program id from idl.address, so this only
  // takes (idl, provider). Passing PROGRAM_ID as a 2nd positional arg
  // was shifting `provider` out of place — that was the root cause of
  // "Cannot read properties of undefined (reading 'size')".
  const program = new Program(idl, provider);
  console.log("[web3] Program instance created:", program);

  return program;
}

// ============================================================================
// PDA helpers
// ============================================================================

export const pdas = {
  userProfile: (walletPubkey) => {
    if (!PROGRAM_ID) {
      throw new Error("PROGRAM_ID is not configured");
    }

    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_profile"),
        walletPubkey.toBuffer(),
      ],
      PROGRAM_ID
    )[0];
  },

  business: (ownerPubkey, businessId) => {
    if (!PROGRAM_ID) {
      throw new Error("PROGRAM_ID is not configured");
    }

    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("business"),
        ownerPubkey.toBuffer(),
        businessId.toArrayLike(Buffer, "le", 8),
      ],
      PROGRAM_ID
    )[0];
  },

  vault: (businessPubkey) => {
    if (!PROGRAM_ID) {
      throw new Error("PROGRAM_ID is not configured");
    }

    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        businessPubkey.toBuffer(),
      ],
      PROGRAM_ID
    )[0];
  },

  investment: (businessPubkey, investorPubkey) => {
    if (!PROGRAM_ID) {
      throw new Error("PROGRAM_ID is not configured");
    }

    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("investment"),
        businessPubkey.toBuffer(),
        investorPubkey.toBuffer(),
      ],
      PROGRAM_ID
    )[0];
  },

  profitDeposit: (businessPubkey, year, month) => {
    if (!PROGRAM_ID) {
      throw new Error("PROGRAM_ID is not configured");
    }

    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("profit"),
        businessPubkey.toBuffer(),

        Uint8Array.from([
          year & 0xff,
          (year >> 8) & 0xff,
        ]),

        Uint8Array.from([month]),
      ],
      PROGRAM_ID
    )[0];
  },
};