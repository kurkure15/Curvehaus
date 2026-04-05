'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SECTIONS, ALL_PRESETS } from '@/lib/presets';
import { gen, norm, cumLen } from '@/lib/curves';
import { exportReact } from '@/lib/exports';
import { exportGIF, downloadBlob } from '@/lib/gif-export';
import { toast } from 'sonner';
import Hero from '@/components/Hero';
import BentoCell from '@/components/BentoCell';

export default function Gallery() {
  const [activeId, setActiveId] = useState(1);
  const [mounted, setMounted] = useState(false);

  // Color state
  const [baseColor, setBaseColor] = useState('#ffffff');
  const [gradientStops, setGradientStops] = useState<string[]>([]);
  const [gradientAngle, setGradientAngle] = useState(0);

  // Restore ALL state from sessionStorage in one effect
  useEffect(() => {
    const savedId = sessionStorage.getItem('curvehaus-active');
    if (savedId) setActiveId(Number(savedId));
    const c = sessionStorage.getItem('curvehaus-color');
    if (c) setBaseColor(c);
    const s = sessionStorage.getItem('curvehaus-stops');
    if (s) try { setGradientStops(JSON.parse(s)); } catch {}
    const a = sessionStorage.getItem('curvehaus-angle');
    if (a) setGradientAngle(Number(a));
    // Set mounted AFTER all restores so save effects don't fire with defaults
    setMounted(true);
  }, []);

  // Save state — only after mount
  useEffect(() => {
    if (!mounted) return;
    sessionStorage.setItem('curvehaus-active', String(activeId));
    sessionStorage.setItem('curvehaus-color', baseColor);
    sessionStorage.setItem('curvehaus-stops', JSON.stringify(gradientStops));
    sessionStorage.setItem('curvehaus-angle', String(gradientAngle));
  }, [activeId, baseColor, gradientStops, gradientAngle, mounted]);

  const activePreset = ALL_PRESETS.find(p => p.id === activeId) || ALL_PRESETS[0];

  // Reset colors when user clicks a DIFFERENT preset (not on mount)
  const handleSelectPreset = useCallback((id: number) => {
    if (id !== activeId) {
      setBaseColor('#ffffff');
      setGradientStops([]);
      setGradientAngle(0);
    }
    setActiveId(id);
  }, [activeId]);

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

  const handleExportGIF = useCallback(async () => {
    toast('Recording animation...');
    const raw = gen(activePreset.type, activePreset.params);
    const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
    const pts = norm(valid);
    const L = cumLen(pts);
    try {
      const blob = await exportGIF(pts, L, 0.1, baseColor, gradientStops, gradientAngle, 300, '#09090b');
      downloadBlob(blob, `curvehaus-${activePreset.name.toLowerCase().replace(/\s/g, '-')}.gif`);
      toast('GIF downloaded');
    } catch (err) {
      toast('Export failed');
      console.error(err);
    }
  }, [activePreset, baseColor, gradientStops, gradientAngle]);

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="flex shrink-0 items-center justify-between px-6 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-bold tracking-[-0.01em]" style={{ color: 'var(--text)' }}>Curvehaus <a href="/changelog" className="text-[10px] font-normal hover:text-[#a1a1aa]" style={{ color: 'var(--text-3)' }}>v1</a></span>
          <span className="text-[12px] font-normal" style={{ color: 'var(--text-3)' }}>
            Made by <a href="https://ankuryadav.me" target="_blank" rel="noopener noreferrer" className="hover:text-[#a1a1aa]">Ankur</a> with Claude
          </span>
        </div>
        <a href="https://github.com/kurkure15/Curvehaus" target="_blank" rel="noopener noreferrer"
          className="self-center text-[12px] hover:underline" style={{ color: 'var(--text-2)' }}>
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
          {/* Action buttons */}
          <div className="flex shrink-0 justify-center gap-2">
            <button onClick={handleCopyReact} className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }} title="Copy React component">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="10" ry="4.5" /><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)" />
              </svg>
              React
            </button>
            <button onClick={handleExportGIF} className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }} title="Download GIF">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2h16v-2" />
              </svg>
              GIF
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
                    onSelect={() => handleSelectPreset(preset.id)}
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
