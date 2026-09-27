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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";   // ← NEW
import { Toaster } from "react-hot-toast";
import "@solana/wallet-adapter-react-ui/styles.css";
import { RPC_URL } from "./config/web3";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./styles/theme.css";
import "./index.css";

const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

// One client for the whole app. Created outside the component so it
// survives every re-render.                                         // ← NEW
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s — dashboard data doesn't need to be fresher
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>                    {/* ← NEW */}
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
    </QueryClientProvider>                                        {/* ← NEW */}
  </React.StrictMode>
);