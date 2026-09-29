import axios from "axios";

// All requests go to /api (proxied to the backend)
const api = axios.create({ baseURL: "/api" });

// Attach the login token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turns an Axios error into a friendly message
export const errorMessage = (err) =>
  err.response?.data?.message || "Something went wrong. Please try again.";

export const getUser = () => JSON.parse(localStorage.getItem("user") || "null");

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export default api;
