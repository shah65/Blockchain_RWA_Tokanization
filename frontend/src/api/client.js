import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:4000",
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rwa_jwt");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize backend errors into a single message
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error?.message ||
      err.response?.data?.error ||
      err.message ||
      "Network error"; return Promise.reject(Object.assign(err, { friendlyMessage: message }));
  }
);

export default api;