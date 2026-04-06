'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

export default function ColorPickerSheet({ onAdd, onClose, onDragY, addLabel = 'Add stop' }: { onAdd: (hex: string) => void; onClose: () => void; onDragY?: (y: number) => void; addLabel?: string }) {
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(0.8);
  const [val, setVal] = useState(0.9);
  const svRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);
  const dragSV = useRef(false);
  const dragHue = useRef(false);

  // Drag-to-dismiss
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragY = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const dismissing = useRef(false);

  const SVW = 300, SVH = 140, HH = 14;
  const [r, g, b] = hsvToRgb(hue, sat, val);
  const hex = rgbToHex(r, g, b);

  // Draw SV
  useEffect(() => {
    const c = svRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = window.devicePixelRatio || 2;
    c.width = SVW * dpr; c.height = SVH * dpr;
    ctx.scale(dpr, dpr);
    const hGrad = ctx.createLinearGradient(0, 0, SVW, 0);
    hGrad.addColorStop(0, '#fff');
    const [hr, hg, hb] = hsvToRgb(hue, 1, 1);
    hGrad.addColorStop(1, `rgb(${hr},${hg},${hb})`);
    ctx.fillStyle = hGrad; ctx.fillRect(0, 0, SVW, SVH);
    const vGrad = ctx.createLinearGradient(0, 0, 0, SVH);
    vGrad.addColorStop(0, 'rgba(0,0,0,0)'); vGrad.addColorStop(1, '#000');
    ctx.fillStyle = vGrad; ctx.fillRect(0, 0, SVW, SVH);
    const tx = sat * SVW, ty = (1 - val) * SVH;
    ctx.beginPath(); ctx.arc(tx, ty, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; ctx.stroke();
  }, [hue, sat, val]);

  // Draw hue
  useEffect(() => {
    const c = hueRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = window.devicePixelRatio || 2;
    c.width = SVW * dpr; c.height = HH * dpr;
    ctx.scale(dpr, dpr);
    const grad = ctx.createLinearGradient(0, 0, SVW, 0);
    for (let i = 0; i <= 6; i++) { const [r, g, b] = hsvToRgb(i * 60, 1, 1); grad.addColorStop(i / 6, `rgb(${r},${g},${b})`); }
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(0, 0, SVW, HH, HH / 2); ctx.fill();
    const tx = (hue / 360) * SVW;
    ctx.beginPath(); ctx.roundRect(tx - 5, -1, 10, HH + 2, 5);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();
  }, [hue]);

  const handleSV = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    const pt = 'touches' in e ? (e as TouchEvent).touches[0] : (e as MouseEvent);
    if (!pt) return;
    setSat(Math.max(0, Math.min(1, (pt.clientX - rect.left) / rect.width)));
    setVal(Math.max(0, Math.min(1, 1 - (pt.clientY - rect.top) / rect.height)));
  }, []);

  const handleHue = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const pt = 'touches' in e ? (e as TouchEvent).touches[0] : (e as MouseEvent);
    if (!pt) return;
    setHue(Math.max(0, Math.min(360, ((pt.clientX - rect.left) / rect.width) * 360)));
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if (!dragSV.current && !dragHue.current) return;
      e.preventDefault();
      if (dragSV.current) handleSV(e);
      if (dragHue.current) handleHue(e);
    };
    const up = () => { dragSV.current = false; dragHue.current = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [handleSV, handleHue]);

  // Drag-to-dismiss handlers
  const onHandleTouchStart = useCallback((e: React.TouchEvent) => {
    dragY.current = e.touches[0].clientY;
    dismissing.current = false;
  }, []);

  const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragY.current === null) return;
    const dy = e.touches[0].clientY - dragY.current;
    if (dy > 0) {
      setTranslateY(dy);
      onDragY?.(dy);
    }
  }, [onDragY]);

  const onHandleTouchEnd = useCallback(() => {
    if (translateY > 80) {
      dismissing.current = true;
      setTranslateY(400);
      onDragY?.(400);
      setTimeout(onClose, 250);
    } else {
      setTranslateY(0);
      onDragY?.(0);
    }
    dragY.current = null;
  }, [translateY, onClose, onDragY]);

  return (
    <div ref={sheetRef}>
      <div className="flex flex-col items-center gap-3" style={{ padding: '12px 20px 24px' }}>
        {/* Drag handle */}
        <div
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
          className="flex w-full cursor-grab items-center justify-center touch-none"
          style={{ padding: '8px 0' }}>
          <div className="h-1 w-9 rounded-full" style={{ background: 'var(--border-h)' }} />
        </div>
        <canvas ref={svRef}
          onMouseDown={(e) => { dragSV.current = true; handleSV(e); }}
          onTouchStart={(e) => { dragSV.current = true; handleSV(e); }}
          className="block touch-none cursor-crosshair"
          style={{ width: SVW, height: SVH, borderRadius: 12 }} />
        <canvas ref={hueRef}
          onMouseDown={(e) => { dragHue.current = true; handleHue(e); }}
          onTouchStart={(e) => { dragHue.current = true; handleHue(e); }}
          className="block touch-none cursor-crosshair"
          style={{ width: SVW, height: HH, borderRadius: HH / 2 }} />
        <div className="flex items-center gap-3" style={{ width: SVW }}>
          <div className="rounded-lg" style={{ width: 28, height: 28, background: hex, border: '1px solid var(--border)' }} />
          <span className="flex-1 text-[13px]" style={{ fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>{hex.toUpperCase()}</span>
          <button type="button"
            onTouchEnd={(e) => { e.preventDefault(); onAdd(hex); }}
            onClick={() => onAdd(hex)}
            className="rounded-lg px-4 text-[12px] font-medium"
            style={{ height: 44, background: 'var(--text)', color: 'var(--bg)', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
            {addLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
