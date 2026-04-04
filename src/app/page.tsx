'use client';

import { useState, useEffect, useCallback } from 'react';
import { SECTIONS, ALL_PRESETS } from '@/lib/presets';
import { gen } from '@/lib/curves';
import { pointsToSvgPath, exportReact } from '@/lib/exports';
import { toast } from 'sonner';
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

  // Lifted color state — shared between Hero and copy button
  const [baseColor, setBaseColor] = useState('#ffffff');
  const [gradientStops, setGradientStops] = useState<string[]>([]);
  const [gradientAngle, setGradientAngle] = useState(0);

  const handleCopyReact = useCallback(() => {
    const raw = gen(activePreset.type, activePreset.params);
    const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
    const gradColor = gradientStops.length > 0 ? gradientStops[0] : undefined;
    const code = exportReact(valid, {
      color: baseColor,
      lineWidth: 5.5,
      speed: 0.1,
      trimLength: 0.08,
      size: 48,
      gradientColor: gradColor,
      gradientAngle: gradientStops.length > 0 ? gradientAngle : undefined,
    });
    navigator.clipboard.writeText(code).then(() => toast('React component copied'));
  }, [activePreset, baseColor, gradientStops, gradientAngle]);

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="flex shrink-0 items-center justify-between px-6 py-3">
        <span className="text-[14px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--text)' }}>Curvehaus</span>
        <a href="https://github.com/kurkure15/Curvehaus" target="_blank" rel="noopener noreferrer"
          className="text-[12px] hover:underline" style={{ color: 'var(--text-2)' }}>
          GitHub ↗
        </a>
      </nav>

      {/* Main grid */}
      <div className="flex flex-1 gap-6 overflow-hidden p-6">
        {/* Left: Hero */}
        <div className="flex flex-1 flex-col gap-2">
          <Hero
            preset={activePreset}
            baseColor={baseColor}
            onBaseColorChange={setBaseColor}
            gradientStops={gradientStops}
            onGradientStopsChange={setGradientStops}
            gradientAngle={gradientAngle}
            onGradientAngleChange={setGradientAngle}
          />
          {/* Copy React code button */}
          <div className="flex shrink-0 justify-center">
            <button onClick={handleCopyReact} className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }} title="Copy React component">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="10" ry="4.5" /><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)" />
              </svg>
              React
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
