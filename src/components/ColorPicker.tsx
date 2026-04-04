'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  const r = Math.round(f(5) * 255), g = Math.round(f(3) * 255), b = Math.round(f(1) * 255);
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 0) { if (max === r) h = 60 * (((g - b) / d) % 6); else if (max === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, max > 0 ? d / max : 0, max];
}

export default function ColorPicker({ open, onAdd }: { open: boolean; onAdd: (hex: string) => void }) {
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(1);
  const [val, setVal] = useState(1);
  const [hex, setHex] = useState('#ff0000');
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setHex(hsvToHex(hue, sat, val)); }, [hue, sat, val]);

  const handleSV = useCallback((e: React.MouseEvent | MouseEvent) => {
    const r = svRef.current?.getBoundingClientRect();
    if (!r) return;
    setSat(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    setVal(Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)));
  }, []);

  const handleHue = useCallback((e: React.MouseEvent | MouseEvent) => {
    const r = hueRef.current?.getBoundingClientRect();
    if (!r) return;
    setHue(Math.max(0, Math.min(360, (e.clientX - r.left) / r.width * 360)));
  }, []);

  const startDrag = (handler: (e: MouseEvent) => void) => (e: React.MouseEvent) => {
    handler(e.nativeEvent);
    const move = (ev: MouseEvent) => handler(ev);
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div style={{ height: 140, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 150ms' }}>
      {/* SV area */}
      <div
        ref={svRef}
        onMouseDown={startDrag(handleSV)}
        className="relative mb-2 cursor-crosshair rounded"
        style={{ height: 80, background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue},100%,50%))` }}
      >
        <div className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%`, boxShadow: '0 0 2px rgba(0,0,0,0.5)' }} />
      </div>
      {/* Hue bar */}
      <div
        ref={hueRef}
        onMouseDown={startDrag(handleHue)}
        className="relative mb-2 cursor-pointer rounded"
        style={{ height: 10, background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
      >
        <div className="pointer-events-none absolute top-0 h-full w-1.5 -translate-x-1/2 rounded border border-white"
          style={{ left: `${(hue / 360) * 100}%`, boxShadow: '0 0 2px rgba(0,0,0,0.5)' }} />
      </div>
      {/* Hex + Add */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 shrink-0 rounded" style={{ background: hex }} />
        <input
          value={hex}
          onChange={e => {
            const v = e.target.value;
            setHex(v);
            if (/^#[0-9a-f]{6}$/i.test(v)) {
              const [h, s, vl] = hexToHsv(v);
              setHue(h); setSat(s); setVal(vl);
            }
          }}
          className="flex-1 rounded border border-[#27272a] bg-transparent px-2 py-0.5 text-[10px] text-[#a1a1aa] outline-none"
          style={{ fontFamily: 'var(--mono)' }}
        />
        <button onClick={() => onAdd(hex)}
          className="rounded bg-[#27272a] px-2.5 py-0.5 text-[10px] text-[#fafafa] hover:bg-[#3f3f46]">
          Add
        </button>
      </div>
    </div>
  );
}
