import { gcd, normalizePoints } from './math';

export type CurveType =
  | 'hypotrochoid'
  | 'rose'
  | 'lissajous'
  | 'superformula';

export const CURVE_TYPES: CurveType[] = [
  'hypotrochoid', 'rose', 'lissajous', 'superformula',
];

export interface CurveParams {
  a: number; b: number; c: number; d: number;
  n1: number; n2: number; n3: number; m: number;
  petals: number; stepAngle: number;
  // Custom equation fields
}

export interface CurveInfo { name: string; formula: string; detail: string; }

export interface ParamDef {
  param: keyof CurveParams;
  label: string;
  range: [number, number, number, number];
}

export const curveParamDefs: Record<CurveType, ParamDef[]> = {
  hypotrochoid: [
    { param: 'a', label: 'Ring teeth', range: [96, 48, 200, 1] },
    { param: 'b', label: 'Cog teeth', range: [60, 10, 180, 1] },
    { param: 'c', label: 'Pen hole', range: [0.75, 0.1, 1.0, 0.01] },
  ],
  rose: [
    { param: 'petals', label: 'Petals', range: [5, 2, 20, 1] },
    { param: 'a', label: 'Offset', range: [0, 0, 2, 0.01] },
  ],
  lissajous: [
    { param: 'b', label: 'Freq X', range: [3, 1, 10, 1] },
    { param: 'd', label: 'Freq Y', range: [2, 1, 10, 1] },
    { param: 'c', label: 'Phase', range: [1.5, 0, 6.28, 0.01] },
  ],
  superformula: [
    { param: 'm', label: 'Symmetry', range: [5, 2, 12, 1] },
    { param: 'n1', label: 'Roundness', range: [0.3, 0.05, 2.0, 0.05] },
    { param: 'n2', label: 'Sharpness', range: [1.7, 0.3, 1.9, 0.1] },
  ],
};

// ── Point generators ────────────────────────────────────────────────

function hypotrochoid(p: CurveParams, steps: number): [number, number][] {
  const R = p.a, r = p.b, d = p.c * r;
  const Ri = Math.round(R), ri = Math.round(r);
  const g = gcd(Ri, ri);
  const revolutions = ri / g;
  const lobes = Ri / g;
  const maxT = 2 * Math.PI * revolutions;
  const actualSteps = Math.max(steps, lobes * 200);
  const pts: [number, number][] = [];
  for (let i = 0; i <= actualSteps; i++) {
    const t = (i / actualSteps) * maxT;
    pts.push([
      (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t),
      (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t),
    ]);
  }
  return normalizePoints(pts);
}

function rose(p: CurveParams, steps: number): [number, number][] {
  const k = p.petals;
  const offset = p.a;
  const pts: [number, number][] = [];
  const maxT = offset > 0.01 ? 4 * Math.PI : (k % 2 === 0 ? 2 * Math.PI : Math.PI);
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * maxT;
    const r = Math.cos(k * t) + offset;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return normalizePoints(pts);
}

function lissajousGen(p: CurveParams, steps: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    pts.push([Math.sin(p.b * t + p.c), Math.sin(p.d * t)]);
  }
  return normalizePoints(pts);
}

function superformula(p: CurveParams, steps: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const sharpness = p.n2;
    const t1 = Math.pow(Math.abs(Math.cos(p.m * theta / 4)), sharpness);
    const t2 = Math.pow(Math.abs(Math.sin(p.m * theta / 4)), sharpness);
    const sum = t1 + t2;
    if (sum === 0) continue;
    const r = Math.pow(sum, -1 / p.n1);
    if (!isFinite(r)) continue;
    pts.push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  return normalizePoints(pts);
}

// ── Custom text-to-path: traces the outline of any word ─────────────

// ── Dispatch ────────────────────────────────────────────────────────

const generators: Record<CurveType, (p: CurveParams, steps: number) => [number, number][]> = {
  hypotrochoid, rose, lissajous: lissajousGen, superformula,
};

const baseSteps: Record<CurveType, number> = {
  hypotrochoid: 4000, rose: 1000, lissajous: 1000, superformula: 1200,
};

export function generatePoints(type: CurveType, params: CurveParams): [number, number][] {
  const gen = generators[type];
  if (!gen) return [];
  let steps = baseSteps[type] ?? 2000;
  if (type === 'hypotrochoid') {
    const Ri = Math.round(params.a), ri = Math.round(params.b);
    const g = gcd(Ri, ri);
    steps = Math.max(steps, (Ri / g) * 200);
  }
  try { return gen(params, steps); } catch { return []; }
}

// ── Info ─────────────────────────────────────────────────────────────

export function getCurveInfo(type: CurveType, params: CurveParams): CurveInfo {
  switch (type) {
    case 'hypotrochoid': {
      const R = params.a, r = params.b, d = params.c * r;
      const Ri = Math.round(R), ri = Math.round(r);
      const g = gcd(Ri, ri); const lobes = ri / g;
      const orbit = Math.abs(R - r);
      const hint = (orbit > 0 && d / orbit < 0.5) ? ' · tip: increase pen hole' : '';
      return { name: 'Hypotrochoid', formula: `x=(${Ri}−${ri})cos t + ${d.toFixed(1)}·cos((${Ri}−${ri})/${ri}·t)`, detail: `${lobes} lobes · gcd ${g}${hint}` };
    }
    case 'rose': {
      const k = params.petals; const off = params.a;
      const n = k % 2 === 0 ? 2 * k : k;
      return { name: 'Rose', formula: `r = cos(${k}θ)${off > 0.005 ? ` + ${off.toFixed(2)}` : ''}`, detail: `${n} petals${off > 0.005 ? ' · merged' : ''}` };
    }
    case 'lissajous':
      return { name: 'Lissajous', formula: `x = sin(${params.b}t + ${params.c.toFixed(2)}), y = sin(${params.d}t)`, detail: `ratio ${params.b}:${params.d}` };
    case 'superformula':
      return { name: 'Superformula', formula: `r = [|cos(${params.m}θ/4)|^${params.n2} + |sin(…)|^${params.n2}]^(−1/${params.n1})`, detail: `${params.m}-fold · n₁=${params.n1.toFixed(2)}` };
  }
}

// ── Presets ──────────────────────────────────────────────────────────

export interface Preset {
  label: string;
  type: CurveType;
  params: Partial<CurveParams>;
  color: string;
  trailColor: string;
}

export const presets: Preset[] = [
  { label: 'Spirograph star', type: 'hypotrochoid', params: { a: 96, b: 60, c: 0.75 }, color: '#d42b4e', trailColor: '#7F77DD' },
  { label: 'Dense bloom', type: 'hypotrochoid', params: { a: 96, b: 52, c: 0.85 }, color: '#7F77DD', trailColor: '#378ADD' },
  { label: 'Rose petal', type: 'rose', params: { petals: 5, a: 0 }, color: '#d4537e', trailColor: '#BA7517' },
  { label: 'Lissajous knot', type: 'lissajous', params: { b: 3, d: 2, c: 1.5 }, color: '#378ADD', trailColor: '#1D9E75' },
  { label: 'Superformula', type: 'superformula', params: { m: 5, n1: 0.3, n2: 1.7 }, color: '#BA7517', trailColor: '#d42b4e' },
];

export const defaultParams: CurveParams = {
  a: 96, b: 60, c: 0.75, d: 2, n1: 0.3, n2: 1.7, n3: 1.7, m: 5,
  petals: 5, stepAngle: 71,
};
