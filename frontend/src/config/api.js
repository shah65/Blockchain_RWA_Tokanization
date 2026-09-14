// ============================================================================
// src/config/api.js
// Central Axios instance for talking to YOUR backend (not Solana directly).
// ----------------------------------------------------------------------------
// SECURITY:
// - JWT is stored in memory (a module-level variable) + sessionStorage,
//NOT localStorage.sessionStorage clears when the tab closes, which
//limits how long a stolen / leaked token stays useful.
// - On any 401 response, we assume the token is invalid/expired and force
//the user back through wallet sign -in rather than silently retrying.
// - We never log the token or attach it to third-party requests — the
//interceptor only fires for requests to OUR OWN api baseURL.
// ============================================================================\\
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
let inMemoryToken = sessionStorage.getItem("auth_token") || null;

export function setAuthToken(token) {
  inMemoryToken = token;
  if (token) {
    sessionStorage.setItem("auth_token", token);
  } else {
    sessionStorage.removeItem("auth_token");
  }
}

export function getAuthToken() {
  return inMemoryToken;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // fail fast rather than hang forever on a dead backend
  headers: { "Content-Type": "application/json" },
});

// Attach the JWT to every outgoing request automatically.
api.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});
// Global 401 handling: token expired or invalid -> force re-auth.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
      // Let the app know to show the "reconnect wallet" screen instead of a
      // silent broken state. AuthContext listens for this custom event.
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    return Promise.reject(error);
  }
);