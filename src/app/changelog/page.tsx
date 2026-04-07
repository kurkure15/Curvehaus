'use client';

import Link from 'next/link';

const VERSIONS = [
  {
    version: 'v1.1',
    date: 'April 2026',
    current: true,
    changes: [
      'Full mobile experience — gallery, editor, share sheet',
      'Swipeable looping preset carousel',
      'HSV color picker bottom sheet with drag-to-dismiss',
      'Touch-friendly angle knob (64px, drag support)',
      'DialKit editor as bottom sheet with inline mode',
      'Safari touch patches for DialKit select + color controls',
      'Share sheet with live canvas animation + React/GIF/Edit actions',
      'Direct point-range trim rendering (matches desktop)',
      'Custom centered toast for mobile',
    ],
  },
  {
    version: 'v1',
    date: 'April 2026',
    current: false,
    changes: [
      'Gallery of 23 animated loader presets',
      'Canvas 2D renderer with direct point-range trim',
      'Ghost outline via offscreen canvas compositing',
      'HSV color picker with gradient stops + angle knob',
      'React component export with motion.path',
      'Transparent GIF export at 30fps',
      'DialKit parametric editor at /editor',
      'Hover-to-play bento grid',
      'Sonner toast notifications',
    ],
  },
  {
    version: 'v0',
    date: 'March 2026',
    current: false,
    changes: [
      'Initial SVG-based prototype',
      'Circle particle trail animation',
      'Basic hypotrochoid + rose curves',
    ],
  },
];

export default function Changelog() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-[520px] px-6 py-16">
        {/* Header */}
        <a href="/" className="mb-8 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#27272a] bg-[#111113] px-3 text-[11px] text-[#a1a1aa] transition-colors hover:border-[#3f3f46] hover:text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M19 12H5M5 12l6-6M5 12l6 6" /></svg>
          Back
        </a>

        <h1 className="text-[24px] font-bold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>Changelog</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-3)' }}>What&apos;s new in Curvehaus.</p>

        {/* Versions */}
        <div className="mt-10 space-y-10">
          {VERSIONS.map(v => (
            <div key={v.version}>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{v.version}</span>
                {v.current && (
                  <span className="rounded-full bg-[#27272a] px-2 py-0.5 text-[9px] font-medium" style={{ color: 'var(--text-2)' }}>current</span>
                )}
                <span className="text-[11px]" style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{v.date}</span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {v.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-2)' }}>
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--text-3)' }} />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
