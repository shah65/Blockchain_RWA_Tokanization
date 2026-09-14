// ============================================================================
// src/components/RoleSelectionScreen.jsx
// ============================================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import * as anchor from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";
import toast from "react-hot-toast";
import { getProgram, pdas } from "../config/web3";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

export default function RoleSelectScreen() {
  const { publicKey, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);

  async function handleChooseRole(role) {
    setPendingRole(role);

    if (!publicKey) {
      setVisible(true); // opens wallet picker
      return;
    }

    setBusy(true);
    try {
      // getProgram normalizes the wallet wrapper -> adapter (see web3.js fix).
      const program = getProgram(wallet);
      const userProfilePda = pdas.userProfile(publicKey);

      let alreadyInitialized = false;
      try {
        await program.account.userProfile.fetch(userProfilePda);
        alreadyInitialized = true;
      } catch {
        alreadyInitialized = false;
      }

      if (!alreadyInitialized) {
        const roleArg =
          role === "business_owner" ? { businessOwner: {} } : { investor: {} };
        await program.methods
          .initUserProfile(roleArg)
          .accounts({
            wallet: publicKey,
            userProfile: userProfilePda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        toast.success("Role set on-chain!");
      }

      const profile = await signIn();
      navigate(profile?.full_name ? "/" : "/complete-profile");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (busy)
    return (
      <Spinner
        label={`Setting up your ${pendingRole === "business_owner" ? "business owner" : "investor"
          } account...`}
      />
    );

  return (
    <div className="role-select-screen">
      <h1>Welcome to RWA Tokenization</h1>
      <p className="subtitle">
        Tokenize real businesses, or invest in businesses that already have.
        Choose how you'd like to use the platform — this can't be changed
        later on the same wallet, so pick the one that matches you.
      </p>
      <div className="role-cards">
        <button
          className="role-card"
          onClick={() => handleChooseRole("business_owner")}
        >
          <h2>I'm a Business Owner</h2>
          <p>
            Tokenize your business, sell shares to investors, and pay out
            monthly profit.
          </p>
        </button>
        <button
          className="role-card"
          onClick={() => handleChooseRole("investor")}
        >
          <h2>I'm an Investor</h2>
          <p>
            Browse tokenized businesses, buy shares in USDC, and track your
            monthly returns.
          </p>
        </button>
      </div>
    </div>
  );
} 