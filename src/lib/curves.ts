// Curve generation, normalization, arc-length utilities

export type CurveType = 'h' | 'r' | 'l' | 's' | 'e';

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

// ── Generators ──────────────────────────────────────────────────────

export function gen(type: CurveType, p: (number | string)[]): [number, number][] {
  switch (type) {
    case 'h': return genHypo(p as number[]);
    case 'r': return genRose(p as number[]);
    case 'l': return genLiss(p as number[]);
    case 's': return genSuper(p as number[]);
    case 'e': return genEquation(p as (number | string)[]);
    default: return [];
  }
}

function genHypo(p: number[]): [number, number][] {
  const R = p[0], r = p[1], d = r * p[2];
  const Ri = Math.round(R), ri = Math.round(r);
  const g = gcd(Ri, ri);
  const lobes = ri / g;
  const maxT = 2 * Math.PI * lobes;
  const steps = Math.max(2000, lobes * 400);
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * maxT;
    pts.push([
      (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t),
      (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t),
    ]);
  }
  return pts;
}

function genRose(p: number[]): [number, number][] {
  const k = p[0], offset = p[1] || 0;
  const maxT = (offset > 0.01 || k % 2 === 0) ? 4 * Math.PI : 2 * Math.PI;
  const steps = 1200;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * maxT;
    const r = Math.cos(k * t) + offset;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return pts;
}

function genLiss(p: number[]): [number, number][] {
  const a = p[0], b = p[1], phase = p[2] || 0;
  const steps = 1200;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    pts.push([Math.sin(a * t + phase), Math.sin(b * t)]);
  }
  return pts;
}

function genSuper(p: number[]): [number, number][] {
  const m = p[0], n1 = p[1], n2 = p[2];
  const steps = 1200;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const t1 = Math.pow(Math.abs(Math.cos(m * theta / 4)), n2);
    const t2 = Math.pow(Math.abs(Math.sin(m * theta / 4)), n2);
    const sum = t1 + t2;
    if (sum === 0) continue;
    const r = Math.pow(sum, -1 / n1);
    if (!isFinite(r)) continue;
    pts.push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  return pts;
}

function genEquation(p: (number | string)[]): [number, number][] {
  const M = Math;
  const env = { sin: M.sin, cos: M.cos, tan: M.tan, sqrt: M.sqrt, abs: M.abs, pow: M.pow, exp: M.exp, PI: M.PI };
  const build = (expr: string) => {
    try {
      const s = expr.replace(/\b(sin|cos|tan|sqrt|abs|pow|exp|PI)\b/g, 'e.$1');
      return new Function('t', 'e', 'return ' + s) as (t: number, e: typeof env) => number;
    } catch { return null; }
  };
  const fnX = build(String(p[0]));
  const fnY = build(String(p[1]));
  if (!fnX || !fnY) return [];
  const range = Number(p[2]) || 6.28;
  const steps = 1200;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * range;
    try {
      const x = fnX(t, env), y = fnY(t, env);
      if (isFinite(x) && isFinite(y)) pts.push([x, y]);
    } catch {}
  }
  return pts;
}

// ── Normalize to unit square centered at (0.5, 0.5) ────────────────

export function norm(pts: [number, number][], pad = 0.68): [number, number][] {
  if (pts.length < 2) return pts;
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
  for (const [x, y] of pts) {
    if (x < mnx) mnx = x; if (x > mxx) mxx = x;
    if (y < mny) mny = y; if (y > mxy) mxy = y;
  }
  const range = Math.max(mxx - mnx, mxy - mny) || 1;
  const scale = pad / range;
  const ox = 0.5 - ((mnx + mxx) / 2) * scale;
  const oy = 0.5 - ((mny + mxy) / 2) * scale;
  return pts.map(([x, y]) => [x * scale + ox, y * scale + oy]);
}

// ── Cumulative arc length ───────────────────────────────────────────

export function cumLen(pts: [number, number][]): number[] {
  const L = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    L.push(L[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return L;
}

export function ptAt(pts: [number, number][], L: number[], dist: number): [number, number] {
  const total = L[L.length - 1];
  const d = ((dist % total) + total) % total;
  let lo = 0, hi = L.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (L[mid] <= d) lo = mid; else hi = mid;
  }
  const seg = L[hi] - L[lo];
  const frac = seg > 0 ? (d - L[lo]) / seg : 0;
  return [
    pts[lo][0] + (pts[hi][0] - pts[lo][0]) * frac,
    pts[lo][1] + (pts[hi][1] - pts[lo][1]) * frac,
  ];
}
