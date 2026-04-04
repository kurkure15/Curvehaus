'use client';

import { Suspense } from 'react';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDialKit } from 'dialkit';
import {
  generatePoints, getCurveInfo, curveParamDefs,
  CURVE_TYPES, CurveType, CurveParams, CurveInfo,
} from '@/lib/curves';
import { exportReact, exportCSS, exportSwiftUI } from '@/lib/exports';
import { PRESETS } from '@/lib/presets';

// ═══════════════════════════════════════════════════════════════════

interface CurveState {
  curveType: CurveType;
  params: CurveParams;
  speed: number;
  trimLength: number;
  strokeColor: string;
  strokeWidth: number;
  particleSize: number;
  ghostOpacity: number;
  particleCount: number;
  customX: string;
  customY: string;
}

const MAX_PARTICLES = 120;

// ═══════════════════════════════════════════════════════════════════

function buildParams(type: CurveType, overrides: Partial<CurveParams> = {}): CurveParams {
  const cp: CurveParams = { a: 96, b: 60, c: 0.75, d: 2, n1: 0.3, n2: 1.7, n3: 1.7, m: 5, petals: 5, stepAngle: 71, customX: 'sin(3*t)*cos(t)', customY: 'sin(2*t)', customRange: 6.28 };
  for (const def of curveParamDefs[type]) {
    if (typeof cp[def.param] === 'number') (cp as unknown as Record<string, number>)[def.param] = def.range[0];
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (k in cp) (cp as unknown as Record<string, unknown>)[k] = v;
  }
  return cp;
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  });
}

function normalizeToViewBox(pts: [number, number][], pad = 0.75): number[][] {
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
  for (const [x, y] of pts) { if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; }
  const range = Math.max(mxx - mnx, mxy - mny) || 1;
  const scale = (100 * pad) / range;
  const ox = 50 - ((mnx + mxx) / 2) * scale, oy = 50 - ((mny + mxy) / 2) * scale;
  return pts.map(([x, y]) => [x * scale + ox, y * scale + oy]);
}

function pointsToD(mapped: number[][]): string {
  return mapped.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ' Z';
}

function svgToCanvas(svgEl: SVGSVGElement, size: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('no ctx')); return; }

    // Clone SVG with explicit dimensions and dark background for visibility
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(size));
    clone.setAttribute('height', String(size));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // Add black background rect
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100'); bg.setAttribute('height', '100');
    bg.setAttribute('fill', '#0a0a0c');
    clone.insertBefore(bg, clone.firstChild);

    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img load failed')); };
    img.src = url;
  });
}

async function exportGIF(svgEl: SVGSVGElement) {
  try {
    const canvas = await svgToCanvas(svgEl, 512);
    canvas.toBlob(b => {
      if (!b) return;
      const a = document.createElement('a');
      a.download = `curvehaus-${Date.now()}.gif`; // actually PNG, browsers can't encode GIF
      a.href = URL.createObjectURL(b); a.click();
    }, 'image/png');
  } catch (e) { console.error('GIF export failed:', e); }
}

async function exportMP4(svgEl: SVGSVGElement, durationMs: number) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const fps = 30;
  const totalFrames = Math.round((durationMs / 1000) * fps);

  // Check MediaRecorder support
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      alert('Video recording not supported in this browser');
      return;
    }
  }

  const stream = canvas.captureStream(fps);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType });
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.download = `curvehaus-${Date.now()}.webm`;
    a.href = URL.createObjectURL(blob); a.click();
  };
  recorder.start();

  let frame = 0;
  async function drawFrame() {
    if (frame >= totalFrames) { recorder.stop(); return; }
    try {
      const rendered = await svgToCanvas(svgEl, size);
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(rendered, 0, 0);
    } catch { /* skip frame */ }
    frame++;
    requestAnimationFrame(drawFrame);
  }
  drawFrame();
}

// ═══════════════════════════════════════════════════════════════════
// DialKit panel
// ═══════════════════════════════════════════════════════════════════

function DialPanel({
  initType, initParams, initColor,
  onStateChange, onTypeChange, svgRef,
}: {
  initType: CurveType;
  initParams: Record<string, number>;
  initColor: string;
  onStateChange: (partial: Partial<CurveState>) => void;
  onTypeChange: (type: CurveType, color: string) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}) {
  const config = useMemo(() => {
    const paramSliders: Record<string, [number, number, number, number]> = {};
    for (const def of curveParamDefs[initType]) {
      if (def.param === 'customX' || def.param === 'customY') continue;
      paramSliders[def.label] = [initParams[def.param] ?? def.range[0], def.range[1], def.range[2], def.range[3]];
    }
    return {
      Curve: { curveType: { type: 'select' as const, options: CURVE_TYPES as unknown as string[], default: initType } },
      Parameters: paramSliders,
      Animation: {
        speed: [0.5, 0.05, 2.0, 0.05] as [number, number, number, number],
        trimLength: [0.38, 0.1, 0.7, 0.01] as [number, number, number, number],
      },
      Style: {
        strokeColor: { type: 'color' as const, default: initColor },
        strokeWidth: [2.0, 0.5, 5.0, 0.1] as [number, number, number, number],
        particleSize: [3.0, 0.5, 6.0, 0.1] as [number, number, number, number],
        ghostOpacity: [0.1, 0.02, 0.25, 0.01] as [number, number, number, number],
        particles: [120, 24, 120, 1] as [number, number, number, number],
      },
      Export: {
        copyReact: { type: 'action' as const, label: '\u269B React' },
        copyCSS: { type: 'action' as const, label: '{ } CSS' },
        copySwift: { type: 'action' as const, label: '\u25C6 SwiftUI' },
        exportMP4: { type: 'action' as const, label: '\u{1F3AC} MP4' },
        exportGIF: { type: 'action' as const, label: '\u{1F5BC} GIF' },
      },
    };
  }, [initType, initParams, initColor]);

  const vals = useDialKit('Curvehaus', config, {
    onAction: (action: string) => {
      const styl = vals.Style as { strokeColor: string; strokeWidth: number; ghostOpacity: number };
      const anm = vals.Animation as { speed: number; trimLength: number };
      const pts = generatePoints(initType, curveParamsFromVals()).filter(p => isFinite(p[0]) && isFinite(p[1]));
      const opts = { color: styl.strokeColor, lineWidth: styl.strokeWidth, ghostOpacity: styl.ghostOpacity, speed: anm.speed, trimLength: anm.trimLength, size: 48 };

      if (action === 'Export.copyReact') copyText(exportReact(pts, opts));
      else if (action === 'Export.copyCSS') copyText(exportCSS(pts, opts));
      else if (action === 'Export.copySwift') copyText(exportSwiftUI(pts, opts));
      else if (action === 'Export.exportMP4') {
        const svg = svgRef.current;
        if (svg) exportMP4(svg, 4600 / (anm.speed || 0.5));
      } else if (action === 'Export.exportGIF') {
        const svg = svgRef.current;
        if (svg) exportGIF(svg);
      }
    },
  });

  const selectedType = (vals.Curve as { curveType: string }).curveType as CurveType;
  const paramVals = vals.Parameters as Record<string, number>;
  const anim = vals.Animation as { speed: number; trimLength: number };
  const style = vals.Style as { strokeColor: string; strokeWidth: number; particleSize: number; ghostOpacity: number; particles: number };

  function curveParamsFromVals(): CurveParams {
    const cp: CurveParams = { a: 96, b: 60, c: 0.75, d: 2, n1: 0.3, n2: 1.7, n3: 1.7, m: 5, petals: 5, stepAngle: 71, customX: 'sin(3*t)*cos(t)', customY: 'sin(2*t)', customRange: 6.28 };
    for (const def of curveParamDefs[initType]) {
      if (def.param === 'customX' || def.param === 'customY') continue;
      if (paramVals[def.label] !== undefined) (cp as unknown as Record<string, number>)[def.param] = paramVals[def.label];
    }
    return cp;
  }

  useEffect(() => {
    if (selectedType !== initType) {
      const defaults: Record<string, number> = {};
      for (const def of curveParamDefs[selectedType]) {
        if (def.param !== 'customX' && def.param !== 'customY') defaults[def.param] = def.range[0];
      }
      onTypeChange(selectedType, style.strokeColor);
    }
  }, [selectedType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onStateChange({
      curveType: initType,
      params: curveParamsFromVals(),
      speed: anim.speed,
      trimLength: anim.trimLength,
      strokeColor: style.strokeColor,
      strokeWidth: style.strokeWidth,
      ghostOpacity: style.ghostOpacity,
      particleSize: style.particleSize,
      particleCount: Math.round(style.particles),
    });
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════

export default function EditorPage() {
  return <Suspense><EditorInner /></Suspense>;
}

function EditorInner() {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const circleRefs = useRef<SVGCircleElement[]>([]);
  const searchParams = useSearchParams();

  const [state, setState] = useState<CurveState>({
    curveType: 'hypotrochoid',
    params: buildParams('hypotrochoid', { a: 96, b: 60, c: 0.75 }),
    speed: 0.5, trimLength: 0.38,
    strokeColor: '#d42b4e', strokeWidth: 2.0, particleSize: 3.0,
    ghostOpacity: 0.1, particleCount: 120,
    customX: 'sin(3*t)*cos(t)', customY: 'sin(2*t)',
  });
  const [info, setInfo] = useState<CurveInfo>({ name: '', formula: '', detail: '' });

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });
  useEffect(() => { setInfo(getCurveInfo(state.curveType, state.params)); }, [state.curveType, state.params]);

  // Load preset from URL ?preset=N
  useEffect(() => {
    const pid = searchParams.get('preset');
    if (pid) {
      const preset = PRESETS.find(p => p.id === Number(pid));
      if (preset) {
        const type = preset.curveType as CurveType;
        setState(s => ({
          ...s, curveType: type,
          params: buildParams(type, preset.params as Partial<CurveParams>),
          strokeColor: preset.color,
        }));
        setActiveType(type);
        setActiveColor(preset.color);
        setDialKey(k => k + 1);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate mapped points in viewBox 0-100 space
  const mapped = useMemo(() => {
    const raw = generatePoints(state.curveType, state.params);
    const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
    return valid.length < 10 ? [] : normalizeToViewBox(valid);
  }, [state.curveType, state.params]);

  const pathD = useMemo(() => mapped.length > 10 ? pointsToD(mapped) : '', [mapped]);
  const mappedRef = useRef(mapped);
  useEffect(() => { mappedRef.current = mapped; }, [mapped]);

  // DialKit remount
  const [dialKey, setDialKey] = useState(0);
  const [activeType, setActiveType] = useState<CurveType>('hypotrochoid');
  const [activeDefaults, setActiveDefaults] = useState<Record<string, number>>({ a: 96, b: 60, c: 0.75 });
  const [activeColor, setActiveColor] = useState('#d42b4e');

  const handleTypeChange = useCallback((type: CurveType, color: string) => {
    const defaults: Record<string, number> = {};
    for (const def of curveParamDefs[type]) {
      if (def.param !== 'customX' && def.param !== 'customY') defaults[def.param] = def.range[0];
    }
    setState(s => ({ ...s, curveType: type, params: buildParams(type), strokeColor: color }));
    setActiveType(type);
    setActiveDefaults(defaults);
    setActiveColor(color);
    setDialKey(k => k + 1);
  }, []);

  const handleStateChange = useCallback((partial: Partial<CurveState>) => {
    setState(s => ({ ...s, ...partial }));
  }, []);

  const setCustomText = useCallback((v: string) => setState(s => ({ ...s, customX: v, params: { ...s.params, customX: v } })), []);

  // ═══════════════════════════════════════════════════════════════
  // ANIMATION LOOP — moves circles along curve each frame
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const startTime = performance.now();
    let frameId: number;

    function tick(now: number) {
      const s = stateRef.current;
      const pts = mappedRef.current;
      const n = pts.length;

      if (n < 10) { frameId = requestAnimationFrame(tick); return; }

      // Progress: 0→1 over one loop
      const durationMs = 4600 / (s.speed || 0.5);
      const progress = (((now - startTime) % durationMs) / durationMs);
      const trailSpan = s.trimLength || 0.38;
      const sw = s.strokeWidth || 2.0;
      const headR = s.particleSize || 3.0;
      const tailR = headR * 0.25;
      const count = s.particleCount || 120;

      const pathEl = pathRef.current;
      if (pathEl) {
        pathEl.setAttribute('stroke-width', sw.toFixed(1));
        pathEl.setAttribute('opacity', String(s.ghostOpacity || 0.1));
      }

      // Head walks forward continuously
      const headIdx = Math.floor(progress * (n - 1));
      const trailPoints = Math.floor(n * trailSpan);
      const rawStep = Math.max(1, Math.floor(trailPoints / count));
      const step = Math.min(rawStep, Math.ceil(n / 200));

      for (let i = 0; i < MAX_PARTICLES; i++) {
        const el = circleRefs.current[i];
        if (!el) continue;
        if (i >= count) { el.setAttribute('opacity', '0'); continue; }

        const tailOffset = i / (count - 1); // 0=head, 1=tail

        // Walk backwards from head by i steps
        const ptIdx = ((headIdx - i * step) % n + n) % n;
        const pt = pts[ptIdx];

        const fade = Math.pow(1 - tailOffset, 0.53);
        const radius = headR - (headR - tailR) * Math.pow(tailOffset, 1.5);
        const opacity = Math.max(0.04, fade);

        el.setAttribute('cx', pt[0].toFixed(2));
        el.setAttribute('cy', pt[1].toFixed(2));
        el.setAttribute('r', radius.toFixed(2));
        el.setAttribute('opacity', opacity.toFixed(3));
      }

      frameId = requestAnimationFrame(tick);
    }

    console.log('CURVEHAUS: animation started');
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Log first circle data on mount for debugging
  useEffect(() => {
    if (mapped.length > 10) {
      const headR = state.particleSize || 3.0;
      console.log('Circle 0:', { cx: mapped[0][0].toFixed(2), cy: mapped[0][1].toFixed(2), r: headR.toFixed(2), opacity: '1.000' });
    }
  }, [mapped, state.strokeWidth]);

  return (
    <div className="flex h-screen flex-col items-center justify-center pr-[280px] max-[900px]:pr-0">
      {/* SVG with <g> wrapping path + circles */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        fill="none"
        className="w-full flex-1"
        style={{ maxHeight: 'calc(100vh - 40px)', maxWidth: 'calc(100vw - 300px)' }}
      >
        <g ref={groupRef}>
          {/* Ghost path — STROKE only, never fill */}
          <path
            ref={pathRef}
            d={pathD}
            stroke={state.strokeColor}
            strokeWidth={state.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={state.ghostOpacity}
            fill="none"
          />
          {/* Trail circles */}
          {Array.from({ length: MAX_PARTICLES }, (_, i) => (
            <circle
              key={i}
              ref={el => { if (el) circleRefs.current[i] = el; }}
              fill={state.strokeColor}
              cx="50" cy="50"
              r={String(state.particleSize || 3.0)}
              opacity="1"
            />
          ))}
        </g>
      </svg>

      {/* Compact info */}
      <div className="shrink-0 py-0.5 text-center">
        <span className="text-[13px] font-medium text-white/60">{info.name}</span>
        <span className="ml-2 font-mono text-[9px] text-white/15">{info.formula}</span>
      </div>

      {/* Custom text input */}
      {state.curveType === 'custom' && (
        <div className="fixed bottom-4 left-4 z-50 rounded-lg border border-[#1e1e24] bg-[#111114] p-3">
          <label className="mb-1 block text-[10px] text-white/40">Type any word</label>
          <input type="text" value={state.customX} onChange={e => setCustomText(e.target.value)}
            placeholder="hello"
            className="w-56 rounded border border-[#1e1e24] bg-white/[0.04] px-3 py-1.5 text-[16px] text-white/80 outline-none focus:border-white/20" />
        </div>
      )}

      <DialPanel
        key={dialKey}
        initType={activeType}
        initParams={activeDefaults}
        initColor={activeColor}
        onStateChange={handleStateChange}
        onTypeChange={handleTypeChange}
        svgRef={svgRef}
      />
    </div>
  );
}
