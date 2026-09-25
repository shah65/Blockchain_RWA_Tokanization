
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


  // ---------------------------------------------------------------------------
  // User endpoints
  // ---------------------------------------------------------------------------
  export const getKycStatus = () =>
    api.get("/users/kyc/status").then((r) => r.data);

  export const submitKyc = (payload) =>
    api.post("/users/kyc", payload).then((r) => r.data.profile);

  // ---------------------------------------------------------------------------
  // Admin endpoints
  // ---------------------------------------------------------------------------
  export const listPendingKyc = () =>
    api.get("/admin/kyc/pending").then((r) => r.data.pending);

  export const getKycSignedUrl = (walletAddress, field) =>
    api
      .get("/admin/kyc/signed-url", {
        params: { walletAddress, field },
      })
      .then((r) => r.data.url);

  export const decideKyc = (payload) =>
    api.post("/admin/kyc/decide", payload).then((r) => r.data.profile);
