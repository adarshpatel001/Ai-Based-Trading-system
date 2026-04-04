import { API_BASE_URL } from "../constants/defaults";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: (token) => request("/auth/me", { headers: { Authorization: `Bearer ${token}` } }),

  quote: (symbol) => request(`/market/${symbol}/quote?_t=${Date.now()}`),
  candles: (symbol, interval = "5m", range = "1d") =>
    request(`/market/${symbol}/candles?interval=${interval}&range=${range}`),

  aiAnalyze: (token, payload) =>
    request("/ai/analyze", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  aiHistory: (token) => request("/ai/recommendations", { headers: { Authorization: `Bearer ${token}` } }),

  wallet: (token) => request("/trade/wallet", { headers: { Authorization: `Bearer ${token}` } }),
  topUp: (token, amount) =>
    request("/trade/wallet/top-up", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount }),
    }),
  placeOrder: (token, payload) =>
    request("/trade/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  portfolio: (token) => request("/trade/portfolio", { headers: { Authorization: `Bearer ${token}` } }),
  orders: (token) => request("/trade/orders", { headers: { Authorization: `Bearer ${token}` } }),
};
