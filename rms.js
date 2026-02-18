export function rmsMag(points) {
  if (!points || points.length < 2) return NaN;
  let sum = 0;
  let n = 0;
  for (const p of points) {
    const x = Number(p.x);
    const y = Number(p.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const mag = Math.sqrt(x*x + y*y);
    sum += mag * mag;
    n++;
  }
  if (n < 2) return NaN;
  return Math.sqrt(sum / n);
}

export function fmt(v) {
  if (!Number.isFinite(v)) return "-";
  return v.toFixed(6);
}
