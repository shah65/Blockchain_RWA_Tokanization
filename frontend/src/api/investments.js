import api from "./client.js";
export const getPortfolio = () =>
  api.get("/api/investments/portfolio").then((r) => r.data.portfolio);
export const getProfitHistory = () =>
  api.get("/api/investments/profit-history").then((r) => r.data.history);