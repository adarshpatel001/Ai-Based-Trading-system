export function formatSigned(value, normalDp = 2, tinyDp = 4) {
  const number = Number(value ?? 0);
  const abs = Math.abs(number);
  if (abs > 0 && abs < 0.01) {
    return number.toFixed(tinyDp);
  }
  return number.toFixed(normalDp);
}

export function formatVolume(volumeRaw) {
  const value = Number(volumeRaw);
  if (volumeRaw === null || volumeRaw === undefined || Number.isNaN(value) || value <= 0) {
    return "N/A";
  }
  return value.toLocaleString();
}

export function formatPrice(priceRaw) {
  const value = Number(priceRaw ?? 0);
  return value.toFixed(2);
}

export function formatTime(tsRaw) {
  if (!tsRaw) return "N/A";
  const ts = Number(tsRaw);
  const ms = String(tsRaw).length <= 10 ? ts * 1000 : ts;
  return new Date(ms).toLocaleTimeString();
}

export function changeTone(changeRaw) {
  const value = Number(changeRaw ?? 0);
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}
