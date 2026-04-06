'use client';

import { useRef, useCallback } from 'react';

export default function AngleKnob({ angle, onChange }: { angle: number; onChange: (a: number) => void }) {
  const knobRef = useRef<HTMLDivElement>(null);

  const calcAngle = useCallback((clientX: number, clientY: number) => {
    const r = knobRef.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const deg = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    onChange(((deg % 360) + 360) % 360);
  }, [onChange]);

  const startDrag = (e: React.MouseEvent) => {
    calcAngle(e.clientX, e.clientY);
    const move = (ev: MouseEvent) => calcAngle(ev.clientX, ev.clientY);
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const startTouch = (e: React.TouchEvent) => {
    const t = e.touches[0];
    calcAngle(t.clientX, t.clientY);
    const move = (ev: TouchEvent) => { ev.preventDefault(); calcAngle(ev.touches[0].clientX, ev.touches[0].clientY); };
    const up = () => { window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={knobRef}
        onMouseDown={startDrag}
        onTouchStart={startTouch}
        className="relative cursor-pointer rounded-full border-[1.5px] border-[#27272a] touch-none"
        style={{ width: 64, height: 64 }}
      >
        <div
          className="absolute left-1/2 bg-white"
          style={{
            width: 3, height: 18, top: 5,
            transformOrigin: '50% 27px',
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
