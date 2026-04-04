'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { generatePoints } from '@/lib/curves';
import type { CurveType, CurveParams } from '@/lib/curves';

function normalizeToViewBox(pts: [number, number][], pad = 0.75): number[][] {
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
  for (const [x, y] of pts) { if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; }
  const range = Math.max(mxx - mnx, mxy - mny) || 1;
  const scale = (100 * pad) / range;
  const ox = 50 - ((mnx + mxx) / 2) * scale, oy = 50 - ((mny + mxy) / 2) * scale;
  return pts.map(([x, y]) => [x * scale + ox, y * scale + oy]);
}

function pointsToD(mapped: number[][]): string {
  return mapped.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ' Z';
}

interface Circle { cx: string; cy: string; r: string; opacity: string; }

function generateTrailCircles(pts: number[][], strokeWidth = 5.5): Circle[] {
  const TRAIL_COUNT = 64;
  const trailSpan = Math.floor(pts.length * 0.3);
  const step = Math.max(1, Math.floor(trailSpan / TRAIL_COUNT));
  const headR = strokeWidth * 0.655;
  const tailR = strokeWidth * 0.164;

  return Array.from({ length: TRAIL_COUNT }, (_, i) => {
    const frac = i / (TRAIL_COUNT - 1);
    const idx = (i * step) % pts.length;
    const pt = pts[idx];
    return {
      cx: pt[0].toFixed(2),
      cy: pt[1].toFixed(2),
      r: (headR - (headR - tailR) * Math.pow(frac, 1.5)).toFixed(2),
      opacity: Math.max(0.04, Math.pow(1 - frac, 0.53)).toFixed(3),
    };
  });
}

function useIsVisible(ref: React.RefObject<HTMLElement | null>) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return isVisible;
}

export default function MiniLoader({
  curveType,
  params,
  speed = 1,
}: {
  curveType: CurveType;
  params: CurveParams;
  speed?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const isVisible = useIsVisible(containerRef);

  const mapped = useMemo(() => {
    const raw = generatePoints(curveType, params);
    const valid = raw.filter(p => isFinite(p[0]) && isFinite(p[1]));
    return valid.length < 10 ? [] : normalizeToViewBox(valid);
  }, [curveType, params]);

  const pathD = useMemo(() => mapped.length > 10 ? pointsToD(mapped) : '', [mapped]);
  const circles = useMemo(() => mapped.length > 10 ? generateTrailCircles(mapped) : [], [mapped]);

  // Rotation animation — only when visible
  useEffect(() => {
    if (!isVisible) return;
    let angle = 0;
    let frameId: number;
    function animate() {
      angle -= speed * 2;
      if (groupRef.current) {
        groupRef.current.setAttribute('transform', `rotate(${angle} 50 50)`);
      }
      frameId = requestAnimationFrame(animate);
    }
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isVisible, speed]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg viewBox="0 0 100 100" fill="none" className="h-full w-full">
        <g ref={groupRef}>
          <path
            d={pathD}
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.1"
            fill="none"
          />
          {circles.map((c, i) => (
            <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="currentColor" opacity={c.opacity} />
          ))}
        </g>
      </svg>
    </div>
  );
}
