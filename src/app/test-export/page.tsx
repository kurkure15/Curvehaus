'use client';

import { motion, useReducedMotion } from 'motion/react';
import { SECTIONS } from '@/lib/presets';
import { gen } from '@/lib/curves';
import { pointsToSvgPath } from '@/lib/exports';
import { useState, useMemo } from 'react';

const ALL = SECTIONS.flatMap(s => s.presets);

function getExportPath(preset: typeof ALL[number]) {
  const raw = gen(preset.type, preset.params);
  const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
  return pointsToSvgPath(valid);
}

// Hardcoded to match EXACTLY what exportReact produces
const TRIM = 0.08;
const DURATION = 33.3;
const GHOST_SW = 5.5;
const TRIM_SW = 6;
const GHOST_OPACITY = 0.06;

function MatchLoader({ path, color }: { path: string; color: string }) {
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 100 100" width={280} height={280}>
      <path d={path} fill="none" stroke={color} strokeWidth={GHOST_SW}
        strokeLinecap="round" strokeLinejoin="round" opacity={GHOST_OPACITY} />
      <motion.path key={path} d={path} fill="none" stroke={color}
        strokeWidth={TRIM_SW} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: TRIM, pathOffset: 0 }}
        animate={reduced ? { pathLength: TRIM } : { pathLength: TRIM, pathOffset: [0, 1] }}
        transition={{ duration: DURATION, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

function PastedLoader({ code }: { code: string }) {
  const reduced = useReducedMotion();
  // Match d="M..." paths only (start with M, not arbitrary id attributes)
  const paths = useMemo(() => [...code.matchAll(/d="(M[^"]+)"/g)].map(m => m[1]), [code]);
  const styleMatch = code.match(/style=\{\{[^}]*pathLength:\s*([\d.]+)/);
  const trim = styleMatch ? parseFloat(styleMatch[1]) : 0.08;
  const durMatch = code.match(/duration:\s*([\d.]+)/);
  const duration = durMatch ? parseFloat(durMatch[1]) : 33.3;
  const colorMatch = code.match(/color\s*=\s*"([^"]+)"/);
  const color = colorMatch ? colorMatch[1] : '#ffffff';
  const swMatches = [...code.matchAll(/strokeWidth[=:{]\s*\{?([\d.]+)/g)].map(m => parseFloat(m[1]));
  const ghostSw = swMatches[0] || 5.5;
  const trimSw = swMatches[1] || 6;
  const opMatch = code.match(/opacity[=:{]\s*\{?([\d.]+)/);
  const ghostOp = opMatch ? parseFloat(opMatch[1]) : 0.06;
  const path = paths[0] || '';

  // Parse gradient: extract stop colors and angle
  const hasGradient = code.includes('linearGradient');
  const gradStops = useMemo(() => [...code.matchAll(/stopColor[="{]\s*"?([^"}\s]+)/g)].map(m => m[1]), [code]);
  const gradAngleMatch = code.match(/rotate\((-?[\d.]+)/);
  const gradAngle = gradAngleMatch ? parseFloat(gradAngleMatch[1]) : 0;

  // Resolve gradient stop colors — first may be {color} reference
  const stop0 = gradStops[0] === '{color}' || gradStops[0] === 'color' ? color : (gradStops[0] || color);
  const stop1 = gradStops[1] || color;

  if (!path) return <div style={{ color: '#555', fontSize: 12 }}>No valid path found in pasted code</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg viewBox="0 0 100 100" width={280} height={280}>
        {hasGradient && (
          <defs>
            <linearGradient id="parsed-grad" gradientUnits="objectBoundingBox"
              gradientTransform={`rotate(${gradAngle} 0.5 0.5)`}>
              <stop offset="0%" stopColor={stop0} />
              <stop offset="100%" stopColor={stop1} />
            </linearGradient>
          </defs>
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={ghostSw}
          strokeLinecap="round" strokeLinejoin="round" opacity={ghostOp} />
        <motion.path key={path} d={path} fill="none"
          stroke={hasGradient ? 'url(#parsed-grad)' : color}
          strokeWidth={trimSw} strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: trim, pathOffset: 0 }}
          animate={reduced ? { pathLength: trim } : { pathLength: trim, pathOffset: [0, 1] }}
          transition={{ duration, repeat: Infinity, ease: 'linear' }}
        />
      </svg>
      <div style={{ color: '#555', fontSize: 10, fontFamily: 'monospace' }}>
        trim={trim} dur={duration}s sw={ghostSw}/{trimSw} op={ghostOp}
        {hasGradient ? ` grad=${stop0}→${stop1} angle=${gradAngle}°` : ` color=${color}`}
      </div>
    </div>
  );
}

export default function TestExportPage() {
  const [idx, setIdx] = useState(0);
  const [pastedCode, setPastedCode] = useState('');
  const [tab, setTab] = useState<'presets' | 'paste' | 'side-by-side'>('side-by-side');

  const preset = ALL[idx];
  const path = useMemo(() => getExportPath(preset), [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      background: '#09090b', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 16px', gap: 16, fontFamily: 'monospace',
    }}>
      <div style={{ color: '#888', fontSize: 14 }}>Curvehaus — Export Test</div>

      <div style={{ display: 'flex', gap: 0 }}>
        {(['side-by-side', 'presets', 'paste'] as const).map((t, i) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? '#222' : 'transparent', color: tab === t ? '#fff' : '#555',
            border: '1px solid #333',
            borderRadius: i === 0 ? '6px 0 0 6px' : i === 2 ? '0 6px 6px 0' : '0',
            padding: '6px 14px', cursor: 'pointer', fontSize: 11,
          }}>
            {t === 'side-by-side' ? 'Side by Side' : t === 'presets' ? 'Presets' : 'Paste'}
          </button>
        ))}
      </div>

      {/* Preset buttons — shared by all tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', maxWidth: 600 }}>
        {ALL.map((p, i) => (
          <button key={p.id} onClick={() => setIdx(i)} style={{
            background: i === idx ? '#333' : 'transparent', color: i === idx ? '#fff' : '#555',
            border: '1px solid #272727', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 9,
          }}>
            {p.name}
          </button>
        ))}
      </div>

      {tab === 'side-by-side' && (
        <>
          <div style={{ color: '#555', fontSize: 11 }}>
            Left = from pointsToSvgPath (what export produces) · Right = paste your copied code
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ color: '#666', fontSize: 10 }}>Generated (export values)</div>
              <div style={{ border: '1px solid #222', borderRadius: 12, padding: 12 }}>
                <MatchLoader path={path} color="#ffffff" />
              </div>
              <div style={{ color: '#444', fontSize: 9 }}>
                trim={TRIM} dur={DURATION}s sw={GHOST_SW}/{TRIM_SW} op={GHOST_OPACITY}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ color: '#666', fontSize: 10 }}>Pasted code</div>
              <textarea
                value={pastedCode}
                onChange={e => setPastedCode(e.target.value)}
                placeholder="Paste copied React code here..."
                style={{
                  width: 300, height: 80,
                  background: '#111', color: '#888', border: '1px solid #272727',
                  borderRadius: 8, padding: 8, fontSize: 10,
                  fontFamily: 'monospace', resize: 'vertical', outline: 'none',
                }}
              />
              <div style={{ border: '1px solid #222', borderRadius: 12, padding: 12, minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pastedCode ? <PastedLoader code={pastedCode} /> : <div style={{ color: '#333', fontSize: 11 }}>Paste above</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'presets' && (
        <div style={{ border: '1px solid #222', borderRadius: 12, padding: 16 }}>
          <MatchLoader path={path} color="#ffffff" />
        </div>
      )}

      {tab === 'paste' && (
        <>
          <textarea
            value={pastedCode}
            onChange={e => setPastedCode(e.target.value)}
            placeholder="Paste exported React component code here..."
            style={{
              width: '100%', maxWidth: 600, height: 200,
              background: '#111', color: '#888', border: '1px solid #272727',
              borderRadius: 8, padding: 12, fontSize: 11,
              fontFamily: 'monospace', resize: 'vertical', outline: 'none',
            }}
          />
          <div style={{ border: '1px solid #222', borderRadius: 12, padding: 16, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pastedCode ? <PastedLoader code={pastedCode} /> : <div style={{ color: '#333', fontSize: 12 }}>Paste code above to preview</div>}
          </div>
        </>
      )}
    </div>
  );
}
