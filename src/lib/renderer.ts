export interface TrimPathOptions {
  trimStart: number;
  trimEnd: number;
  ghostOpacity: number;
  strokeColor: string;
  lineWidth: number;
  showHeadDot: boolean;
}

export function renderTrimPath(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  options: TrimPathOptions,
  canvasWidth: number,
  canvasHeight: number,
) {
  if (points.length < 2) return;

  const size = Math.min(canvasWidth, canvasHeight);
  const ox = canvasWidth / 2;
  const oy = canvasHeight / 2;
  const scale = size / 2;
  const px = (p: [number, number]) => ox + p[0] * scale;
  const py = (p: [number, number]) => oy + p[1] * scale;
  const N = points.length;
  const last = N - 1;

  // ── Ghost outline: full shape, same lineWidth, low opacity ────
  ctx.save();
  ctx.globalAlpha = options.ghostOpacity;
  ctx.strokeStyle = options.strokeColor;
  ctx.lineWidth = options.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(px(points[0]), py(points[0]));
  for (let i = 1; i < N; i++) ctx.lineTo(px(points[i]), py(points[i]));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // ── Bright trim segment: slightly thicker, full opacity ───────
  const rawStart = options.trimStart;
  const rawEnd = options.trimEnd;
  if (Math.abs(rawEnd - rawStart) < 0.0005) return;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = options.strokeColor;
  ctx.lineWidth = options.lineWidth + 0.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = options.strokeColor;
  ctx.shadowBlur = options.lineWidth * 3;
  ctx.beginPath();

  if (rawStart < 0) {
    const tailIdx = Math.max(0, Math.floor((1 + rawStart) * last));
    const headIdx = Math.min(last, Math.floor(rawEnd * last));
    ctx.moveTo(px(points[tailIdx]), py(points[tailIdx]));
    for (let i = tailIdx + 1; i < N; i++) ctx.lineTo(px(points[i]), py(points[i]));
    for (let i = 0; i <= headIdx; i++) ctx.lineTo(px(points[i]), py(points[i]));
  } else {
    const si = Math.max(0, Math.floor(rawStart * last));
    const ei = Math.min(last, Math.floor(rawEnd * last));
    if (ei > si) {
      ctx.moveTo(px(points[si]), py(points[si]));
      for (let i = si + 1; i <= ei; i++) ctx.lineTo(px(points[i]), py(points[i]));
    }
  }
  ctx.stroke();
  ctx.restore();

  // ── Head dot: outer glow halo + solid core ────────────────────
  if (options.showHeadDot) {
    const ei = Math.max(0, Math.min(Math.floor(rawEnd * last), last));
    const hx = px(points[ei]);
    const hy = py(points[ei]);

    // Outer halo (6px, 0.3 alpha)
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = options.strokeColor;
    ctx.shadowColor = options.strokeColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(hx, hy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Solid core (3px)
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = options.strokeColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(hx, hy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
