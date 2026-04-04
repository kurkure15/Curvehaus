'use client';

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { gen, norm, cumLen } from '@/lib/curves';
import { renderLoader } from '@/lib/renderer';
import type { CurveType } from '@/lib/curves';
import ColorPicker from './ColorPicker';
import AngleKnob from './AngleKnob';

interface HeroPreset {
  id: number;
  name: string;
  type: CurveType;
  params: (number | string)[];
}

const BASE_COLORS = ['#ffffff', '#f97316', '#a78bfa', '#34d399', '#f472b6'];

export default function Hero({ preset }: { preset: HeroPreset }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  const [baseColor, setBaseColor] = useState('#ffffff');
  const [gradientStops, setGradientStops] = useState<string[]>([]);
  const [gradientAngle, setGradientAngle] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const data = useMemo(() => {
    const raw = gen(preset.type, preset.params);
    const pts = norm(raw.filter(p => isFinite(p[0]) && isFinite(p[1])));
    const L = cumLen(pts);
    return { pts, L };
  }, [preset]);

  // Animation loop
  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const cvs = canvasRef.current;
      if (!cvs || data.pts.length < 10) { animRef.current = requestAnimationFrame(tick); return; }
      const dpr = window.devicePixelRatio || 1;
      const sz = 200 * dpr;
      if (cvs.width !== sz) { cvs.width = sz; cvs.height = sz; }
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      const t = (now - start) / 1000;
      renderLoader(ctx, sz, data.pts, data.L, t, 0.1, baseColor, gradientStops, gradientAngle);
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [data, baseColor, gradientStops, gradientAngle]);

  const addStop = useCallback((hex: string) => {
    setGradientStops(s => [...s, hex]);
    setPickerOpen(false);
  }, []);

  const removeStop = useCallback((i: number) => {
    setGradientStops(s => s.filter((_, idx) => idx !== i));
  }, []);

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-[#27272a]/50 bg-[#111113]">
      {/* Shape area — vertically centered */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <canvas ref={canvasRef} style={{ width: 200, height: 200 }} className="block" />
        {/* Edit button — navigates to /editor with ALL current settings */}
        <button onClick={() => {
          const p = new URLSearchParams();
          p.set('preset', String(preset.id));
          p.set('color', baseColor.replace('#', ''));
          p.set('gw', '5.5');   // ghost width (matches gallery renderer)
          p.set('tw', '5.5');   // trim width
          p.set('tl', '0.08');  // trim length (8% of path)
          p.set('sp', '0.1');   // speed
          p.set('go', '0.06');  // ghost opacity
          if (gradientStops.length > 0) {
            p.set('grad', gradientStops[0].replace('#', ''));
            p.set('angle', String(Math.round(gradientAngle)));
          }
          router.push('/editor?' + p.toString());
        }} className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[#27272a] text-[#52525b] hover:border-[#3f3f46] hover:text-[#a1a1aa]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M7.5 1.5l3 3M2 7.5L8.5 1l3 3L5 10.5 1 11l1-3.5z" />
          </svg>
        </button>
      </div>

      {/* Controls — pinned to bottom */}
      <div className="shrink-0 space-y-3 px-4 pb-4">
        {/* Base color dots */}
        <div className="flex items-center justify-center gap-2">
          {BASE_COLORS.map(c => (
            <button key={c} onClick={() => setBaseColor(c)}
              className="rounded-full transition-shadow" title={c}
              style={{
                width: 18, height: 18, background: c,
                boxShadow: baseColor === c ? `0 0 0 2px #09090b, 0 0 0 3.5px ${c}` : 'none',
              }}
            />
          ))}
        </div>

        {/* Gradient stops + plus */}
        <div className="flex items-center justify-center gap-1.5">
          {gradientStops.map((c, i) => (
            <button key={i} onClick={() => removeStop(i)}
              className="group relative rounded-full" style={{ width: 14, height: 14, background: c }}>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[8px] text-white opacity-0 group-hover:opacity-100">×</span>
            </button>
          ))}
          <button onClick={() => setPickerOpen(!pickerOpen)}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-dashed border-[#3f3f46] text-[11px] text-[#52525b] hover:border-[#a1a1aa] hover:text-[#a1a1aa]">
            +
          </button>
        </div>

        {/* Angle knob — only when gradient stops exist */}
        {gradientStops.length > 0 && (
          <div className="flex justify-center">
            <AngleKnob angle={gradientAngle} onChange={setGradientAngle} />
          </div>
        )}

        {/* Color picker — height always reserved */}
        <ColorPicker open={pickerOpen} onAdd={addStop} />
      </div>
    </div>
  );
}
