export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function normalizePoints(points: [number, number][], padding = 0.80): [number, number][] {
  if (points.length === 0) return [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (isFinite(x) && isFinite(y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.max(rangeX, rangeY) / 2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return points.map(([x, y]) => {
    if (!isFinite(x) || !isFinite(y)) return [0, 0] as [number, number];
    return [
      ((x - cx) / scale) * padding,
      ((y - cy) / scale) * padding,
    ];
  });
}
