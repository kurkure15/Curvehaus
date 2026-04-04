'use client';

import { useState, useEffect } from 'react';
import { SECTIONS, ALL_PRESETS } from '@/lib/presets';
import Hero from '@/components/Hero';
import BentoCell from '@/components/BentoCell';

export default function Gallery() {
  const [activeId, setActiveId] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('curvehaus-active');
      if (saved) return Number(saved);
    }
    return 1;
  });

  useEffect(() => {
    sessionStorage.setItem('curvehaus-active', String(activeId));
  }, [activeId]);
  const activePreset = ALL_PRESETS.find(p => p.id === activeId) || ALL_PRESETS[0];

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="flex shrink-0 items-center justify-between px-6 py-3">
        <span className="text-[14px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--text)' }}>Curvehaus</span>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer"
          className="text-[12px] hover:underline" style={{ color: 'var(--text-2)' }}>
          GitHub ↗
        </a>
      </nav>

      {/* Main grid */}
      <div className="flex flex-1 gap-6 overflow-hidden p-6">
        {/* Left: Hero */}
        <div className="flex flex-1 flex-col gap-2">
          <Hero preset={activePreset} />
          {/* Action buttons */}
          <div className="flex shrink-0 justify-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              style={{ borderColor: 'var(--border)' }} title="Copy React code">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <path d="M4.5 2H2v10h10V9.5M5.5 8.5L12 2M8 2h4v4" />
              </svg>
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              style={{ borderColor: 'var(--border)' }} title="Download">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <path d="M7 2v7.5M4 7l3 3 3-3M2.5 11h9" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Picker */}
        <div className="w-[280px] shrink-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {SECTIONS.map(section => (
            <div key={section.title} className="mb-4">
              <h3 className="mb-2 text-[8px] font-medium uppercase tracking-[0.14em]"
                style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                {section.title}
              </h3>
              <div className="grid grid-cols-3 gap-1">
                {section.presets.map(preset => (
                  <BentoCell
                    key={preset.id}
                    preset={preset}
                    active={activeId === preset.id}
                    onSelect={() => setActiveId(preset.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
