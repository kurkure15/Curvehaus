// ── Points → SVG path d="" ──────────────────────────────────────────

export function pointsToSvgPath(pts: [number, number][], viewBox = 100): string {
  if (pts.length < 2) return '';
  // Find bounds
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
  for (const [x, y] of pts) {
    if (x < mnx) mnx = x; if (x > mxx) mxx = x;
    if (y < mny) mny = y; if (y > mxy) mxy = y;
  }
  const range = Math.max(mxx - mnx, mxy - mny) || 1;
  const pad = viewBox * 0.1;
  const scale = (viewBox - pad * 2) / range;
  const ox = viewBox / 2 - ((mnx + mxx) / 2) * scale;
  const oy = viewBox / 2 - ((mny + mxy) / 2) * scale;

  const d = pts.map(([x, y], i) => {
    const px = (x * scale + ox).toFixed(2);
    const py = (y * scale + oy).toFixed(2);
    return i === 0 ? `M${px},${py}` : `L${px},${py}`;
  }).join(' ');
  return d + ' Z';
}

// ── Estimate path length from points ────────────────────────────────

export function estimatePathLength(pts: [number, number][], viewBox = 100): number {
  if (pts.length < 2) return 0;
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
  for (const [x, y] of pts) {
    if (x < mnx) mnx = x; if (x > mxx) mxx = x;
    if (y < mny) mny = y; if (y > mxy) mxy = y;
  }
  const range = Math.max(mxx - mnx, mxy - mny) || 1;
  const pad = viewBox * 0.1;
  const scale = (viewBox - pad * 2) / range;
  const ox = viewBox / 2 - ((mnx + mxx) / 2) * scale;
  const oy = viewBox / 2 - ((mny + mxy) / 2) * scale;
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = (pts[i][0] - pts[i - 1][0]) * scale;
    const dy = (pts[i][1] - pts[i - 1][1]) * scale;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  // closing segment
  const dx = (pts[0][0] - pts[pts.length - 1][0]) * scale;
  const dy = (pts[0][1] - pts[pts.length - 1][1]) * scale;
  len += Math.sqrt(dx * dx + dy * dy);
  return len;
}

// ── Export: Animated SVG ────────────────────────────────────────────

export function exportSVG(
  pts: [number, number][],
  opts: { color: string; lineWidth: number; ghostOpacity: number; speed: number; trimLength: number; darkColor?: string; lightColor?: string },
): string {
  const path = pointsToSvgPath(pts);
  const totalLen = estimatePathLength(pts);
  const trimLen = totalLen * opts.trimLength;
  const remainder = totalLen - trimLen;
  const duration = (2 / opts.speed).toFixed(1);
  const sw = opts.lineWidth.toFixed(1);

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="status" aria-label="Loading">
  <title>Loading</title>
  <style>
    @media (prefers-reduced-motion: reduce) {
      .loader-path { animation: none !important; stroke-dashoffset: 0 !important; }
    }
    @media (prefers-color-scheme: light) {
      .loader-ghost, .loader-path { stroke: ${opts.lightColor || '#1a1a1a'}; }
    }
    .loader-ghost {
      fill: none; stroke: var(--loader-color, ${opts.color});
      stroke-width: var(--loader-width, ${sw}); stroke-linecap: round; opacity: ${opts.ghostOpacity};
    }
    .loader-path {
      fill: none; stroke: var(--loader-color, ${opts.color});
      stroke-width: var(--loader-width, ${sw}); stroke-linecap: round;
      stroke-dasharray: ${trimLen.toFixed(1)} ${remainder.toFixed(1)};
      animation: race ${duration}s linear infinite;
    }
    @keyframes race { to { stroke-dashoffset: -${totalLen.toFixed(1)}; } }
  </style>
  <path class="loader-ghost" d="${path}"/>
  <path class="loader-path" d="${path}"/>
</svg>`;
}

// ── Export: React component ─────────────────────────────────────────

export function exportReact(
  pts: [number, number][],
  opts: { color: string; lineWidth: number; speed: number; trimLength: number; size: number },
): string {
  const path = pointsToSvgPath(pts);
  const duration = (2 / opts.speed).toFixed(1);

  return `import { motion, useReducedMotion } from "motion/react"

export function Loader({ color = "${opts.color}", size = ${opts.size} }) {
  const reduced = useReducedMotion()
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="status" aria-label="Loading">
      <title>Loading</title>
      {/* Ghost outline */}
      <path d="${path}" fill="none" stroke={color} strokeWidth={${opts.lineWidth.toFixed(1)}}
        strokeLinecap="round" opacity={0.12} />
      {/* Animated trim */}
      <motion.path d="${path}" fill="none" stroke={color}
        strokeWidth={${(opts.lineWidth + 0.5).toFixed(1)}} strokeLinecap="round"
        initial={{ pathLength: 0, pathOffset: 0 }}
        animate={reduced ? {} : { pathOffset: [0, 1] }}
        transition={{ duration: ${duration}, repeat: Infinity, ease: "linear" }}
        style={{ pathLength: ${opts.trimLength} }} />
    </svg>
  )
}`;
}

// ── Export: CSS-only (SVG as data URI) ──────────────────────────────

export function exportCSS(
  pts: [number, number][],
  opts: { color: string; lineWidth: number; speed: number; trimLength: number; size: number },
): string {
  const svgRaw = exportSVG(pts, { ...opts, ghostOpacity: 0.12 });
  const encoded = encodeURIComponent(svgRaw).replace(/'/g, '%27').replace(/"/g, '%22');

  return `.loader {
  width: ${opts.size}px;
  height: ${opts.size}px;
  background: url("data:image/svg+xml,${encoded}") no-repeat center / contain;
}

@media (prefers-reduced-motion: reduce) {
  .loader { /* SVG internal animation stops via CSS */ }
}`;
}

// ── Export: SwiftUI ─────────────────────────────────────────────────

export function exportSwiftUI(
  pts: [number, number][],
  opts: { color: string; speed: number; trimLength: number; size: number },
): string {
  // Convert hex to SwiftUI Color
  const r = parseInt(opts.color.slice(1, 3), 16) / 255;
  const g = parseInt(opts.color.slice(3, 5), 16) / 255;
  const b = parseInt(opts.color.slice(5, 7), 16) / 255;

  // Generate normalized points for SwiftUI path
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
  for (const [x, y] of pts) {
    if (x < mnx) mnx = x; if (x > mxx) mxx = x;
    if (y < mny) mny = y; if (y > mxy) mxy = y;
  }
  const range = Math.max(mxx - mnx, mxy - mny) || 1;

  const pathLines = pts.map(([x, y], i) => {
    const nx = ((x - mnx) / range).toFixed(4);
    const ny = ((y - mny) / range).toFixed(4);
    const cmd = i === 0 ? 'path.move' : 'path.addLine';
    return `            ${cmd}(to: CGPoint(x: rect.width * ${nx}, y: rect.height * ${ny}))`;
  }).join('\n');

  return `import SwiftUI

struct CurveLoader: View {
    @State private var offset: CGFloat = 0
    @Environment(\\.accessibilityReduceMotion) var reduceMotion

    var body: some View {
        CurveShape()
            .trim(from: offset, to: offset + ${opts.trimLength})
            .stroke(
                Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)}),
                style: StrokeStyle(lineWidth: 2, lineCap: .round)
            )
            .frame(width: ${opts.size}, height: ${opts.size})
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.linear(duration: ${(2 / opts.speed).toFixed(1)}).repeatForever(autoreverses: false)) {
                    offset = 1
                }
            }
            .accessibilityLabel("Loading")
    }
}

struct CurveShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
${pathLines}
        path.closeSubpath()
        return path
    }
}`;
}

// ── Export: Lottie JSON ─────────────────────────────────────────────

export function exportLottie(
  pts: [number, number][],
  opts: { color: string; lineWidth: number; speed: number; trimLength: number },
): string {
  // Normalize points to 0-100 for Lottie
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
  for (const [x, y] of pts) {
    if (x < mnx) mnx = x; if (x > mxx) mxx = x;
    if (y < mny) mny = y; if (y > mxy) mxy = y;
  }
  const range = Math.max(mxx - mnx, mxy - mny) || 1;
  const pad = 10;
  const scale = (100 - pad * 2) / range;
  const ox = 50 - ((mnx + mxx) / 2) * scale;
  const oy = 50 - ((mny + mxy) / 2) * scale;

  // Sample points for Lottie vertices (max 200 to keep file small)
  const step = Math.max(1, Math.floor(pts.length / 200));
  const verts: number[][] = [];
  for (let i = 0; i < pts.length; i += step) {
    verts.push([pts[i][0] * scale + ox, pts[i][1] * scale + oy]);
  }

  const r = parseInt(opts.color.slice(1, 3), 16) / 255;
  const g = parseInt(opts.color.slice(3, 5), 16) / 255;
  const b = parseInt(opts.color.slice(5, 7), 16) / 255;
  const fps = 30;
  const frames = Math.round((2 / opts.speed) * fps);

  const lottie = {
    v: "5.7.1", fr: fps, ip: 0, op: frames, w: 100, h: 100, nm: "Loader",
    layers: [{
      ty: 4, nm: "curve", sr: 1, ks: { o: { a: 0, k: 100 }, p: { a: 0, k: [50, 50] }, s: { a: 0, k: [100, 100] } },
      shapes: [
        {
          ty: "sh", ks: {
            a: 0, k: {
              c: true, v: verts.map(v => [v[0] - 50, v[1] - 50]),
              i: verts.map(() => [0, 0]), o: verts.map(() => [0, 0]),
            }
          }
        },
        {
          ty: "tm", s: { a: 0, k: 0 }, e: { a: 0, k: opts.trimLength * 100 },
          o: { a: 1, k: [
            { t: 0, s: [0], e: [360] },
            { t: frames, s: [360] },
          ]},
        },
        { ty: "st", c: { a: 0, k: [r, g, b, 1] }, w: { a: 0, k: opts.lineWidth }, lc: 2, lj: 2 },
      ],
      ip: 0, op: frames, st: 0,
    }],
  };
  return JSON.stringify(lottie, null, 2);
}

// ── Export: Inline HTML embed ───────────────────────────────────────

export function exportEmbed(
  pts: [number, number][],
  opts: { color: string; lineWidth: number; ghostOpacity: number; speed: number; trimLength: number; size: number },
): string {
  const svg = exportSVG(pts, opts);
  const escaped = svg.replace(/\n\s*/g, '').replace(/"/g, '&quot;');
  return `<div style="width:${opts.size}px;height:${opts.size}px" role="status" aria-label="Loading">
  ${svg.replace(/\n/g, '\n  ')}
</div>`;
}

// ── Export: Scroll-linked CSS ───────────────────────────────────────

export function exportScrollCSS(
  pts: [number, number][],
  opts: { color: string; lineWidth: number },
): string {
  const path = pointsToSvgPath(pts);
  const totalLen = estimatePathLength(pts);

  return `.scroll-loader path {
  fill: none;
  stroke: ${opts.color};
  stroke-width: ${opts.lineWidth};
  stroke-linecap: round;
  stroke-dasharray: ${totalLen.toFixed(1)};
  stroke-dashoffset: ${totalLen.toFixed(1)};
  animation: scroll-draw linear;
  animation-timeline: scroll();
  animation-range: entry 0% cover 100%;
}

@keyframes scroll-draw {
  to { stroke-dashoffset: 0; }
}

/* SVG path: d="${path}" */`;
}

// ── URL serialization ───────────────────────────────────────────────

export function stateToURL(state: {
  curveType: string;
  params: object;
  color: string;
}): string {
  const u = new URLSearchParams();
  u.set('t', state.curveType);
  u.set('col', state.color.replace('#', ''));
  for (const [k, v] of Object.entries(state.params as Record<string, number>)) {
    u.set(k, String(v));
  }
  return '?' + u.toString();
}

export function urlToState(search: string): { curveType: string; params: Record<string, number>; color: string } | null {
  const u = new URLSearchParams(search);
  const t = u.get('t');
  if (!t) return null;
  const color = '#' + (u.get('col') || 'd42b4e');
  const params: Record<string, number> = {};
  for (const [k, v] of u.entries()) {
    if (k !== 't' && k !== 'col') {
      const n = parseFloat(v);
      if (isFinite(n)) params[k] = n;
    }
  }
  return { curveType: t, params, color };
}
