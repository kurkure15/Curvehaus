'use client';

import { useRef, useState, useEffect } from 'react';
import type { Preset } from '@/lib/presets';
import { gen, norm } from '@/lib/curves';

const BG_COLORS = [
  { id: 'black',  frame: '#0a0a0a', screen: 'linear-gradient(160deg, #1a1a1a 0%, #0d0d0d 100%)', loader: '#fafafa' },
  { id: 'white',  frame: '#d4d4d4', screen: 'linear-gradient(160deg, #ffffff 0%, #f2f2f2 100%)', loader: '#1a1a1a' },
  { id: 'orange', frame: '#7a3015', screen: 'linear-gradient(160deg, #f0854a 0%, #c4511a 100%)', loader: '#fff2e8' },
  { id: 'purple', frame: '#3a2060', screen: 'linear-gradient(160deg, #9b6fd4 0%, #5c35a0 100%)', loader: '#f0e8ff' },
  { id: 'green',  frame: '#0d4028', screen: 'linear-gradient(160deg, #3cb878 0%, #1a7a4c 100%)', loader: '#e8fff2' },
  { id: 'navy',   frame: '#0f1a2e', screen: 'linear-gradient(160deg, #2a4470 0%, #152040 100%)', loader: '#e0ecff' },
];

const ITEM_W = 260;
const GAP = 24;

interface Props {
  preset: Preset;
  onClose: () => void;
  onCopyReact: () => void;
  onDownloadGif: () => void;
  onEdit: () => void;
}

export default function DownloadPreview({ preset, onClose, onCopyReact, onDownloadGif, onEdit }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const animRef = useRef(0);
  // One ref slot per phone — RAF writes dashoffset directly to DOM
  const loaderRefs = useRef<(SVGPathElement | null)[]>(new Array(BG_COLORS.length).fill(null));

  // Build the SVG path string
  const raw = gen(preset.type, preset.params);
  const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
  const pts = norm(valid);
  const pathD = pts.length > 1
    ? pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x * 100).toFixed(1)},${(y * 100).toFixed(1)}`).join(' ') + ' Z'
    : '';

  // RAF animation — no CSS, works on every browser
  useEffect(() => {
    if (!pathD) return;

    // Measure actual path length so dasharray values are correct regardless of shape
    let totalLen = 300;
    try {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
      const p = document.createElementNS(ns, 'path') as SVGPathElement;
      p.setAttribute('d', pathD);
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
      document.body.appendChild(svg);
      svg.appendChild(p);
      totalLen = p.getTotalLength() || 300;
      document.body.removeChild(svg);
    } catch (_) { /* use fallback */ }

    const dash = totalLen * 0.08;
    const gap  = totalLen * 0.92;
    const da   = `${dash} ${gap}`;

    loaderRefs.current.forEach(el => {
      if (!el) return;
      el.style.strokeDasharray  = da;
      el.style.strokeDashoffset = '0';
    });

    const start = performance.now();
    function tick(now: number) {
      const t = (now - start) / 1000;
      const offset = String(-((t % 3.5) / 3.5) * totalLen);
      loaderRefs.current.forEach(el => {
        if (el) el.style.strokeDashoffset = offset;
      });
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [pathD]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / (ITEM_W + GAP));
    setActiveIdx(Math.max(0, Math.min(idx, BG_COLORS.length - 1)));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 9999,
        background: 'var(--bg-elevated)',
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Header */}
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
          style={{
            width: 28, height: 28, borderRadius: 14,
            background: 'var(--border-default)', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Spacer */}
      <div style={{ height: 24, flexShrink: 0 }} />

      {/* Carousel area — flex:1 but with explicit minHeight so it doesn't collapse */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Horizontal scroll */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            display: 'flex',
            gap: GAP,
            overflowX: 'auto',
            overflowY: 'hidden',
            touchAction: 'pan-x',       // explicit pan direction for iOS
            scrollSnapType: 'x mandatory',
            paddingLeft: 'calc(50vw - 130px)',
            paddingRight: 'calc(50vw - 130px)',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}
        >
          {BG_COLORS.map((bg, i) => (
            <div key={bg.id} style={{ scrollSnapAlign: 'center', flexShrink: 0 }}>
              <PhoneMockup
                frame={bg.frame}
                screen={bg.screen}
                loaderColor={bg.loader}
                pathD={pathD}
                presetName={preset.name}
                loaderRef={el => { loaderRefs.current[i] = el; }}
              />
            </div>
          ))}
        </div>

        {/* Hide scrollbar via CSS — still need it for Webkit */}
        <style>{`.dp-scroll::-webkit-scrollbar{display:none}`}</style>

        {/* Page indicator */}
        <div style={{ paddingTop: 20 }}>
          <PageIndicator total={BG_COLORS.length} active={activeIdx} />
        </div>
      </div>

      {/* Spacer */}
      <div style={{ height: 24, flexShrink: 0 }} />

      {/* Action buttons */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 28,
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
      </div>

      {/* iPhone home indicator */}
      <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', flexShrink: 0 }} />
    </div>
  );
}

// ── Phone mockup ──────────────────────────────────────────────────────

interface PhoneProps {
  frame: string;
  screen: string;
  loaderColor: string;
  pathD: string;
  presetName: string;
  loaderRef: (el: SVGPathElement | null) => void;
}

function PhoneMockup({ frame, screen, loaderColor, pathD, presetName, loaderRef }: PhoneProps) {
  const isDark = frame === '#0a0a0a' || frame === '#0f1a2e' || frame === '#3a2060';
  const statusColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)';
  const notchColor  = isDark ? '#000000' : '#0a0a0a';

  return (
    <div style={{
      width: 260, height: 530,
      borderRadius: 44,
      background: frame,
      padding: 6,
      flexShrink: 0,
      boxShadow: '0 16px 50px rgba(0,0,0,0.6)',
    }}>
      <div style={{
        width: '100%', height: '100%',
        borderRadius: 38,
        background: screen,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Notch */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 80, height: 24, borderRadius: 14, background: notchColor }} />
        </div>

        {/* Status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 22px 0' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>9:41</span>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <svg width="12" height="9" viewBox="0 0 16 12" fill="none">
              <rect x="0" y="7" width="3" height="5" rx="0.5" fill={statusColor} />
              <rect x="4.5" y="4" width="3" height="8" rx="0.5" fill={statusColor} />
              <rect x="9" y="1" width="3" height="11" rx="0.5" fill={statusColor} />
              <rect x="13" y="0" width="3" height="12" rx="0.5" fill={statusColor} opacity="0.4" />
            </svg>
            <div style={{
              width: 20, height: 10, borderRadius: 3,
              border: `1px solid ${statusColor}`,
              padding: '0 2px',
              display: 'flex', alignItems: 'center',
            }}>
              <div style={{ width: '70%', height: 6, borderRadius: 1.5, background: '#34c759' }} />
            </div>
          </div>
        </div>

        {/* Loader centered */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 10,
        }}>
          <svg viewBox="0 0 100 100" width={110} height={110}>
            {/* Ghost track */}
            <path d={pathD} fill="none" stroke={loaderColor} strokeWidth={3}
              strokeLinecap="round" strokeLinejoin="round" opacity={0.12} />
            {/* Animated dot — dasharray/dashoffset set by RAF */}
            <path
              ref={loaderRef}
              d={pathD}
              fill="none"
              stroke={loaderColor}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 9, color: loaderColor, opacity: 0.3, fontFamily: 'var(--mono)' }}>
            {presetName}
          </span>
        </div>

        {/* Home indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 10 }}>
          <div style={{
            width: 60, height: 4, borderRadius: 2,
            background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
          }} />
        </div>
      </div>
    </div>
  );
}

// ── Page indicator ────────────────────────────────────────────────────

function PageIndicator({ total, active }: { total: number; active: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === active;
        const dist = Math.abs(i - active);
        const size = dist === 0 ? 7 : dist === 1 ? 6 : 5;
        return (
          <div key={i} style={{
            width: isActive ? 22 : size,
            height: size,
            borderRadius: size,
            background: 'var(--text-primary)',
            opacity: dist === 0 ? 1 : dist === 1 ? 0.35 : 0.15,
            transition: 'all 350ms cubic-bezier(0.32, 0.72, 0, 1)',
          }} />
        );
      })}
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
        background: 'var(--gray-5)',
        color: 'var(--text-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {children}
      </div>
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{label}</span>
    </button>
  );
}
