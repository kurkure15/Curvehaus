'use client';

import { useRef, useCallback } from 'react';

export default function AngleKnob({ angle, onChange }: { angle: number; onChange: (a: number) => void }) {
  const knobRef = useRef<HTMLDivElement>(null);

  const handleDrag = useCallback((e: MouseEvent) => {
    const r = knobRef.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const deg = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
    onChange(((deg % 360) + 360) % 360);
  }, [onChange]);

  const startDrag = (e: React.MouseEvent) => {
    handleDrag(e.nativeEvent);
    const move = (ev: MouseEvent) => handleDrag(ev);
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={knobRef}
        onMouseDown={startDrag}
        className="relative cursor-pointer rounded-full border-[1.5px] border-[#27272a]"
        style={{ width: 48, height: 48 }}
      >
        <div
          className="absolute left-1/2 bg-white"
          style={{
            width: 3, height: 14, top: 4,
            transformOrigin: '50% 20px',
            transform: `translateX(-50%) rotate(${angle}deg)`,
            borderRadius: 2,
          }}
        />
      </div>
      <span className="text-[9px] text-[#52525b]" style={{ fontFamily: 'var(--mono)' }}>
        {Math.round(angle)}°
      </span>
    </div>
  );
}
