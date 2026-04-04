export const money = (v, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

export const moneyLocal = (v, currency = "USD") => money(v, currency);
export const moneyUsd = (v) => money(v, "USD");

export const num = (v) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(v || 0));

export const signed = (v) => {
  const value = Number(v || 0);
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
};

export const signedPct = (v) => {
  const value = Number(v || 0);
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

export const tone = (v) => {
  const value = Number(v || 0);
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
};
