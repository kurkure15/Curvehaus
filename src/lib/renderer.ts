import { cumLen, ptAt } from './curves';

// ── Color utilities ─────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): string {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

export function interpolateGradient(
  baseColor: string,
  stops: string[],
  frac: number,
  shiftFrac: number,
): string {
  if (stops.length === 0) return baseColor;
  const colors = [baseColor, ...stops];
  const shifted = ((frac + shiftFrac) % 1 + 1) % 1;
  const idx = shifted * (colors.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, colors.length - 1);
  const t = idx - lo;
  return lerpRgb(hexToRgb(colors[lo]), hexToRgb(colors[hi]), t);
}

// ── Ghost (offscreen canvas trick to avoid intersection dots) ───────

export function drawGhost(
  ctx: CanvasRenderingContext2D,
  sz: number,
  pts: [number, number][],
  color: string,
) {
  const off = document.createElement('canvas');
  off.width = sz; off.height = sz;
  const oc = off.getContext('2d')!;
  const sw = 0.055 * sz;

  oc.strokeStyle = color;
  oc.lineWidth = sw;
  oc.lineCap = 'round';
  oc.lineJoin = 'round';
  oc.globalAlpha = 1;
  oc.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0] * sz, y = pts[i][1] * sz;
    i === 0 ? oc.moveTo(x, y) : oc.lineTo(x, y);
  }
  oc.closePath();
  oc.stroke();

  ctx.globalAlpha = 0.06;
  ctx.drawImage(off, 0, 0, sz, sz);
  ctx.globalAlpha = 1;
}

// ── Trim path (continuous bands — no visible circles) ───────────────

export function drawTrim(
  ctx: CanvasRenderingContext2D,
  sz: number,
  pts: [number, number][],
  L: number[],
  time: number,
  speed: number,
  baseColor: string,
  gradientStops: string[],
  gradientAngle: number,
) {
  if (pts.length < 2) return;

  const lw = 0.055 * sz;
  const trimFrac = 0.08;
  const n = pts.length;

  // Head position as fraction (0→1)
  const headFrac = ((time * speed * 0.30) % 1 + 1) % 1;
  const tailFrac = ((headFrac - trimFrac) % 1 + 1) % 1;

  const headIdx = Math.floor(headFrac * (n - 1));
  const tailIdx = Math.floor(tailFrac * (n - 1));

  // Build strokeStyle
  const allColors = [baseColor, ...gradientStops];
  let style: string | CanvasGradient;
  if (gradientStops.length === 0) {
    const rgb = hexToRgb(baseColor);
    style = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  } else {
    const rad = (gradientAngle - 90) * Math.PI / 180;
    const cx = sz / 2, cy = sz / 2, len = sz * 0.5;
    const grad = ctx.createLinearGradient(
      cx - Math.cos(rad) * len, cy - Math.sin(rad) * len,
      cx + Math.cos(rad) * len, cy + Math.sin(rad) * len,
    );
    for (let i = 0; i < allColors.length; i++) {
      grad.addColorStop(i / (allColors.length - 1), allColors[i]);
    }
    style = grad;
  }

  // Draw ONLY the trim segment — direct point range, no setLineDash
  ctx.beginPath();
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = style;

  if (tailIdx <= headIdx) {
    ctx.moveTo(pts[tailIdx][0] * sz, pts[tailIdx][1] * sz);
    for (let i = tailIdx + 1; i <= headIdx; i++) {
      ctx.lineTo(pts[i][0] * sz, pts[i][1] * sz);
    }
  } else {
    ctx.moveTo(pts[tailIdx][0] * sz, pts[tailIdx][1] * sz);
    for (let i = tailIdx + 1; i < n; i++) {
      ctx.lineTo(pts[i][0] * sz, pts[i][1] * sz);
    }
    for (let i = 0; i <= headIdx; i++) {
      ctx.lineTo(pts[i][0] * sz, pts[i][1] * sz);
    }
  }
  ctx.stroke();
}

// ── Full render (ghost + trim) ──────────────────────────────────────

export function renderLoader(
  ctx: CanvasRenderingContext2D,
  sz: number,
  pts: [number, number][],
  L: number[],
  time: number,
  speed: number,
  baseColor: string,
  gradientStops: string[],
  gradientAngle: number,
) {
  ctx.clearRect(0, 0, sz, sz);
  drawGhost(ctx, sz, pts, baseColor);
  drawTrim(ctx, sz, pts, L, time, speed, baseColor, gradientStops, gradientAngle);
}

// ── Ghost only (for bento cells at rest) ────────────────────────────

export function renderGhostOnly(
  ctx: CanvasRenderingContext2D,
  sz: number,
  pts: [number, number][],
  color: string,
) {
  ctx.clearRect(0, 0, sz, sz);
  drawGhost(ctx, sz, pts, color);
}
