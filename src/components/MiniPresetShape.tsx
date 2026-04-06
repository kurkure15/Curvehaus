'use client';

import { useMemo } from 'react';
import { gen, norm } from '@/lib/curves';
import type { CurveType } from '@/lib/curves';

interface PresetLike {
  type: CurveType;
  params: (number | string)[];
}

export default function MiniPresetShape({ preset, color, size = 18, active = false }: {
  preset: PresetLike;
  color: string;
  size?: number;
  active?: boolean;
}) {
  const path = useMemo(() => {
    const raw = gen(preset.type, preset.params);
    const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
    const pts = norm(valid);
    if (pts.length < 2) return '';
    return pts.map(([x, y], i) =>
      `${i === 0 ? 'M' : 'L'}${(x * 100).toFixed(1)},${(y * 100).toFixed(1)}`
    ).join(' ') + ' Z';
  }, [preset]);

  if (!path) return null;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <path d={path} fill="none" stroke={color} strokeWidth={6}
        strokeLinecap="round" strokeLinejoin="round" opacity={active ? 0.12 : 0.2}
        pathLength={100} />
      {active && (
        <path d={path} fill="none" stroke={color} strokeWidth={6.5}
          strokeLinecap="round" strokeLinejoin="round"
          pathLength={100} strokeDasharray="8 92" strokeDashoffset={0}>
          <animate attributeName="stroke-dashoffset" from="0" to="-100" dur="3.5s" repeatCount="indefinite" />
        </path>
      )}
    </svg>
  );
}
