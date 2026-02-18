export function rmsMag(samples) {
  if (!samples || samples.length === 0) return null;
  let s = 0, n = 0;
  for (const p of samples) {
    const x = Number(p.x), y = Number(p.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    s += (x * x + y * y);
    n++;
  }
  if (!n) return null;
  return Math.sqrt(s / n);
}

export function fmt(v) {
  if (!Number.isFinite(v)) return "-";
  if (Math.abs(v) >= 100) return v.toFixed(1);
  if (Math.abs(v) >= 10) return v.toFixed(2);
  return v.toFixed(4);
}
