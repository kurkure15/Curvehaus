'use client';

import { Suspense } from 'react';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDialKit, DialRoot } from 'dialkit';
import {
  generatePoints, getCurveInfo, curveParamDefs,
  CURVE_TYPES, CurveType, CurveParams, CurveInfo,
} from '@/lib/editor-curves';
import { exportReact } from '@/lib/editor-exports';
import { ALL_PRESETS } from '@/lib/presets';
import { toast } from '@/lib/toast';
import { exportGIF as exportGIFLib, downloadBlob } from '@/lib/gif-export';
import { norm, cumLen } from '@/lib/curves';

// ═══════════════════════════════════════════════════════════════════

interface CurveState {
  curveType: CurveType;
  params: CurveParams;
  speed: number;
  trimLength: number;
  strokeColor: string;
  ghostWidth: number;
  trimWidth: number;
  ghostOpacity: number;
  gradientColor: string;
  gradientAngle: number;
}

// ═══════════════════════════════════════════════════════════════════

function buildParams(type: CurveType, overrides: Partial<CurveParams> = {}): CurveParams {
  const cp: CurveParams = { a: 96, b: 60, c: 0.75, d: 2, n1: 0.3, n2: 1.7, n3: 1.7, m: 5, petals: 5, stepAngle: 71 };
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
// Mobile DialKit bottom sheet with drag-to-dismiss
// ═══════════════════════════════════════════════════════════════════

function MobileDialSheet({ onClose }: { onClose: () => void }) {
  const [translateY, setTranslateY] = useState(0);
  const dragStart = useRef<number | null>(null);
  const sheetHeight = useRef(0);
  const sheetEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sheetEl.current) sheetHeight.current = sheetEl.current.offsetHeight;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    const dy = e.touches[0].clientY - dragStart.current;
    if (dy > 0) setTranslateY(dy);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (translateY > 80) {
      setTranslateY(500);
      setTimeout(onClose, 250);
    } else {
      setTranslateY(0);
    }
    dragStart.current = null;
  }, [translateY, onClose]);

  return (
    <div ref={sheetEl}
      className="fixed bottom-0 rounded-t-2xl md:hidden"
      style={{
        zIndex: 'calc(var(--z-sheet) - 10)',
        left: 0, right: 0,
        maxHeight: '44vh',
        overflow: 'visible',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        background: 'var(--bg-surface)',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.3), inset 0 var(--border-hairline) 0 0 var(--border-default)',
        transform: `translateY(${translateY}px)`,
        transition: dragStart.current !== null ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        animation: translateY === 0 ? 'pickerSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) both' : undefined,
      }}>
      {/* Drag handle */}
      <div className="flex justify-center py-3 touch-none cursor-grab"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="h-1 w-8 rounded-full" style={{ background: 'var(--border-strong)' }} />
      </div>
      <div style={{ maxHeight: 'calc(44vh - 44px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <DialRoot mode="inline" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DialKit panel
// ═══════════════════════════════════════════════════════════════════

function DialPanel({
  initType, initParams, initColor, initStyle,
  onStateChange, onTypeChange, svgRef,
}: {
  initType: CurveType;
  initParams: Record<string, number>;
  initColor: string;
  initStyle: { ghostWidth: number; trimWidth: number; trimLength: number; speed: number; ghostOpacity: number; gradientColor: string; gradientAngle: number };
  onStateChange: (partial: Partial<CurveState>) => void;
  onTypeChange: (type: CurveType, color: string) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}) {
  const config = useMemo(() => {
    const paramSliders: Record<string, [number, number, number, number]> = {};
    for (const def of curveParamDefs[initType]) {
      paramSliders[def.label] = [initParams[def.param] ?? def.range[0], def.range[1], def.range[2], def.range[3]];
    }
    return {
      Curve: { curveType: { type: 'select' as const, options: CURVE_TYPES as unknown as string[], default: initType } },
      Parameters: paramSliders,
      Animation: {
        speed: [initStyle.speed, 0.05, 2.0, 0.05] as [number, number, number, number],
        trimLength: [initStyle.trimLength, 0.01, 0.7, 0.01] as [number, number, number, number],
      },
      Style: {
        strokeColor: { type: 'color' as const, default: initColor },
        gradientColor: { type: 'color' as const, default: initStyle.gradientColor },
        ghostWidth: [initStyle.ghostWidth, 0.5, 8.0, 0.1] as [number, number, number, number],
        trimWidth: [initStyle.trimWidth, 0.5, 8.0, 0.1] as [number, number, number, number],
        ghostOpacity: [initStyle.ghostOpacity, 0.02, 0.25, 0.01] as [number, number, number, number],
        gradientAngle: [initStyle.gradientAngle, 0, 360, 1] as [number, number, number, number],
      },
      Export: {
        copyReact: { type: 'action' as const, label: '\u269B React' },
        exportGIF: { type: 'action' as const, label: '\u{1F5BC} GIF' },
      },
    };
  }, [initType, initParams, initColor]);

  const vals = useDialKit('Curvehaus Editor', config, {
    onAction: (action: string) => {
      const styl = vals.Style as { strokeColor: string; gradientColor: string; ghostWidth: number; trimWidth: number; ghostOpacity: number };
      const anm = vals.Animation as { speed: number; trimLength: number };
      const pts = generatePoints(initType, curveParamsFromVals()).filter(p => isFinite(p[0]) && isFinite(p[1]));
      const opts = { color: styl.strokeColor, lineWidth: 5.5, ghostOpacity: 0.06, speed: anm.speed, trimLength: 0.08, size: 48, gradientColor: styl.gradientColor, gradientAngle: style.gradientAngle };

      if (action === 'Export.copyReact') { copyText(exportReact(pts, opts)); toast('React component copied'); }
      else if (action === 'Export.exportGIF') {
        toast('Recording animation…');
        const normPts = norm(pts.map(p => p as [number, number]));
        const arcL = cumLen(normPts);
        exportGIFLib(normPts, arcL, anm.speed, styl.strokeColor, [], style.gradientAngle, 300, '#09090b')
          .then(blob => { downloadBlob(blob, `curvehaus-${Date.now()}.gif`); toast('GIF downloaded'); })
          .catch(() => toast('Export failed'));
      }
    },
  });

  const selectedType = (vals.Curve as { curveType: string }).curveType as CurveType;
  const paramVals = vals.Parameters as Record<string, number>;
  const anim = vals.Animation as { speed: number; trimLength: number };
  const style = vals.Style as { strokeColor: string; gradientColor: string; ghostWidth: number; trimWidth: number; ghostOpacity: number; gradientAngle: number };

  function curveParamsFromVals(): CurveParams {
    const cp: CurveParams = { a: 96, b: 60, c: 0.75, d: 2, n1: 0.3, n2: 1.7, n3: 1.7, m: 5, petals: 5, stepAngle: 71 };
    for (const def of curveParamDefs[initType]) {
      if (paramVals[def.label] !== undefined) (cp as unknown as Record<string, number>)[def.param] = paramVals[def.label];
    }
    return cp;
  }

  useEffect(() => {
    if (selectedType !== initType) {
      const defaults: Record<string, number> = {};
      for (const def of curveParamDefs[selectedType]) {
        defaults[def.param] = def.range[0];
      }
      onTypeChange(selectedType, style.strokeColor || '#ffffff');
    }
  }, [selectedType]); // eslint-disable-line react-hooks/exhaustive-deps

  const valsKey = JSON.stringify([paramVals, anim, style]);
  useEffect(() => {
    onStateChange({
      curveType: initType,
      params: curveParamsFromVals(),
      speed: anim.speed,
      trimLength: anim.trimLength,
      strokeColor: style.strokeColor,
      gradientColor: style.gradientColor,
      ghostWidth: style.ghostWidth,
      trimWidth: style.trimWidth,
      ghostOpacity: style.ghostOpacity,
      gradientAngle: style.gradientAngle,
    });
  }, [valsKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const trimRef = useRef<SVGPathElement>(null);
  const searchParams = useSearchParams();

  const [state, setState] = useState<CurveState>({
    curveType: 'hypotrochoid',
    params: buildParams('hypotrochoid', { a: 96, b: 60, c: 0.75 }),
    speed: 0.1, trimLength: 0.08,
    strokeColor: '#d42b4e', ghostWidth: 2.0, trimWidth: 2.0,
    ghostOpacity: 0.06, gradientColor: '#378ADD', gradientAngle: 0,
  });
  const [info, setInfo] = useState<CurveInfo>({ name: '', formula: '', detail: '' });

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });
  useEffect(() => { setInfo(getCurveInfo(state.curveType, state.params)); }, [state.curveType, state.params]);


  // Load preset from URL ?preset=N
  useEffect(() => {
    const pid = searchParams.get('preset');
    if (!pid) return;
    const preset = ALL_PRESETS.find(p => p.id === Number(pid));
    if (!preset) return;
    const typeMap: Record<string, string> = { h: 'hypotrochoid', r: 'rose', l: 'lissajous', s: 'superformula' };
    const type = (typeMap[preset.type] || 'hypotrochoid') as CurveType;
    // Map array params to named params
    const paramMap: Record<string, Partial<CurveParams>> = {
      h: { a: Number(preset.params[0]), b: Number(preset.params[1]), c: Number(preset.params[2]) },
      r: { petals: Number(preset.params[0]), a: Number(preset.params[1] || 0) },
      l: { b: Number(preset.params[0]), d: Number(preset.params[1]), c: Number(preset.params[2] || 0) },
      s: { m: Number(preset.params[0]), n1: Number(preset.params[1]), n2: Number(preset.params[2]) },
    };
    const mapped = paramMap[preset.type] || {};
    const color = '#' + (searchParams.get('color') || 'ffffff');
    const gradColor = searchParams.get('grad') ? '#' + searchParams.get('grad') : color;
    const angle = Number(searchParams.get('angle') || 0);
    const gw = Number(searchParams.get('gw') || 2.0);
    const tw = Number(searchParams.get('tw') || 2.0);
    const tl = Number(searchParams.get('tl') || 0.08);
    const sp = Number(searchParams.get('sp') || 0.1);
    const go = Number(searchParams.get('go') || 0.06);
    const builtParams = buildParams(type, mapped);
    setState(s => ({
      ...s, curveType: type, params: builtParams,
      strokeColor: color, gradientColor: gradColor, gradientAngle: angle,
      ghostWidth: gw, trimWidth: tw, trimLength: tl, speed: sp, ghostOpacity: go,
    }));
    // Update DialKit remount props with the PRESET's values
    const defaults: Record<string, number> = {};
    for (const [k, v] of Object.entries(mapped)) {
      if (typeof v === 'number') defaults[k] = v;
    }
    setActiveType(type);
    setActiveDefaults(defaults);
    setActiveColor(color);
    setDialKey(k => k + 1);
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
  const [dialOpen, setDialOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    setDialOpen(!mq.matches);
    setMounted(true);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const handleTypeChange = useCallback((type: CurveType, color: string) => {
    const defaults: Record<string, number> = {};
    for (const def of curveParamDefs[type]) {
      defaults[def.param] = def.range[0];
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


  // ═══════════════════════════════════════════════════════════════
  // ANIMATION LOOP — direct point-range trim (same as home page)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    let frameId: number;

    function tick(now: number) {
      const s = stateRef.current;
      const trimEl = trimRef.current;
      const ghostEl = pathRef.current;
      const pts = mappedRef.current;
      if (!trimEl || pts.length < 10) { frameId = requestAnimationFrame(tick); return; }

      const n = pts.length;
      const trimFrac = s.trimLength || 0.08;
      const speed = s.speed || 0.1;

      // Head/tail as fraction — same formula as renderer.ts drawTrim
      const headFrac = ((now / 1000 * speed * 0.30) % 1 + 1) % 1;
      const tailFrac = ((headFrac - trimFrac) % 1 + 1) % 1;
      const headIdx = Math.floor(headFrac * (n - 1));
      const tailIdx = Math.floor(tailFrac * (n - 1));

      // Build trim path D from point range
      let trimD = '';
      if (tailIdx <= headIdx) {
        trimD = `M${pts[tailIdx][0].toFixed(2)},${pts[tailIdx][1].toFixed(2)}`;
        for (let i = tailIdx + 1; i <= headIdx; i++) {
          trimD += `L${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)}`;
        }
      } else {
        trimD = `M${pts[tailIdx][0].toFixed(2)},${pts[tailIdx][1].toFixed(2)}`;
        for (let i = tailIdx + 1; i < n; i++) {
          trimD += `L${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)}`;
        }
        for (let i = 0; i <= headIdx; i++) {
          trimD += `L${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)}`;
        }
      }

      trimEl.setAttribute('d', trimD);
      trimEl.removeAttribute('stroke-dasharray');
      trimEl.removeAttribute('stroke-dashoffset');
      trimEl.setAttribute('stroke-width', String(s.trimWidth || 2.0));

      // Apply gradient or solid color to trim
      const hasGradient = s.gradientColor && s.gradientColor !== s.strokeColor;
      if (hasGradient) {
        trimEl.setAttribute('stroke', 'url(#trim-gradient)');
      } else {
        trimEl.setAttribute('stroke', s.strokeColor || '#d42b4e');
      }

      // Ghost path — separate width + opacity
      if (ghostEl) {
        ghostEl.setAttribute('stroke-width', String(s.ghostWidth || 2.0));
        ghostEl.setAttribute('opacity', String(s.ghostOpacity || 0.06));
        ghostEl.setAttribute('stroke', s.strokeColor || '#d42b4e');
      }

      // Update gradient angle + colors
      const gradEl = document.getElementById('trim-gradient') as unknown as SVGLinearGradientElement | null;
      if (gradEl) {
        gradEl.setAttribute('gradientTransform', `rotate(${(s.gradientAngle || 0) - 90} 0.5 0.5)`);
        const stop0 = gradEl.querySelector('.stop0');
        const stop1 = gradEl.querySelector('.stop1');
        if (stop0) stop0.setAttribute('stop-color', s.strokeColor || '#d42b4e');
        if (stop1) stop1.setAttribute('stop-color', s.gradientColor || '#378ADD');
      }

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`flex h-[100dvh] flex-col items-center md:pr-[280px] max-[900px]:md:pr-0 ${isDesktop ? 'justify-center' : 'pt-12'}`}>
      {/* Back button */}
      <a href="/" className="hairline-border fixed left-4 top-4 z-50 flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] transition-colors hover:text-[var(--text-primary)]"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M19 12H5M5 12l6-6M5 12l6 6" /></svg>
        Back
      </a>

      {/* SVG — responsive sizing, shrinks when sheet is open on mobile */}
      <svg ref={svgRef} viewBox="0 0 100 100" fill="none"
        className="w-full flex-1"
        style={{ maxWidth: isDesktop ? undefined : (dialOpen ? 300 : 'min(90vw, 360px)'), maxHeight: isDesktop ? 'calc(100dvh - 80px)' : (dialOpen ? 'calc(56dvh - 40px)' : 'calc(100dvh - 80px)'), transition: 'all 0.3s ease' }}>
        <defs>
          <linearGradient id="trim-gradient" gradientUnits="objectBoundingBox"
            gradientTransform={`rotate(${(state.gradientAngle || 0) - 90} 0.5 0.5)`}>
            <stop className="stop0" offset="0%" stopColor={state.strokeColor} />
            <stop className="stop1" offset="100%" stopColor={state.gradientColor || state.strokeColor} />
          </linearGradient>
        </defs>
        <g ref={groupRef}>
          <path ref={pathRef} d={pathD} stroke={state.strokeColor} strokeWidth={state.ghostWidth}
            strokeLinecap="round" strokeLinejoin="round" opacity={state.ghostOpacity} fill="none" />
          <path ref={trimRef} d={pathD}
            stroke={state.gradientColor !== state.strokeColor ? 'url(#trim-gradient)' : state.strokeColor}
            strokeWidth={state.trimWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </svg>


      {/* DialPanel feeds data to DialKit */}
      <DialPanel
        key={dialKey}
        initType={activeType}
        initParams={activeDefaults}
        initColor={activeColor}
        initStyle={{
          ghostWidth: state.ghostWidth, trimWidth: state.trimWidth,
          trimLength: state.trimLength, speed: state.speed,
          ghostOpacity: state.ghostOpacity, gradientColor: state.gradientColor,
          gradientAngle: state.gradientAngle,
        }}
        onStateChange={handleStateChange}
        onTypeChange={handleTypeChange}
        svgRef={svgRef}
      />

      {/* Mobile: label + FAB aligned at bottom */}
      {!dialOpen && (
        <>
        <span className="fixed left-0 right-0 z-40 text-center text-[13px] font-medium text-white/60 pointer-events-none md:hidden" style={{ bottom: 'calc(1rem + 10px)' }}>{info.name}</span>
        <button type="button"
          onTouchEnd={(e) => { e.preventDefault(); setDialOpen(true); }}
          onClick={() => setDialOpen(true)}
          className="hairline-border fixed right-4 bottom-4 z-50 flex h-11 w-11 items-center justify-center rounded-full md:hidden"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', WebkitTapHighlightColor: 'transparent' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
            <path d="M1 14h6M9 8h6M17 16h6" />
          </svg>
        </button>
        </>
      )}

      {dialOpen && (
        <MobileDialSheet onClose={() => setDialOpen(false)} />
      )}

      {/* Desktop: floating DialKit panel (conditional — DialKit portals to body) */}
      {mounted && isDesktop && <DialRoot position="top-right" />}
    </div>
  );
}
