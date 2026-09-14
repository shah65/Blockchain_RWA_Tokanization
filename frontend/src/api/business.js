import api from "./client";

export const listBusinesses = () => api.get("/api/businesses").then((r) => r.data.businesses);

export const getBusiness = (pubkey) =>
  api.get(`/api/businesses/${pubkey}`).then((r) => r.data.business);

export const getOnchainBusiness = (pubkey) =>
  api.get(`/api/businesses/${pubkey}/onchain`).then((r) => r.data.business);

export const listMyBusinesses = () =>
  api.get("/api/businesses/mine").then((r) => r.data.businesses);

export const createBusinessRecord = (payload) =>
  api.post("/api/businesses", payload).then((r) => r.data.business);