// ============================================================================
// src/context/AuthContext.jsx
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { api, setAuthToken, getAuthToken } from "../config/api";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // --------------------------------------------------------------------------
  // Logout
  // --------------------------------------------------------------------------
  const logout = useCallback(() => {
    setAuthToken(null);
    setProfile(null);
    setIsAuthenticated(false);

    disconnect().catch(() => { });
  }, [disconnect]);

  // --------------------------------------------------------------------------
  // Handle expired JWT
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handler = () => logout();

    window.addEventListener("auth:expired", handler);

    return () => {
      window.removeEventListener("auth:expired", handler);
    };
  }, [logout]);

  // --------------------------------------------------------------------------
  // Sign in with Solana wallet
  // --------------------------------------------------------------------------
  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) {
      toast.error("Connect a wallet that supports message signing.");
      return null;
    }

    setIsAuthenticating(true);

    try {
      // 1. Get wallet address
      const walletAddress = publicKey.toBase58();

      // 2. Ask backend for nonce
      const { data: nonceData } = await api.get("/auth/nonce", {
        params: {
          wallet: walletAddress,
        },
      });

      // 3. Convert backend message to bytes
      const messageBytes = new TextEncoder().encode(nonceData.message);

      // 4. Ask wallet to sign message
      const signedBytes = await signMessage(messageBytes);

      // 5. Convert signature to base58
      const signature = bs58.encode(signedBytes);

      // 6. Send signature to backend
      const { data } = await api.post("/auth/verify", {
        walletAddress,
        signature,
      });

      // 7. Save JWT
      setAuthToken(data.token);

      // 8. Save profile
      setProfile(data.profile);

      // 9. Mark authenticated
      setIsAuthenticated(true);

      return data.profile;
    } catch (err) {
      console.error("Sign-in failed:", err);

      toast.error("Sign-in failed. Please try again.");

      setIsAuthenticated(false);

      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [publicKey, signMessage]);

  // --------------------------------------------------------------------------
  // Restore existing session
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function restore() {
      const token = getAuthToken();

      if (!token) {
        setIsReady(true);
        return;
      }

      try {
        const { data } = await api.get("/users/profile");

        setProfile(data.profile);
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Session restore failed:", err);

        setAuthToken(null);
        setProfile(null);
        setIsAuthenticated(false);
      } finally {
        setIsReady(true);
      }
    }

    restore();
  }, []);

  // --------------------------------------------------------------------------
  // Wallet disconnected
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!connected) {
      setAuthToken(null);
      setProfile(null);
      setIsAuthenticated(false);
    }
  }, [connected]);

  // --------------------------------------------------------------------------
  // Refresh profile
  // --------------------------------------------------------------------------
  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await api.get("/users/profile");

      setProfile(data.profile);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Context
  // --------------------------------------------------------------------------
  return (
    <AuthContext.Provider
      value={{
        publicKey,
        connected,
        profile,

        // Convenient role access
        role: profile?.role || null,

        isAuthenticated,
        isAuthenticating,
        isReady,

        signIn,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Main auth hook
// ============================================================================

export function useAuthContext() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuthContext must be used inside <AuthProvider>"
    );
  }

  return ctx;
}

// Optional alias.
// This allows other files to use either useAuthContext() or useAuth().
export const useAuth = useAuthContext;