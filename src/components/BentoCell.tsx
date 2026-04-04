'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { gen, norm, cumLen } from '@/lib/curves';
import { renderGhostOnly, renderLoader } from '@/lib/renderer';
import type { CurveType } from '@/lib/curves';

interface CellPreset {
  id: number;
  name: string;
  type: CurveType;
  params: (number | string)[];
}

export default function BentoCell({
  preset, active, onSelect,
}: {
  preset: CellPreset;
  active: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<{ pts: [number, number][]; L: number[] } | null>(null);
  const animRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  // Generate points once
  useEffect(() => {
    const raw = gen(preset.type, preset.params);
    const pts = norm(raw.filter(p => isFinite(p[0]) && isFinite(p[1])));
    const L = cumLen(pts);
    dataRef.current = { pts, L };

    // Draw ghost at rest
    const cvs = canvasRef.current;
    if (cvs && pts.length > 10) {
      const dpr = window.devicePixelRatio || 1;
      const sz = 56 * dpr;
      cvs.width = sz; cvs.height = sz;
      const ctx = cvs.getContext('2d');
      if (ctx) renderGhostOnly(ctx, sz, pts, '#ffffff');
    }
  }, [preset]);

  // Hover animation
  useEffect(() => {
    if (!hovered) {
      cancelAnimationFrame(animRef.current);
      // Redraw ghost only
      const d = dataRef.current;
      const cvs = canvasRef.current;
      if (d && cvs && d.pts.length > 10) {
        const dpr = window.devicePixelRatio || 1;
        const sz = 56 * dpr;
        const ctx = cvs.getContext('2d');
        if (ctx) renderGhostOnly(ctx, sz, d.pts, '#ffffff');
      }
      return;
    }

    const start = performance.now();
    function tick(now: number) {
      const d = dataRef.current;
      const cvs = canvasRef.current;
      if (!d || !cvs || d.pts.length < 10) return;
      const dpr = window.devicePixelRatio || 1;
      const sz = 56 * dpr;
      if (cvs.width !== sz) { cvs.width = sz; cvs.height = sz; }
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      const t = (now - start) / 1000;
      renderLoader(ctx, sz, d.pts, d.L, t, 0.15, '#ffffff', [], 0);
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [hovered]);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${
        active
          ? 'border-[#3f3f46] bg-[rgba(255,255,255,0.03)]'
          : 'border-transparent hover:border-[#27272a] hover:bg-[rgba(255,255,255,0.02)]'
      }`}
    >
      <canvas ref={canvasRef} style={{ width: 56, height: 56 }} className="block" />
      <span className="text-[8px] text-[#52525b]" style={{ fontFamily: 'var(--mono)' }}>
        {preset.name}
      </span>
    </button>
  );
}
