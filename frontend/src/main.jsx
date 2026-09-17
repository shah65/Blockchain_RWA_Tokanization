// ============================================================
// src/main.jsx
// ============================================================
import "./config/polyfills";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { Toaster } from "react-hot-toast";
import "@solana/wallet-adapter-react-ui/styles.css";
import { RPC_URL } from "./config/web3";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./styles/theme.css";
import "./index.css";
// Only list wallets you've actually tested against. Adding more here is a
// UX/security surface tradeoff — every wallet is a different code path.
const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BrowserRouter>
            <AuthProvider>
              <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
              <App />
            </AuthProvider>
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);