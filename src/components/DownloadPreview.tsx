'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import type { Preset } from '@/lib/presets';
import { gen, norm, cumLen } from '@/lib/curves';
import { renderLoader } from '@/lib/renderer';

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

export default function DownloadPreview({ preset, baseColor, gradientStops, gradientAngle, onClose, onCopyReact, onDownloadGif, onEdit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const [fullscreen, setFullscreen] = useState(false);

  const data = useMemo(() => {
    const raw = gen(preset.type, preset.params);
    const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
    const pts = norm(valid);
    const L = cumLen(pts);
    return { pts, L };
  }, [preset]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const start = performance.now();
    function tick(now: number) {
      const cvs = canvasRef.current;
      if (!cvs || cvs.offsetWidth < 10) { animRef.current = requestAnimationFrame(tick); return; }
      const dpr = window.devicePixelRatio || 1;
      const cssSize = cvs.offsetWidth;
      const sz = Math.round(cssSize * dpr);
      if (cvs.width !== sz || cvs.height !== sz) { cvs.width = sz; cvs.height = sz; }
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      const t = (now - start) / 1000;
      renderLoader(ctx, sz, data.pts, data.L, t, 0.2, baseColor, gradientStops, gradientAngle);
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [data, baseColor, gradientStops, gradientAngle]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 9999,
        background: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Header */}
      {!fullscreen && (
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          height: 'calc(env(safe-area-inset-top, 0px) + 52px)',
        }}>
          <span style={{
            fontSize: 17, fontWeight: 600, color: 'var(--text-primary)',
            fontFamily: 'var(--mono)', letterSpacing: '-0.025em',
          }}>
            {preset.name}
          </span>
          <button
            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onClose(); }}
            onClick={onClose}
            aria-label="Close"
            className="hairline-border flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:text-[var(--text-primary)]"
            style={{
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
              flexShrink: 0, touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loader area */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <canvas ref={canvasRef} className={fullscreen ? 'block h-[64px] w-[64px]' : 'block h-[200px] w-[200px]'} />
      </div>

      {/* Action buttons */}
      {!fullscreen && (
        <div style={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          padding: '0 24px',
          touchAction: 'manipulation',
        }}>
          <ActionButton label="React" onPress={onCopyReact}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </ActionButton>
          <ActionButton label="GIF" onPress={onDownloadGif}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </ActionButton>
          <ActionButton label="Edit" onPress={onEdit}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3l6 6M4 15l11-11 6 6-11 11H4v-6z" />
            </svg>
          </ActionButton>
          <ActionButton label="Full" onPress={() => setFullscreen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </ActionButton>
        </div>
      )}

      {/* iPhone home indicator */}
      {!fullscreen && (
        <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', flexShrink: 0 }} />
      )}

      {/* Fullscreen exit button */}
      {fullscreen && (
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setFullscreen(false); }}
          onClick={() => setFullscreen(false)}
          aria-label="Exit fullscreen"
          className="hairline-border flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:text-[var(--text-primary)]"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            right: 20,
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────

function ActionButton({ label, onPress, children }: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onPress(); }}
      onClick={onPress}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        background: 'transparent', border: 'none', cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        padding: 0,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        color: 'var(--text-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {children}
      </div>
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{label}</span>
    </button>
  );
}
