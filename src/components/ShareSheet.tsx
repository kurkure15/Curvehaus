'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { gen, norm, cumLen } from '@/lib/curves';
import { renderLoader } from '@/lib/renderer';

interface Preset {
  id: number;
  name: string;
  type: string;
  params: (number | string)[];
}

interface Props {
  preset: Preset;
  baseColor: string;
  gradientStops: string[];
  gradientAngle: number;
  onClose: () => void;
  onCopyReact: () => void;
  onDownloadGif: () => void;
  onEdit: () => void;
}

export default function ShareSheet({ preset, baseColor, gradientStops, gradientAngle, onClose, onCopyReact, onDownloadGif, onEdit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const [translateY, setTranslateY] = useState(0);
  const dragStart = useRef<number | null>(null);

  const onHandleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientY;
  }, []);

  const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    const dy = e.touches[0].clientY - dragStart.current;
    if (dy > 0) setTranslateY(dy);
  }, []);

  const onHandleTouchEnd = useCallback(() => {
    if (translateY > 100) {
      setTranslateY(800);
      setTimeout(onClose, 250);
    } else {
      setTranslateY(0);
    }
    dragStart.current = null;
  }, [translateY, onClose]);

  useEffect(() => {
    const raw = gen(preset.type as 'h' | 'r' | 'l' | 's' | 'e', preset.params);
    const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
    const pts = norm(valid);
    const L = cumLen(pts);
    const start = performance.now();

    function tick(now: number) {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const dpr = window.devicePixelRatio || 1;
      const cssSize = 320;
      const sz = Math.round(cssSize * dpr);
      if (cvs.width !== sz) { cvs.width = sz; cvs.height = sz; }
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      const t = (now - start) / 1000;
      renderLoader(ctx, sz, pts, L, t, 0.1, baseColor, gradientStops, gradientAngle);
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [preset, baseColor, gradientStops, gradientAngle]);

  return (
    <>
      {/* Backdrop */}
      <div
        onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
        onClick={onClose}
        className="fixed inset-0 z-50 md:hidden"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col md:hidden"
        style={{
          height: '75%',
          background: '#111113',
          borderRadius: '16px 16px 0 0',
          borderTop: '1px solid #27272a',
          transform: `translateY(${translateY}px)`,
          transition: dragStart.current !== null ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
          animation: translateY === 0 ? 'shareSheetUp 0.35s cubic-bezier(0.32, 0.72, 0, 1) both' : undefined,
        }}
      >
        {/* Grab handle */}
        <div className="flex shrink-0 justify-center py-3 touch-none cursor-grab"
          onTouchStart={onHandleTouchStart} onTouchMove={onHandleTouchMove} onTouchEnd={onHandleTouchEnd}>
          <div className="h-1 w-9 rounded-full" style={{ background: '#3f3f46' }} />
        </div>

        {/* Title */}
        <div className="shrink-0 pt-3.5 text-center">
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fafafa', fontFamily: 'var(--mono)', letterSpacing: '-0.02em' }}>
            {preset.name}
          </span>
        </div>

        {/* Loader — big, no card */}
        <div className="flex items-center justify-center" style={{ paddingTop: 8 }}>
          <canvas ref={canvasRef} style={{ width: 320, height: 320 }} />
        </div>

        {/* Spacer pushes buttons to bottom */}
        <div className="flex-1" />

        {/* 3 action buttons */}
        <div className="flex shrink-0 justify-center gap-8 px-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
          <button
            onTouchEnd={(e) => { e.preventDefault(); onCopyReact(); }}
            onClick={onCopyReact}
            className="flex flex-col items-center gap-2"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <div className="flex h-14 w-14 items-center justify-center" style={{ background: '#1a1a1c', borderRadius: 18 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fafafa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </div>
            <span className="text-[11px]" style={{ color: '#8e8e93' }}>React</span>
          </button>

          <button
            onTouchEnd={(e) => { e.preventDefault(); onDownloadGif(); }}
            onClick={onDownloadGif}
            className="flex flex-col items-center gap-2"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <div className="flex h-14 w-14 items-center justify-center" style={{ background: '#1a1a1c', borderRadius: 18 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fafafa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
              </svg>
            </div>
            <span className="text-[11px]" style={{ color: '#8e8e93' }}>GIF</span>
          </button>

          <button
            onTouchEnd={(e) => { e.preventDefault(); onEdit(); }}
            onClick={onEdit}
            className="flex flex-col items-center gap-2"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <div className="flex h-14 w-14 items-center justify-center" style={{ background: '#1a1a1c', borderRadius: 18 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fafafa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3l6 6M4 15l11-11 6 6-11 11H4v-6z"/>
              </svg>
            </div>
            <span className="text-[11px]" style={{ color: '#8e8e93' }}>Edit</span>
          </button>
        </div>
      </div>
    </>
  );
}
