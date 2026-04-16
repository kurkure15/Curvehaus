'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { SECTIONS, ALL_PRESETS } from '@/lib/presets';
import { gen, norm, cumLen } from '@/lib/curves';
import { exportReact } from '@/lib/exports';
import { exportGIF, downloadBlob } from '@/lib/gif-export';
import { renderLoader } from '@/lib/renderer';
import { toast } from '@/lib/toast';
import Hero from '@/components/Hero';
import BentoCell from '@/components/BentoCell';
import AngleKnob from '@/components/AngleKnob';
import MiniPresetShape from '@/components/MiniPresetShape';
import ColorPickerSheet from '@/components/ColorPickerSheet';
import DownloadPreview from '@/components/DownloadPreview';

const BASE_COLORS = ['#ffffff', '#f97316', '#a78bfa', '#34d399', '#f472b6'];

export default function Gallery() {
  const router = useRouter();
  const [activeId, setActiveId] = useState(1);
  const [mounted, setMounted] = useState(false);

  const [baseColor, setBaseColor] = useState('#ffffff');
  const [gradientStops, setGradientStops] = useState<string[]>([]);
  const [gradientAngle, setGradientAngle] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const sheetDragging = useRef(false);
  const [carouselKey, setCarouselKey] = useState(0);

  useEffect(() => {
    const savedId = sessionStorage.getItem('curvehaus-active');
    if (savedId) setActiveId(Number(savedId));
    const c = sessionStorage.getItem('curvehaus-color');
    if (c) setBaseColor(c);
    const s = sessionStorage.getItem('curvehaus-stops');
    if (s) try { setGradientStops(JSON.parse(s)); } catch {}
    const a = sessionStorage.getItem('curvehaus-angle');
    if (a) setGradientAngle(Number(a));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    sessionStorage.setItem('curvehaus-active', String(activeId));
    sessionStorage.setItem('curvehaus-color', baseColor);
    sessionStorage.setItem('curvehaus-stops', JSON.stringify(gradientStops));
    sessionStorage.setItem('curvehaus-angle', String(gradientAngle));
  }, [activeId, baseColor, gradientStops, gradientAngle, mounted]);

  // When preview is open, intercept browser/system back to close the preview
  // instead of popping to whatever was before home (e.g. /editor).
  useEffect(() => {
    if (!previewOpen) return;
    window.history.pushState({ preview: true }, '');
    const onPop = () => setPreviewOpen(false);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // If our pushed entry is still the current state, pop it so history stays clean.
      if (window.history.state?.preview) {
        window.history.back();
      }
    };
  }, [previewOpen]);

  const activePreset = ALL_PRESETS.find(p => p.id === activeId) || ALL_PRESETS[0];
  const activeIdx = ALL_PRESETS.findIndex(p => p.id === activeId);
  const prevPreset = ALL_PRESETS[(activeIdx - 1 + ALL_PRESETS.length) % ALL_PRESETS.length];
  const nextPreset = ALL_PRESETS[(activeIdx + 1) % ALL_PRESETS.length];

  const handleSelectPreset = useCallback((id: number) => {
    setActiveId(id);
  }, []);

  // Mobile swipe
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      const idx = ALL_PRESETS.findIndex(p => p.id === activeId);
      if (dx < 0) handleSelectPreset(ALL_PRESETS[(idx + 1) % ALL_PRESETS.length].id);
      else if (dx > 0) handleSelectPreset(ALL_PRESETS[(idx - 1 + ALL_PRESETS.length) % ALL_PRESETS.length].id);
    }
  }, [activeId, handleSelectPreset]);

  const handleCopyReact = useCallback(() => {
    const raw = gen(activePreset.type, activePreset.params);
    const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
    const gradColor = gradientStops.length > 0 ? gradientStops[0] : undefined;
    const code = exportReact(valid, {
      color: baseColor, lineWidth: 5.5, speed: 0.2, trimLength: 0.08, size: 48,
      gradientColor: gradColor, gradientAngle: gradientStops.length > 0 ? gradientAngle : undefined,
    });
    navigator.clipboard.writeText(code).then(() => toast('React component copied'));
  }, [activePreset, baseColor, gradientStops, gradientAngle]);

  const handleExportGIF = useCallback(async () => {
    toast('Recording animation…');
    const raw = gen(activePreset.type, activePreset.params);
    const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
    const pts = norm(valid);
    const L = cumLen(pts);
    try {
      const blob = await exportGIF(pts, L, 0.2, baseColor, gradientStops, gradientAngle, 300, '#09090b');
      downloadBlob(blob, `curvehaus-${activePreset.name.toLowerCase().replace(/\s/g, '-')}.gif`);
      toast('GIF downloaded');
    } catch (err) { toast('Export failed'); console.error(err); }
  }, [activePreset, baseColor, gradientStops, gradientAngle]);

  // ── Mobile canvas animation ─────────────────────────────────────
  const mobileCanvasRef = useRef<HTMLCanvasElement>(null);
  const mobileAnimRef = useRef(0);

  const mobileData = useMemo(() => {
    const raw = gen(activePreset.type, activePreset.params);
    const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
    const pts = norm(valid);
    const L = cumLen(pts);
    return { pts, L };
  }, [activePreset]);

  // Tiny ghost path for preset indicator
  const tinyPathD = useMemo(() => {
    if (mobileData.pts.length < 10) return '';
    return mobileData.pts.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${(p[0] * 100).toFixed(1)},${(p[1] * 100).toFixed(1)}`
    ).join(' ') + ' Z';
  }, [mobileData]);

  useEffect(() => {
    const cvs = mobileCanvasRef.current;
    if (!cvs) return;
    const start = performance.now();
    function tick(now: number) {
      const cvs = mobileCanvasRef.current;
      if (!cvs || cvs.offsetWidth < 10) { mobileAnimRef.current = requestAnimationFrame(tick); return; }
      const dpr = window.devicePixelRatio || 1;
      const cssSize = cvs.offsetWidth;
      const sz = Math.round(cssSize * dpr);
      if (cvs.width !== sz) { cvs.width = sz; cvs.height = sz; }
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      const t = (now - start) / 1000;
      renderLoader(ctx, sz, mobileData.pts, mobileData.L, t, 0.2, baseColor, gradientStops, gradientAngle);
      mobileAnimRef.current = requestAnimationFrame(tick);
    }
    mobileAnimRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(mobileAnimRef.current);
  }, [mobileData, baseColor, gradientStops, gradientAngle]);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className={`${previewOpen ? 'hidden' : 'flex'} shrink-0 items-center justify-between px-4 py-2 md:px-6 md:py-3 md:flex`}>
        <div className="flex flex-col gap-0.5 md:gap-1">
          <span className="text-[14px] font-semibold tracking-[-0.02em] md:text-[16px]" style={{ color: 'var(--text-primary)' }}>
            Curvehaus <a href="/changelog" className="tabular text-[10px] font-normal transition-colors hover:text-[var(--text-secondary)]" style={{ color: 'var(--text-tertiary)' }}>v1.1</a>
          </span>
          <span className="text-[10px] font-normal md:text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            Made by <a href="https://ankuryadav.me" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[var(--text-secondary)]">Ankur</a> with Claude
          </span>
        </div>
        <a href="https://github.com/kurkure15/Curvehaus" target="_blank" rel="noopener noreferrer"
          className="self-center text-[11px] hover:underline md:text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          GitHub ↗
        </a>
      </nav>

      {/* ═══ MOBILE ═══ */}
      <div className={`relative ${previewOpen ? 'hidden' : 'flex'} flex-1 flex-col items-center overflow-hidden md:hidden`}>

        {/* Hero — flex-1, centers loader vertically, pb reserves space for bottom carousel */}
        <div className="flex flex-1 flex-col items-center justify-center gap-0" style={{ paddingBottom: 120 }}>

          {/* Canvas — 300×300 */}
          <canvas ref={mobileCanvasRef} className="block h-[300px] w-[300px]" />

          {/* Edit + Share icons */}
          <div className="mt-[-4px] flex items-center gap-5">
            <button onClick={() => {
              const params = new URLSearchParams({
                preset: String(activePreset.id),
                color: baseColor.replace('#', ''),
                gw: '5.5', tw: '5.5', tl: '0.08', sp: '0.2', go: '0.06',
              });
              if (gradientStops.length > 0) params.set('grad', gradientStops[0].replace('#', ''));
              if (gradientAngle) params.set('angle', String(gradientAngle));
              router.push(`/editor?${params.toString()}`);
            }}
              onTouchEnd={(e) => {
                e.preventDefault();
                const params = new URLSearchParams({
                  preset: String(activePreset.id),
                  color: baseColor.replace('#', ''),
                  gw: '5.5', tw: '5.5', tl: '0.08', sp: '0.2', go: '0.06',
                });
                if (gradientStops.length > 0) params.set('grad', gradientStops[0].replace('#', ''));
                if (gradientAngle) params.set('angle', String(gradientAngle));
                router.push(`/editor?${params.toString()}`);
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3l6 6M4 15l11-11 6 6-11 11H4v-6z"/>
              </svg>
            </button>
            <button
              onTouchEnd={(e) => { e.preventDefault(); setPreviewOpen(true); }}
              onClick={() => setPreviewOpen(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/>
              </svg>
            </button>
          </div>

          {/* Spacer */}
          <div className="h-14" />

          {/* Base color dots */}
          <div className="flex items-center gap-3">
            {BASE_COLORS.map(c => (
              <button key={c} onClick={() => setBaseColor(c)} className="rounded-full"
                style={{
                  width: 26, height: 26, background: c,
                  boxShadow: baseColor === c
                    ? `0 0 0 2px var(--bg-app), 0 0 0 3.5px ${c}`
                    : c === '#ffffff' ? 'inset 0 0 0 var(--border-hairline) var(--border-strong)' : 'none',
                }} />
            ))}
          </div>

          {/* Gradient stops + plus */}
          <div className="mt-2.5 flex items-center gap-2">
            {gradientStops.map((c, i) => (
              <button key={i} onClick={() => setGradientStops(gradientStops.filter((_, j) => j !== i))}
                className="rounded-full" style={{ width: 20, height: 20, background: c, boxShadow: 'inset 0 0 0 var(--border-hairline) rgba(255,255,255,0.18)' }} />
            ))}
            <button type="button"
              onTouchEnd={(e) => { e.preventDefault(); setPickerOpen(true); }}
              onClick={() => setPickerOpen(true)}
              className="flex items-center justify-center rounded-full"
              style={{ width: 24, height: 24, border: '1.5px dashed var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--border-strong)', fontSize: 14, cursor: 'pointer' }}>
              +
            </button>
          </div>

          {/* Angle knob */}
          {gradientStops.length > 0 && (
            <div className="mt-5">
              <AngleKnob angle={gradientAngle} onChange={setGradientAngle} />
            </div>
          )}

        </div>

        {/* Bottom: picker sheet OR carousel */}
        {pickerOpen ? (
          <>
          <div className="absolute inset-0" style={{ zIndex: 'calc(var(--z-sheet) - 10)', background: 'rgba(0,0,0,0.55)' }}
            onTouchEnd={(e) => { e.preventDefault(); setPickerOpen(false); setSheetDragY(0); setCarouselKey(k => k + 1); }}
            onClick={() => { setPickerOpen(false); setSheetDragY(0); setCarouselKey(k => k + 1); }} />
          <div className="absolute inset-x-0 bottom-0" style={{
            zIndex: 'var(--z-sheet)',
            transform: `translateY(${sheetDragY}px)`,
            transition: sheetDragging.current ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
            animation: sheetDragY === 0 ? 'pickerSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1) both' : undefined,
          }}>
            <div className="rounded-t-2xl" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
              <ColorPickerSheet
                onAdd={(hex) => { setGradientStops(prev => [...prev, hex]); setPickerOpen(false); setSheetDragY(0); setCarouselKey(k => k + 1); }}
                onClose={() => { setPickerOpen(false); setSheetDragY(0); setCarouselKey(k => k + 1); }}
                onDragY={(y) => { sheetDragging.current = y > 0 && y < 400; setSheetDragY(y); }}
              />
            </div>
          </div>
          </>
        ) : (
          <div key={carouselKey} className="absolute left-0 right-0 pb-6"
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
            style={{ overflow: 'hidden', bottom: -10, animation: 'carouselSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1) both' }}>
            <div className="grid items-center" style={{ gridTemplateColumns: '1fr auto 1fr', height: 80 }}>

              {/* Previous */}
              <div className="overflow-hidden"
                onClick={() => handleSelectPreset(prevPreset.id)}
                style={{ opacity: 0.15, cursor: 'pointer', marginLeft: -96 }}>
                <div className="flex flex-col items-center gap-1">
                  <span style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--text-primary)', letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>
                    {prevPreset.name}
                  </span>
                  <MiniPresetShape preset={prevPreset} color="#ffffff" size={18} />
                </div>
              </div>

              {/* Active */}
              <div key={activeId} className="flex flex-col items-center gap-1 px-4"
                style={{ animation: 'fadeScaleIn 0.4s cubic-bezier(0.32, 0.72, 0, 1) both' }}>
                <span style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--text-primary)', letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>
                  {activePreset.name}
                </span>
                <MiniPresetShape preset={activePreset} color={baseColor} size={18} />
              </div>

              {/* Next */}
              <div className="overflow-hidden"
                onClick={() => handleSelectPreset(nextPreset.id)}
                style={{ opacity: 0.15, cursor: 'pointer', marginRight: -96 }}>
                <div className="flex flex-col items-center gap-1">
                  <span style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--text-primary)', letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>
                    {nextPreset.name}
                  </span>
                  <MiniPresetShape preset={nextPreset} color="#ffffff" size={18} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Download preview — rendered inline, position: fixed covers viewport */}
      {previewOpen && (
        <DownloadPreview
          preset={activePreset}
          baseColor={baseColor}
          gradientStops={gradientStops}
          gradientAngle={gradientAngle}
          onClose={() => setPreviewOpen(false)}
          onCopyReact={() => { handleCopyReact(); }}
          onDownloadGif={() => { handleExportGIF(); }}
          onEdit={() => {
            const params = new URLSearchParams({
              preset: String(activePreset.id),
              color: baseColor.replace('#', ''),
              gw: '5.5', tw: '5.5', tl: '0.08', sp: '0.2', go: '0.06',
            });
            if (gradientStops.length > 0) params.set('grad', gradientStops[0].replace('#', ''));
            if (gradientAngle) params.set('angle', String(gradientAngle));
            router.push(`/editor?${params.toString()}`);
          }}
        />
      )}

      {/* ═══ DESKTOP (unchanged) ═══ */}
      <div className="hidden flex-1 gap-6 overflow-hidden p-6 md:flex">
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
