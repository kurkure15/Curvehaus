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

  // Convert to pixel space ONCE, compute pixel arc length
  const pxX = new Float64Array(pts.length);
  const pxY = new Float64Array(pts.length);
  for (let i = 0; i < pts.length; i++) {
    pxX[i] = pts[i][0] * sz;
    pxY[i] = pts[i][1] * sz;
  }
  let pixLen = 0;
  for (let i = 1; i < pts.length; i++) {
    pixLen += Math.hypot(pxX[i] - pxX[i - 1], pxY[i] - pxY[i - 1]);
  }
  if (pixLen < 1) return;

  const trimLen = trimFrac * pixLen;
  const totalArcLen = L[L.length - 1] || 1;
  // Trim position driven ONLY by time + speed — knob does NOT move the trim
  const headDist = ((time * speed * totalArcLen * 0.30)) % totalArcLen;
  const tailDist = ((headDist - totalArcLen * trimFrac) % totalArcLen + totalArcLen) % totalArcLen;
  const tailPos = ((headDist * pixLen / totalArcLen - trimLen) % pixLen + pixLen) % pixLen;

  // Build colors array
  const allColors = [baseColor, ...gradientStops];

  // Build strokeStyle: solid color or linear gradient
  let style: string | CanvasGradient;
  if (gradientStops.length === 0) {
    const rgb = hexToRgb(baseColor);
    style = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  } else {
    // Gradient direction controlled by angle knob — rotates around canvas center
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

  // ONE path, ONE stroke — zero breaks
  ctx.beginPath();
  ctx.moveTo(pxX[0], pxY[0]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pxX[i], pxY[i]);

  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([trimLen, pixLen - trimLen]);
  ctx.lineDashOffset = -(tailPos % pixLen);
  ctx.strokeStyle = style;
  ctx.stroke();
  ctx.setLineDash([]);
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
