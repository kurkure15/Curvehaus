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

export default function MiniColorPicker({
  value, onChange, label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [hue, setHue] = useState(() => hexToHsv(value)[0]);
  const [sat, setSat] = useState(() => hexToHsv(value)[1]);
  const [val, setVal] = useState(() => hexToHsv(value)[2]);
  const [hex, setHex] = useState(value);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync internal hex → parent
  useEffect(() => {
    const h = hsvToHex(hue, sat, val);
    setHex(h);
    onChange(h);
  }, [hue, sat, val]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync incoming value → internal HSV (when parent changes it externally)
  useEffect(() => {
    if (value !== hex) {
      setHex(value);
      const [h, s, v] = hexToHsv(value);
      setHue(h); setSat(s); setVal(v);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSV = useCallback((e: MouseEvent) => {
    const r = svRef.current?.getBoundingClientRect();
    if (!r) return;
    setSat(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    setVal(Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)));
  }, []);

  const handleHue = useCallback((e: MouseEvent) => {
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
    <div ref={wrapRef} className="relative">
      {/* Trigger: swatch + label + hex */}
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 rounded py-1">
        <div className="h-5 w-5 shrink-0 rounded border border-[#3f3f46]" style={{ background: hex }} />
        <span className="text-[11px] text-[#a1a1aa]">{label}</span>
        <span className="ml-auto text-[10px] text-[#52525b]" style={{ fontFamily: 'var(--mono)' }}>{hex}</span>
      </button>

      {/* Dropdown picker */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-[#27272a] bg-[#111113] p-2 shadow-lg">
          {/* SV area — compact */}
          <div
            ref={svRef}
            onMouseDown={startDrag(handleSV)}
            className="relative mb-1.5 cursor-crosshair rounded"
            style={{ height: 64, background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue},100%,50%))` }}
          >
            <div className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%`, boxShadow: '0 0 2px rgba(0,0,0,0.6)' }} />
          </div>
          {/* Hue bar */}
          <div
            ref={hueRef}
            onMouseDown={startDrag(handleHue)}
            className="relative mb-1.5 cursor-pointer rounded"
            style={{ height: 8, background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
          >
            <div className="pointer-events-none absolute top-0 h-full w-1 -translate-x-1/2 rounded border border-white"
              style={{ left: `${(hue / 360) * 100}%`, boxShadow: '0 0 2px rgba(0,0,0,0.5)' }} />
          </div>
          {/* Hex input */}
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
            className="w-full rounded border border-[#27272a] bg-transparent px-2 py-0.5 text-[10px] text-[#a1a1aa] outline-none"
            style={{ fontFamily: 'var(--mono)' }}
          />
        </div>
      )}
    </div>
  );
}
