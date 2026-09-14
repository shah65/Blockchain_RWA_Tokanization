import api from "./client.js";
export const saveProfile = (payload) =>
  api.post("/api/users/profile", payload).then((r) => r.data.profile);
export const getMyProfile = () =>
  api.get("/api/users/profile").then((r) => r.data.profile);